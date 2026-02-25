import { useState } from 'react';
import { Page } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import { api } from '../../services/api';

interface PageTreeProps {
  pages: Page[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (parentId?: string) => void;
  onDeletePage?: (pageId: string) => void;
  level?: number;
}

export function PageTree({ pages, selectedPageId, onSelectPage, onCreatePage, onDeletePage, level = 0 }: PageTreeProps) {
  return (
    <div className="select-none">
      {pages.map((page) => (
        <PageTreeItem
          key={page.id}
          page={page}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          onDeletePage={onDeletePage}
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
  onDeletePage?: (pageId: string) => void;
  level: number;
}

function PageTreeItem({ page, selectedPageId, onSelectPage, onCreatePage, onDeletePage, level }: PageTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = selectedPageId === page.id;

  const getPageIcon = (pageType?: string) => {
    if (pageType === 'board') return '🎨';
    return page.icon || '📄';
  };

  const handleDelete = async () => {
    if (onDeletePage) {
      onDeletePage(page.id);
    } else {
      try {
        await api.deletePage(page.id);
        window.location.reload();
      } catch (err) {
        console.error('Failed to delete page:', err);
      }
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-hover rounded-sm group ${
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
        
        <span className="text-sm truncate">{getPageIcon(page.page_type)}</span>
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className="ml-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500"
          title="Delete page"
        >
          🗑️
        </button>
      </div>
      
      {hasChildren && expanded && (
        <PageTree
          pages={page.children || []}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          onDeletePage={onDeletePage}
          level={level + 1}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Page"
        message={`Are you sure you want to delete "${page.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        danger
      />
    </div>
  );
}
