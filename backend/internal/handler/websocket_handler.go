package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

const (
	MsgTypeUpdate   = "update"
	MsgTypePresence = "presence"
	MsgTypeCursor   = "cursor"
	MsgTypeTyping   = "typing"
	MsgTypeJoin     = "join"
	MsgTypeLeave    = "leave"
)

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type PresencePayload struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	Color    string `json:"color"`
}

type CursorPayload struct {
	UserID string  `json:"user_id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
}

type TypingPayload struct {
	UserID   string `json:"user_id"`
	IsTyping bool   `json:"is_typing"`
}

type Client struct {
	conn     *websocket.Conn
	pageID   string
	userID   string
	userName string
	color    string
	send     chan []byte
	hub      *Hub
}

type UserPresence struct {
	UserID   string    `json:"user_id"`
	UserName string    `json:"user_name"`
	Color    string    `json:"color"`
	Cursor   *Cursor   `json:"cursor,omitempty"`
	IsTyping bool      `json:"is_typing"`
	LastSeen time.Time `json:"last_seen"`
}

type Cursor struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Hub struct {
	clients        map[string]map[*Client]bool
	presence       map[string]map[string]*UserPresence
	broadcast      chan *BroadcastMessage
	register       chan *Client
	unregister     chan *Client
	updatePresence chan *PresenceUpdate
	mutex          sync.RWMutex
}

type BroadcastMessage struct {
	pageID  []byte
	data    []byte
	exclude *Client
}

type PresenceUpdate struct {
	pageID string
	client *Client
}

var userColors = []string{
	"#ef4444", "#f97316", "#f59e0b", "#84cc16",
	"#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
	"#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
}

func NewHub() *Hub {
	return &Hub{
		clients:        make(map[string]map[*Client]bool),
		presence:       make(map[string]map[string]*UserPresence),
		broadcast:      make(chan *BroadcastMessage, 256),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		updatePresence: make(chan *PresenceUpdate, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			if h.clients[client.pageID] == nil {
				h.clients[client.pageID] = make(map[*Client]bool)
				h.presence[client.pageID] = make(map[string]*UserPresence)
			}
			h.clients[client.pageID][client] = true

			presence := &UserPresence{
				UserID:   client.userID,
				UserName: client.userName,
				Color:    client.color,
				LastSeen: time.Now(),
			}
			h.presence[client.pageID][client.userID] = presence
			h.mutex.Unlock()

			h.broadcastPresence(client.pageID, MsgTypeJoin, presence)

		case update := <-h.updatePresence:
			h.mutex.Lock()
			if p, ok := h.presence[update.pageID][update.client.userID]; ok {
				if p.Cursor != nil {
					h.broadcastRAW(update.pageID, MsgTypeCursor, p.Cursor, nil)
				}
				h.broadcastRAW(update.pageID, MsgTypeTyping, TypingPayload{
					UserID:   update.client.userID,
					IsTyping: p.IsTyping,
				}, nil)
			}
			h.mutex.Unlock()

		case client := <-h.unregister:
			h.mutex.Lock()
			if clients, ok := h.clients[client.pageID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.clients, client.pageID)
						delete(h.presence, client.pageID)
					} else {
						delete(h.presence[client.pageID], client.userID)
					}
				}
			}
			h.mutex.Unlock()

			h.broadcastPresence(client.pageID, MsgTypeLeave, &UserPresence{
				UserID: client.userID,
			})

		case message := <-h.broadcast:
			h.mutex.RLock()
			pageIDStr := string(message.pageID)
			clients := h.clients[pageIDStr]
			h.mutex.RUnlock()

			for client := range clients {
				if message.exclude != nil && client == message.exclude {
					continue
				}
				select {
				case client.send <- message.data:
				default:
					h.mutex.Lock()
					delete(h.clients[pageIDStr], client)
					close(client.send)
					h.mutex.Unlock()
				}
			}
		}
	}
}

func (h *Hub) broadcastPresence(pageID, msgType string, presence *UserPresence) {
	data, _ := json.Marshal(WSMessage{
		Type:    msgType,
		Payload: json.RawMessage(`{}`),
	})

	h.mutex.RLock()
	clients := h.clients[pageID]
	h.mutex.RUnlock()

	for client := range clients {
		select {
		case client.send <- data:
		default:
		}
	}

	presenceData, _ := json.Marshal(presence)
	h.broadcastRAW(pageID, MsgTypePresence, presenceData, nil)
}

func (h *Hub) broadcastRAW(pageID, msgType string, payload interface{}, exclude *Client) {
	data, err := json.Marshal(WSMessage{
		Type:    msgType,
		Payload: json.RawMessage{},
	})
	if err != nil {
		return
	}
	if p, ok := payload.(json.Marshaler); ok {
		data, _ = json.Marshal(WSMessage{
			Type:    msgType,
			Payload: p.(json.RawMessage),
		})
	} else {
		payloadBytes, _ := json.Marshal(payload)
		data, _ = json.Marshal(WSMessage{
			Type:    msgType,
			Payload: payloadBytes,
		})
	}

	h.mutex.RLock()
	clients := h.clients[pageID]
	h.mutex.RUnlock()

	for client := range clients {
		if exclude != nil && client == exclude {
			continue
		}
		select {
		case client.send <- data:
		default:
		}
	}
}

func (h *Hub) GetPresence(pageID string) []*UserPresence {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	var result []*UserPresence
	for _, p := range h.presence[pageID] {
		result = append(result, p)
	}
	return result
}

func (h *Hub) GetClientCount(pageID string) int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return len(h.clients[pageID])
}

type WebSocketHandler struct {
	hub *Hub
}

func NewWebSocketHandler(hub *Hub) *WebSocketHandler {
	return &WebSocketHandler{
		hub: hub,
	}
}

func (h *WebSocketHandler) Handle(w http.ResponseWriter, r *http.Request) {
	pageID := strings.TrimPrefix(r.URL.Path, "/api/ws/pages/")
	if pageID == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	userID := r.URL.Query().Get("user_id")
	userName := r.URL.Query().Get("user_name")
	if userID == "" {
		userID = "anonymous"
	}
	if userName == "" {
		userName = "Anonymous"
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	colorIdx := 0
	for i := range userID {
		colorIdx += int(userID[i])
	}
	color := userColors[colorIdx%len(userColors)]

	client := &Client{
		conn:     conn,
		pageID:   pageID,
		userID:   userID,
		userName: userName,
		color:    color,
		send:     make(chan []byte, 256),
		hub:      h.hub,
	}

	h.hub.register <- client

	go h.writePump(client)
	go h.readPump(client)
}

func (h *WebSocketHandler) readPump(client *Client) {
	defer func() {
		h.hub.unregister <- client
		client.conn.Close()
	}()

	for {
		_, message, err := client.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			continue
		}

		switch wsMsg.Type {
		case MsgTypeCursor:
			var cursor CursorPayload
			if err := json.Unmarshal(wsMsg.Payload, &cursor); err == nil {
				h.hub.mutex.Lock()
				if p, ok := h.hub.presence[client.pageID][client.userID]; ok {
					p.Cursor = &Cursor{X: cursor.X, Y: cursor.Y}
				}
				h.hub.mutex.Unlock()

				h.hub.broadcastRAW(client.pageID, MsgTypeCursor, wsMsg.Payload, client)
			}

		case MsgTypeTyping:
			var typing TypingPayload
			if err := json.Unmarshal(wsMsg.Payload, &typing); err == nil {
				h.hub.mutex.Lock()
				if p, ok := h.hub.presence[client.pageID][client.userID]; ok {
					p.IsTyping = typing.IsTyping
				}
				h.hub.mutex.Unlock()

				h.hub.broadcastRAW(client.pageID, MsgTypeTyping, wsMsg.Payload, client)
			}

		default:
			h.hub.broadcast <- &BroadcastMessage{
				pageID:  []byte(client.pageID),
				data:    message,
				exclude: client,
			}
		}
	}
}

func (h *WebSocketHandler) writePump(client *Client) {
	defer client.conn.Close()

	for {
		message, ok := <-client.send
		if !ok {
			client.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}
