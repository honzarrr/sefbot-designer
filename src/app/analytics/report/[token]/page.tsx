'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import {
  BarChart3, ExternalLink, Mail, Phone,
  HelpCircle, Clock, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type DateRange = '7d' | '30d' | '90d';

interface ReportData {
  chatbot: { id: string; name: string };
  summary: {
    opens: number;
    uniqueSessions: number;
    emailsCollected: number;
    phonesCollected: number;
    faqViews: number;
    avgDurationSeconds: number;
  };
  timeSeries: { date: string; conversations: number }[];
  devices: { device: string; count: number }[];
  urls: { pageUrl: string; count: number }[];
  workHours: { label: string; count: number }[];
  weekends: { label: string; count: number }[];
  conversions: { name: string; type: string; count: number }[];
}

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function SharedReportPage() {
  const params = useParams() ?? {};
  const token = params.token as string;

  const [range, setRange] = useState<DateRange>('30d');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/report/${token}?range=${range}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to load report');
        return;
      }
      setData(await res.json());
      setError(null);
    } catch {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchReport, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchReport]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-background">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
          <p className="text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-background">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">Report Unavailable</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, timeSeries, devices, urls, workHours, weekends, conversions } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Branding Header */}
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Sefbot Analytics</span>
        </div>
        <span className="text-sm text-muted-foreground">{data.chatbot.name}</span>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard icon={<ExternalLink className="h-4 w-4" />} label="Opens" value={summary.opens} />
          <SummaryCard icon={<Mail className="h-4 w-4" />} label="Emails" value={summary.emailsCollected} />
          <SummaryCard icon={<Phone className="h-4 w-4" />} label="Phones" value={summary.phonesCollected} />
          <SummaryCard icon={<MessageSquare className="h-4 w-4" />} label="Questions" value={summary.uniqueSessions} />
          <SummaryCard icon={<HelpCircle className="h-4 w-4" />} label="FAQ Views" value={summary.faqViews} />
          <SummaryCard icon={<Clock className="h-4 w-4" />} label="Avg Duration" value={formatDuration(summary.avgDurationSeconds)} />
        </div>

        {/* Line Chart */}
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={((props: any) => `${props.device} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as any}
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

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t">
          Powered by Sefbot — Auto-refreshes every 5 minutes
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
