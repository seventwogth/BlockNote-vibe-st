import { useEffect, useRef, useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { PageWithContent } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import * as Y from 'yjs';

interface BoardEditorProps {
  page: PageWithContent | null;
  onSaveContent: (content: Uint8Array) => void;
  onUpdatePage: (data: { title?: string; icon?: string }) => void;
}

type Tool = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'text' | 'sticky' | 'pencil' | 'eraser' | 'line' | 'star' | 'heart' | 'polygon' | 'image' | 'connector';

interface BoardElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'text' | 'sticky' | 'pencil' | 'line' | 'star' | 'heart' | 'polygon' | 'image' | 'connector';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  rotation?: number;
  locked?: boolean;
  groupId?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  imageUrl?: string;
  sides?: number;
  opacity?: number;
}

interface BoardState {
  elements: BoardElement[];
  selectedIds: string[];
  groups: { id: string; elementIds: string[] }[];
}

interface ToolOptions {
  strokeWidth: number;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  opacity: number;
}

const COLORS = [
  '#ffffff', '#fff1f2', '#fff7ed', '#fefce8', '#f0fdf4', 
  '#f0f9ff', '#f5f3ff', '#fdf2f8', '#fafafa', '#18181b'
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32, 48, 64];

export function BoardEditor({ page, onSaveContent, onUpdatePage }: BoardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  
  const [title, setTitle] = useState('');
  const [boardState, setBoardState] = useState<BoardState>({ elements: [], selectedIds: [], groups: [] });
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [elementStart, setElementStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId?: string } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextToolbar, setShowTextToolbar] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(20);
  const [laserMode, setLaserMode] = useState(false);
  const [laserPoints, setLaserPoints] = useState<{ x: number; y: number; color: string }[]>([]);
  const [clipboard, setClipboard] = useState<BoardElement[]>([]);
  
  const [toolOptions] = useState<ToolOptions>({
    strokeWidth: 2,
    fontSize: 16,
    fontWeight: 'normal',
    fontFamily: 'sans-serif',
    opacity: 1,
  });

  const lastSavedContentRef = useRef<string>('');
  const laserTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!page) return;
    
    setTitle(page.title);
    
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    if (page.content && page.content.length > 0) {
      try {
        const decodedContent = new TextDecoder().decode(page.content);
        if (decodedContent && decodedContent.trim()) {
          Y.applyUpdate(ydoc, page.content);
          const yText = ydoc.getText('content');
          const content = yText.toString();
          
          if (content) {
            try {
              const parsed = JSON.parse(content);
              if (parsed.elements) {
                setBoardState(parsed);
                lastSavedContentRef.current = content;
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Failed to apply initial content, starting fresh:', err);
      }
    }
  }, [page?.id]);

  const { connected, sendUpdate } = useWebSocket(page?.id || null, ydocRef.current);

  useEffect(() => {
    if (!ydocRef.current) return;

    const handleUpdate = (update: Uint8Array) => {
      sendUpdate(update);
      
      try {
        const yText = ydocRef.current?.getText('content');
        if (yText) {
          const content = yText.toString();
          if (content !== lastSavedContentRef.current) {
            try {
              const parsed = JSON.parse(content);
              if (parsed.elements) {
                setBoardState(parsed);
                lastSavedContentRef.current = content;
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Failed to apply remote update:', err);
      }
    };

    ydocRef.current.on('update', handleUpdate);
    
    return () => {
      ydocRef.current?.off('update', handleUpdate);
    };
  }, [sendUpdate]);

  const historyRef = useRef<BoardState[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const pushToHistory = useCallback((newState: BoardState) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(newState)));
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      setBoardState(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      setBoardState(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        handleGroup();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'g') {
        e.preventDefault();
        handleUngroup();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        handleToggleLock();
      }
      if (e.key === 'Escape') {
        setBoardState(prev => ({ ...prev, selectedIds: [] }));
        setEditingTextId(null);
        setLaserMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, boardState.selectedIds]);

  const updateBoardState = useCallback((newState: BoardState) => {
    pushToHistory(newState);
    setBoardState(newState);
    lastSavedContentRef.current = JSON.stringify(newState);
    
    if (ydocRef.current) {
      const yText = ydocRef.current.getText('content');
      ydocRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, JSON.stringify(newState));
      });
    }
  }, [pushToHistory]);

  const snapValue = (value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(scale, scale);

    if (snapToGrid) {
      const gridSize = 20;
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1 / scale;
      
      const startX = Math.floor(-panOffset.x / scale / gridSize) * gridSize;
      const startY = Math.floor(-panOffset.y / scale / gridSize) * gridSize;
      const endX = startX + rect.width / scale + gridSize * 2;
      const endY = startY + rect.height / scale + gridSize * 2;

      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    boardState.elements.forEach(el => {
      const isSelected = boardState.selectedIds.includes(el.id);
      const opacity = el.opacity ?? 1;
      
      ctx.globalAlpha = opacity;
      ctx.fillStyle = el.color;
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#00000020';
      ctx.lineWidth = (isSelected ? 3 : toolOptions.strokeWidth) / scale;

      switch (el.type) {
        case 'rectangle':
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, el.width, el.height, 8 / scale);
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(
            el.x + el.width / 2,
            el.y + el.height / 2,
            el.width / 2,
            el.height / 2,
            0, 0, Math.PI * 2
          );
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(el.x + el.width / 2, el.y);
          ctx.lineTo(el.x + el.width, el.y + el.height / 2);
          ctx.lineTo(el.x + el.width / 2, el.y + el.height);
          ctx.lineTo(el.x, el.y + el.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 'line':
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + el.width, el.y + el.height);
          ctx.stroke();
          break;

        case 'star': {
          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;
          const outerRadius = Math.min(el.width, el.height) / 2;
          const innerRadius = outerRadius * 0.4;
          const points = 5;
          
          ctx.beginPath();
          for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }

        case 'heart': {
          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;
          const scaleX = el.width / 100;
          const scaleY = el.height / 100;
          
          ctx.beginPath();
          ctx.moveTo(cx, cy + 35 * scaleY);
          ctx.bezierCurveTo(cx - 50 * scaleX, cy, cx - 50 * scaleX, cy - 50 * scaleY, cx, cy - 20 * scaleY);
          ctx.bezierCurveTo(cx + 50 * scaleX, cy - 50 * scaleY, cx + 50 * scaleX, cy, cx, cy + 35 * scaleY);
          ctx.fill();
          ctx.stroke();
          break;
        }

        case 'polygon': {
          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;
          const radius = Math.min(el.width, el.height) / 2;
          const sides = el.sides || 6;
          
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
          
        case 'arrow':
          if (el.startPoint && el.endPoint) {
            const angle = Math.atan2(el.endPoint.y - el.startPoint.y, el.endPoint.x - el.startPoint.x);
            const headLength = 15 / scale;
            
            ctx.beginPath();
            ctx.moveTo(el.startPoint.x, el.startPoint.y);
            ctx.lineTo(el.endPoint.x, el.endPoint.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(el.endPoint.x, el.endPoint.y);
            ctx.lineTo(
              el.endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
              el.endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              el.endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
              el.endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;

        case 'connector': {
          if (el.startPoint && el.endPoint) {
            const angle = Math.atan2(el.endPoint.y - el.startPoint.y, el.endPoint.x - el.startPoint.x);
            const headLength = 12 / scale;
            const curveOffset = Math.min(50, Math.hypot(el.endPoint.x - el.startPoint.x, el.endPoint.y - el.startPoint.y) / 3);
            
            ctx.beginPath();
            ctx.moveTo(el.startPoint.x, el.startPoint.y);
            ctx.quadraticCurveTo(
              el.startPoint.x + curveOffset, el.startPoint.y,
              (el.startPoint.x + el.endPoint.x) / 2, (el.startPoint.y + el.endPoint.y) / 2
            );
            ctx.quadraticCurveTo(
              el.endPoint.x - curveOffset, el.endPoint.y,
              el.endPoint.x, el.endPoint.y
            );
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(el.endPoint.x, el.endPoint.y);
            ctx.lineTo(
              el.endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
              el.endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              el.endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
              el.endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
          
        case 'sticky':
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, el.width, el.height, 4 / scale);
          ctx.fill();
          ctx.strokeStyle = '#00000020';
          ctx.stroke();
          break;
          
        case 'text':
          if (el.content) {
            ctx.fillStyle = el.color;
            ctx.font = `${el.fontWeight || 'normal'} ${(el.fontSize || 16) / scale}px ${el.fontFamily || 'sans-serif'}`;
            ctx.textAlign = el.textAlign || 'left';
            ctx.textBaseline = 'top';
            const lines = el.content.split('\n');
            lines.forEach((line, i) => {
              ctx.fillText(line, el.x, el.y + (i * (el.fontSize || 16) * 1.2) / scale);
            });
          }
          break;

        case 'image':
          break;
          
        case 'pencil':
          if (el.points && el.points.length > 1) {
            ctx.strokeStyle = el.color;
            ctx.lineWidth = 3 / scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            el.points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
          }
          break;
      }

      ctx.globalAlpha = 1;

      if (isSelected && !el.locked) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([5 / scale, 5 / scale]);
        ctx.strokeRect(el.x - 4 / scale, el.y - 4 / scale, el.width + 8 / scale, el.height + 8 / scale);
        
        const handleSize = 8 / scale;
        const handles = [
          { x: el.x - handleSize / 2, y: el.y - handleSize / 2, cursor: 'nw-resize', pos: 'nw' },
          { x: el.x + el.width / 2 - handleSize / 2, y: el.y - handleSize / 2, cursor: 'n-resize', pos: 'n' },
          { x: el.x + el.width - handleSize / 2, y: el.y - handleSize / 2, cursor: 'ne-resize', pos: 'ne' },
          { x: el.x + el.width - handleSize / 2, y: el.y + el.height / 2 - handleSize / 2, cursor: 'e-resize', pos: 'e' },
          { x: el.x + el.width - handleSize / 2, y: el.y + el.height - handleSize / 2, cursor: 'se-resize', pos: 'se' },
          { x: el.x + el.width / 2 - handleSize / 2, y: el.y + el.height - handleSize / 2, cursor: 's-resize', pos: 's' },
          { x: el.x - handleSize / 2, y: el.y + el.height - handleSize / 2, cursor: 'sw-resize', pos: 'sw' },
          { x: el.x - handleSize / 2, y: el.y + el.height / 2 - handleSize / 2, cursor: 'w-resize', pos: 'w' },
        ];
        handles.forEach(h => {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1 / scale;
          ctx.setLineDash([]);
          ctx.fillRect(h.x, h.y, handleSize, handleSize);
          ctx.strokeRect(h.x, h.y, handleSize, handleSize);
        });
      }

      if (el.locked) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.strokeRect(el.x - 2 / scale, el.y - 2 / scale, el.width + 4 / scale, el.height + 4 / scale);
        ctx.setLineDash([]);
      }
    });

    if (laserMode && laserPoints.length > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      laserPoints.forEach((p, i) => {
        const screenX = p.x * scale + panOffset.x;
        const screenY = p.y * scale + panOffset.y;
        if (i === 0) ctx.moveTo(screenX, screenY);
        else ctx.lineTo(screenX, screenY);
      });
      ctx.stroke();
    }

    ctx.restore();
  }, [boardState, panOffset, scale, toolOptions.strokeWidth, snapToGrid, gridSize, laserMode, laserPoints]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const handleResize = () => drawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - panOffset.x) / scale,
      y: (e.clientY - rect.top - panOffset.y) / scale,
    };
  };

  const isPointInHandle = (x: number, y: number, handlePos: string): boolean => {
    const selectedElement = boardState.elements.find(el => boardState.selectedIds.includes(el.id));
    if (!selectedElement) return false;
    
    const handleSize = 12 / scale;
    const el = selectedElement;
    const handles: Record<string, { x: number; y: number }> = {
      nw: { x: el.x, y: el.y },
      n: { x: el.x + el.width / 2, y: el.y },
      ne: { x: el.x + el.width, y: el.y },
      e: { x: el.x + el.width, y: el.y + el.height / 2 },
      se: { x: el.x + el.width, y: el.y + el.height },
      s: { x: el.x + el.width / 2, y: el.y + el.height },
      sw: { x: el.x, y: el.y + el.height },
      w: { x: el.x, y: el.y + el.height / 2 },
    };
    
    const h = handles[handlePos];
    return Math.abs(x - h.x) < handleSize && Math.abs(y - h.y) < handleSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (laserMode) {
      const coords = getCanvasCoords(e);
      setLaserPoints([...laserPoints, { x: coords.x, y: coords.y, color: '#ef4444' }]);
      setIsDrawing(true);
      return;
    }

    if (e.button === 1 || (e.button === 0 && currentTool === 'hand')) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const coords = getCanvasCoords(e);

    if (currentTool === 'select') {
      for (const handlePos of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
        if (isPointInHandle(coords.x, coords.y, handlePos)) {
          setIsResizing(true);
          setResizeHandle(handlePos);
          setDragStart(coords);
          const selectedElement = boardState.elements.find(el => boardState.selectedIds.includes(el.id));
          if (selectedElement) {
            setElementStart({ x: selectedElement.x, y: selectedElement.y, width: selectedElement.width, height: selectedElement.height });
          }
          return;
        }
      }

      const clickedElement = [...boardState.elements].reverse().find(el => 
        coords.x >= el.x && coords.x <= el.x + el.width &&
        coords.y >= el.y && coords.y <= el.y + el.height
      );

      if (clickedElement) {
        if (clickedElement.locked) {
          return;
        }
        if (e.shiftKey) {
          setBoardState(prev => ({
            ...prev,
            selectedIds: prev.selectedIds.includes(clickedElement.id)
              ? prev.selectedIds.filter(id => id !== clickedElement.id)
              : [...prev.selectedIds, clickedElement.id]
          }));
        } else if (!boardState.selectedIds.includes(clickedElement.id)) {
          setBoardState(prev => ({ ...prev, selectedIds: [clickedElement.id] }));
        }
        setIsDragging(true);
        setDragStart(coords);
      } else {
        setBoardState(prev => ({ ...prev, selectedIds: [] }));
      }
    } else if (['rectangle', 'ellipse', 'diamond', 'sticky', 'star', 'heart', 'polygon'].includes(currentTool)) {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: currentTool as BoardElement['type'],
        x: snapValue(coords.x),
        y: snapValue(coords.y),
        width: 100,
        height: currentTool === 'diamond' || currentTool === 'star' || currentTool === 'heart' || currentTool === 'polygon' ? 100 : 80,
        color: currentTool === 'sticky' ? '#fef08a' : currentColor,
        opacity: toolOptions.opacity,
      };
      
      if (currentTool === 'polygon') {
        newElement.sides = 6;
      }
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id],
        groups: boardState.groups,
      });
      
      setIsDragging(true);
      setDragStart(coords);
    } else if (currentTool === 'line') {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: 'line',
        x: snapValue(coords.x),
        y: snapValue(coords.y),
        width: 0,
        height: 0,
        color: currentColor,
        opacity: toolOptions.opacity,
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id],
        groups: boardState.groups,
      });
      
      setIsDragging(true);
      setDragStart(coords);
    } else if (currentTool === 'arrow' || currentTool === 'connector') {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: currentTool,
        x: Math.min(coords.x, coords.x + 100),
        y: Math.min(coords.y, coords.y + 50),
        width: 100,
        height: 50,
        startPoint: coords,
        endPoint: coords,
        color: currentColor,
        opacity: toolOptions.opacity,
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id],
        groups: boardState.groups,
      });
      
      setIsDragging(true);
      setDragStart(coords);
    } else if (currentTool === 'text') {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: 'text',
        x: snapValue(coords.x),
        y: snapValue(coords.y),
        width: 200,
        height: 24,
        content: '',
        color: '#18181b',
        fontSize: toolOptions.fontSize,
        fontWeight: toolOptions.fontWeight,
        fontFamily: toolOptions.fontFamily,
        opacity: toolOptions.opacity,
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id],
        groups: boardState.groups,
      });
      
      setEditingTextId(newElement.id);
      setTextInput('');
    } else if (currentTool === 'image') {
      const url = prompt('Enter image URL:');
      if (url) {
        const newElement: BoardElement = {
          id: `el-${Date.now()}`,
          type: 'image',
          x: snapValue(coords.x),
          y: snapValue(coords.y),
          width: 200,
          height: 150,
          imageUrl: url,
          color: '#ffffff',
          opacity: toolOptions.opacity,
        };
        
        updateBoardState({
          elements: [...boardState.elements, newElement],
          selectedIds: [newElement.id],
          groups: boardState.groups,
        });
      }
    } else if (currentTool === 'pencil') {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: 'pencil',
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        points: [coords],
        color: currentColor,
        opacity: toolOptions.opacity,
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id],
        groups: boardState.groups,
      });
      
      setIsDrawing(true);
    } else if (currentTool === 'eraser') {
      const elementToDelete = boardState.elements.find(el => 
        !el.locked && coords.x >= el.x && coords.x <= el.x + el.width &&
        coords.y >= el.y && coords.y <= el.y + el.height
      );
      
      if (elementToDelete) {
        updateBoardState({
          elements: boardState.elements.filter(el => el.id !== elementToDelete.id),
          selectedIds: boardState.selectedIds.filter(id => id !== elementToDelete.id),
          groups: boardState.groups,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (laserMode && isDrawing) {
      const coords = getCanvasCoords(e);
      setLaserPoints(prev => [...prev, { x: coords.x, y: coords.y, color: '#ef4444' }]);
      return;
    }

    if (isPanning && dragStart) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (!isDragging && !isDrawing && !isResizing) return;

    const coords = getCanvasCoords(e);

    if (isDrawing && currentTool === 'pencil') {
      const activeId = boardState.selectedIds[boardState.selectedIds.length - 1];
      if (activeId) {
        updateBoardState({
          ...boardState,
          elements: boardState.elements.map(el => 
            el.id === activeId && el.points
              ? { ...el, points: [...el.points, coords] }
              : el
          )
        });
      }
      return;
    }

    if (!dragStart) return;

    if (isResizing && elementStart && resizeHandle) {
      const dx = coords.x - dragStart.x;
      const dy = coords.y - dragStart.y;
      const el = boardState.elements.find(e => boardState.selectedIds.includes(e.id));
      if (!el) return;

      let newX = el.x;
      let newY = el.y;
      let newWidth = el.width;
      let newHeight = el.height;

      switch (resizeHandle) {
        case 'nw':
          newX = elementStart.x + dx;
          newY = elementStart.y + dy;
          newWidth = elementStart.width - dx;
          newHeight = elementStart.height - dy;
          break;
        case 'n':
          newY = elementStart.y + dy;
          newHeight = elementStart.height - dy;
          break;
        case 'ne':
          newY = elementStart.y + dy;
          newWidth = elementStart.width + dx;
          newHeight = elementStart.height - dy;
          break;
        case 'e':
          newWidth = elementStart.width + dx;
          break;
        case 'se':
          newWidth = elementStart.width + dx;
          newHeight = elementStart.height + dy;
          break;
        case 's':
          newHeight = elementStart.height + dy;
          break;
        case 'sw':
          newX = elementStart.x + dx;
          newWidth = elementStart.width - dx;
          newHeight = elementStart.height + dy;
          break;
        case 'w':
          newX = elementStart.x + dx;
          newWidth = elementStart.width - dx;
          break;
      }

      if (newWidth > 10 && newHeight > 10) {
        updateBoardState({
          ...boardState,
          elements: boardState.elements.map(e => 
            e.id === el.id 
              ? { ...e, x: snapValue(newX), y: snapValue(newY), width: snapValue(newWidth), height: snapValue(newHeight) }
              : e
          )
        });
      }
      return;
    }

    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    if (currentTool === 'arrow' || currentTool === 'connector') {
      const activeId = boardState.selectedIds[boardState.selectedIds.length - 1];
      if (activeId) {
        updateBoardState({
          ...boardState,
          elements: boardState.elements.map(el => {
            if (el.id !== activeId) return el;
            return {
              ...el,
              endPoint: coords,
              width: Math.abs(coords.x - (el.startPoint?.x || 0)),
              height: Math.abs(coords.y - (el.startPoint?.y || 0)),
            };
          })
        });
      }
    } else if (currentTool === 'line') {
      const activeId = boardState.selectedIds[boardState.selectedIds.length - 1];
      if (activeId) {
        updateBoardState({
          ...boardState,
          elements: boardState.elements.map(el => {
            if (el.id !== activeId) return el;
            return {
              ...el,
              width: coords.x - dragStart.x,
              height: coords.y - dragStart.y,
            };
          })
        });
      }
    } else {
      const selectedElements = boardState.elements.filter(el => boardState.selectedIds.includes(el.id) && !el.locked);
      if (selectedElements.length > 0) {
        updateBoardState({
          ...boardState,
          elements: boardState.elements.map(el => {
            if (!boardState.selectedIds.includes(el.id) || el.locked) return el;
            return {
              ...el,
              x: snapValue(el.x + dx),
              y: snapValue(el.y + dy),
            };
          })
        });
        setDragStart(coords);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
    setIsDrawing(false);
    setIsResizing(false);
    setDragStart(null);
    setElementStart(null);
    setResizeHandle(null);

    if (laserMode) {
      if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
      laserTimeoutRef.current = setTimeout(() => setLaserPoints([]), 2000);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * delta, 0.1), 5);
      setScale(newScale);
    } else {
      setPanOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const element = boardState.elements.find(el => 
      coords.x >= el.x && coords.x <= el.x + el.width &&
      coords.y >= el.y && coords.y <= el.y + el.height
    );
    
    setContextMenu({ 
      x: e.clientX, 
      y: e.clientY, 
      elementId: element?.id 
    });
  };

  const handleCopy = () => {
    const selectedElements = boardState.elements.filter(el => boardState.selectedIds.includes(el.id));
    setClipboard([...selectedElements]);
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;
    
    const newElements = clipboard.map(el => ({
      ...el,
      id: `el-${Date.now()}-${Math.random()}`,
      x: el.x + 20,
      y: el.y + 20,
    }));
    
    updateBoardState({
      ...boardState,
      elements: [...boardState.elements, ...newElements],
      selectedIds: newElements.map(el => el.id),
    });
  };

  const handleDuplicate = () => {
    handleCopy();
    handlePaste();
  };

  const handleGroup = () => {
    if (boardState.selectedIds.length < 2) return;
    
    const groupId = `group-${Date.now()}`;
    const newGroup = { id: groupId, elementIds: [...boardState.selectedIds] };
    
    updateBoardState({
      ...boardState,
      elements: boardState.elements.map(el => 
        boardState.selectedIds.includes(el.id)
          ? { ...el, groupId }
          : el
      ),
      groups: [...boardState.groups, newGroup],
      selectedIds: [],
    });
  };

  const handleUngroup = () => {
    const selectedElement = boardState.elements.find(el => boardState.selectedIds.includes(el.id));
    if (!selectedElement?.groupId) return;
    
    updateBoardState({
      ...boardState,
      elements: boardState.elements.map(el => 
        el.groupId === selectedElement.groupId
          ? { ...el, groupId: undefined }
          : el
      ),
      groups: boardState.groups.filter(g => g.id !== selectedElement.groupId),
    });
  };

  const handleToggleLock = () => {
    updateBoardState({
      ...boardState,
      elements: boardState.elements.map(el => 
        boardState.selectedIds.includes(el.id)
          ? { ...el, locked: !el.locked }
          : el
      ),
    });
  };

  const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const selectedElements = boardState.elements.filter(el => boardState.selectedIds.includes(el.id) && !el.locked);
    if (selectedElements.length < 2) return;

    let newElements = [...boardState.elements];
    
    if (alignment === 'left') {
      const minX = Math.min(...selectedElements.map(el => el.x));
      newElements = newElements.map(el => 
        boardState.selectedIds.includes(el.id) ? { ...el, x: minX } : el
      );
    } else if (alignment === 'center') {
      const centerX = selectedElements.reduce((sum, el) => sum + el.x + el.width / 2, 0) / selectedElements.length;
      newElements = newElements.map(el => 
        boardState.selectedIds.includes(el.id) ? { ...el, x: centerX - el.width / 2 } : el
      );
    } else if (alignment === 'right') {
      const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
      newElements = newElements.map(el => 
        boardState.selectedIds.includes(el.id) ? { ...el, x: maxX - el.width } : el
      );
    } else if (alignment === 'top') {
      const minY = Math.min(...selectedElements.map(el => el.y));
      newElements = newElements.map(el => 
        boardState.selectedIds.includes(el.id) ? { ...el, y: minY } : el
      );
    } else if (alignment === 'middle') {
      const centerY = selectedElements.reduce((sum, el) => sum + el.y + el.height / 2, 0) / selectedElements.length;
      newElements = newElements.map(el => 
        boardState.selectedIds.includes(el.id) ? { ...el, y: centerY - el.height / 2 } : el
      );
    } else if (alignment === 'bottom') {
      const maxY = Math.max(...selectedElements.map(el => el.y + el.height));
      newElements = newElements.map(el => 
        boardState.selectedIds.includes(el.id) ? { ...el, y: maxY - el.height } : el
      );
    }
    
    updateBoardState({ ...boardState, elements: newElements });
  };

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;

    if (action === 'delete') {
      if (contextMenu.elementId) {
        updateBoardState({
          elements: boardState.elements.filter(el => el.id !== contextMenu.elementId),
          selectedIds: boardState.selectedIds.filter(id => id !== contextMenu.elementId),
          groups: boardState.groups,
        });
      } else {
        updateBoardState({
          elements: boardState.elements.filter(el => !boardState.selectedIds.includes(el.id)),
          selectedIds: [],
          groups: boardState.groups,
        });
      }
    } else if (action === 'duplicate') {
      handleDuplicate();
    } else if (action === 'bringToFront') {
      const el = boardState.elements.find(e => e.id === contextMenu.elementId);
      if (el) {
        updateBoardState({
          elements: [...boardState.elements.filter(e => e.id !== el.id), el],
          selectedIds: boardState.selectedIds,
          groups: boardState.groups,
        });
      }
    } else if (action === 'sendToBack') {
      const el = boardState.elements.find(e => e.id === contextMenu.elementId);
      if (el) {
        updateBoardState({
          elements: [el, ...boardState.elements.filter(e => e.id !== el.id)],
          selectedIds: boardState.selectedIds,
          groups: boardState.groups,
        });
      }
    } else if (action === 'lock') {
      updateBoardState({
        ...boardState,
        elements: boardState.elements.map(el => 
          el.id === contextMenu.elementId ? { ...el, locked: !el.locked } : el
        ),
      });
    } else if (action.startsWith('fontSize-')) {
      const size = parseInt(action.split('-')[1]);
      updateBoardState({
        ...boardState,
        elements: boardState.elements.map(el => 
          el.id === contextMenu.elementId ? { ...el, fontSize: size } : el
        ),
      });
    }

    setContextMenu(null);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (page && title !== page.title) {
      onUpdatePage({ title });
    }
  };

  const handleTextSubmit = () => {
    if (!editingTextId) return;
    
    updateBoardState({
      ...boardState,
      elements: boardState.elements.map(el =>
        el.id === editingTextId ? { ...el, content: textInput } : el
      )
    });
    setEditingTextId(null);
    setTextInput('');
  };

  const handleTextToolbarAction = (action: string) => {
    const selectedElement = boardState.elements.find(el => boardState.selectedIds.includes(el.id));
    if (!selectedElement) return;

    let newEl = { ...selectedElement };
    
    switch (action) {
      case 'bold':
        newEl.fontWeight = newEl.fontWeight === 'bold' ? 'normal' : 'bold';
        break;
      case 'italic':
        newEl.fontStyle = newEl.fontStyle === 'italic' ? 'normal' : 'italic';
        break;
      case 'align-left':
        newEl.textAlign = 'left';
        break;
      case 'align-center':
        newEl.textAlign = 'center';
        break;
      case 'align-right':
        newEl.textAlign = 'right';
        break;
      default:
        if (action.startsWith('fontSize-')) {
          newEl.fontSize = parseInt(action.split('-')[1]);
        }
    }

    updateBoardState({
      ...boardState,
      elements: boardState.elements.map(el => el.id === selectedElement.id ? newEl : el),
    });
  };

  const handleSave = async () => {
    if (!ydocRef.current) return;
    setSaving(true);
    try {
      const update = Y.encodeStateAsUpdate(ydocRef.current);
      await onSaveContent(update);
    } finally {
      setSaving(false);
    }
  };

  const tools: { id: Tool; icon: string; label: string; shortcut?: string }[] = [
    { id: 'select', icon: '↖', label: 'Select', shortcut: 'V' },
    { id: 'hand', icon: '✋', label: 'Pan', shortcut: 'H' },
    { id: 'rectangle', icon: '▢', label: 'Rectangle', shortcut: 'R' },
    { id: 'ellipse', icon: '◯', label: 'Ellipse', shortcut: 'O' },
    { id: 'diamond', icon: '◇', label: 'Diamond', shortcut: 'D' },
    { id: 'line', icon: '╱', label: 'Line', shortcut: 'L' },
    { id: 'arrow', icon: '→', label: 'Arrow', shortcut: 'A' },
    { id: 'connector', icon: '⌇', label: 'Connector', shortcut: 'C' },
    { id: 'text', icon: 'T', label: 'Text', shortcut: 'T' },
    { id: 'sticky', icon: '📝', label: 'Sticky', shortcut: 'S' },
    { id: 'star', icon: '★', label: 'Star', shortcut: 'K' },
    { id: 'heart', icon: '♥', label: 'Heart', shortcut: 'U' },
    { id: 'polygon', icon: '⬡', label: 'Polygon', shortcut: 'G' },
    { id: 'image', icon: '🖼', label: 'Image', shortcut: 'I' },
    { id: 'pencil', icon: '✏', label: 'Pencil', shortcut: 'P' },
    { id: 'eraser', icon: '⌫', label: 'Eraser', shortcut: 'E' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key.toLowerCase();
      const tool = tools.find(t => t.shortcut?.toLowerCase() === key);
      if (tool) {
        setCurrentTool(tool.id);
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && boardState.selectedIds.length > 0) {
        updateBoardState({
          elements: boardState.elements.filter(el => !boardState.selectedIds.includes(el.id) || el.locked),
          selectedIds: [],
          groups: boardState.groups,
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardState.selectedIds, editingTextId, updateBoardState]);

  useEffect(() => {
    const selectedElement = boardState.elements.find(el => boardState.selectedIds.includes(el.id));
    setShowTextToolbar(selectedElement?.type === 'text');
  }, [boardState.selectedIds, boardState.elements]);

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Select a page to start editing
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-12 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <button className="text-2xl hover:bg-hover p-1 rounded">
            {page.icon || '🎨'}
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Untitled Board"
            className="text-2xl font-semibold bg-transparent border-none outline-none text-text-primary w-full"
          />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          
          <span className="px-2 py-1 bg-surface rounded text-xs">
            🎨 Board
          </span>

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-1 rounded text-xs ${snapToGrid ? 'bg-primary text-white' : 'hover:bg-hover'}`}
            title="Snap to Grid"
          >
            ⊞ {snapToGrid ? 'On' : 'Off'}
          </button>

          <button
            onClick={() => setLaserMode(!laserMode)}
            className={`px-2 py-1 rounded text-xs ${laserMode ? 'bg-red-500 text-white' : 'hover:bg-hover'}`}
            title="Laser Mode"
          >
            🔴 Laser
          </button>

          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="px-2 py-1 rounded text-xs hover:bg-hover"
            title="Keyboard Shortcuts"
          >
            ⌨️
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setScale(s => Math.max(s * 0.8, 0.1))}
              className="px-2 py-1 hover:bg-hover rounded text-xs"
            >
              -
            </button>
            <input
              type="range"
              min="10"
              max="200"
              value={Math.round(scale * 100)}
              onChange={(e) => setScale(Number(e.target.value) / 100)}
              className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(s * 1.2, 5))}
              className="px-2 py-1 hover:bg-hover rounded text-xs"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              className="px-2 py-1 hover:bg-hover rounded text-xs"
              title="Undo (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              onClick={redo}
              className="px-2 py-1 hover:bg-hover rounded text-xs"
              title="Redo (Ctrl+Shift+Z)"
            >
              ↪
            </button>
          </div>
          
          {saving && <span> - Saving...</span>}
          <button 
            onClick={handleSave}
            className="px-3 py-1 bg-primary text-white rounded text-xs hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: laserMode ? 'crosshair' : currentTool === 'hand' ? 'grab' : currentTool === 'select' ? 'default' : 'crosshair' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
        />

        {boardState.elements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-lg font-medium text-text-secondary mb-2">Начните рисовать...</p>
            <p className="text-sm text-text-secondary">Перетащите фигуры из панели инструментов</p>
          </div>
        )}
        
        {editingTextId && (
          <input
            autoFocus
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            className="absolute bg-transparent border-none outline-none"
            style={{
              left: 0,
              top: 0,
              transform: `translate(${boardState.elements.find(e => e.id === editingTextId)?.x || 0}px, ${boardState.elements.find(e => e.id === editingTextId)?.y || 0}px) scale(${scale})`,
              transformOrigin: 'top left',
              fontSize: (boardState.elements.find(e => e.id === editingTextId)?.fontSize || 16) + 'px',
              fontWeight: boardState.elements.find(e => e.id === editingTextId)?.fontWeight || 'normal',
              fontFamily: boardState.elements.find(e => e.id === editingTextId)?.fontFamily || 'sans-serif',
            }}
          />
        )}

        {showTextToolbar && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-border px-2 py-2 flex items-center gap-1 z-50">
            <button
              onClick={() => handleTextToolbarAction('bold')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover font-bold"
            >
              B
            </button>
            <button
              onClick={() => handleTextToolbarAction('italic')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover italic"
            >
              I
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={() => handleTextToolbarAction('align-left')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover"
            >
              ≡
            </button>
            <button
              onClick={() => handleTextToolbarAction('align-center')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover"
            >
              ☰
            </button>
            <button
              onClick={() => handleTextToolbarAction('align-right')}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover"
            >
              ➜
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            <select
              className="px-2 py-1 text-xs border border-border rounded"
              value={boardState.elements.find(el => boardState.selectedIds.includes(el.id))?.fontSize || 16}
              onChange={(e) => handleTextToolbarAction(`fontSize-${e.target.value}`)}
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>
          </div>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-border px-2 py-2 flex items-center gap-1">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                currentTool === tool.id 
                  ? 'bg-primary text-white' 
                  : 'hover:bg-hover text-text-secondary'
              }`}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            >
              {tool.icon}
            </button>
          ))}
          
          <div className="w-px h-8 bg-border mx-1" />

          {boardState.selectedIds.length > 1 && (
            <>
              <button
                onClick={handleGroup}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover text-text-secondary"
                title="Group (Ctrl+G)"
              >
                ⊞
              </button>
              <button
                onClick={handleUngroup}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover text-text-secondary"
                title="Ungroup (Ctrl+Shift+G)"
              >
                ⧉
              </button>
              <div className="w-px h-8 bg-border mx-1" />
            </>
          )}

          {boardState.selectedIds.length > 0 && (
            <>
              <button
                onClick={handleCopy}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover text-text-secondary"
                title="Copy (Ctrl+C)"
              >
                📋
              </button>
              <button
                onClick={handlePaste}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover text-text-secondary"
                title="Paste (Ctrl+V)"
              >
                📄
              </button>
              <button
                onClick={handleDuplicate}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover text-text-secondary"
                title="Duplicate (Ctrl+D)"
              >
                ⧉
              </button>
              <button
                onClick={handleToggleLock}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover text-text-secondary"
                title="Lock/Unlock (Ctrl+L)"
              >
                {boardState.elements.find(el => boardState.selectedIds.includes(el.id))?.locked ? '🔓' : '🔒'}
              </button>
              <div className="w-px h-8 bg-border mx-1" />
            </>
          )}

          {boardState.selectedIds.length > 1 && (
            <div className="flex items-center gap-1 relative group">
              <button
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hover text-text-secondary"
                title="Align"
              >
                ⊜
              </button>
              <div className="absolute bottom-full mb-2 left-0 hidden group-hover:flex bg-white rounded-lg shadow-lg border border-border p-1">
                <button onClick={() => handleAlign('left')} className="w-8 h-8 flex items-center justify-center hover:bg-hover rounded" title="Align Left">⬅</button>
                <button onClick={() => handleAlign('center')} className="w-8 h-8 flex items-center justify-center hover:bg-hover rounded" title="Align Center">⬌</button>
                <button onClick={() => handleAlign('right')} className="w-8 h-8 flex items-center justify-center hover:bg-hover rounded" title="Align Right">➡</button>
                <button onClick={() => handleAlign('top')} className="w-8 h-8 flex items-center justify-center hover:bg-hover rounded" title="Align Top">⬆</button>
                <button onClick={() => handleAlign('middle')} className="w-8 h-8 flex items-center justify-center hover:bg-hover rounded" title="Align Middle">⬍</button>
                <button onClick={() => handleAlign('bottom')} className="w-8 h-8 flex items-center justify-center hover:bg-hover rounded" title="Align Bottom">⬇</button>
              </div>
            </div>
          )}
          
          <div className="w-px h-8 bg-border mx-1" />
          
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm ${
                showColorPicker ? 'border-primary' : 'border-transparent hover:bg-hover'
              }`}
              style={{ backgroundColor: currentColor }}
              title="Color"
            >
              🎨
            </button>
            {COLORS.slice(0, 5).map(color => (
              <button
                key={color}
                onClick={() => {
                  setCurrentColor(color);
                  if (boardState.selectedIds.length > 0) {
                    updateBoardState({
                      ...boardState,
                      elements: boardState.elements.map(el => 
                        boardState.selectedIds.includes(el.id) ? { ...el, color } : el
                      ),
                    });
                  }
                }}
                className={`w-6 h-6 rounded-full border-2 ${
                  currentColor === color ? 'border-primary' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            {showColorPicker && (
              <div className="absolute bottom-full mb-2 left-0 z-50">
                <div 
                  className="fixed inset-0" 
                  onClick={() => setShowColorPicker(false)} 
                />
                <div className="relative bg-white rounded-lg shadow-xl p-3 border">
                  <HexColorPicker 
                    color={currentColor} 
                    onChange={setCurrentColor}
                    style={{ width: '180px', height: '150px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {showKeyboardHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardHelp(false)}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">V</kbd> Select</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">H</kbd> Pan</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">R</kbd> Rectangle</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">O</kbd> Ellipse</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">D</kbd> Diamond</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">L</kbd> Line</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">A</kbd> Arrow</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">C</kbd> Connector</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">T</kbd> Text</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">S</kbd> Sticky</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">K</kbd> Star</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">U</kbd> Heart</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">G</kbd> Polygon</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">I</kbd> Image</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">P</kbd> Pencil</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">E</kbd> Eraser</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+C</kbd> Copy</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+V</kbd> Paste</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+D</kbd> Duplicate</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+G</kbd> Group</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+L</kbd> Lock</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">Del</kbd> Delete</div>
                <div><kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> Deselect</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2"
            onClick={() => handleContextAction('duplicate')}
          >
            📋 Duplicate
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2"
            onClick={handleCopy}
          >
            📄 Copy
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2"
            onClick={handlePaste}
          >
            📥 Paste
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2"
            onClick={() => handleContextAction('lock')}
          >
            {boardState.elements.find(e => e.id === contextMenu.elementId)?.locked ? '🔓 Unlock' : '🔒 Lock'}
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2"
            onClick={() => handleContextAction('bringToFront')}
          >
            ⬆️ Bring to Front
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2"
            onClick={() => handleContextAction('sendToBack')}
          >
            ⬇️ Send to Back
          </button>
          <div className="h-px bg-border my-1" />
          <div className="px-3 py-1 text-xs text-text-secondary">Font Size</div>
          {FONT_SIZES.map(size => (
            <button
              key={size}
              className="w-full px-4 py-1 text-sm text-left hover:bg-hover"
              onClick={() => handleContextAction(`fontSize-${size}`)}
            >
              {size}px
            </button>
          ))}
          <div className="h-px bg-border my-1" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2 text-red-500"
            onClick={() => handleContextAction('delete')}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
