import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/preview/[token] — public preview (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const version = await prisma.chatbotVersion.findFirst({
    where: { changes: `preview:${token}` },
  });

  if (!version) {
    return NextResponse.json({ error: 'Preview not found or expired' }, { status: 404 });
  }

  return NextResponse.json({
    chatbotId: version.chatbotId,
    snapshot: JSON.parse(version.snapshot),
    createdAt: version.createdAt.toISOString(),
  });
}
