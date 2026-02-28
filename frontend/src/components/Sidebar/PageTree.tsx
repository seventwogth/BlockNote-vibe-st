import { useState } from 'react';
import { Page } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import { api } from '../../services/api';

interface PageTreeProps {
  pages: Page[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  onDeletePage?: (pageId: string) => void;
  onToggleFavorite?: (pageId: string) => void;
  onArchive?: (pageId: string) => void;
  expandedFolders?: Set<string>;
  onToggleExpand?: (folderId: string) => void;
  level?: number;
  showActions?: boolean;
}

export function PageTree({ 
  pages, 
  selectedPageId, 
  onSelectPage, 
  onCreatePage, 
  onDeletePage,
  onToggleFavorite,
  onArchive,
  expandedFolders = new Set(),
  onToggleExpand,
  level = 0,
  showActions = true
}: PageTreeProps) {
  const rootPages = pages.filter(p => !p.parent_id);
  
  return (
    <div className="select-none">
      {rootPages.map((page) => (
        <PageTreeItem
          key={page.id}
          page={page}
          pages={pages}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          onDeletePage={onDeletePage}
          onToggleFavorite={onToggleFavorite}
          onArchive={onArchive}
          expandedFolders={expandedFolders}
          onToggleExpand={onToggleExpand}
          level={level}
          showActions={showActions}
        />
      ))}
    </div>
  );
}

interface PageTreeItemProps {
  page: Page;
  pages: Page[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  onDeletePage?: (pageId: string) => void;
  onToggleFavorite?: (pageId: string) => void;
  onArchive?: (pageId: string) => void;
  expandedFolders: Set<string>;
  onToggleExpand?: (folderId: string) => void;
  level: number;
  showActions: boolean;
}

function PageTreeItem({ 
  page, 
  pages,
  selectedPageId, 
  onSelectPage, 
  onCreatePage, 
  onDeletePage,
  onToggleFavorite,
  onArchive,
  expandedFolders,
  onToggleExpand,
  level,
  showActions
}: PageTreeItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const childPages = pages.filter(p => p.parent_id === page.id);
  const hasChildren = childPages.length > 0;
  const isFolder = page.page_type === 'folder';
  const isExpanded = expandedFolders.has(page.id);
  const isSelected = selectedPageId === page.id;

  const getPageIcon = () => {
    if (isFolder) return page.icon || '📁';
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

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(page.id);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.(page.id);
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
        {isFolder && hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(page.id);
            }}
            className="w-4 h-4 flex items-center justify-center text-text-secondary"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        {(!isFolder || !hasChildren) && <div className="w-4" />}
        
        <span className="text-sm">{getPageIcon()}</span>
        <span className={`text-sm truncate ${page.is_favorite ? 'font-medium' : ''}`}>
          {page.title}
        </span>

        {showActions && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
            {onToggleFavorite && (
              <button
                onClick={handleToggleFavorite}
                className="p-0.5 text-text-secondary hover:text-yellow-500"
                title={page.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {page.is_favorite ? '⭐' : '☆'}
              </button>
            )}
            {onArchive && (
              <button
                onClick={handleArchive}
                className="p-0.5 text-text-secondary hover:text-text-primary"
                title="Archive page"
              >
                📦
              </button>
            )}
            {onCreatePage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatePage(page.id);
                }}
                className="p-0.5 text-text-secondary hover:text-text-primary"
                title="Add subpage"
              >
                +
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-0.5 text-text-secondary hover:text-red-500"
              title="Delete page"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      
      {isFolder && isExpanded && hasChildren && (
        <PageTree
          pages={childPages}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          onDeletePage={onDeletePage}
          onToggleFavorite={onToggleFavorite}
          onArchive={onArchive}
          expandedFolders={expandedFolders}
          onToggleExpand={onToggleExpand}
          level={level + 1}
          showActions={showActions}
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
