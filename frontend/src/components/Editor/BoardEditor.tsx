import { useEffect, useRef, useState, useCallback } from 'react';
import { PageWithContent } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import * as Y from 'yjs';

interface BoardEditorProps {
  page: PageWithContent | null;
  onSaveContent: (content: Uint8Array) => void;
  onUpdatePage: (data: { title?: string; icon?: string }) => void;
}

type Tool = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'text' | 'sticky' | 'pencil' | 'eraser';

interface BoardElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'text' | 'sticky' | 'pencil';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}

interface BoardState {
  elements: BoardElement[];
  selectedIds: string[];
}

const COLORS = [
  '#ffffff', '#fff1f2', '#fff7ed', '#fefce8', '#f0fdf4', 
  '#f0f9ff', '#f5f3ff', '#fdf2f8', '#fafafa', '#18181b'
];

export function BoardEditor({ page, onSaveContent, onUpdatePage }: BoardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  
  const [title, setTitle] = useState('');
  const [boardState, setBoardState] = useState<BoardState>({ elements: [], selectedIds: [] });
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId?: string } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  
  const lastSavedContentRef = useRef<string>('');

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

  const updateBoardState = useCallback((newState: BoardState) => {
    setBoardState(newState);
    lastSavedContentRef.current = JSON.stringify(newState);
    
    if (ydocRef.current) {
      const yText = ydocRef.current.getText('content');
      ydocRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, JSON.stringify(newState));
      });
    }
  }, []);

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

    boardState.elements.forEach(el => {
      const isSelected = boardState.selectedIds.includes(el.id);
      
      ctx.fillStyle = el.color;
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#00000020';
      ctx.lineWidth = isSelected ? 2 / scale : 1 / scale;

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
          
        case 'sticky':
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, el.width, el.height, 4 / scale);
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'text':
          if (el.content) {
            ctx.fillStyle = '#18181b';
            ctx.font = `${16 / scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
            ctx.fillText(el.content, el.x, el.y + 16 / scale);
          }
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

      if (isSelected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([5 / scale, 5 / scale]);
        ctx.strokeRect(el.x - 4 / scale, el.y - 4 / scale, el.width + 8 / scale, el.height + 8 / scale);
        ctx.setLineDash([]);
      }
    });

    ctx.restore();
  }, [boardState, panOffset, scale]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && currentTool === 'hand')) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const coords = getCanvasCoords(e);

    if (currentTool === 'select') {
      const clickedElement = [...boardState.elements].reverse().find(el => 
        coords.x >= el.x && coords.x <= el.x + el.width &&
        coords.y >= el.y && coords.y <= el.y + el.height
      );

      if (clickedElement) {
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
    } else if (['rectangle', 'ellipse', 'diamond', 'sticky'].includes(currentTool)) {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: currentTool === 'sticky' ? 'sticky' : currentTool as 'rectangle' | 'ellipse' | 'diamond',
        x: coords.x,
        y: coords.y,
        width: 100,
        height: currentTool === 'diamond' ? 100 : 80,
        color: currentTool === 'sticky' ? '#fef08a' : currentColor,
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id]
      });
      
      setIsDragging(true);
      setDragStart(coords);
    } else if (currentTool === 'arrow') {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: 'arrow',
        x: Math.min(coords.x, coords.x + 100),
        y: Math.min(coords.y, coords.y + 50),
        width: 100,
        height: 50,
        startPoint: coords,
        endPoint: coords,
        color: currentColor,
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id]
      });
      
      setIsDragging(true);
      setDragStart(coords);
    } else if (currentTool === 'text') {
      const newElement: BoardElement = {
        id: `el-${Date.now()}`,
        type: 'text',
        x: coords.x,
        y: coords.y,
        width: 200,
        height: 24,
        content: '',
        color: '#18181b',
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id]
      });
      
      setEditingTextId(newElement.id);
      setTextInput('');
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
      };
      
      updateBoardState({
        elements: [...boardState.elements, newElement],
        selectedIds: [newElement.id]
      });
      
      setIsDrawing(true);
    } else if (currentTool === 'eraser') {
      const elementToDelete = boardState.elements.find(el => 
        coords.x >= el.x && coords.x <= el.x + el.width &&
        coords.y >= el.y && coords.y <= el.y + el.height
      );
      
      if (elementToDelete) {
        updateBoardState({
          elements: boardState.elements.filter(el => el.id !== elementToDelete.id),
          selectedIds: boardState.selectedIds.filter(id => id !== elementToDelete.id)
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && dragStart) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (!isDragging && !isDrawing) return;

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

    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    if (currentTool === 'arrow') {
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
    } else {
      updateBoardState({
        ...boardState,
        elements: boardState.elements.map(el => {
          if (!boardState.selectedIds.includes(el.id)) return el;
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
          };
        })
      });
      setDragStart(coords);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
    setIsDrawing(false);
    setDragStart(null);
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

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;

    if (action === 'delete') {
      if (contextMenu.elementId) {
        updateBoardState({
          elements: boardState.elements.filter(el => el.id !== contextMenu.elementId),
          selectedIds: boardState.selectedIds.filter(id => id !== contextMenu.elementId)
        });
      } else {
        updateBoardState({
          elements: boardState.elements.filter(el => !boardState.selectedIds.includes(el.id)),
          selectedIds: []
        });
      }
    } else if (action === 'duplicate') {
      const toDuplicate = contextMenu.elementId
        ? boardState.elements.filter(el => el.id === contextMenu.elementId)
        : boardState.elements.filter(el => boardState.selectedIds.includes(el.id));
      
      const duplicates = toDuplicate.map(el => ({
        ...el,
        id: `el-${Date.now()}-${Math.random()}`,
        x: el.x + 20,
        y: el.y + 20,
      }));
      
      updateBoardState({
        elements: [...boardState.elements, ...duplicates],
        selectedIds: duplicates.map(el => el.id)
      });
    } else if (action === 'bringToFront') {
      const el = boardState.elements.find(e => e.id === contextMenu.elementId);
      if (el) {
        updateBoardState({
          elements: [...boardState.elements.filter(e => e.id !== el.id), el],
          selectedIds: boardState.selectedIds
        });
      }
    } else if (action === 'sendToBack') {
      const el = boardState.elements.find(e => e.id === contextMenu.elementId);
      if (el) {
        updateBoardState({
          elements: [el, ...boardState.elements.filter(e => e.id !== el.id)],
          selectedIds: boardState.selectedIds
        });
      }
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
    { id: 'arrow', icon: '→', label: 'Arrow', shortcut: 'A' },
    { id: 'text', icon: 'T', label: 'Text', shortcut: 'T' },
    { id: 'sticky', icon: '📝', label: 'Sticky', shortcut: 'S' },
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
          elements: boardState.elements.filter(el => !boardState.selectedIds.includes(el.id)),
          selectedIds: []
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardState.selectedIds, editingTextId, updateBoardState]);

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

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setScale(s => Math.min(s * 1.2, 5))}
              className="px-2 py-1 hover:bg-hover rounded"
            >
              +
            </button>
            <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.max(s * 0.8, 0.1))}
              className="px-2 py-1 hover:bg-hover rounded"
            >
              -
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
        className="flex-1 relative overflow-hidden cursor-crosshair"
        style={{ cursor: currentTool === 'hand' ? 'grab' : currentTool === 'select' ? 'default' : 'crosshair' }}
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
              left: boardState.elements.find(e => e.id === editingTextId)?.x || 0,
              top: boardState.elements.find(e => e.id === editingTextId)?.y || 0,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
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
          
          <div className="flex items-center gap-1">
            {COLORS.slice(0, 5).map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-6 h-6 rounded-full border-2 ${
                  currentColor === color ? 'border-primary' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {contextMenu && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover"
            onClick={() => handleContextAction('duplicate')}
          >
            📋 Duplicate
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover"
            onClick={() => handleContextAction('delete')}
          >
            🗑️ Delete
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover"
            onClick={() => handleContextAction('bringToFront')}
          >
            ⬆️ Bring to Front
          </button>
          <button
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover"
            onClick={() => handleContextAction('sendToBack')}
          >
            ⬇️ Send to Back
          </button>
        </div>
      )}
    </div>
  );
}
