import { useState, useRef } from 'react';
import { useS3Upload } from '../../hooks/useS3Upload';

interface Block {
  id: string;
  type: string;
  content: string;
  properties?: {
    width?: number;
    align?: 'left' | 'center' | 'right';
  };
}

interface ImageBlockProps {
  block: Block;
  onUpdate: (content: string) => void;
  workspaceId?: string;
  pageId: string;
}

export function ImageBlock({ block, onUpdate, workspaceId, pageId }: ImageBlockProps) {
  const { upload, uploading } = useS3Upload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showSizeInput, setShowSizeInput] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  
  const imageProps = block.properties || {};
  const [width, setWidth] = useState(imageProps.width || 400);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>(imageProps.align || 'center');

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    const result = await upload(file, pageId, workspaceId);
    if (result) {
      onUpdate(result.url);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/') || !workspaceId) return;

    const result = await upload(file, pageId, workspaceId);
    if (result) {
      onUpdate(result.url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleResizeStart = (e: React.MouseEvent, _direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(100, Math.min(1200, startWidth + delta));
      setWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleApplySize = () => {
    const newWidth = parseInt(sizeInput);
    if (newWidth > 0 && newWidth <= 2000) {
      setWidth(newWidth);
    }
    setShowSizeInput(false);
    setSizeInput('');
  };

  const handleAlignChange = (newAlign: 'left' | 'center' | 'right') => {
    setAlign(newAlign);
  };

  const imageUrl = block.content;

  if (imageUrl) {
    return (
      <div className="flex-1 group">
        <div 
          className="relative inline-block"
          style={{ 
            width: `${width}px`,
            maxWidth: '100%',
            marginLeft: align === 'left' ? '0' : align === 'right' ? 'auto' : 'auto',
            marginRight: align === 'right' ? '0' : 'auto',
          }}
        >
          <img
            src={imageUrl}
            alt="Uploaded"
            className="max-w-full rounded-lg select-none"
            style={{ 
              width: '100%', 
              height: 'auto',
              cursor: isResizing ? 'ew-resize' : 'default',
              userSelect: 'none',
            }}
            draggable={false}
          />
          
          <div 
            className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="flex gap-1">
              <button
                onClick={() => handleAlignChange('left')}
                className={`px-2 py-0.5 rounded ${align === 'left' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                title="Align left"
              >
                ⬅
              </button>
              <button
                onClick={() => handleAlignChange('center')}
                className={`px-2 py-0.5 rounded ${align === 'center' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                title="Align center"
              >
                ⬌
              </button>
              <button
                onClick={() => handleAlignChange('right')}
                className={`px-2 py-0.5 rounded ${align === 'right' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                title="Align right"
              >
                ➡
              </button>
              <span className="mx-1 border-l border-white/20" />
              <button
                onClick={() => setShowSizeInput(!showSizeInput)}
                className="px-2 py-0.5 rounded hover:bg-white/10"
                title="Custom size"
              >
                {width}px ↔
              </button>
            </div>
            <button
              onClick={() => onUpdate('')}
              className="px-2 py-0.5 rounded hover:bg-red-500/50"
              title="Remove image"
            >
              🗑️
            </button>
          </div>

          {showSizeInput && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg p-2 flex gap-1 z-10">
              <input
                type="number"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                placeholder="Width"
                className="w-20 px-2 py-1 border rounded text-sm"
                min="50"
                max="2000"
                onKeyDown={(e) => e.key === 'Enter' && handleApplySize()}
              />
              <button
                onClick={handleApplySize}
                className="px-2 py-1 bg-primary text-white rounded text-sm"
              >
                Apply
              </button>
            </div>
          )}

          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 rounded-r-lg"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <span className="text-text-secondary">Uploading...</span>
        ) : (
          <>
            <div className="text-4xl mb-2">🖼️</div>
            <div className="text-text-secondary text-sm">
              Click to upload or drag and drop
            </div>
          </>
        )}
      </div>
    </div>
  );
}
