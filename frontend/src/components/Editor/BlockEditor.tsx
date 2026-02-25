import { useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import { PageWithContent } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useS3Upload } from '../../hooks/useS3Upload';

interface BlockEditorProps {
  page: PageWithContent | null;
  onSaveContent: (content: Uint8Array) => void;
  onUpdatePage: (data: { title?: string; icon?: string }) => void;
}

export function BlockEditor({ page, onSaveContent, onUpdatePage }: BlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  
  const { uploading } = useS3Upload();

  useEffect(() => {
    if (!page) return;
    
    setTitle(page.title);
    
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    if (page.content && page.content.length > 0) {
      try {
        Y.applyUpdate(ydoc, page.content);
        const yText = ydoc.getText('content');
        setContent(yText.toString());
      } catch (err) {
        console.error('Failed to apply initial content:', err);
      }
    }
  }, [page?.id]);

  const { connected, sendUpdate } = useWebSocket(page?.id || null, ydocRef.current);

  useEffect(() => {
    if (!ydocRef.current) return;

    const handleUpdate = (update: Uint8Array) => {
      sendUpdate(update);
      onSaveContent(Y.encodeStateAsUpdate(ydocRef.current!));
    };

    ydocRef.current.on('update', handleUpdate);
    return () => {
      ydocRef.current?.off('update', handleUpdate);
    };
  }, [sendUpdate, onSaveContent]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
  };

  const handleTitleBlur = () => {
    if (page && title !== page.title) {
      onUpdatePage({ title });
    }
  };

  const handleContentChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    setContent(newContent);
    
    if (ydocRef.current) {
      const yText = ydocRef.current.getText('content');
      yText.delete(0, yText.length);
      yText.insert(0, newContent);
    }
  }, []);

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

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        Select a page to start editing
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
        
        <div className="flex items-center gap-2 mb-4 text-sm text-text-secondary">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Connected' : 'Disconnected'}
          {saving && <span> - Saving...</span>}
          {uploading && <span> - Uploading...</span>}
          <button 
            onClick={handleSave}
            className="ml-2 px-2 py-1 bg-primary text-white rounded text-xs"
          >
            Save
          </button>
        </div>
      </div>

      <div 
        ref={editorRef}
        contentEditable
        className="flex-1 overflow-y-auto px-12 py-4 outline-none"
        onInput={handleContentChange}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
