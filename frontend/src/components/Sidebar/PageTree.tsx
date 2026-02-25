import { useState } from 'react';
import { Page } from '../../types';

interface PageTreeProps {
  pages: Page[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (parentId?: string) => void;
  level?: number;
}

export function PageTree({ pages, selectedPageId, onSelectPage, onCreatePage, level = 0 }: PageTreeProps) {
  return (
    <div className="select-none">
      {pages.map((page) => (
        <PageTreeItem
          key={page.id}
          page={page}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          level={level}
        />
      ))}
    </div>
  );
}

interface PageTreeItemProps {
  page: Page;
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (parentId?: string) => void;
  level: number;
}

function PageTreeItem({ page, selectedPageId, onSelectPage, onCreatePage, level }: PageTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = selectedPageId === page.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-hover rounded-sm ${
          isSelected ? 'bg-hover' : ''
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectPage(page.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-4 h-4 flex items-center justify-center text-text-secondary"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        
        <span className="text-sm truncate">{page.icon || '📄'}</span>
        <span className="text-sm text-text-primary truncate">{page.title}</span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCreatePage(page.id);
          }}
          className="ml-auto opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary"
        >
          +
        </button>
      </div>
      
      {hasChildren && expanded && (
        <PageTree
          pages={page.children || []}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          level={level + 1}
        />
      )}
    </div>
  );
}
