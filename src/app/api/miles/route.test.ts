import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockAll = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
      all: mockAll,
      run: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

import { GET } from './route';
import { getAuthUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

function getRequest(cookie = 'token=valid') {
  return new NextRequest('http://localhost/api/miles', {
    method: 'GET',
    headers: { cookie },
  });
}

describe('GET /api/miles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token', async () => {
    const response = await GET(getRequest(''));
    expect(response.status).toBe(401);
  });

  it('returns 404 when the user no longer exists', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 999, email: 'x@x.com' });
    mockGet.mockReturnValueOnce(undefined);

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('用户不存在');
  });

  it('returns the balance plus the most recent ledger entries', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' });
    mockGet.mockReturnValueOnce({ miles_balance: 6400 });
    const transactions = [
      { id: 3, amount: -1200, type: 'redeem', order_id: 1, description: '兑换「共享单车骑行卡」', created_at: '2026-08-31 10:00:00' },
      { id: 1, amount: 10000, type: 'grant', order_id: null, description: '注册赠礼', created_at: '2026-08-01 09:00:00' },
    ];
    mockAll.mockReturnValueOnce(transactions);

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.balance).toBe(6400);
    expect(data.data.transactions).toEqual(transactions);
    // The ledger is scoped to the signed-in member
    expect(mockAll).toHaveBeenCalledWith(1);
  });
});
