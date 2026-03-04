'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Circle,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface Comment {
  id: string;
  blockId: string;
  authorName: string;
  authorEmail?: string;
  authorType: string;
  content: string;
  isResolved: boolean;
  resolvedBy?: string;
  createdAt: string;
  replies?: Comment[];
  todo?: { id: string; status: string; priority: string } | null;
}

export function CommentsPanel() {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('id') ?? null;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newCommentBlock, setNewCommentBlock] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');

  const fetchComments = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleResolve = async (commentId: string, isResolved: boolean) => {
    if (!projectId) return;
    await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isResolved }),
    });
    fetchComments();
  };

  const handleReply = async (parentId: string, blockId: string) => {
    if (!projectId || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId,
          content: replyContent.trim(),
          parentId,
        }),
      });
      setReplyContent('');
      fetchComments();
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewComment = async () => {
    if (!projectId || !newCommentBlock.trim() || !newCommentContent.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: newCommentBlock.trim(),
          content: newCommentContent.trim(),
        }),
      });
      setNewCommentBlock('');
      setNewCommentContent('');
      fetchComments();
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = comments.filter((c) => {
    if (filter === 'unresolved') return !c.isResolved;
    if (filter === 'resolved') return c.isResolved;
    return true;
  });

  const unresolvedCount = comments.filter((c) => !c.isResolved).length;

  return (
    <div className="p-4 space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        {(['all', 'unresolved', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 text-[10px] py-1 rounded-md capitalize transition-colors ${
              filter === f ? 'bg-white shadow-sm font-medium text-gray-700' : 'text-gray-500'
            }`}
          >
            {f} {f === 'unresolved' && unresolvedCount > 0 && `(${unresolvedCount})`}
          </button>
        ))}
      </div>

      {/* Comments list */}
      {loading ? (
        <p className="text-xs text-gray-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6">
          <MessageCircle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">No comments yet.</p>
          <p className="text-[10px] text-gray-300 mt-1">Add comments to discuss design decisions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((comment) => (
            <div
              key={comment.id}
              className={`text-xs border rounded-lg overflow-hidden ${
                comment.isResolved ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className="px-3 py-2 cursor-pointer hover:bg-gray-50/50"
                onClick={() => setExpandedComment(expandedComment === comment.id ? null : comment.id)}
              >
                <div className="flex items-start gap-2">
                  {expandedComment === comment.id ? (
                    <ChevronDown className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-700">{comment.authorName}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${
                        comment.authorType === 'client'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {comment.authorType}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-0.5 line-clamp-2">{comment.content}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                      <span>Block: {comment.blockId.slice(0, 8)}...</span>
                      {comment.replies && comment.replies.length > 0 && (
                        <span>{comment.replies.length} replies</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolve(comment.id, !comment.isResolved);
                    }}
                    className={`shrink-0 ${
                      comment.isResolved ? 'text-green-500' : 'text-gray-300 hover:text-green-500'
                    }`}
                    title={comment.isResolved ? 'Mark unresolved' : 'Mark resolved'}
                  >
                    {comment.isResolved ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedComment === comment.id && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2 space-y-1.5 ml-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 rounded p-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-700">{reply.authorName}</span>
                            <span className={`text-[9px] px-1 py-0.5 rounded ${
                              reply.authorType === 'client'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {reply.authorType}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-0.5">{reply.content}</p>
                          <span className="text-[10px] text-gray-400">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  <div className="mt-2 ml-4 flex gap-1">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleReply(comment.id, comment.blockId);
                      }}
                    />
                    <button
                      onClick={() => handleReply(comment.id, comment.blockId)}
                      disabled={submitting || !replyContent.trim()}
                      className="px-2 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New comment (internal) */}
      <div className="border-t pt-3 space-y-2">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase">Add Internal Comment</h4>
        <input
          type="text"
          value={newCommentBlock}
          onChange={(e) => setNewCommentBlock(e.target.value)}
          placeholder="Block ID"
          className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5"
        />
        <div className="flex gap-1">
          <textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 text-xs border border-gray-200 rounded px-2.5 py-1.5 resize-none"
            rows={2}
          />
          <button
            onClick={handleNewComment}
            disabled={submitting || !newCommentBlock.trim() || !newCommentContent.trim()}
            className="self-end px-2 py-1.5 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
