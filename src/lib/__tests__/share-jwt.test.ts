import { describe, it, expect } from 'vitest';
import { signShareJWT, verifyShareJWT } from '../share-jwt';

describe('share-jwt', () => {
  it('signs and verifies a JWT token', async () => {
    const payload = { shareToken: 'abc123', projectId: 'proj-1' };
    const token = await signShareJWT(payload);

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const verified = await verifyShareJWT(token);
    expect(verified).not.toBeNull();
    expect(verified!.shareToken).toBe('abc123');
    expect(verified!.projectId).toBe('proj-1');
  });

  it('returns null for invalid token', async () => {
    const result = await verifyShareJWT('invalid-token');
    expect(result).toBeNull();
  });

  it('returns null for tampered token', async () => {
    const token = await signShareJWT({ shareToken: 'test', projectId: 'p1' });
    // Tamper with the token
    const tampered = token.slice(0, -5) + 'xxxxx';
    const result = await verifyShareJWT(tampered);
    expect(result).toBeNull();
  });

  it('produces different tokens for different payloads', async () => {
    const token1 = await signShareJWT({ shareToken: 'a', projectId: '1' });
    const token2 = await signShareJWT({ shareToken: 'b', projectId: '2' });
    expect(token1).not.toBe(token2);
  });
});
