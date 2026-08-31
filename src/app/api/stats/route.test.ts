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
  return new NextRequest('http://localhost/api/stats', {
    method: 'GET',
    headers: { cookie },
  });
}

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token', async () => {
    const response = await GET(getRequest(''));
    expect(response.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce(null as never);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it('aggregates platform KPIs from real order data', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet.mockReturnValueOnce({
      orderCount: 5,
      greenMilesSpent: 3200,
      treeCount: 2,
      outstandingMiles: 16800,
      userCo2Kg: 96.75,
    });
    // Rows come back DESC (newest first) and must be reversed for charting
    mockAll.mockReturnValueOnce([
      { month: '2026-08', milesSpent: 3000, trees: 1 },
      { month: '2026-07', milesSpent: 200, trees: 1 },
    ]);

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    // issued = spent (3200) + outstanding (16800) = 20000 → rate 0.16
    expect(data.data.conversionRate).toBe(0.16);
    expect(data.data.unspentMiles).toBe(16800);
    // 2 trees × 22 kg CO₂ per tree per year
    expect(data.data.totalCo2OffsetKg).toBe(44);
    expect(data.data.orderCount).toBe(5);
    expect(data.data.userCo2Kg).toBe(96.75);
    // Oldest month first
    expect(data.data.monthly[0].month).toBe('2026-07');
    expect(data.data.monthly[1].offsetKg).toBe(22);
  });

  it('handles an empty platform without dividing by zero', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet.mockReturnValueOnce({
      orderCount: 0,
      greenMilesSpent: 0,
      treeCount: 0,
      outstandingMiles: 10000,
      userCo2Kg: 0,
    });
    mockAll.mockReturnValueOnce([]);

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.conversionRate).toBe(0);
    expect(data.data.monthly).toEqual([]);
  });
});
