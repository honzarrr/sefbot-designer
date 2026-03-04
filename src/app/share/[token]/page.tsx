'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Lock, Send, MessageCircle, X } from 'lucide-react';

// ============================================================
// Shared read-only node component
// ============================================================
function ReadOnlyStepNode({ data }: { data: { step: { id: string; name: string; color: string; blocks: Array<{ id: string; type: string; content?: string; placeholder?: string; buttons?: Array<{ id: string; label: string }> }> }; onBlockClick?: (blockId: string) => void; commentCounts?: Record<string, number> } }) {
  const { step, onBlockClick, commentCounts } = data;
  return (
    <div className="min-w-[240px] max-w-[320px] rounded-lg bg-white shadow-md border border-gray-200">
      <div
        className="rounded-t-lg px-3 py-2"
        style={{ backgroundColor: step.color }}
      >
        <span className="text-white text-sm font-semibold truncate">
          {step.name}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {step.blocks.map((block) => {
          const count = commentCounts?.[block.id] || 0;
          return (
            <div
              key={block.id}
              className="relative group cursor-pointer hover:bg-blue-50 rounded px-2 py-1.5 transition-colors"
              onClick={() => onBlockClick?.(block.id)}
            >
              {block.type === 'text' && (
                <div
                  className="text-xs text-gray-600"
                  dangerouslySetInnerHTML={{ __html: block.content || '' }}
                />
              )}
              {block.type === 'buttons' && (
                <div className="space-y-1">
                  {block.buttons?.map((btn) => (
                    <div
                      key={btn.id}
                      className="text-xs bg-gray-50 rounded px-2 py-1 text-gray-700"
                    >
                      {btn.label}
                    </div>
                  ))}
                </div>
              )}
              {block.type === 'user-input' && (
                <div className="text-xs text-gray-400 italic bg-gray-50 rounded px-2 py-1.5 border border-dashed border-gray-200">
                  {block.placeholder || 'User input...'}
                </div>
              )}
              {count > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadOnlySoftStartNode({ data }: { data: { softStart: { name: string; buttonLabel: string } } }) {
  return (
    <div className="min-w-[160px] rounded-full bg-green-50 border-2 border-green-400 px-5 py-3 text-center">
      <div className="text-sm font-semibold text-green-700">{data.softStart.name}</div>
      <div className="text-xs text-green-500 bg-green-100 rounded-full px-2 py-0.5 mt-1 inline-block">
        {data.softStart.buttonLabel}
      </div>
    </div>
  );
}

function ReadOnlyNoteNode({ data }: { data: { note: { content: string } } }) {
  return (
    <div
      className="min-w-[160px] max-w-[240px] p-3 rounded shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #FEF9C3 0%, #FDE68A 100%)',
        borderLeft: '3px solid #F59E0B',
      }}
    >
      <div className="text-xs text-gray-700 whitespace-pre-wrap">{data.note.content}</div>
    </div>
  );
}

const readOnlyNodeTypes: NodeTypes = {
  stepNode: ReadOnlyStepNode as unknown as NodeTypes['stepNode'],
  softStartNode: ReadOnlySoftStartNode as unknown as NodeTypes['softStartNode'],
  noteNode: ReadOnlyNoteNode as unknown as NodeTypes['noteNode'],
};

// ============================================================
// Comment thread types
// ============================================================
interface Comment {
  id: string;
  blockId: string;
  authorName: string;
  authorEmail?: string;
  authorType: string;
  content: string;
  isResolved: boolean;
  createdAt: string;
  replies?: Comment[];
}

// ============================================================
// Comment Sidebar
// ============================================================
function CommentSidebar({
  blockId,
  comments,
  onClose,
  onSubmit,
}: {
  blockId: string;
  comments: Comment[];
  onClose: () => void;
  onSubmit: (data: { blockId: string; authorName: string; authorEmail?: string; content: string; parentId?: string }) => Promise<void>;
}) {
  const [authorName, setAuthorName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('share-author-name') || '' : ''
  );
  const [authorEmail, setAuthorEmail] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('share-author-email') || '' : ''
  );
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const blockComments = comments.filter((c) => c.blockId === blockId);

  const handleSubmit = async () => {
    if (!authorName.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      localStorage.setItem('share-author-name', authorName.trim());
      if (authorEmail.trim()) {
        localStorage.setItem('share-author-email', authorEmail.trim());
      }
      await onSubmit({
        blockId,
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim() || undefined,
        content: content.trim(),
        parentId: replyTo || undefined,
      });
      setContent('');
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Comments</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {blockComments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No comments yet. Be the first!</p>
        )}
        {blockComments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className={`rounded-lg p-2.5 text-xs ${comment.authorType === 'internal' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-700">{comment.authorName}</span>
                <span className="text-gray-400 text-[10px]">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap">{comment.content}</p>
              {comment.isResolved && (
                <span className="text-[10px] text-green-600 bg-green-50 rounded px-1.5 py-0.5 mt-1 inline-block">Resolved</span>
              )}
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-[10px] text-blue-500 hover:text-blue-700 mt-1 block"
              >
                Reply
              </button>
            </div>
            {comment.replies?.map((reply) => (
              <div key={reply.id} className="ml-4 rounded-lg p-2 text-xs bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-700">{reply.authorName}</span>
                  <span className="text-gray-400 text-[10px]">
                    {new Date(reply.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{reply.content}</p>
              </div>
            ))}
            {replyTo === comment.id && (
              <div className="ml-4 flex gap-1">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !content.trim()}
                  className="self-end px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New comment form */}
      <div className="border-t border-gray-200 px-4 py-3 space-y-2">
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name *"
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
        />
        <input
          type="email"
          value={authorEmail}
          onChange={(e) => setAuthorEmail(e.target.value)}
          placeholder="Email (optional)"
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
        />
        <div className="flex gap-1">
          <textarea
            value={replyTo ? '' : content}
            onChange={(e) => { setReplyTo(null); setContent(e.target.value); }}
            placeholder="Write a comment..."
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 resize-none"
            rows={3}
          />
          <button
            onClick={() => { setReplyTo(null); handleSubmit(); }}
            disabled={submitting || !authorName.trim() || !content.trim() || !!replyTo}
            className="self-end px-3 py-1.5 bg-blue-500 text-white rounded text-xs disabled:opacity-50 hover:bg-blue-600"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Share Page
// ============================================================
export default function SharePage() {
  const params = useParams() ?? {};
  const token = (params?.token as string) || '';

  const [stage, setStage] = useState<'loading' | 'password' | 'canvas'>('loading');
  const [projectName, setProjectName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [jwt, setJwt] = useState('');

  // Canvas state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  // Retry countdown
  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev && prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  // Fetch share info on mount
  useEffect(() => {
    fetch(`/api/share/${token}/info`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data) => {
        setProjectName(data.projectName);
        setStage('password');
      })
      .catch(() => {
        setError('This share link is invalid or has expired.');
        setStage('password');
      });
  }, [token]);

  const handleVerify = async () => {
    setError('');
    try {
      const res = await fetch(`/api/share/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setRetryAfter(data.retryAfter || 60);
        setError('Too many attempts. Please wait.');
        return;
      }

      if (res.status === 401) {
        setAttemptsRemaining(data.attemptsRemaining ?? null);
        setError('Invalid password');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Failed to verify');
        return;
      }

      setJwt(data.token);
      await loadContent(data.token);
      setStage('canvas');
    } catch {
      setError('Network error. Please try again.');
    }
  };

  const loadContent = async (authToken: string) => {
    const [contentRes, commentsRes] = await Promise.all([
      fetch(`/api/share/${token}/content`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
      fetch(`/api/share/${token}/comments`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
    ]);

    if (contentRes.ok) {
      const content = await contentRes.json();
      const flowNodes: Node[] = [];

      // Map steps to nodes
      for (const step of content.steps || []) {
        const pos = content.nodePositions?.[step.id] || { x: 0, y: 0 };
        flowNodes.push({
          id: step.id,
          type: 'stepNode',
          position: pos,
          data: {
            step,
            onBlockClick: (blockId: string) => setSelectedBlock(blockId),
          },
          draggable: false,
          connectable: false,
        });
      }

      // Map soft starts
      for (const ss of content.softStarts || []) {
        const pos = content.nodePositions?.[ss.id] || { x: 0, y: 0 };
        flowNodes.push({
          id: ss.id,
          type: 'softStartNode',
          position: pos,
          data: { softStart: ss },
          draggable: false,
          connectable: false,
        });
      }

      // Map notes
      for (const note of content.notes || []) {
        const pos = content.nodePositions?.[note.id] || note.position || { x: 0, y: 0 };
        flowNodes.push({
          id: note.id,
          type: 'noteNode',
          position: pos,
          data: { note },
          draggable: false,
          connectable: false,
        });
      }

      setNodes(flowNodes);
    }

    if (commentsRes.ok) {
      const grouped = await commentsRes.json();
      const allComments: Comment[] = [];
      for (const blockComments of Object.values(grouped)) {
        allComments.push(...(blockComments as Comment[]));
      }
      setComments(allComments);
    }
  };

  const handleSubmitComment = async (data: {
    blockId: string;
    authorName: string;
    authorEmail?: string;
    content: string;
    parentId?: string;
  }) => {
    const res = await fetch(`/api/share/${token}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      // Reload comments
      const commentsRes = await fetch(`/api/share/${token}/comments`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (commentsRes.ok) {
        const grouped = await commentsRes.json();
        const allComments: Comment[] = [];
        for (const blockComments of Object.values(grouped)) {
          allComments.push(...(blockComments as Comment[]));
        }
        setComments(allComments);
      }
    }
  };

  // Compute comment counts per block
  const commentCounts: Record<string, number> = {};
  for (const c of comments) {
    commentCounts[c.blockId] = (commentCounts[c.blockId] || 0) + 1;
  }

  // Inject comment counts and click handler into step nodes
  const nodesWithComments = nodes.map((n) => {
    if (n.type === 'stepNode') {
      return {
        ...n,
        data: {
          ...n.data,
          onBlockClick: (blockId: string) => setSelectedBlock(blockId),
          commentCounts,
        },
      };
    }
    return n;
  });

  // Password stage
  if (stage === 'loading' || stage === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Sefbot Designer</h1>
            {projectName && (
              <p className="text-sm text-gray-500 mt-1">{projectName}</p>
            )}
          </div>

          {stage === 'loading' ? (
            <div className="text-center text-sm text-gray-400">Loading...</div>
          ) : error && !projectName ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Enter password to view</span>
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="Password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={!!retryAfter}
              />

              {error && (
                <p className="text-xs text-red-500 mb-2">
                  {error}
                  {attemptsRemaining !== null && ` (${attemptsRemaining} attempts remaining)`}
                </p>
              )}
              {retryAfter && (
                <p className="text-xs text-orange-500 mb-2">
                  Try again in {retryAfter}s
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={!password || !!retryAfter}
                className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                View Project
              </button>
            </div>
          )}

          <p className="text-center text-[10px] text-gray-400 mt-6">
            Powered by Sefbot Designer
          </p>
        </div>
      </div>
    );
  }

  // Canvas stage
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">{projectName}</span>
          <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">Shared View</span>
        </div>
        <p className="text-[10px] text-gray-400">Click any block to leave a comment</p>
      </div>

      {/* Canvas + Sidebar */}
      <div className="flex-1 flex">
        <div className="flex-1">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodesWithComments}
              edges={[]}
              nodeTypes={readOnlyNodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              zoomOnScroll
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {selectedBlock && (
          <CommentSidebar
            blockId={selectedBlock}
            comments={comments}
            onClose={() => setSelectedBlock(null)}
            onSubmit={handleSubmitComment}
          />
        )}
      </div>
    </div>
  );
}
