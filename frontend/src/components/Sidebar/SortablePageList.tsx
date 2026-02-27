import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Page } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import { api } from '../../services/api';

interface SortablePageListProps {
  pages: Page[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onReorder: (pages: Page[]) => void;
  onCreatePage?: (parentId?: string) => void;
  onToggleFavorite?: (pageId: string) => void;
  onArchive?: (pageId: string) => void;
}

export function SortablePageList({
  pages,
  selectedPageId,
  onSelectPage,
  onReorder,
  onCreatePage,
  onToggleFavorite,
  onArchive,
}: SortablePageListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      const newPages = arrayMove(pages, oldIndex, newIndex);
      onReorder(newPages);

      const movedPage = newPages[newIndex];
      if (movedPage) {
        api.movePage(movedPage.id, {
          parent_id: movedPage.parent_id,
          position: newIndex,
        }).catch(console.error);
      }
    }
  };

  const activePage = activeId ? pages.find((p) => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {pages.map((page) => (
            <SortablePageItem
              key={page.id}
              page={page}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
              onCreatePage={onCreatePage}
              onToggleFavorite={onToggleFavorite}
              onArchive={onArchive}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activePage ? (
          <div className="bg-surface border-2 border-primary rounded-lg p-2 shadow-lg opacity-90">
            <span className="text-sm">{activePage.icon || '📄'} {activePage.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface SortablePageItemProps {
  page: Page;
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  onToggleFavorite?: (pageId: string) => void;
  onArchive?: (pageId: string) => void;
}

function SortablePageItem({
  page,
  selectedPageId,
  onSelectPage,
  onCreatePage,
  onToggleFavorite,
  onArchive,
}: SortablePageItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isSelected = selectedPageId === page.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPageIcon = () => {
    return page.icon || '📄';
  };

  const handleDelete = async () => {
    try {
      await api.deletePage(page.id);
      window.location.reload();
    } catch (err) {
      console.error('Failed to delete page:', err);
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
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 py-1.5 px-2 cursor-pointer hover:bg-hover rounded-sm group ${
        isSelected ? 'bg-hover' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onSelectPage(page.id)}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-text-secondary hover:text-text opacity-0 group-hover:opacity-100"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>

      <span className="text-sm">{getPageIcon()}</span>
      <span className={`text-sm truncate ${page.is_favorite ? 'font-medium' : ''}`}>
        {page.title}
      </span>

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
