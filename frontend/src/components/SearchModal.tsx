import { useState, useEffect } from 'react';
import { Page } from '../types';
import { api } from '../services/api';

interface SearchModalProps {
  workspaceId: string;
  onClose: () => void;
  onSelectPage: (pageId: string) => void;
}

export function SearchModal({ workspaceId, onClose, onSelectPage }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await api.searchPages({ q: query, workspace_id: workspaceId });
        setResults(data || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, workspaceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-surface rounded-lg shadow-2xl border border-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔍</span>
            <input
              type="text"
              placeholder="Search pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="p-1 text-text-secondary hover:text-text"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-text-secondary">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-text-secondary">
              {query.length < 2 ? 'Type at least 2 characters to search' : 'No results found'}
            </div>
          ) : (
            <div>
              {results.map((page) => (
                <button
                  key={page.id}
                  onClick={() => onSelectPage(page.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-hover text-left border-b border-border last:border-b-0"
                >
                  <span className="text-xl">{page.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">{page.title}</p>
                    {page.content_text && (
                      <p className="text-sm text-text-secondary truncate">
                        {page.content_text.substring(0, 100)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary">
                    {page.page_type === 'board' ? '🎨' : '📄'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-border text-xs text-text-secondary flex gap-4 justify-center">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
