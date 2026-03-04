import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth and prisma
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatbot: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function createRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown;
}

describe('Chatbots API - /api/chatbots', () => {
  let GET: typeof import('@/app/api/chatbots/route').GET;
  let POST: typeof import('@/app/api/chatbots/route').POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/chatbots/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  describe('GET /api/chatbots', () => {
    it('returns 401 without session', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const req = createRequest('GET', 'http://localhost/api/chatbots');
      const response = await GET(req as never);

      expect(response.status).toBe(401);
    });

    it('returns chatbot list for authenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
      const now = new Date();
      vi.mocked(prisma.chatbot.findMany).mockResolvedValue([
        {
          id: 'cb-1',
          name: 'Test Bot',
          organizationId: 'org-1',
          active: true,
          deletedAt: null,
          projectId: null,
          createdAt: now,
          updatedAt: now,
        },
      ] as never);

      const req = createRequest('GET', 'http://localhost/api/chatbots');
      const response = await GET(req as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Test Bot');
      expect(data[0].deletedAt).toBeNull();
    });

    it('excludes soft-deleted chatbots', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
      vi.mocked(prisma.chatbot.findMany).mockResolvedValue([] as never);

      const req = createRequest('GET', 'http://localhost/api/chatbots');
      await GET(req as never);

      expect(prisma.chatbot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });
  });

  describe('POST /api/chatbots', () => {
    it('returns 401 without session', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const req = createRequest('POST', 'http://localhost/api/chatbots', {
        name: 'Bot',
        organizationId: 'org-1',
      });
      const response = await POST(req as never);

      expect(response.status).toBe(401);
    });

    it('returns 400 when name is empty', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);

      const req = createRequest('POST', 'http://localhost/api/chatbots', {
        name: '',
        organizationId: 'org-1',
      });
      const response = await POST(req as never);

      expect(response.status).toBe(400);
    });

    it('returns 400 when organizationId is missing', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);

      const req = createRequest('POST', 'http://localhost/api/chatbots', {
        name: 'Bot',
      });
      const response = await POST(req as never);

      expect(response.status).toBe(400);
    });

    it('returns 404 when organization does not exist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null as never);

      const req = createRequest('POST', 'http://localhost/api/chatbots', {
        name: 'Bot',
        organizationId: 'bad-org',
      });
      const response = await POST(req as never);

      expect(response.status).toBe(404);
    });

    it('creates chatbot with valid data', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({ id: 'org-1' } as never);
      const now = new Date();
      vi.mocked(prisma.chatbot.create).mockResolvedValue({
        id: 'cb-new',
        name: 'My Bot',
        organizationId: 'org-1',
        active: true,
        deletedAt: null,
        projectId: null,
        createdAt: now,
        updatedAt: now,
      } as never);

      const req = createRequest('POST', 'http://localhost/api/chatbots', {
        name: 'My Bot',
        organizationId: 'org-1',
      });
      const response = await POST(req as never);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('My Bot');
      expect(data.id).toBe('cb-new');
    });
  });
});

describe('Chatbots API - /api/chatbots/[id]', () => {
  let GET: typeof import('@/app/api/chatbots/[id]/route').GET;
  let PUT: typeof import('@/app/api/chatbots/[id]/route').PUT;
  let DELETE: typeof import('@/app/api/chatbots/[id]/route').DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/chatbots/[id]/route');
    GET = mod.GET;
    PUT = mod.PUT;
    DELETE = mod.DELETE;
  });

  it('GET returns 401 without session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = createRequest('GET', 'http://localhost/api/chatbots/cb-1');
    const response = await GET(req as never, { params: { id: 'cb-1' } });

    expect(response.status).toBe(401);
  });

  it('GET returns 404 for non-existent chatbot', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
    vi.mocked(prisma.chatbot.findUnique).mockResolvedValue(null as never);

    const req = createRequest('GET', 'http://localhost/api/chatbots/bad-id');
    const response = await GET(req as never, { params: { id: 'bad-id' } });

    expect(response.status).toBe(404);
  });

  it('DELETE performs soft delete by setting deletedAt and active=false', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
    const deletedAt = new Date();
    vi.mocked(prisma.chatbot.update).mockResolvedValue({
      id: 'cb-1',
      deletedAt,
    } as never);

    const req = createRequest('DELETE', 'http://localhost/api/chatbots/cb-1');
    const response = await DELETE(req as never, { params: { id: 'cb-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deletedAt).toBeDefined();

    expect(prisma.chatbot.update).toHaveBeenCalledWith({
      where: { id: 'cb-1' },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        active: false,
      }),
    });
  });

  it('PUT updates chatbot name', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
    const now = new Date();
    vi.mocked(prisma.chatbot.update).mockResolvedValue({
      id: 'cb-1',
      name: 'Updated Name',
      organizationId: 'org-1',
      active: true,
      deletedAt: null,
      projectId: null,
      createdAt: now,
      updatedAt: now,
    } as never);

    const req = createRequest('PUT', 'http://localhost/api/chatbots/cb-1', {
      name: 'Updated Name',
    });
    const response = await PUT(req as never, { params: { id: 'cb-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Updated Name');
  });
});
