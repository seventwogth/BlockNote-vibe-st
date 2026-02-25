import { useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import { api } from '../services/api';

const API_URL = '/api';

export function useWebSocket(pageId: string | null, ydoc: Y.Doc | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ydocRef = useRef(ydoc);
  
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
      if (!ydocRef.current) return;
      
      const data = new Uint8Array(event.data as ArrayBuffer);
      try {
        Y.applyUpdate(ydocRef.current, data);
      } catch (err) {
        console.warn('Failed to apply Yjs update:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
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

  return {
    connected,
    error,
    sendUpdate,
  };
}
