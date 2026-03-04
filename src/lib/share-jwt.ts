import { SignJWT, jwtVerify } from 'jose';

if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET environment variable is required in production');
}

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'dev-secret-change-in-production-min-32-chars-long'
);

interface SharePayload {
  shareToken: string;
  projectId: string;
}

export async function signShareJWT(payload: SharePayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyShareJWT(token: string): Promise<SharePayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      shareToken: payload.shareToken as string,
      projectId: payload.projectId as string,
    };
  } catch {
    return null;
  }
}
