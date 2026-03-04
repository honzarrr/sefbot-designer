'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import {
  BarChart3, Download, Share2, ExternalLink, Mail, Phone,
  HelpCircle, Clock, MessageSquare, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type DateRange = '7d' | '30d' | '90d' | 'custom';

interface SummaryData {
  opens: number;
  uniqueSessions: number;
  emailsCollected: number;
  phonesCollected: number;
  faqViews: number;
  avgDurationSeconds: number;
}

interface TimeSeriesPoint {
  date: string;
  conversations: number;
}

interface DeviceData {
  device: string;
  count: number;
}

interface UrlData {
  pageUrl: string;
  count: number;
}

interface LabelCount {
  label: string;
  count: number;
}

interface ConversionData {
  name: string;
  type: string;
  count: number;
}

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function AnalyticsPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const chatbotId = (params?.id as string) || '';

  const [range, setRange] = useState<DateRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [urls, setUrls] = useState<UrlData[]>([]);
  const [workHours, setWorkHours] = useState<LabelCount[]>([]);
  const [weekends, setWeekends] = useState<LabelCount[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);

  const buildDateParams = useCallback(() => {
    if (range === 'custom' && customStart && customEnd) {
      return `start=${customStart}&end=${customEnd}`;
    }
    const days = range === '90d' ? 90 : range === '7d' ? 7 : 30;
    const start = new Date(Date.now() - days * 86400000).toISOString();
    return `start=${start}`;
  }, [range, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const dateParams = buildDateParams();
    const base = `/api/chatbots/${chatbotId}/analytics`;

    try {
      const [summaryRes, tsRes, devRes, urlRes, whRes, weRes, convRes] = await Promise.all([
        fetch(`${base}/summary?${dateParams}`),
        fetch(`${base}/time-series?range=${range}${range === 'custom' ? `&start=${customStart}&end=${customEnd}` : ''}`),
        fetch(`${base}/devices?${dateParams}`),
        fetch(`${base}/urls?${dateParams}`),
        fetch(`${base}/work-hours?${dateParams}`),
        fetch(`${base}/weekends?${dateParams}`),
        fetch(`${base}/conversions?${dateParams}`),
      ]);

      const [summaryData, tsData, devData, urlData, whData, weData, convData] = await Promise.all([
        summaryRes.json(),
        tsRes.json(),
        devRes.json(),
        urlRes.json(),
        whRes.json(),
        weRes.json(),
        convRes.json(),
      ]);

      setSummary(summaryData);
      setTimeSeries(tsData.data || []);
      setDevices(devData.data || []);
      setUrls(urlData.data || []);
      setWorkHours(whData.data || []);
      setWeekends(weData.data || []);
      setConversions(convData.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [chatbotId, range, customStart, customEnd, buildDateParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (format: 'csv' | 'json') => {
    const dateParams = buildDateParams();
    const res = await fetch(`/api/chatbots/${chatbotId}/analytics/export?format=${format}&${dateParams}`);
    if (format === 'csv') {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${chatbotId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${chatbotId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = async () => {
    try {
      const res = await fetch(`/api/chatbots/${chatbotId}/analytics/share`, { method: 'POST' });
      const data = await res.json();
      const shareUrl = `${window.location.origin}/analytics/report/${data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p className="text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/chatbots/${chatbotId}/analytics/logs`)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Conversation Logs
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
            {copied ? 'Copied!' : 'Share Report'}
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center gap-2">
        {(['7d', '30d', '90d', 'custom'] as DateRange[]).map((r) => (
          <Button
            key={r}
            variant={range === r ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRange(r)}
          >
            {r === 'custom' ? 'Custom' : r}
          </Button>
        ))}
        {range === 'custom' && (
          <>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard icon={<ExternalLink className="h-4 w-4" />} label="Opens" value={summary.opens} />
          <SummaryCard icon={<Mail className="h-4 w-4" />} label="Emails" value={summary.emailsCollected} />
          <SummaryCard icon={<Phone className="h-4 w-4" />} label="Phones" value={summary.phonesCollected} />
          <SummaryCard icon={<MessageSquare className="h-4 w-4" />} label="Questions" value={summary.uniqueSessions} />
          <SummaryCard icon={<HelpCircle className="h-4 w-4" />} label="FAQ Views" value={summary.faqViews} />
          <SummaryCard icon={<Clock className="h-4 w-4" />} label="Avg Duration" value={formatDuration(summary.avgDurationSeconds)} />
        </div>
      )}

      {/* Line Chart: Conversations over time */}
      <div className="border rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-4">Conversations Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pie: Devices */}
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-4">Device Types</h2>
          {devices.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={devices}
                  dataKey="count"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {devices.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data</p>
          )}
        </div>

        {/* Bar: Work Hours */}
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-4">Work Hours</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={workHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Weekday vs Weekend */}
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-4">Weekday vs Weekend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* URLs Table */}
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-4">Top Pages</h2>
          {urls.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Page URL</th>
                  <th className="text-right py-2 font-medium">Conversations</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((u, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 truncate max-w-[300px]" title={u.pageUrl}>{u.pageUrl}</td>
                    <td className="py-2 text-right">{u.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No data</p>
          )}
        </div>

        {/* Conversions Table */}
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-4">Conversions</h2>
          {conversions.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Type</th>
                  <th className="text-right py-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-muted-foreground">{c.type}</td>
                    <td className="py-2 text-right">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No conversions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
