import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface BreadcrumbItem {
  id: string;
  title: string;
  icon?: string;
}

interface BreadcrumbProps {
  pageId: string;
  workspaceId: string;
  onNavigate: (pageId: string) => void;
}

export function Breadcrumb({ pageId, workspaceId, onNavigate }: BreadcrumbProps) {
  const [ancestors, setAncestors] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAncestors = async () => {
      setLoading(true);
      try {
        const ancestors: BreadcrumbItem[] = [];
        
        let currentId: string | null = pageId;
        while (currentId) {
          try {
            const page = await api.getPage(currentId);
            ancestors.unshift({
              id: page.id,
              title: page.title,
              icon: page.icon,
            });
            currentId = page.parent_id || null;
          } catch {
            break;
          }
        }
        
        setAncestors(ancestors);
      } catch (err) {
        console.error('Failed to load ancestors:', err);
      } finally {
        setLoading(false);
      }
    };

    if (pageId) {
      loadAncestors();
    }
  }, [pageId]);

  if (loading || ancestors.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-12 py-2 text-sm text-text-secondary overflow-x-auto">
      <button
        onClick={() => onNavigate(workspaceId)}
        className="hover:text-text transition-colors"
        title="Workspace"
      >
        📁
      </button>
      
      {ancestors.slice(0, -1).map((item) => (
        <span key={item.id} className="flex items-center gap-1">
          <span className="text-gray-400">/</span>
          <button
            onClick={() => onNavigate(item.id)}
            className="hover:text-text transition-colors whitespace-nowrap"
          >
            {item.icon || '📄'} {item.title}
          </button>
        </span>
      ))}
      
      <span className="text-gray-400">/</span>
      <span className="text-text font-medium whitespace-nowrap">
        {ancestors[ancestors.length - 1]?.icon || '📄'} {ancestors[ancestors.length - 1]?.title}
      </span>
    </div>
  );
}
