import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing route handlers
vi.mock('@/lib/prisma', () => ({
  prisma: {
    projectShare: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

vi.mock('@/lib/share-jwt', () => ({
  signShareJWT: vi.fn().mockResolvedValue('mock-jwt-token'),
}));

import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

// Helper to create NextRequest-like objects
function createRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const req = new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req as unknown;
}

describe('Share API - /api/share/[token]/info', () => {
  let GET: typeof import('@/app/api/share/[token]/info/route').GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to get fresh module with mocks
    const mod = await import('@/app/api/share/[token]/info/route');
    GET = mod.GET;
  });

  it('returns 404 for non-existent share token', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue(null);

    const req = createRequest('GET', 'http://localhost/api/share/bad-token/info');
    const response = await GET(req as never, { params: { token: 'bad-token' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Share not found');
  });

  it('returns 404 for inactive share', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue({
      id: '1',
      shareToken: 'token-1',
      isActive: false,
      project: { name: 'Test' },
    } as never);

    const req = createRequest('GET', 'http://localhost/api/share/token-1/info');
    const response = await GET(req as never, { params: { token: 'token-1' } });

    expect(response.status).toBe(404);
  });

  it('returns 410 for expired share', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue({
      id: '1',
      shareToken: 'token-1',
      isActive: true,
      expiresAt: new Date('2020-01-01'),
      project: { name: 'Test' },
    } as never);

    const req = createRequest('GET', 'http://localhost/api/share/token-1/info');
    const response = await GET(req as never, { params: { token: 'token-1' } });

    expect(response.status).toBe(410);
  });

  it('returns project info for valid share', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue({
      id: '1',
      shareToken: 'token-1',
      isActive: true,
      expiresAt: null,
      project: { name: 'My Project' },
    } as never);

    const req = createRequest('GET', 'http://localhost/api/share/token-1/info');
    const response = await GET(req as never, { params: { token: 'token-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projectName).toBe('My Project');
    expect(data.requiresPassword).toBe(true);
  });
});

describe('Share API - /api/share/[token]/verify', () => {
  let POST: typeof import('@/app/api/share/[token]/verify/route').POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to clear rate limit state
    vi.resetModules();
    const mod = await import('@/app/api/share/[token]/verify/route');
    POST = mod.POST;
  });

  it('returns 400 when password is missing', async () => {
    const req = createRequest(
      'POST',
      'http://localhost/api/share/token-1/verify',
      {}
    );
    const response = await POST(req as never, { params: { token: 'token-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Password is required');
  });

  it('returns 404 for non-existent share', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue(null);

    const req = createRequest(
      'POST',
      'http://localhost/api/share/bad-token/verify',
      { password: 'test' }
    );
    const response = await POST(req as never, { params: { token: 'bad-token' } });

    expect(response.status).toBe(404);
  });

  it('returns 401 for wrong password', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue({
      id: '1',
      shareToken: 'token-1',
      isActive: true,
      expiresAt: null,
      password: 'hashed-password',
      projectId: 'project-1',
    } as never);
    vi.mocked(compare).mockResolvedValue(false as never);

    const req = createRequest(
      'POST',
      'http://localhost/api/share/token-1/verify',
      { password: 'wrong' }
    );
    const response = await POST(req as never, { params: { token: 'token-1' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid password');
  });

  it('returns JWT token for correct password', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue({
      id: '1',
      shareToken: 'token-1',
      isActive: true,
      expiresAt: null,
      password: 'hashed-password',
      projectId: 'project-1',
    } as never);
    vi.mocked(compare).mockResolvedValue(true as never);

    const req = createRequest(
      'POST',
      'http://localhost/api/share/token-1/verify',
      { password: 'correct' }
    );
    const response = await POST(req as never, { params: { token: 'token-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('mock-jwt-token');
    expect(data.projectId).toBe('project-1');
  });

  it('returns 410 for expired share', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue({
      id: '1',
      shareToken: 'token-1',
      isActive: true,
      expiresAt: new Date('2020-01-01'),
      password: 'hashed',
      projectId: 'project-1',
    } as never);

    const req = createRequest(
      'POST',
      'http://localhost/api/share/token-1/verify',
      { password: 'test' }
    );
    const response = await POST(req as never, { params: { token: 'token-1' } });

    expect(response.status).toBe(410);
  });

  it('rate limits after 5 attempts from same IP', async () => {
    vi.mocked(prisma.projectShare.findUnique).mockResolvedValue({
      id: '1',
      shareToken: 'token-1',
      isActive: true,
      expiresAt: null,
      password: 'hashed',
      projectId: 'project-1',
    } as never);
    vi.mocked(compare).mockResolvedValue(false as never);

    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const req = createRequest(
        'POST',
        'http://localhost/api/share/token-1/verify',
        { password: 'wrong' },
        { 'x-forwarded-for': '10.0.0.99' }
      );
      await POST(req as never, { params: { token: 'token-1' } });
    }

    // 6th attempt should be rate limited
    const req = createRequest(
      'POST',
      'http://localhost/api/share/token-1/verify',
      { password: 'wrong' },
      { 'x-forwarded-for': '10.0.0.99' }
    );
    const response = await POST(req as never, { params: { token: 'token-1' } });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toContain('Too many attempts');
  });
});
