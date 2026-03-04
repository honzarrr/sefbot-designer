'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronDown, ChevronRight, Search, ChevronLeft,
  Monitor, Smartphone, Tablet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Interaction {
  id: string;
  type: string;
  stepId: string | null;
  stepName: string | null;
  content: unknown;
  createdAt: string;
}

interface ConversationLog {
  id: string;
  sessionId: string;
  deviceType: string | null;
  pageUrl: string | null;
  isWeekend: boolean;
  isWorkHours: boolean;
  startedAt: string;
  endedAt: string | null;
  interactionCount: number;
  interactions: Interaction[];
}

interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

function DeviceIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'mobile': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function ConversationLogsPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const chatbotId = (params?.id as string) || '';

  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, perPage: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const fetchLogs = useCallback(async (page: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (dateStart) params.set('start', dateStart);
    if (dateEnd) params.set('end', dateEnd);

    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/analytics/logs?${params}`);
      const data = await res.json();
      setLogs(data.data || []);
      setPagination(data.pagination || { page: 1, perPage: 20, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [chatbotId, search, dateStart, dateEnd]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/chatbots/${chatbotId}/analytics`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Analytics
        </Button>
        <h1 className="text-xl font-semibold">Conversation Logs</h1>
        <span className="text-sm text-muted-foreground ml-auto">
          {pagination.total} conversations
        </span>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by session ID, URL, or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <input
          type="date"
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
          className="border rounded px-2 py-2 text-sm"
        />
        <span className="text-muted-foreground text-sm">to</span>
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          className="border rounded px-2 py-2 text-sm"
        />
        <Button type="submit" size="sm">Filter</Button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No conversations found</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-8 p-2"></th>
                <th className="text-left p-2 font-medium">Session ID</th>
                <th className="text-left p-2 font-medium">Started</th>
                <th className="text-left p-2 font-medium">Ended</th>
                <th className="text-left p-2 font-medium">Device</th>
                <th className="text-left p-2 font-medium">URL</th>
                <th className="text-right p-2 font-medium">Interactions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <ConversationRow
                  key={log.id}
                  log={log}
                  expanded={expandedId === log.id}
                  onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchLogs(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchLogs(pagination.page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  log,
  expanded,
  onToggle,
}: {
  log: ConversationLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b hover:bg-muted/30 cursor-pointer"
        onClick={onToggle}
      >
        <td className="p-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="p-2 font-mono text-xs">{log.sessionId.slice(0, 8)}...</td>
        <td className="p-2">{formatTime(log.startedAt)}</td>
        <td className="p-2">{log.endedAt ? formatTime(log.endedAt) : '—'}</td>
        <td className="p-2">
          <div className="flex items-center gap-1">
            <DeviceIcon type={log.deviceType} />
            <span className="capitalize">{log.deviceType || 'unknown'}</span>
          </div>
        </td>
        <td className="p-2 truncate max-w-[200px]" title={log.pageUrl || ''}>
          {log.pageUrl || '—'}
        </td>
        <td className="p-2 text-right">{log.interactionCount}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-muted/20 p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">Interaction Timeline</div>
              {log.interactions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No interactions recorded</p>
              ) : (
                <div className="space-y-1">
                  {log.interactions.map((i) => (
                    <div key={i.id} className="flex items-start gap-3 text-xs">
                      <span className="text-muted-foreground whitespace-nowrap w-40 flex-shrink-0">
                        {formatTime(i.createdAt)}
                      </span>
                      <span className="font-medium bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        {i.type}
                      </span>
                      {i.stepName && (
                        <span className="text-muted-foreground">Step: {i.stepName}</span>
                      )}
                      {i.content ? (
                        <span className="text-muted-foreground truncate">
                          {typeof i.content === 'string' ? i.content : JSON.stringify(i.content)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
