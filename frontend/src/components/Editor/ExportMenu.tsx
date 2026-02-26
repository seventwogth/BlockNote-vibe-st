import { useState, useEffect, useRef } from 'react';

interface Block {
  id: string;
  type: string;
  content: string;
  children?: Block[];
}

interface ExportMenuProps {
  blocks: Block[];
  title: string;
  onClose: () => void;
}

export function ExportMenu({ blocks, title, onClose }: ExportMenuProps) {
  const [exporting, setExporting] = useState(false);
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

  const blocksToMarkdown = (blocks: Block[]): string => {
    return blocks.map(block => {
      const content = block.content.replace(/<[^>]*>/g, '').trim();
      
      switch (block.type) {
        case 'heading1':
          return `# ${content}\n`;
        case 'heading2':
          return `## ${content}\n`;
        case 'heading3':
          return `### ${content}\n`;
        case 'bullet':
          return `- ${content}\n`;
        case 'numbered':
          return `1. ${content}\n`;
        case 'todo':
          const checked = block.content.includes('checked');
          return `- [${checked ? 'x' : ' '}] ${content}\n`;
        case 'quote':
          return `> ${content}\n`;
        case 'code':
          return `\`\`\`\n${content}\n\`\`\`\n`;
        case 'divider':
          return `---\n`;
        case 'callout':
          return `> 💡 ${content}\n`;
        case 'toggle':
          if (block.children) {
            const childrenMd = blocksToMarkdown(block.children);
            return `<details>\n<summary>${content}</summary>\n\n${childrenMd}</details>\n`;
          }
          return content;
        default:
          return `${content}\n`;
      }
    }).join('\n');
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const markdown = blocksToMarkdown(blocks);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'document'}.md`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportHTML = async () => {
    setExporting(true);
    try {
      const markdown = blocksToMarkdown(blocks);
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
    h2, h3 { margin-top: 30px; }
    code { background: #f4f4f5; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${markdown}</div>
</body>
</html>`;
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'document'}.html`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <div className="px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">Export</span>
      </div>
      
      <div className="py-1">
        <button
          onClick={handleExportMarkdown}
          disabled={exporting}
          className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex items-center gap-2"
        >
          <span>📄</span>
          <div>
            <div className="font-medium">Markdown</div>
            <div className="text-xs text-text-secondary">.md file</div>
          </div>
        </button>
        
        <button
          onClick={handleExportHTML}
          disabled={exporting}
          className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex items-center gap-2"
        >
          <span>🌐</span>
          <div>
            <div className="font-medium">HTML</div>
            <div className="text-xs text-text-secondary">.html file</div>
          </div>
        </button>
      </div>
      
      <div className="px-3 py-2 border-t border-border">
        <button
          onClick={onClose}
          className="text-xs text-text-secondary hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
