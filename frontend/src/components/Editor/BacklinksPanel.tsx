import { useState, useEffect } from 'react';

interface Backlink {
  pageId: string;
  pageTitle: string;
  pageIcon?: string;
  context: string;
  updatedAt: string;
}

interface BacklinksPanelProps {
  pageId: string;
  onNavigate: (pageId: string) => void;
}

const MOCK_BACKLINKS: Backlink[] = [
  {
    pageId: 'page-1',
    pageTitle: 'Project Planning',
    pageIcon: '📋',
    context: 'Referenced in the <strong>timeline section</strong>',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    pageId: 'page-2',
    pageTitle: 'Meeting Notes',
    pageIcon: '📝',
    context: 'Linked from <strong>action items</strong>',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    pageId: 'page-3',
    pageTitle: 'Design System',
    pageIcon: '🎨',
    context: 'Mentioned in <strong>style guide</strong>',
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export function BacklinksPanel({ pageId, onNavigate }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setBacklinks(MOCK_BACKLINKS);
      setLoading(false);
    }, 300);
  }, [pageId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔗</span>
        <h3 className="font-medium">Linked to this page</h3>
        <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded">
          {backlinks.length}
        </span>
      </div>

      {backlinks.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <div className="text-3xl mb-2">🔗</div>
          <p className="text-sm">No linked pages</p>
          <p className="text-xs mt-1">Pages that link to this one will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backlinks.map(backlink => (
            <div
              key={backlink.pageId}
              className="border border-border rounded-lg p-3 hover:bg-hover cursor-pointer transition-colors"
              onClick={() => onNavigate(backlink.pageId)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{backlink.pageIcon || '📄'}</span>
                <span className="font-medium text-sm">{backlink.pageTitle}</span>
                <span className="text-xs text-text-secondary ml-auto">
                  {formatTime(backlink.updatedAt)}
                </span>
              </div>
              <div 
                className="text-xs text-text-secondary"
                dangerouslySetInnerHTML={{ __html: backlink.context }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-sm font-medium mb-3">Quick actions</h4>
        <div className="space-y-2">
          <button className="w-full px-3 py-2 text-left text-sm hover:bg-hover rounded flex items-center gap-2">
            <span>➕</span>
            <span>Add a link to another page</span>
          </button>
          <button className="w-full px-3 py-2 text-left text-sm hover:bg-hover rounded flex items-center gap-2">
            <span>📋</span>
            <span>Copy all linked pages</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function InlineBacklink({ page, onClick }: { page: { id: string; title: string; icon?: string }; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
    >
      <span>{page.icon || '📄'}</span>
      <span className="text-sm underline">{page.title}</span>
    </button>
  );
}

export function BacklinksSection({ backlinks, onNavigate }: { backlinks: Backlink[]; onNavigate: (pageId: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (backlinks.length === 0) return null;

  return (
    <div className="border-t border-border mt-4 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text"
      >
        <span>{isExpanded ? '▼' : '▶'}</span>
        <span>🔗 {backlinks.length} linked pages</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {backlinks.map(backlink => (
            <button
              key={backlink.pageId}
              onClick={() => onNavigate(backlink.pageId)}
              className="w-full px-2 py-1 text-left text-sm hover:bg-hover rounded flex items-center gap-2"
            >
              <span>{backlink.pageIcon || '📄'}</span>
              <span className="truncate">{backlink.pageTitle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
