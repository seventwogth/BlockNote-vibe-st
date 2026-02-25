import { useState, useRef } from 'react';
import { useS3Upload } from '../../hooks/useS3Upload';

interface Block {
  id: string;
  type: string;
  content: string;
}

interface ImageBlockProps {
  block: Block;
  onUpdate: (content: string) => void;
  workspaceId?: string;
}

export function ImageBlock({ block, onUpdate, workspaceId }: ImageBlockProps) {
  const { upload, uploading } = useS3Upload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    const result = await upload(file, block.id, workspaceId);
    if (result) {
      onUpdate(result.url);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/') || !workspaceId) return;

    const result = await upload(file, block.id, workspaceId);
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

  const imageUrl = block.content;

  if (imageUrl) {
    return (
      <div className="flex-1 relative group">
        <img
          src={imageUrl}
          alt="Uploaded"
          className="max-w-full rounded-lg"
          style={{ maxHeight: '400px', objectFit: 'contain' }}
        />
        <button
          onClick={() => onUpdate('')}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove image"
        >
          ×
        </button>
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
