import { useEffect, useRef, useState, useCallback } from 'react';
import { PageWithContent } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useS3Upload } from '../../hooks/useS3Upload';
import * as Y from 'yjs';
import { ContextMenu } from './ContextMenu';
import { SlashCommandMenu } from './SlashCommandMenu';
import { FloatingToolbar } from './FloatingToolbar';

interface BlockEditorProps {
  page: PageWithContent | null;
  onSaveContent: (content: Uint8Array) => void;
  onUpdatePage: (data: { title?: string; icon?: string }) => void;
}

type BlockType = 'text' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'code' | 'divider' | 'callout' | 'image';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: Record<string, unknown>;
}

export function BlockEditor({ page, onSaveContent, onUpdatePage }: BlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([{ id: '1', type: 'text', content: '' }]);
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);
  const [floatingToolbar, setFloatingToolbar] = useState<{ x: number; y: number } | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const isUpdatingRef = useRef(false);
  
  const { uploading } = useS3Upload();

  useEffect(() => {
    if (!page) return;
    
    setTitle(page.title);
    
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    if (page.content && page.content.length > 0) {
      try {
        const decodedContent = new TextDecoder().decode(page.content);
        if (decodedContent && decodedContent.trim()) {
          Y.applyUpdate(ydoc, page.content);
          const yText = ydoc.getText('content');
          const content = yText.toString();
          
          if (content) {
            const parsedBlocks = parseContentToBlocks(content);
            setBlocks(parsedBlocks.length > 0 ? parsedBlocks : [{ id: '1', type: 'text', content: '' }]);
            lastSavedContentRef.current = content;
          }
        }
      } catch (err) {
        console.warn('Failed to apply initial content, starting fresh:', err);
      }
    }
  }, [page?.id]);

  const { connected, sendUpdate } = useWebSocket(page?.id || null, ydocRef.current);

  useEffect(() => {
    if (!ydocRef.current) return;

    const handleUpdate = (update: Uint8Array) => {
      if (isUpdatingRef.current) return;
      
      sendUpdate(update);
      
      try {
        const yText = ydocRef.current?.getText('content');
        if (yText) {
          const content = yText.toString();
          if (content !== lastSavedContentRef.current) {
            const parsedBlocks = parseContentToBlocks(content);
            setBlocks(parsedBlocks.length > 0 ? parsedBlocks : [{ id: '1', type: 'text', content: '' }]);
            lastSavedContentRef.current = content;
          }
        }
      } catch (err) {
        console.error('Failed to apply remote update:', err);
      }
    };

    ydocRef.current.on('update', handleUpdate);
    
    return () => {
      ydocRef.current?.off('update', handleUpdate);
    };
  }, [sendUpdate]);

  const parseContentToBlocks = (content: string): Block[] => {
    if (!content) return [];
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Plain text fallback
    }
    
    return content.split('\n').filter(line => line.trim()).map((line, idx) => ({
      id: `${Date.now()}-${idx}`,
      type: detectBlockType(line) as BlockType,
      content: line.replace(/^[#*\->\d.]+\s*/, ''),
    }));
  };

  const detectBlockType = (line: string): BlockType => {
    if (line.startsWith('# ')) return 'heading1';
    if (line.startsWith('## ')) return 'heading2';
    if (line.startsWith('### ')) return 'heading3';
    if (line.startsWith('- ')) return 'bullet';
    if (/^\d+\.\s/.test(line)) return 'numbered';
    if (line.startsWith('[] ')) return 'todo';
    if (line.startsWith('> ')) return 'quote';
    if (line.startsWith('```')) return 'code';
    if (line.startsWith('---')) return 'divider';
    return 'text';
  };

  const blocksToContent = (blocks: Block[]): string => {
    return JSON.stringify(blocks);
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const isBlockEmpty = (content: string): boolean => {
    if (!content) return true;
    const stripped = stripHtml(content).trim();
    return stripped === '';
  };

  const renderBlockContent = (block: Block): string => {
    if (isBlockEmpty(block.content)) {
      return '';
    }
    return block.content;
  };

  const updateBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    lastSavedContentRef.current = blocksToContent(newBlocks);
    
    if (ydocRef.current) {
      const yText = ydocRef.current.getText('content');
      ydocRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, blocksToContent(newBlocks));
      });
    }
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
  };

  const handleTitleBlur = () => {
    if (page && title !== page.title) {
      onUpdatePage({ title });
    }
  };

  const handleBlockContentChange = useCallback((blockId: string, newContent: string, cursorPosition?: number) => {
    const newBlocks = blocks.map(b => 
      b.id === blockId ? { ...b, content: newContent } : b
    );
    
    setBlocks(newBlocks);
    lastSavedContentRef.current = blocksToContent(newBlocks);
    
    if (ydocRef.current) {
      const yText = ydocRef.current.getText('content');
      ydocRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, blocksToContent(newBlocks));
      });
    }
    
    if (cursorPosition !== undefined) {
      setTimeout(() => {
        const editor = document.getElementById(`block-${blockId}`);
        if (editor && editor.childNodes[0]) {
          const range = document.createRange();
          const sel = window.getSelection();
          try {
            range.setStart(editor.childNodes[0], Math.min(cursorPosition, editor.childNodes[0].textContent?.length || 0));
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch (e) {          }
        }
      }, 0);
    }
  }, [blocks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    const isEmptyBlock = stripHtml(blocks[blockIndex]?.content || '').trim() === '';
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const currentBlock = blocks[blockIndex];
      const newBlock: Block = { 
        id: `${Date.now()}`, 
        type: currentBlock.type, 
        content: '' 
      };
      const newBlocks = [...blocks];
      newBlocks.splice(blockIndex + 1, 0, newBlock);
      updateBlocks(newBlocks);
      
      setTimeout(() => {
        const editor = document.getElementById(`block-${newBlock.id}`);
        editor?.focus();
      }, 0);
    }
    
    if (e.key === 'Backspace' && isEmptyBlock && blocks.length > 1) {
      e.preventDefault();
      const newBlocks = blocks.filter(b => b.id !== blockId);
      updateBlocks(newBlocks);
      
      const prevBlockIndex = Math.max(0, blockIndex - 1);
      setTimeout(() => {
        const prevBlock = document.getElementById(`block-${blocks[prevBlockIndex].id}`);
        prevBlock?.focus();
        
        const range = document.createRange();
        const sel = window.getSelection();
        if (prevBlock && sel) {
          range.selectNodeContents(prevBlock);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 0);
    }
    
    if (e.key === 'ArrowUp' && blockIndex > 0) {
      const selection = window.getSelection();
      if (selection && selection.anchorOffset === 0) {
        e.preventDefault();
        const prevBlock = document.getElementById(`block-${blocks[blockIndex - 1].id}`);
        prevBlock?.focus();
        
        const range = document.createRange();
        const sel = window.getSelection();
        if (prevBlock && sel) {
          range.selectNodeContents(prevBlock);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
    
    if (e.key === 'ArrowDown' && blockIndex < blocks.length - 1) {
      const selection = window.getSelection();
      const blockEl = document.getElementById(`block-${blockId}`);
      const textLength = blockEl?.textContent?.length || 0;
      if (selection && selection.anchorOffset === textLength) {
        e.preventDefault();
        const nextBlock = document.getElementById(`block-${blocks[blockIndex + 1].id}`);
        nextBlock?.focus();
        
        const range = document.createRange();
        const sel = window.getSelection();
        if (nextBlock && sel) {
          range.selectNodeContents(nextBlock);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }

    if (e.key === '/') {
      const blockEl = document.getElementById(`block-${blockId}`);
      if (blockEl) {
        const selection = window.getSelection();
        const plainContent = stripHtml(blocks[blockIndex]?.content || '');
        if (selection && selection.anchorOffset === plainContent.length) {
          setTimeout(() => {
            const rect = blockEl.getBoundingClientRect();
            setSlashMenu({ x: rect.left, y: rect.bottom, blockId });
          }, 0);
        }
      }
    }
  }, [blocks, updateBlocks]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setFloatingToolbar({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    } else {
      setFloatingToolbar(null);
    }
  }, []);

  const handleSlashCommandSelect = useCallback((command: string) => {
    if (!slashMenu) return;
    
    const blockIndex = blocks.findIndex(b => b.id === slashMenu.blockId);
    if (blockIndex === -1) return;
    
    const currentBlock = blocks[blockIndex];
    let newType: BlockType = 'text';
    const plainContent = stripHtml(currentBlock.content);
    const cleanContent = plainContent.replace(/^\//, '');
    
    switch (command) {
      case 'heading1': newType = 'heading1'; break;
      case 'heading2': newType = 'heading2'; break;
      case 'heading3': newType = 'heading3'; break;
      case 'bullet': newType = 'bullet'; break;
      case 'numbered': newType = 'numbered'; break;
      case 'todo': newType = 'todo'; break;
      case 'quote': newType = 'quote'; break;
      case 'code': newType = 'code'; break;
      case 'divider': newType = 'divider'; break;
      case 'callout': newType = 'callout'; break;
    }
    
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...currentBlock, type: newType, content: cleanContent };
    updateBlocks(newBlocks);
    setSlashMenu(null);
    
    const blockEl = document.getElementById(`block-${slashMenu.blockId}`);
    blockEl?.focus();
  }, [slashMenu, blocks, updateBlocks]);

  const handleContextAction = useCallback((action: string) => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const selectedText = selection.toString();
    const selectedBlocks = blocks.filter(b => 
      document.getElementById(`block-${b.id}`)?.contains(selection.anchorNode)
    );
    
    switch (action) {
      case 'delete':
        if (selectedBlocks.length > 0) {
          const newBlocks = blocks.filter(b => !selectedBlocks.includes(b));
          updateBlocks(newBlocks.length > 0 ? newBlocks : [{ id: '1', type: 'text', content: '' }]);
        }
        break;
      case 'duplicate':
        if (selectedBlocks.length > 0) {
          const insertIndex = blocks.indexOf(selectedBlocks[selectedBlocks.length - 1]);
          const newBlocks = [...blocks];
          const duplicates = selectedBlocks.map(b => ({ ...b, id: `${Date.now()}-${Math.random()}` }));
          newBlocks.splice(insertIndex + 1, 0, ...duplicates);
          updateBlocks(newBlocks);
        }
        break;
      case 'copy':
        navigator.clipboard.writeText(selectedText);
        break;
      case 'paste':
        navigator.clipboard.readText().then(text => {
          const newBlocks = [...blocks];
          selectedBlocks.forEach((b) => {
            const idx = newBlocks.indexOf(b);
            newBlocks[idx] = { ...b, content: b.content + text };
          });
          updateBlocks(newBlocks);
        });
        break;
      case 'turnInto-text': case 'turnInto-heading1': case 'turnInto-heading2':
      case 'turnInto-heading3': case 'turnInto-bullet': case 'turnInto-numbered':
      case 'turnInto-quote': case 'turnInto-code':
        const newType = action.replace('turnInto-', '') as BlockType;
        const newBlocks = selectedBlocks.map(b => ({ ...b, type: newType }));
        updateBlocks(blocks.map(b => {
          const updated = newBlocks.find(nb => nb.id === b.id);
          return updated || b;
        }));
        break;
    }
    
    setContextMenu(null);
  }, [blocks, updateBlocks]);

  const applyFormat = useCallback((format: string) => {
    const selection = window.getSelection();
    if (!selection) return;
    
    switch (format) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'strike':
        document.execCommand('strikethrough', false);
        break;
      case 'code':
        document.execCommand('code', false);
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
    }
    
    const blockId = Array.from(blocks).find(b => 
      document.getElementById(`block-${b.id}`)?.contains(selection?.anchorNode)
    )?.id;
    
    if (blockId) {
      const blockEl = document.getElementById(`block-${blockId}`);
      handleBlockContentChange(blockId, blockEl?.innerHTML || '');
    }
  }, [blocks, handleBlockContentChange]);

  const handleSave = async () => {
    if (!ydocRef.current) return;
    setSaving(true);
    try {
      const update = Y.encodeStateAsUpdate(ydocRef.current);
      await onSaveContent(update);
    } finally {
      setSaving(false);
    }
  };

  const getBlockPlaceholder = (type: BlockType): string => {
    switch (type) {
      case 'heading1': return 'Heading 1';
      case 'heading2': return 'Heading 2';
      case 'heading3': return 'Heading 3';
      case 'bullet': return 'List item';
      case 'numbered': return 'List item';
      case 'todo': return 'To-do';
      case 'quote': return 'Quote';
      case 'code': return 'Code';
      case 'callout': return 'Callout';
      default: return "Type '/' for commands...";
    }
  };

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Select a page to start editing
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onClick={() => { setContextMenu(null); setSlashMenu(null); }}>
      <div className="px-12 py-8">
        <div className="flex items-center gap-2 mb-4">
          <button className="text-3xl hover:bg-hover p-1 rounded">
            {page.icon || '📄'}
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Untitled"
            className="text-3xl font-semibold bg-transparent border-none outline-none text-text-primary w-full"
          />
        </div>
        
        <div className="flex items-center gap-4 mb-4 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          
          <span className="px-2 py-1 bg-surface rounded text-xs">
            📄 Text
          </span>
          
          {saving && <span> - Saving...</span>}
          {uploading && <span> - Uploading...</span>}
          <button 
            onClick={handleSave}
            className="ml-auto px-3 py-1 bg-primary text-white rounded text-xs hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>

      <div 
        ref={editorRef}
        className="flex-1 overflow-y-auto px-12 py-4 outline-none"
        onContextMenu={handleContextMenu}
        onMouseUp={handleTextSelection}
        onKeyUp={handleTextSelection}
      >
        {blocks.map((block) => (
          <div key={block.id} className="group flex items-start gap-2 mb-2">
            <div className="w-6 h-6 flex items-center justify-center text-text-secondary opacity-0 group-hover:opacity-50 text-xs cursor-grab mt-1">
              ⋮⋮
            </div>
            <div
              id={`block-${block.id}`}
              contentEditable
              data-placeholder={getBlockPlaceholder(block.type)}
              className={`flex-1 outline-none min-h-[1.5em] ${
                block.type === 'heading1' ? 'text-3xl font-bold mb-4 mt-2' :
                block.type === 'heading2' ? 'text-2xl font-semibold mb-3 mt-1' :
                block.type === 'heading3' ? 'text-xl font-medium mb-2' :
                block.type === 'bullet' ? 'pl-2' :
                block.type === 'numbered' ? 'pl-2' :
                block.type === 'todo' ? 'flex items-center gap-2' :
                block.type === 'quote' ? 'border-l-4 border-gray-300 pl-4 italic text-gray-600' :
                block.type === 'code' ? 'font-mono bg-gray-100 p-2 rounded text-sm' :
                block.type === 'divider' ? 'border-t border-gray-200 my-4' :
                block.type === 'callout' ? 'bg-yellow-50 p-4 rounded-lg border border-yellow-200' :
                ''
              }`}
              onInput={(e) => {
                const sel = window.getSelection();
                const cursorPos = sel?.anchorOffset;
                handleBlockContentChange(block.id, e.currentTarget.innerHTML, cursorPos);
              }}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              dangerouslySetInnerHTML={{ __html: renderBlockContent(block) }}
              suppressContentEditableWarning
            />
          </div>
        ))}
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {slashMenu && (
        <SlashCommandMenu 
          x={slashMenu.x} 
          y={slashMenu.y} 
          onSelect={handleSlashCommandSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {floatingToolbar && (
        <FloatingToolbar 
          x={floatingToolbar.x} 
          y={floatingToolbar.y} 
          onFormat={applyFormat}
          onClose={() => setFloatingToolbar(null)}
        />
      )}
    </div>
  );
}
