import { useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import { api } from '../services/api';

export function useWebSocket(pageId: string | null, ydoc: Y.Doc | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!pageId || !ydoc) return;

    const token = api.getToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/pages/${pageId}${token ? `?token=${token}` : ''}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      if (!ydoc) return;
      
      const data = new Uint8Array(event.data as ArrayBuffer);
      try {
        Y.applyUpdate(ydoc, data);
      } catch (err) {
        console.error('Failed to apply Yjs update:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = (event) => {
      setError('WebSocket connection error');
      console.error('WebSocket error:', event);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [pageId, ydoc]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      wsRef.current?.close();
    };
  }, [connect]);

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
