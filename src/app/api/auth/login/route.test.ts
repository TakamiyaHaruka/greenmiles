import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockCompare = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  signJwt: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: (...args: unknown[]) => mockCompare(...args) },
}));

import { POST } from './route';
import { signJwt } from '@/lib/auth';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockCompare.mockReset();
    vi.mocked(signJwt).mockReset();
  });

  it('returns 400 for invalid email', async () => {
    const response = await POST(makeRequest({ email: 'bad', password: 'password123' }));
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    mockGet.mockReturnValueOnce(undefined);

    const response = await POST(makeRequest({ email: 'no@user.com', password: 'password123' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('邮箱或密码错误');
  });

  it('returns 401 when password is wrong', async () => {
    mockGet.mockReturnValue({
      id: 1,
      email: 'test@greenmiles.com',
      password_hash: 'hashed',
      miles_balance: 10000,
    });
    mockCompare.mockResolvedValue(false);

    const response = await POST(makeRequest({ email: 'test@greenmiles.com', password: 'wrongpwd' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('邮箱或密码错误');
  });

  it('returns 200 with user data and sets cookie on success', async () => {
    const user = { id: 1, email: 'test@greenmiles.com', password_hash: 'hashed', miles_balance: 10000 };
    mockGet.mockReturnValueOnce(user);
    mockCompare.mockResolvedValueOnce(true);
    vi.mocked(signJwt).mockResolvedValueOnce('jwt-token');

    const response = await POST(makeRequest({ email: 'test@greenmiles.com', password: 'password123' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.user).toEqual({
      id: 1,
      email: 'test@greenmiles.com',
      miles_balance: 10000,
    });
    expect(response.cookies.get('token')).toBeDefined();
  });

  it('returns 500 on unexpected error', async () => {
    mockGet.mockImplementationOnce(() => {
      throw new Error('DB crash');
    });

    const response = await POST(makeRequest({ email: 'test@greenmiles.com', password: 'password123' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('登录失败，请稍后重试');
  });
});
