import { useState } from 'react';

interface BoardElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
  locked?: boolean;
}

interface LayersPanelProps {
  elements: BoardElement[];
  selectedIds: string[];
  onSelect: (id: string, multi?: boolean) => void;
  onReorder: (elements: BoardElement[]) => void;
  onToggleLock: (id: string) => void;
  onClose: () => void;
}

export function LayersPanel({ elements, selectedIds, onSelect, onReorder, onToggleLock, onClose }: LayersPanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(true);

  const sortedElements = [...elements].reverse();
  const filteredElements = showLocked 
    ? sortedElements 
    : sortedElements.filter(el => !el.locked);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rectangle': return '▢';
      case 'ellipse': return '◯';
      case 'text': return 'T';
      case 'sticky': return '📝';
      case 'arrow': return '→';
      case 'connector': return '⌇';
      case 'pencil': return '✏';
      case 'image': return '🖼';
      default: return '▢';
    }
  };

  const getElementName = (el: BoardElement) => {
    if (el.content) {
      return el.content.substring(0, 20) + (el.content.length > 20 ? '...' : '');
    }
    return `${el.type} ${el.id.slice(0, 4)}`;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = elements.findIndex(el => el.id === draggedId);
    const targetIndex = elements.findIndex(el => el.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newElements = [...elements];
    const [dragged] = newElements.splice(draggedIndex, 1);
    newElements.splice(targetIndex, 0, dragged);

    onReorder(newElements.reverse());
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="fixed right-0 top-14 bottom-0 w-64 bg-surface border-l border-border flex flex-col z-40">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-medium">Layers</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLocked(!showLocked)}
            className={`text-xs px-2 py-1 rounded ${showLocked ? 'bg-primary text-white' : 'hover:bg-hover'}`}
          >
            {showLocked ? 'All' : 'Active'}
          </button>
          <button onClick={onClose} className="text-text-secondary hover:text-text">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {filteredElements.length === 0 ? (
          <div className="text-center text-text-secondary py-8 text-sm">
            No elements
          </div>
        ) : (
          filteredElements.map((el) => (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => handleDragStart(e, el.id)}
              onDragOver={(e) => handleDragOver(e, el.id)}
              onDragEnd={handleDragEnd}
              onClick={(e) => onSelect(el.id, e.shiftKey)}
              className={`px-3 py-2 flex items-center gap-2 cursor-pointer group ${
                selectedIds.includes(el.id) ? 'bg-hover' : 'hover:bg-hover'
              } ${draggedId === el.id ? 'opacity-50' : ''}`}
            >
              <span className="text-text-secondary text-sm cursor-grab" title="Drag to reorder">⋮⋮</span>
              <span 
                className="w-6 h-6 rounded flex items-center justify-center text-xs"
                style={{ backgroundColor: el.color }}
              >
                {getTypeIcon(el.type)}
              </span>
              <span className={`flex-1 text-sm truncate ${el.locked ? 'text-text-secondary' : ''}`}>
                {getElementName(el)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(el.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text"
                title={el.locked ? 'Unlock' : 'Lock'}
              >
                {el.locked ? '🔒' : '🔓'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-border text-xs text-text-secondary">
        {elements.length} elements
        {elements.filter(e => e.locked).length > 0 && ` • ${elements.filter(e => e.locked).length} locked`}
      </div>
    </div>
  );
}
