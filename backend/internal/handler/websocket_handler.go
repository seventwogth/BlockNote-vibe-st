package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type Client struct {
	conn   *websocket.Conn
	pageID string
	send   chan []byte
	hub    *Hub
}

type Hub struct {
	clients    map[string]map[*Client]bool
	broadcast  chan *BroadcastMessage
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

type BroadcastMessage struct {
	pageID  []byte
	data    []byte
	exclude *Client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		broadcast:  make(chan *BroadcastMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			if h.clients[client.pageID] == nil {
				h.clients[client.pageID] = make(map[*Client]bool)
			}
			h.clients[client.pageID][client] = true
			h.mutex.Unlock()

		case client := <-h.unregister:
			h.mutex.Lock()
			if clients, ok := h.clients[client.pageID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.clients, client.pageID)
					}
				}
			}
			h.mutex.Unlock()

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

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		conn:   conn,
		pageID: pageID,
		send:   make(chan []byte, 256),
		hub:    h.hub,
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

		h.hub.broadcast <- &BroadcastMessage{
			pageID:  []byte(client.pageID),
			data:    message,
			exclude: client,
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

		if err := client.conn.WriteMessage(websocket.BinaryMessage, message); err != nil {
			return
		}
	}
}
