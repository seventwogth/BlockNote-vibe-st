import { useEffect, useRef } from 'react';

interface FloatingToolbarProps {
  x: number;
  y: number;
  onFormat: (format: string) => void;
  onClose: () => void;
}

export function FloatingToolbar({ x, y, onFormat, onClose }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      let adjustedX = x - rect.width / 2;
      
      if (adjustedX < 0) adjustedX = 0;
      if (adjustedX + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width;
      }
      
      toolbarRef.current.style.left = `${adjustedX}px`;
      toolbarRef.current.style.top = `${y - 40}px`;
    }
  }, [x, y]);

  const formatButtons = [
    { format: 'bold', icon: 'B', title: 'Bold (Ctrl+B)' },
    { format: 'italic', icon: 'I', title: 'Italic (Ctrl+I)', italic: true },
    { format: 'underline', icon: 'U', title: 'Underline (Ctrl+U)', underline: true },
    { format: 'strike', icon: 'S', title: 'Strikethrough', strike: true },
    { format: 'code', icon: '<>', title: 'Code' },
    { format: 'link', icon: '🔗', title: 'Link' },
  ];

  return (
    <div 
      ref={toolbarRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-border flex items-center gap-1 px-1 py-1"
      style={{ left: x, top: y }}
    >
      {formatButtons.map((btn) => (
        <button
          key={btn.format}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-text-primary transition-colors"
          title={btn.title}
          onClick={() => onFormat(btn.format)}
          style={{
            fontWeight: btn.format === 'bold' ? 'bold' : undefined,
            fontStyle: btn.italic ? 'italic' : undefined,
            textDecoration: btn.underline ? 'underline' : undefined,
            textDecorationLine: btn.strike ? 'line-through' : undefined,
          }}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
