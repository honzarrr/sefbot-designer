'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  MessageCircle,
  X,
} from 'lucide-react';

interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  blockId: string | null;
  commentId: string | null;
  createdAt: string;
  comment?: {
    id: string;
    content: string;
    authorName: string;
    authorType: string;
    blockId: string;
    isResolved: boolean;
  } | null;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const priorityConfig = {
  high: { icon: ArrowUp, color: 'text-red-500', bg: 'bg-red-50', label: 'High' },
  normal: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Normal' },
  low: { icon: ArrowDown, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Low' },
};

const statusConfig = {
  open: { icon: Circle, color: 'text-gray-400', label: 'Open' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  done: { icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
};

export default function TodoBoardPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const projectId = (params?.id as string) || '';

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/todos`);
      if (res.ok) {
        setTodos(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const updateTodoStatus = async (todoId: string, status: string) => {
    await fetch(`/api/projects/${projectId}/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchTodos();
  };

  const updateTodoPriority = async (todoId: string, priority: string) => {
    await fetch(`/api/projects/${projectId}/todos/${todoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    });
    fetchTodos();
  };

  const createTodo = async () => {
    if (!newTitle.trim()) return;
    await fetch(`/api/projects/${projectId}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        priority: newPriority,
      }),
    });
    setNewTitle('');
    setNewDescription('');
    setNewPriority('normal');
    setShowNewForm(false);
    fetchTodos();
    toast.success('Todo created.');
  };

  const columns = [
    { key: 'open', ...statusConfig.open },
    { key: 'in_progress', ...statusConfig.in_progress },
    { key: 'done', ...statusConfig.done },
  ];

  const filteredTodos = todos.filter((t) => {
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesSearch = !searchFilter || t.title.toLowerCase().includes(searchFilter.toLowerCase()) || (t.description && t.description.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-gray-700">Todo Board</h1>

        <div className="ml-auto flex items-center gap-2">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search todos..."
            className="text-xs border border-gray-200 rounded px-2 py-1 w-40"
          />

          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1 text-xs bg-blue-500 text-white rounded px-3 py-1.5 hover:bg-blue-600"
          >
            <Plus className="w-3 h-3" />
            New Todo
          </button>
        </div>
      </header>

      {/* New todo form (modal) */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">New Todo</h2>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title *"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              autoFocus
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
              rows={3}
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              <option value="high">High Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewForm(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={createTodo}
                disabled={!newTitle.trim()}
                className="text-xs bg-blue-500 text-white rounded-lg px-4 py-1.5 hover:bg-blue-600 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Loading...
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-[700px]">
            {columns.map((col) => {
              const Icon = col.icon;
              const columnTodos = filteredTodos.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className="flex-1 flex flex-col min-w-[220px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Icon className={`w-4 h-4 ${col.color}`} />
                    <span className="text-xs font-semibold text-gray-600">{col.label}</span>
                    <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-1.5 py-0.5">
                      {columnTodos.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {columnTodos.map((todo) => {
                      const pConfig = priorityConfig[todo.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                      const PIcon = pConfig.icon;
                      return (
                        <div
                          key={todo.id}
                          className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setExpandedTodo(expandedTodo === todo.id ? null : todo.id)}
                        >
                          <div className="flex items-start gap-2">
                            <PIcon className={`w-3 h-3 mt-0.5 ${pConfig.color}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 line-clamp-2">{todo.title}</p>
                              {todo.comment && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MessageCircle className="w-2.5 h-2.5 text-gray-400" />
                                  <span className="text-[10px] text-gray-400 truncate">
                                    {todo.comment.authorName}
                                  </span>
                                </div>
                              )}
                              {todo.blockId && (
                                <span className="text-[10px] text-gray-400 mt-0.5 block">
                                  Block: {todo.blockId.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expanded view */}
                          {expandedTodo === todo.id && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                              {todo.description && (
                                <p className="text-xs text-gray-500">{todo.description}</p>
                              )}
                              {todo.comment && (
                                <div className="bg-gray-50 rounded p-2 text-xs">
                                  <span className="font-medium text-gray-600">{todo.comment.authorName}:</span>
                                  <span className="text-gray-500 ml-1">{todo.comment.content}</span>
                                </div>
                              )}
                              {todo.assignee && (
                                <div className="text-[10px] text-gray-500">
                                  Assigned to: {todo.assignee.firstName} {todo.assignee.lastName}
                                </div>
                              )}

                              {/* Status change */}
                              <div className="flex gap-1 mt-2">
                                {columns.map((s) => (
                                  <button
                                    key={s.key}
                                    onClick={() => updateTodoStatus(todo.id, s.key)}
                                    className={`text-[10px] px-2 py-1 rounded ${
                                      todo.status === s.key
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>

                              {/* Priority change */}
                              <div className="flex gap-1">
                                {Object.entries(priorityConfig).map(([key, config]) => (
                                  <button
                                    key={key}
                                    onClick={() => updateTodoPriority(todo.id, key)}
                                    className={`text-[10px] px-2 py-1 rounded ${
                                      todo.priority === key
                                        ? `${config.bg} ${config.color} font-medium`
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                  >
                                    {config.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {columnTodos.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-[10px] text-gray-300">{col.key === 'done' ? 'All caught up!' : 'No items'}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
