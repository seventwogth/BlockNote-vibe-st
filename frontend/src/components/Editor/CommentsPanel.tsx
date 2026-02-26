import { useState, useEffect, useRef } from 'react';

interface Comment {
  id: string;
  blockId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  resolved: boolean;
  replies?: Comment[];
}

interface CommentsPanelProps {
  blockId: string | null;
  onClose: () => void;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    blockId: 'block-1',
    content: 'This section needs more detail',
    author: { id: '1', name: 'John Doe' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    resolved: false,
    replies: [
      {
        id: '1-1',
        blockId: 'block-1',
        content: 'I will add more information',
        author: { id: '2', name: 'Jane Smith' },
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        resolved: false,
      },
    ],
  },
  {
    id: '2',
    blockId: 'block-2',
    content: 'Great point!',
    author: { id: '2', name: 'Jane Smith' },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    resolved: true,
  },
];

export function CommentsPanel({ blockId, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setComments(MOCK_COMMENTS.filter(c => blockId ? c.blockId === blockId : true));
  }, [blockId]);

  const filteredComments = showResolved 
    ? comments 
    : comments.filter(c => !c.resolved);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      blockId: blockId || 'general',
      content: newComment,
      author: { id: 'current', name: 'You' },
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;

    const reply: Comment = {
      id: `reply-${Date.now()}`,
      blockId: blockId || 'general',
      content: replyContent,
      author: { id: 'current', name: 'You' },
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    setComments(prev => prev.map(c => {
      if (c.id === parentId) {
        return { ...c, replies: [...(c.replies || []), reply] };
      }
      return c;
    }));

    setReplyingTo(null);
    setReplyContent('');
  };

  const handleResolve = (commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    ));
  };

  const handleDelete = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-surface border-l border-border flex flex-col z-40">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-medium">Comments</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`text-xs px-2 py-1 rounded ${showResolved ? 'bg-primary text-white' : 'hover:bg-hover'}`}
          >
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </button>
          <button onClick={onClose} className="text-text-secondary hover:text-text">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Add a comment to start a discussion</p>
          </div>
        ) : (
          filteredComments.map(comment => (
            <div 
              key={comment.id}
              className={`border rounded-lg p-3 ${comment.resolved ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {getInitials(comment.author.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{comment.author.name}</span>
                    <span className="text-xs text-text-secondary">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-text-primary break-words">{comment.content}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-xs text-text-secondary hover:text-primary"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => handleResolve(comment.id)}
                      className={`text-xs ${comment.resolved ? 'text-primary' : 'text-text-secondary hover:text-primary'}`}
                    >
                      {comment.resolved ? 'Resolved' : 'Resolve'}
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-text-secondary hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>

                  {replyingTo === comment.id && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 px-2 py-1 text-sm border border-border rounded"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
                      />
                      <button
                        onClick={() => handleReply(comment.id)}
                        className="px-2 py-1 text-xs bg-primary text-white rounded"
                      >
                        Send
                      </button>
                    </div>
                  )}

                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-gray-200 space-y-2">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs flex-shrink-0">
                            {getInitials(reply.author.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium">{reply.author.name}</span>
                              <span className="text-xs text-text-secondary">{formatTime(reply.createdAt)}</span>
                            </div>
                            <p className="text-xs text-text-primary break-words">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded resize-none focus:outline-none focus:border-primary"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-text-secondary">
            Press Enter to send, Shift+Enter for new line
          </span>
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded disabled:opacity-50"
          >
            Comment
          </button>
        </div>
      </form>
    </div>
  );
}

export function CommentIndicator({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
}
