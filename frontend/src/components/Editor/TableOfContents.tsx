import { useState, useEffect, useRef } from 'react';

interface TableOfContentsProps {
  blocks: { id: string; type: string; content: string }[];
  onNavigate: (blockId: string) => void;
}

export function TableOfContents({ blocks, onNavigate }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const headings = blocks
    .filter(b => ['heading1', 'heading2', 'heading3'].includes(b.type))
    .map(b => {
      const level = b.type === 'heading1' ? 1 : b.type === 'heading2' ? 2 : 3;
      const text = b.content.replace(/<[^>]*>/g, '').trim();
      return { id: b.id, text, level };
    });

  useEffect(() => {
    const handleScroll = () => {
      const headingElements = headings
        .map(h => document.getElementById(`block-${h.id}`))
        .filter(Boolean) as HTMLElement[];

      for (const el of headingElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100) {
          setActiveId(headings.find(h => document.getElementById(`block-${h.id}`) === el)?.id || null);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (headings.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs text-text-secondary hover:bg-hover rounded flex items-center gap-1"
        title="Table of Contents"
      >
        ☰ Contents
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-sm font-medium">Contents</span>
          </div>
          <div className="py-1">
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => {
                  onNavigate(heading.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-hover flex items-center gap-2 ${
                  activeId === heading.id ? 'bg-hover text-primary' : 'text-text-secondary'
                }`}
                style={{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }}
              >
                <span className="truncate">{heading.text || 'Untitled'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
