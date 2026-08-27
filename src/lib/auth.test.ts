import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from './auth';

describe('auth', () => {
  const payload = { userId: 1, email: 'test@greenmiles.com' };

  it('signJwt returns a non-empty string', async () => {
    const token = await signJwt(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('verifyJwt decodes a valid token', async () => {
    const token = await signJwt(payload);
    const decoded = await verifyJwt(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(1);
    expect(decoded!.email).toBe('test@greenmiles.com');
  });

  it('verifyJwt returns null for invalid token', async () => {
    const result = await verifyJwt('invalid.token.here');
    expect(result).toBeNull();
  });

  it('verifyJwt returns null for empty string', async () => {
    const result = await verifyJwt('');
    expect(result).toBeNull();
  });

  it('round-trip sign then verify preserves payload', async () => {
    const original = { userId: 42, email: 'user@example.com' };
    const token = await signJwt(original);
    const decoded = await verifyJwt(token);
    expect(decoded!.userId).toBe(original.userId);
    expect(decoded!.email).toBe(original.email);
  });
});
