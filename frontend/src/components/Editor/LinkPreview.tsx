import { useState, useEffect, useRef } from 'react';

interface LinkPreviewProps {
  url: string;
  onRemove?: () => void;
}

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  siteName: string;
}

export function LinkPreview({ url, onRemove }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<LinkMetadata>({ title: '', description: '', image: '', siteName: '' });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      setError(false);
      
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/links/preview?url=${encodeURIComponent(url)}`, {
          signal: abortRef.current.signal,
        });
        
        if (res.ok) {
          const data = await res.json();
          setMetadata(data);
          setEditData(data);
        } else {
          setError(true);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchMetadata();
    }

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [url]);

  const handleSaveEdit = () => {
    setMetadata(editData);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="w-full border border-border rounded overflow-hidden">
        <div className="p-4 flex items-center gap-3 bg-gray-50">
          <div className="w-16 h-16 bg-gray-200 animate-pulse rounded" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="w-full border border-border rounded overflow-hidden">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-3 hover:bg-hover"
        >
          <div className="text-sm text-primary truncate">{url}</div>
        </a>
        {onRemove && (
          <button
            onClick={onRemove}
            className="w-full text-xs text-red-500 hover:bg-red-50 py-1"
          >
            Remove link
          </button>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="w-full border border-border rounded overflow-hidden p-3 space-y-2">
        <input
          value={editData.title}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          placeholder="Title"
          className="w-full px-2 py-1 border rounded text-sm"
        />
        <input
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          placeholder="Description"
          className="w-full px-2 py-1 border rounded text-sm"
        />
        <input
          value={editData.image}
          onChange={(e) => setEditData({ ...editData, image: e.target.value })}
          placeholder="Image URL"
          className="w-full px-2 py-1 border rounded text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="px-3 py-1 bg-primary text-white rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 border rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border border-border rounded overflow-hidden group">
      {metadata.image && (
        <div 
          className="h-32 bg-cover bg-center"
          style={{ backgroundImage: `url(${metadata.image})` }}
        />
      )}
      <div className="p-3 bg-white">
        <div className="text-xs text-text-secondary mb-1">{metadata.siteName || new URL(url).hostname}</div>
        <div className="font-medium text-text-primary">{metadata.title}</div>
        {metadata.description && (
          <div className="text-sm text-text-secondary mt-1 line-clamp-2">{metadata.description}</div>
        )}
        <div className="mt-2 flex gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Visit →
          </a>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Edit
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
