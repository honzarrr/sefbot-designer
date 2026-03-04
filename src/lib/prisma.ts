import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// On Cloud Run (K_SERVICE env), use /tmp for writable SQLite
if (process.env.K_SERVICE && !process.env.DATABASE_URL?.includes('/tmp/')) {
  process.env.DATABASE_URL = 'file:/tmp/sefbot.db';
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
