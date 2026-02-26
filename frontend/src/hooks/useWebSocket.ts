import { useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import { api } from '../services/api';

const API_URL = '/api';

interface UserPresence {
  user_id: string;
  user_name: string;
  color: string;
  cursor?: { x: number; y: number };
  is_typing: boolean;
}

export function useWebSocket(pageId: string | null, ydoc: Y.Doc | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const ydocRef = useRef(ydoc);
  const userIdRef = useRef<string>('user-' + Math.random().toString(36).substr(2, 9));
  
  useEffect(() => {
    ydocRef.current = ydoc;
  }, [ydoc]);

  useEffect(() => {
    if (!pageId || !ydocRef.current) return;

    const token = api.getToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${API_URL}/ws/pages/${pageId}${token ? `?token=${token}` : ''}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'join' || message.type === 'leave' || message.type === 'presence') {
          const presenceData = message.payload;
          setPresence(prev => {
            if (message.type === 'leave') {
              return prev.filter(p => p.user_id !== presenceData.user_id);
            }
            const exists = prev.find(p => p.user_id === presenceData.user_id);
            if (exists) {
              return prev.map(p => p.user_id === presenceData.user_id ? presenceData : p);
            }
            return [...prev, presenceData];
          });
          return;
        }

        if (message.type === 'cursor') {
          const cursorData = message.payload;
          setPresence(prev => prev.map(p => 
            p.user_id === cursorData.user_id 
              ? { ...p, cursor: { x: cursorData.x, y: cursorData.y } } 
              : p
          ));
          return;
        }

        if (message.type === 'typing') {
          const typingData = message.payload;
          setPresence(prev => prev.map(p => 
            p.user_id === typingData.user_id 
              ? { ...p, is_typing: typingData.is_typing } 
              : p
          ));
          if (typingData.is_typing) {
            setTypingUsers(prev => 
              prev.includes(typingData.user_id) ? prev : [...prev, typingData.user_id]
            );
          } else {
            setTypingUsers(prev => prev.filter(id => id !== typingData.user_id));
          }
          return;
        }

        if (!ydocRef.current) return;
        
        const data = new Uint8Array(event.data as ArrayBuffer);
        try {
          Y.applyUpdate(ydocRef.current, data);
        } catch (err) {
          console.warn('Failed to apply Yjs update:', err);
        }
      } catch (err) {
        if (!ydocRef.current) return;
        try {
          const data = new Uint8Array(event.data as ArrayBuffer);
          Y.applyUpdate(ydocRef.current, data);
        } catch (err) {
          console.warn('Failed to apply Yjs update:', err);
        }
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setPresence([]);
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
    };

    return () => {
      ws.close();
    };
  }, [pageId]);

  const sendUpdate = useCallback((update: Uint8Array) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(update);
    }
  }, []);

  const sendCursor = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        payload: { user_id: userIdRef.current, x, y }
      }));
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { user_id: userIdRef.current, is_typing: isTyping }
      }));
    }
  }, []);

  return {
    connected,
    error,
    sendUpdate,
    sendCursor,
    sendTyping,
    presence,
    typingUsers,
  };
}
