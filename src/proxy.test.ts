import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// vi.hoisted: the vi.mock factory is hoisted above the const, so it needs a hoisted reference
const { verifyJwtMock } = vi.hoisted(() => ({ verifyJwtMock: vi.fn() }));

vi.mock('@/lib/auth', () => ({
  verifyJwt: verifyJwtMock,
}));

import { proxy } from './proxy';

function makeRequest(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.cookie = `token=${token}`;
  }
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe('proxy (route guard)', () => {
  beforeEach(() => {
    verifyJwtMock.mockReset();
  });

  it('lets public routes pass through', async () => {
    for (const path of ['/', '/login', '/register', '/admin', '/api/auth/login', '/api/auth/register']) {
      const res = await proxy(makeRequest(path));
      expect(res.status).toBe(200);
    }
  });

  it('lets admin API routes pass through (own session gate)', async () => {
    const res = await proxy(makeRequest('/api/admin/products'));
    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated page visits to /login with a from param', async () => {
    const res = await proxy(makeRequest('/orders'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login?from=%2Forders');
  });

  it('returns JSON 401 for unauthenticated API calls instead of a redirect', async () => {
    const res = await proxy(makeRequest('/api/orders'));
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toContain('application/json');
    await expect(res.json()).resolves.toEqual({ error: 'unauthorized' });
  });

  it('redirects to /login when the token is invalid', async () => {
    verifyJwtMock.mockResolvedValue(null);
    const res = await proxy(makeRequest('/mall', 'bad-token'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login?from=%2Fmall');
    expect(verifyJwtMock).toHaveBeenCalledWith('bad-token');
  });

  it('lets valid tokens through', async () => {
    verifyJwtMock.mockResolvedValue({ userId: 1, email: 'test@greenmiles.com' });
    const res = await proxy(makeRequest('/orders', 'valid-token'));
    expect(res.status).toBe(200);
    expect(verifyJwtMock).toHaveBeenCalledWith('valid-token');
  });
});
