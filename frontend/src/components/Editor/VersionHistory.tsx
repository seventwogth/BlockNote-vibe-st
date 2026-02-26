import { useState, useEffect, useRef } from 'react';

interface Version {
  id: string;
  timestamp: string;
  user?: string;
  preview: string;
}

interface VersionHistoryProps {
  onClose: () => void;
  onRestore?: (version: Version) => void;
}

export function VersionHistory({ onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const mockVersions: Version[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        user: 'You',
        preview: 'Updated heading structure',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        user: 'You',
        preview: 'Added new sections',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        user: 'You',
        preview: 'Initial version',
      },
    ];
    
    setTimeout(() => {
      setVersions(mockVersions);
      setLoading(false);
    }, 300);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg w-80 max-h-[500px] flex flex-col"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium">Version History</span>
        <button onClick={onClose} className="text-text-secondary hover:text-text">✕</button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-8 text-center text-text-secondary">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            Loading...
          </div>
        ) : versions.length === 0 ? (
          <div className="px-4 py-8 text-center text-text-secondary text-sm">
            No versions yet
          </div>
        ) : (
          versions.map((version) => (
            <button
              key={version.id}
              onClick={() => onRestore?.(version)}
              className="w-full px-4 py-3 text-left hover:bg-hover border-b border-border last:border-0"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{formatTime(version.timestamp)}</span>
                {version.user && (
                  <span className="text-xs text-text-secondary">{version.user}</span>
                )}
              </div>
              <div className="text-xs text-text-secondary truncate">
                {version.preview}
              </div>
            </button>
          ))
        )}
      </div>
      
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={onClose}
          className="w-full px-3 py-2 text-sm text-text-secondary hover:text-text border border-border rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
