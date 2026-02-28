import { useRef, useEffect } from 'react';

interface CreatePageModalProps {
  onClose: () => void;
  onCreatePage: () => void;
  onCreateFolder: () => void;
}

export function CreatePageModal({ onClose, onCreatePage, onCreateFolder }: CreatePageModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Create new</h2>
        </div>
        
        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              onCreatePage();
              onClose();
            }}
            className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-hover transition-colors flex items-center gap-4 text-left group"
          >
            <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center text-2xl">
              📄
            </div>
            <div>
              <div className="font-medium group-hover:text-primary">Text Page</div>
              <div className="text-sm text-text-secondary">
                Write docs, notes, and more
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onCreateFolder();
              onClose();
            }}
            className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-hover transition-colors flex items-center gap-4 text-left group"
          >
            <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center text-2xl">
              📁
            </div>
            <div>
              <div className="font-medium group-hover:text-primary">Group</div>
              <div className="text-sm text-text-secondary">
                Create a folder for organizing pages
              </div>
            </div>
          </button>
        </div>
        
        <div className="p-4 bg-surface border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
