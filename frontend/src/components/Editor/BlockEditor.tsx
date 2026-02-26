import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { PageWithContent } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useS3Upload } from '../../hooks/useS3Upload';
import * as Y from 'yjs';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ContextMenu } from './ContextMenu';
import { SlashCommandMenu } from './SlashCommandMenu';
import { FloatingToolbar } from './FloatingToolbar';
import { ImageBlock } from './ImageBlock';
import { Breadcrumb } from '../Breadcrumb';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import { EmbedBlock } from './EmbedBlock';
import { TableBlock } from './TableBlock';
import { PresenceAvatars } from './PresenceAvatars';
import { CursorDisplay } from './CursorDisplay';
import { TableOfContents } from './TableOfContents';
import { ExportMenu } from './ExportMenu';
import { VersionHistory } from './VersionHistory';

interface BlockEditorProps {
  page: PageWithContent | null;
  onSaveContent: (content: Uint8Array) => void;
  onUpdatePage: (data: { title?: string; icon?: string; cover?: string }) => void;
  onNavigate?: (pageId: string) => void;
}

type BlockType = 'text' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'code' | 'divider' | 'callout' | 'image' | 'table' | 'video' | 'audio' | 'math' | 'toggle' | 'bookmark' | 'embed';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: Record<string, unknown>;
  children?: Block[];
  collapsed?: boolean;
  color?: string;
  backgroundColor?: string;
}

const EMOJI_LIST = ['📄', '📝', '📚', '💡', '⭐', '🔥', '🎯', '💻', '🎨', '🎮', '🎵', '📷', '🌟', '✨', '💫', '🎉', '🚀', '💼', '🏠', '🌍', '📖', '🔖', '📌', '🎲', '🧩', '📊', '📈', '💰', '❤️', '👍', '👀', '🎁'];

interface BlockColor {
  name: string;
  bg: string;
  text: string;
}

const BLOCK_COLORS: BlockColor[] = [
  { name: 'Default', bg: 'transparent', text: 'inherit' },
  { name: 'Gray', bg: '#f4f4f5', text: '#71717a' },
  { name: 'Brown', bg: '#faf5f0', text: '#92400e' },
  { name: 'Orange', bg: '#fff7ed', text: '#c2410c' },
  { name: 'Yellow', bg: '#fefce8', text: '#a16207' },
  { name: 'Green', bg: '#f0fdf4', text: '#15803d' },
  { name: 'Blue', bg: '#eff6ff', text: '#2563eb' },
  { name: 'Purple', bg: '#faf5ff', text: '#9333ea' },
  { name: 'Pink', bg: '#fdf2f8', text: '#db2777' },
  { name: 'Red', bg: '#fef2f2', text: '#dc2626' },
];

const tryRenderLatex = (content: string): string => {
  try {
    if (content.includes('\\') || content.includes('^') || content.includes('_') || content.includes('{')) {
      return katex.renderToString(content, {
        throwOnError: false,
        displayMode: true,
      });
    }
    return content;
  } catch {
    return content;
  }
};

export function BlockEditor({ page, onSaveContent, onUpdatePage, onNavigate: _onNavigate }: BlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([{ id: '1', type: 'text', content: '' }]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId?: string } | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number; y: number; blockId: string } | null>(null);
  const [floatingToolbar, setFloatingToolbar] = useState<{ x: number; y: number } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const lastSavedContentRef = useRef<string>('');
  const isUpdatingRef = useRef(false);
  
  const { uploading } = useS3Upload();

  const wordCount = useMemo(() => {
    const text = blocks.map(b => b.content.replace(/<[^>]*>/g, '')).join(' ');
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }, [blocks]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  const todoProgress = useMemo(() => {
    const todoBlocks = blocks.filter(b => b.type === 'todo');
    if (todoBlocks.length === 0) return null;
    const completed = todoBlocks.filter(b => b.content.startsWith('<input type="checkbox" checked'));
    return {
      total: todoBlocks.length,
      completed: completed.length,
      percentage: Math.round((completed.length / todoBlocks.length) * 100),
    };
  }, [blocks]);

  useEffect(() => {
    if (!page) return;
    
    setTitle(page.title);
    setCover((page as any).cover || null);
    setIcon(page.icon || null);
    
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

  const { connected, sendUpdate, sendCursor, sendTyping: _sendTyping, presence } = useWebSocket(page?.id || null, ydocRef.current);

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

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const historyRef = useRef<Block[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const pushToHistory = useCallback((newBlocks: Block[]) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(newBlocks)));
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      setBlocks(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      setBlocks(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setFocusMode(f => !f);
      }
      if (e.key === '?' || ((e.metaKey || e.ctrlKey) && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(s => !s);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (!ydocRef.current || !page) return;
    
    const currentContent = blocksToContent(blocks);
    if (currentContent === lastSavedContentRef.current) return;
    
    setSaveStatus('unsaved');
    
    const timeoutId = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const update = Y.encodeStateAsUpdate(ydocRef.current!);
        await onSaveContent(update);
        lastSavedContentRef.current = currentContent;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('unsaved');
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [blocks, page, onSaveContent]);

  const parseContentToBlocks = (content: string): Block[] => {
    if (!content) return [];
    
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
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
    pushToHistory(newBlocks);
    setBlocks(newBlocks);
    lastSavedContentRef.current = blocksToContent(newBlocks);
    
    if (ydocRef.current) {
      const yText = ydocRef.current.getText('content');
      ydocRef.current.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, blocksToContent(newBlocks));
      });
    }
  }, [pushToHistory]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (page && title !== page.title) {
      onUpdatePage({ title, icon: icon || undefined, cover: cover || undefined });
    }
  };

  const handleIconChange = (newIcon: string) => {
    setIcon(newIcon);
    setShowEmojiPicker(false);
    onUpdatePage({ title, icon: newIcon, cover: cover || undefined });
  };

  const handleCoverChange = (url: string) => {
    setCover(url);
    setShowCoverInput(false);
    onUpdatePage({ title, icon: icon || undefined, cover: url });
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
          } catch (e) { }
        }
      }, 0);
    }
  }, [blocks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    const isEmptyBlock = stripHtml(blocks[blockIndex]?.content || '').trim() === '';
    const currentBlock = blocks[blockIndex];
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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

    if (e.key === '/' && isEmptyBlock) {
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

    if (e.key === 'Tab' && currentBlock.type === 'toggle') {
      e.preventDefault();
      const newBlocks = blocks.map(b => 
        b.id === blockId ? { ...b, collapsed: !b.collapsed } : b
      );
      updateBlocks(newBlocks);
    }
  }, [blocks, updateBlocks]);

  const handleContextMenu = useCallback((e: React.MouseEvent, blockId?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, blockId });
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setFloatingToolbar(null);
      return;
    }
    
    const selectedText = selection.toString();
    if (selectedText && selectedText.length > 0) {
      const editorEl = editorRef.current;
      if (!editorEl) return;
      
      const range = selection.getRangeAt(0);
      if (!editorEl.contains(range.commonAncestorContainer)) {
        setFloatingToolbar(null);
        return;
      }
      
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
      case 'image': newType = 'image'; break;
      case 'table': newType = 'table'; break;
      case 'video': newType = 'video'; break;
      case 'audio': newType = 'audio'; break;
      case 'math': newType = 'math'; break;
      case 'toggle': newType = 'toggle'; break;
      case 'bookmark': newType = 'bookmark'; break;
      case 'embed': newType = 'embed'; break;
      default: newType = 'text';
    }

    let newBlock: Block;
    if (newType === 'table') {
      newBlock = { id: `${Date.now()}`, type: 'table', content: '3x3', children: [] };
    } else if (newType === 'toggle') {
      newBlock = { id: `${Date.now()}`, type: 'toggle', content: cleanContent || 'Toggle', children: [{ id: `${Date.now()}-child`, type: 'text', content: '' }], collapsed: false };
    } else if (newType === 'video' || newType === 'audio' || newType === 'bookmark' || newType === 'math' || newType === 'embed') {
      newBlock = { id: `${Date.now()}`, type: newType, content: '' };
    } else {
      newBlock = { ...currentBlock, type: newType, content: cleanContent };
    }
    
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = newBlock;
    updateBlocks(newBlocks);
    setSlashMenu(null);
    
    const blockEl = document.getElementById(`block-${slashMenu.blockId}`);
    blockEl?.focus();
  }, [slashMenu, blocks, updateBlocks]);

  const handleContextAction = useCallback((action: string) => {
    const blockId = contextMenu?.blockId;
    
    if (action === 'delete' && blockId) {
      const newBlocks = blocks.filter(b => b.id !== blockId);
      updateBlocks(newBlocks.length > 0 ? newBlocks : [{ id: '1', type: 'text', content: '' }]);
    } else if (action === 'duplicate' && blockId) {
      const blockIndex = blocks.findIndex(b => b.id === blockId);
      const currentBlock = blocks[blockIndex];
      const newBlock = { ...currentBlock, id: `${Date.now()}-${Math.random()}` };
      const newBlocks = [...blocks];
      newBlocks.splice(blockIndex + 1, 0, newBlock);
      updateBlocks(newBlocks);
    } else if (action.startsWith('turnInto-') && blockId) {
      const newType = action.replace('turnInto-', '') as BlockType;
      const newBlocks = blocks.map(b => b.id === blockId ? { ...b, type: newType } : b);
      updateBlocks(newBlocks);
    } else if (action.startsWith('color-') && blockId) {
      const colorName = action.replace('color-', '');
      const color = BLOCK_COLORS.find(c => c.name.toLowerCase() === colorName.toLowerCase());
      const newBlocks = blocks.map(b => b.id === blockId ? { ...b, color: color?.text, backgroundColor: color?.bg } : b);
      updateBlocks(newBlocks);
      setShowColorPicker(null);
    } else if (action === 'toggle' && blockId) {
      const newBlocks = blocks.map(b => b.id === blockId ? { ...b, collapsed: !b.collapsed } : b);
      updateBlocks(newBlocks);
    }
    
    setContextMenu(null);
  }, [contextMenu, blocks, updateBlocks]);

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
      case 'highlight':
        document.execCommand('hiliteColor', false, '#fef08a');
        break;
      case 'subscript':
        document.execCommand('subscript', false);
        break;
      case 'superscript':
        document.execCommand('superscript', false);
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
    setSaveStatus('saving');
    try {
      const update = Y.encodeStateAsUpdate(ydocRef.current);
      await onSaveContent(update);
      lastSavedContentRef.current = blocksToContent(blocks);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('unsaved');
    }
  };

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);
    
    updateBlocks(newBlocks);
    setDraggedBlockId(null);
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
      case 'image': return 'Click to upload image';
      case 'table': return 'Table';
      case 'video': return 'Paste YouTube URL';
      case 'audio': return 'Paste audio URL';
      case 'math': return 'LaTeX equation (e.g. x^2 + y^2 = r^2)';
      case 'toggle': return 'Toggle';
      case 'bookmark': return 'Paste URL to bookmark';
      case 'embed': return 'Paste URL to embed (YouTube, Twitter, etc.)';
      default: return "Type '/' for commands...";
    }
  };

  const renderBlock = (block: Block, _index: number) => {
    const isToggleCollapsed = block.type === 'toggle' && block.collapsed;
    
    const blockStyles = (block.backgroundColor || block.color) ? {
      backgroundColor: block.backgroundColor,
      color: block.color,
      padding: '8px 12px',
      borderRadius: '4px',
    } : {};

    return (
      <div
        key={block.id}
        draggable
        onDragStart={(e) => handleDragStart(e, block.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, block.id)}
        className={`group flex items-start gap-2 mb-2 ${draggedBlockId === block.id ? 'opacity-50' : ''}`}
      >
        <div 
          className="w-6 h-6 flex items-center justify-center text-text-secondary opacity-0 group-hover:opacity-50 text-xs cursor-grab mt-1"
          title="Drag to move"
        >
          ⋮⋮
        </div>

        {block.type === 'toggle' && (
          <button
            onClick={() => {
              const newBlocks = blocks.map(b => b.id === block.id ? { ...b, collapsed: !b.collapsed } : b);
              updateBlocks(newBlocks);
            }}
            className="mt-1 text-text-secondary"
          >
            {block.collapsed ? '▶' : '▼'}
          </button>
        )}

        {block.type === 'todo' && (
          <input
            type="checkbox"
            className="mt-1.5 w-4 h-4"
            checked={block.content.includes('checked')}
            onChange={(e) => {
              const newContent = e.target.checked ? 'checked' : '';
              const newBlocks = blocks.map(b => b.id === block.id ? { ...b, content: newContent } : b);
              updateBlocks(newBlocks);
            }}
          />
        )}

        {block.type === 'divider' ? (
          <hr className="w-full border-t border-gray-200 my-4" />
        ) : block.type === 'image' ? (
          <ImageBlock
            block={block}
            onUpdate={(content) => handleBlockContentChange(block.id, content)}
            workspaceId={page?.workspace_id || ''}
            pageId={page?.id || ''}
          />
        ) : block.type === 'table' ? (
          <TableBlock block={block} onUpdate={(content) => handleBlockContentChange(block.id, content)} />
        ) : block.type === 'video' ? (
          <div className="w-full">
            {block.content ? (
              <iframe
                width="100%"
                height="315"
                src={block.content.replace('watch?v=', 'embed/')}
                frameBorder="0"
                allowFullScreen
                className="rounded"
              />
            ) : (
              <input
                type="text"
                placeholder="Paste YouTube URL"
                className="w-full px-3 py-2 border border-border rounded"
                onBlur={(e) => handleBlockContentChange(block.id, e.target.value)}
              />
            )}
          </div>
        ) : block.type === 'audio' ? (
          <div className="w-full">
            {block.content ? (
              <audio controls src={block.content} className="w-full" />
            ) : (
              <input
                type="text"
                placeholder="Paste audio URL"
                className="w-full px-3 py-2 border border-border rounded"
                onBlur={(e) => handleBlockContentChange(block.id, e.target.value)}
              />
            )}
          </div>
        ) : block.type === 'math' ? (
          <div className="w-full p-4 bg-gray-50 rounded">
            {block.content ? (
              <div 
                className="text-lg overflow-x-auto"
                dangerouslySetInnerHTML={{ 
                  __html: tryRenderLatex(block.content) 
                }}
              />
            ) : (
              <input
                type="text"
                placeholder="LaTeX equation (e.g. x^2 + y^2 = r^2)"
                className="w-full outline-none bg-transparent font-mono"
                onBlur={(e) => handleBlockContentChange(block.id, e.target.value)}
              />
            )}
          </div>
        ) : block.type === 'bookmark' ? (
          <div className="w-full border border-border rounded overflow-hidden">
            {block.content ? (
              <a href={block.content} target="_blank" rel="noopener noreferrer" className="flex hover:bg-hover">
                <div className="w-32 h-24 bg-gray-100 flex items-center justify-center text-4xl">
                  🔖
                </div>
                <div className="p-3">
                  <div className="font-medium">{new URL(block.content).hostname}</div>
                  <div className="text-sm text-text-secondary truncate">{block.content}</div>
                </div>
              </a>
            ) : (
              <input
                type="text"
                placeholder="Paste URL to bookmark"
                className="w-full px-3 py-2"
                onBlur={(e) => handleBlockContentChange(block.id, e.target.value)}
              />
            )}
          </div>
        ) : block.type === 'embed' ? (
          <div className="w-full">
            {block.content ? (
              <EmbedBlock url={block.content} />
            ) : (
              <input
                type="text"
                placeholder="Paste URL to embed (YouTube, Twitter, Figma, etc.)"
                className="w-full px-3 py-2 border border-border rounded"
                onBlur={(e) => handleBlockContentChange(block.id, e.target.value)}
              />
            )}
          </div>
        ) : block.type === 'callout' ? (
          <div className="w-full bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div
              id={`block-${block.id}`}
              contentEditable
              data-placeholder={getBlockPlaceholder(block.type)}
              className="flex-1 outline-none min-h-[1.5em]"
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
        ) : (
          <div className="flex-1" style={blockStyles}>
            {block.type === 'toggle' && !isToggleCollapsed && block.children ? (
              <div className="pl-4 border-l-2 border-gray-200">
                {block.children.map((child, ci) => (
                  <div key={child.id}>
                    <div
                      id={`block-${child.id}`}
                      contentEditable
                      data-placeholder="Type something..."
                      className="outline-none min-h-[1.5em]"
                      onInput={(e) => {
                        const newBlocks = blocks.map(b => {
                          if (b.id === block.id) {
                            return {
                              ...b,
                              children: b.children?.map((c, i) => i === ci ? { ...c, content: e.currentTarget.innerHTML } : c)
                            };
                          }
                          return b;
                        });
                        setBlocks(newBlocks);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, child.id)}
                      dangerouslySetInnerHTML={{ __html: child.content }}
                      suppressContentEditableWarning
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                id={`block-${block.id}`}
                contentEditable
                data-placeholder={getBlockPlaceholder(block.type)}
                className={`outline-none min-h-[1.5em] ${
                  block.type === 'heading1' ? 'text-3xl font-bold mb-4 mt-2' :
                  block.type === 'heading2' ? 'text-2xl font-semibold mb-3 mt-1' :
                  block.type === 'heading3' ? 'text-xl font-medium mb-2' :
                  block.type === 'bullet' ? 'pl-2 list-disc' :
                  block.type === 'numbered' ? 'pl-2 list-decimal' :
                  block.type === 'quote' ? 'border-l-4 border-gray-300 pl-4 italic text-gray-600' :
                  block.type === 'code' ? 'font-mono bg-gray-100 p-2 rounded text-sm' :
                  ''
                }`}
                onInput={(e) => {
                  const sel = window.getSelection();
                  const cursorPos = sel?.anchorOffset;
                  handleBlockContentChange(block.id, e.currentTarget.innerHTML, cursorPos);
                }}
                onKeyDown={(e) => handleKeyDown(e, block.id)}
                onContextMenu={(e) => handleContextMenu(e, block.id)}
                dangerouslySetInnerHTML={{ __html: renderBlockContent(block) }}
                suppressContentEditableWarning
              />
            )}
          </div>
        )}
      </div>
    );
  };

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Select a page to start editing
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col h-full ${focusMode ? 'max-w-3xl mx-auto' : ''}`} 
      onClick={() => { setContextMenu(null); setSlashMenu(null); setShowEmojiPicker(false); setShowCoverInput(false); }}
    >
      {cover && (
        <div 
          className="h-48 bg-cover bg-center cursor-pointer"
          style={{ backgroundImage: `url(${cover})` }}
          onClick={() => setShowCoverInput(true)}
        />
      )}

      {page && page.parent_id && (
        <Breadcrumb 
          pageId={page.id} 
          workspaceId={page.workspace_id}
          onNavigate={(id) => {
            if (id !== page.workspace_id && _onNavigate) {
              _onNavigate(id);
            }
          }}
        />
      )}

      {showCoverInput && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg p-4">
          <input
            type="text"
            placeholder="Paste image URL for cover"
            className="w-64 px-3 py-2 border border-border rounded"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCoverChange(e.currentTarget.value);
              if (e.key === 'Escape') setShowCoverInput(false);
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder*="cover"]') as HTMLInputElement;
              if (input?.value) handleCoverChange(input.value);
            }}
            className="ml-2 px-3 py-2 bg-primary text-white rounded"
          >
            Add
          </button>
        </div>
      )}

      <div className="px-12 py-8">
        <div className="flex items-start gap-2 mb-4">
          <div className="relative">
            <button 
              className="text-3xl hover:bg-hover p-1 rounded"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              {icon || '📄'}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-border p-2 z-50 grid grid-cols-6 gap-1">
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleIconChange(emoji)}
                    className="p-1 hover:bg-hover rounded text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Untitled"
            className="text-3xl font-semibold bg-transparent border-none outline-none text-text-primary w-full"
          />
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm text-text-secondary flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          
          <PresenceAvatars presence={presence} currentUserId={undefined} maxVisible={4} />
          
          <span className="px-2 py-1 bg-surface rounded text-xs">
            📄 Text
          </span>

          {todoProgress && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${todoProgress.percentage}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary">
                {todoProgress.completed}/{todoProgress.total} ({todoProgress.percentage}%)
              </span>
            </div>
          )}

          <span className="text-xs">
            {wordCount} words · {readingTime} min read
          </span>

          <button
            onClick={() => setShowCoverInput(true)}
            className="px-2 py-1 hover:bg-hover rounded text-xs"
            title="Add cover"
          >
            🖼️ Cover
          </button>

          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`px-2 py-1 rounded text-xs ${focusMode ? 'bg-primary text-white' : 'hover:bg-hover'}`}
            title="Focus mode (Ctrl+/)"
          >
            🎯 Focus
          </button>

          <TableOfContents
            blocks={blocks}
            onNavigate={(blockId) => {
              const blockEl = document.getElementById(`block-${blockId}`);
              if (blockEl) {
                blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                blockEl.focus();
              }
            }}
          />

          <button
            onClick={() => setShowExportMenu(true)}
            className="px-2 py-1 hover:bg-hover rounded text-xs"
            title="Export"
          >
            📤 Export
          </button>

          <button
            onClick={() => setShowVersionHistory(true)}
            className="px-2 py-1 hover:bg-hover rounded text-xs"
            title="Version History"
          >
            🕐 History
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              className="px-2 py-1 hover:bg-hover rounded text-xs"
              title="Undo (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              onClick={redo}
              className="px-2 py-1 hover:bg-hover rounded text-xs"
              title="Redo (Ctrl+Shift+Z)"
            >
              ↪
            </button>
          </div>
          
          <span className={`text-xs ${
            saveStatus === 'saved' ? 'text-green-600' : 
            saveStatus === 'saving' ? 'text-yellow-600' : 
            'text-orange-600'
          }`}>
            {saveStatus === 'saved' ? '✓ Saved' : 
             saveStatus === 'saving' ? '⟳ Saving...' : 
             '● Unsaved'}
          </span>
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
        onContextMenu={(e) => handleContextMenu(e)}
        onMouseUp={handleTextSelection}
        onKeyUp={handleTextSelection}
        onMouseMove={(e) => {
          if (sendCursor) {
            sendCursor(e.clientX, e.clientY);
          }
        }}
      >
        {blocks.length === 0 || (blocks.length === 1 && isBlockEmpty(blocks[0].content)) ? (
          <>
            {blocks.map((block, index) => renderBlock(block, index))}
            {blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-text-secondary pointer-events-none">
                <div className="text-6xl mb-4">✏️</div>
                <p className="text-lg font-medium mb-2">Начните печатать...</p>
                <p className="text-sm">Нажмите <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs">/</kbd> для списка команд</p>
              </div>
            )}
          </>
        ) : (
          blocks.map((block, index) => renderBlock(block, index))
        )}
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

      {showColorPicker && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-border p-2"
          style={{ left: contextMenu?.x, top: (contextMenu?.y || 0) + 150 }}
        >
          <div className="grid grid-cols-5 gap-1">
            {BLOCK_COLORS.map((color, idx) => (
              <button
                key={idx}
                onClick={() => handleContextAction(`color-${color.name.toLowerCase()}`)}
                className="w-8 h-8 rounded border border-border"
                style={{ backgroundColor: color.bg }}
                title={color.name}
              />
            ))}
          </div>
          </div>
        )}

      {showShortcuts && (
        <ShortcutHelpModal onClose={() => setShowShortcuts(false)} />
      )}

      {showExportMenu && (
        <ExportMenu
          blocks={blocks}
          title={title}
          onClose={() => setShowExportMenu(false)}
        />
      )}

      {showVersionHistory && (
        <VersionHistory
          onClose={() => setShowVersionHistory(false)}
          onRestore={(version) => {
            console.log('Restore version:', version);
            setShowVersionHistory(false);
          }}
        />
      )}

      <CursorDisplay presence={presence} currentUserId={undefined} />
    </div>
  );
}
