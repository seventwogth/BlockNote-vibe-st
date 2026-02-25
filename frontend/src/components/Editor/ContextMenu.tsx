import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onAction: (action: string) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, onAction, onClose }: ContextMenuProps) {
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
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menuItems = [
    { label: 'Delete', action: 'delete', icon: '🗑️' },
    { label: 'Duplicate', action: 'duplicate', icon: '📋' },
    { label: 'Copy', action: 'copy', icon: '📄' },
    { label: 'Paste', action: 'paste', icon: '📌' },
    { type: 'divider' as const },
    { 
      label: 'Turn into', 
      icon: '↩️',
      submenu: [
        { label: 'Text', action: 'turnInto-text' },
        { label: 'Heading 1', action: 'turnInto-heading1' },
        { label: 'Heading 2', action: 'turnInto-heading2' },
        { label: 'Heading 3', action: 'turnInto-heading3' },
        { label: 'Bullet list', action: 'turnInto-bullet' },
        { label: 'Numbered list', action: 'turnInto-numbered' },
        { label: 'Quote', action: 'turnInto-quote' },
        { label: 'Code', action: 'turnInto-code' },
      ]
    },
    { type: 'divider' as const },
    { label: 'Color', action: 'color', icon: '🎨' },
  ];

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item, idx) => {
        if (item.type === 'divider') {
          return <div key={idx} className="h-px bg-border my-1" />;
        }
        
        if ('submenu' in item) {
          return (
            <div key={idx} className="relative group">
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center justify-between"
                onClick={() => onAction(item.action || item.label.toLowerCase())}
              >
                <span className="flex items-center gap-2">
                  {item.icon && <span>{item.icon}</span>}
                  {item.label}
                </span>
                <span>▶</span>
              </button>
              <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[150px] hidden group-hover:block">
                {item.submenu?.map((sub, subIdx) => (
                  <button
                    key={subIdx}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover"
                    onClick={() => onAction(sub.action)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        
        return (
          <button
            key={idx}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-hover flex items-center gap-2"
            onClick={() => onAction(item.action || item.label.toLowerCase())}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
