import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  verifyJwt: vi.fn(),
}));

import { GET } from './route';
import { verifyJwt } from '@/lib/auth';

function makeRequest(cookie?: string) {
  return new Request('http://localhost/api/user', {
    headers: cookie ? { cookie } : {},
  });
}

describe('GET /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token cookie', async () => {
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('未登录');
  });

  it('returns 401 when token is invalid', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce(null as never);

    const response = await GET(makeRequest('token=invalid'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('token 无效');
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 999, email: 'x@x.com' } as never);
    mockGet.mockReturnValueOnce(undefined);

    const response = await GET(makeRequest('token=valid'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('用户不存在');
  });

  it('returns 200 with user data on success', async () => {
    const user = { id: 1, email: 'test@greenmiles.com', miles_balance: 10000 };
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'test@greenmiles.com' } as never);
    mockGet.mockReturnValueOnce(user);

    const response = await GET(makeRequest('token=valid'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.user).toEqual(user);
  });

  it('returns 500 on db error', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet.mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const response = await GET(makeRequest('token=valid'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('获取用户信息失败');
  });
});
