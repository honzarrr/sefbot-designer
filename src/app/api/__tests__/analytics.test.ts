import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    analyticsReport: {
      findUnique: vi.fn(),
    },
    conversation: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    conversationInteraction: {
      count: vi.fn(),
    },
    conversionEvent: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

function createRequest(method: string, url: string) {
  return new Request(url, { method }) as unknown;
}

describe('Analytics API - /api/analytics/report/[token]', () => {
  let GET: typeof import('@/app/api/analytics/report/[token]/route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/analytics/report/[token]/route');
    GET = mod.GET;
  });

  it('returns 404 when report token does not exist', async () => {
    vi.mocked(prisma.analyticsReport.findUnique).mockResolvedValue(null as never);

    const req = createRequest('GET', 'http://localhost/api/analytics/report/bad-token');
    const response = await GET(req as never, { params: { token: 'bad-token' } });

    expect(response.status).toBe(404);
  });

  it('returns 410 for expired report', async () => {
    vi.mocked(prisma.analyticsReport.findUnique).mockResolvedValue({
      token: 'expired-token',
      expiresAt: new Date('2020-01-01'),
      chatbot: { id: 'cb-1', name: 'Bot' },
      chatbotId: 'cb-1',
    } as never);

    const req = createRequest('GET', 'http://localhost/api/analytics/report/expired-token');
    const response = await GET(req as never, { params: { token: 'expired-token' } });

    expect(response.status).toBe(410);
  });

  it('returns summary with correct counts', async () => {
    const now = new Date();
    vi.mocked(prisma.analyticsReport.findUnique).mockResolvedValue({
      token: 'valid-token',
      expiresAt: null,
      chatbot: { id: 'cb-1', name: 'Test Bot' },
      chatbotId: 'cb-1',
    } as never);

    vi.mocked(prisma.conversation.count).mockResolvedValue(42 as never);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      { startedAt: now, endedAt: new Date(now.getTime() + 60000) },
      { startedAt: now, endedAt: new Date(now.getTime() + 120000) },
    ] as never);
    vi.mocked(prisma.conversationInteraction.count)
      .mockResolvedValueOnce(10 as never)  // emails
      .mockResolvedValueOnce(5 as never)   // phones
      .mockResolvedValueOnce(20 as never); // faq

    // For allConversations (time series, devices, etc.)
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      { startedAt: now, endedAt: new Date(now.getTime() + 60000), deviceType: 'mobile', pageUrl: '/home', isWorkHours: true, isWeekend: false },
      { startedAt: now, endedAt: new Date(now.getTime() + 120000), deviceType: 'desktop', pageUrl: '/about', isWorkHours: false, isWeekend: true },
    ] as never);

    vi.mocked(prisma.conversionEvent.findMany).mockResolvedValue([
      { conversionName: 'signup', conversionType: 'goal' },
      { conversionName: 'signup', conversionType: 'goal' },
    ] as never);

    const req = createRequest('GET', 'http://localhost/api/analytics/report/valid-token?range=30d');
    const response = await GET(req as never, { params: { token: 'valid-token' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.chatbot.name).toBe('Test Bot');
    expect(data.summary).toBeDefined();
    expect(data.summary.opens).toBe(42);
    expect(data.timeSeries).toBeDefined();
    expect(Array.isArray(data.timeSeries)).toBe(true);
    expect(data.devices).toBeDefined();
    expect(data.conversions).toBeDefined();
  });

  it('respects range parameter for 7d', async () => {
    vi.mocked(prisma.analyticsReport.findUnique).mockResolvedValue({
      token: 'valid',
      expiresAt: null,
      chatbot: { id: 'cb-1', name: 'Bot' },
      chatbotId: 'cb-1',
    } as never);
    vi.mocked(prisma.conversation.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.conversationInteraction.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.conversionEvent.findMany).mockResolvedValue([] as never);

    const req = createRequest('GET', 'http://localhost/api/analytics/report/valid?range=7d');
    const response = await GET(req as never, { params: { token: 'valid' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    // 7 days should produce ~8 time series entries (today + 7 days)
    expect(data.timeSeries.length).toBeLessThanOrEqual(9);
    expect(data.timeSeries.length).toBeGreaterThanOrEqual(7);
  });

  it('returns work hours and weekends breakdown', async () => {
    vi.mocked(prisma.analyticsReport.findUnique).mockResolvedValue({
      token: 'valid',
      expiresAt: null,
      chatbot: { id: 'cb-1', name: 'Bot' },
      chatbotId: 'cb-1',
    } as never);
    vi.mocked(prisma.conversation.count).mockResolvedValue(3 as never);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      { startedAt: new Date(), deviceType: 'mobile', pageUrl: '/', isWorkHours: true, isWeekend: false },
      { startedAt: new Date(), deviceType: 'desktop', pageUrl: '/', isWorkHours: true, isWeekend: false },
      { startedAt: new Date(), deviceType: 'mobile', pageUrl: '/', isWorkHours: false, isWeekend: true },
    ] as never);
    vi.mocked(prisma.conversationInteraction.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.conversionEvent.findMany).mockResolvedValue([] as never);

    const req = createRequest('GET', 'http://localhost/api/analytics/report/valid');
    const response = await GET(req as never, { params: { token: 'valid' } });
    const data = await response.json();

    expect(data.workHours).toHaveLength(2);
    expect(data.weekends).toHaveLength(2);
  });
});
