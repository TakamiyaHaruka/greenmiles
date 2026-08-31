import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  signAdminJwt: vi.fn().mockResolvedValue('admin-jwt-token'),
}));

import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 503 when ADMIN_PASSWORD is not configured', async () => {
    delete process.env.ADMIN_PASSWORD;
    const response = await POST(makeRequest({ password: 'whatever' }));
    expect(response.status).toBe(503);
  });

  it('returns 400 for an empty password', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await POST(makeRequest({ password: '' }));
    expect(response.status).toBe(400);
  });

  it('returns 401 for a wrong password', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await POST(makeRequest({ password: 'wrong' }));
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.error).toBe('管理员密码错误');
  });

  it('sets an admin session cookie for the correct password', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await POST(makeRequest({ password: 'secret' }));
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain('admin_token=admin-jwt-token');
    expect(setCookie).toContain('HttpOnly');
  });
});
