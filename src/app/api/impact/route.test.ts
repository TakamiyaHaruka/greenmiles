import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet, mockAll, mockPrepare } = vi.hoisted(() => {
  const get = vi.fn();
  const all = vi.fn();
  return {
    mockGet: get,
    mockAll: all,
    mockPrepare: vi.fn((statement: string) => {
      void statement;
      return {
        get,
        all,
        run: vi.fn(),
      };
    }),
  };
});

vi.mock('@/lib/db', () => ({
  default: { prepare: mockPrepare },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

import { GET } from './route';
import { getAuthUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

function getRequest(cookie = 'token=valid') {
  return new NextRequest('http://localhost/api/impact', {
    method: 'GET',
    headers: { cookie },
  });
}

describe('GET /api/impact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the member is not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce(null as never);

    const response = await GET(getRequest(''));

    expect(response.status).toBe(401);
  });

  it('returns full-history totals, stable milestones, and redacted certificate sources', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 7, email: 'member@example.com' } as never);
    mockGet
      .mockReturnValueOnce({
        flightCount: 67,
        totalCo2Kg: 1234.567,
        netMilesAmount: -5200,
        treeCount: 4,
        certificateCount: 12,
      })
      .mockReturnValueOnce({
        firstFlightAt: '2026-01-01 08:00:00',
        firstTreeAt: '2026-02-02 08:00:00',
        firstRideAt: '2026-03-03 08:00:00',
      });
    mockAll.mockReturnValueOnce([
      {
        sourceType: 'tree',
        productName: '植树公益',
        quantity: 2,
        createdAt: '2026-02-02 08:00:00',
      },
    ]);

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      flightCount: 67,
      totalCo2Kg: 1234.57,
      redeemedMiles: 5200,
      treeCount: 4,
      projectedOffsetKg: 880,
      certificateCount: 12,
    });
    expect(body.data.milestones.firstTreeAt).toBe('2026-02-02 08:00:00');
    expect(body.data.certificateSources).toEqual([
      {
        sourceType: 'tree',
        productName: '植树公益',
        quantity: 2,
        createdAt: '2026-02-02 08:00:00',
      },
    ]);
    expect(JSON.stringify(body)).not.toContain('member@example.com');
    expect(JSON.stringify(body)).not.toContain('voucher_code');
    expect(JSON.stringify(body)).not.toContain('orderId');
  });

  it('clamps a net-positive refund balance and excludes mutable product fields from classification SQL', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 8, email: 'x@x.com' } as never);
    mockGet
      .mockReturnValueOnce({
        flightCount: 0,
        totalCo2Kg: 0,
        netMilesAmount: 500,
        treeCount: 0,
        certificateCount: 0,
      })
      .mockReturnValueOnce({ firstFlightAt: null, firstTreeAt: null, firstRideAt: null });
    mockAll.mockReturnValueOnce([]);

    const response = await GET(getRequest());
    const body = await response.json();
    const sql = mockPrepare.mock.calls.map(([statement]) => String(statement)).join('\n');

    expect(body.data.redeemedMiles).toBe(0);
    expect(body.data.projectedOffsetKg).toBe(0);
    expect(sql).toContain("type IN ('redeem', 'refund')");
    expect(sql).toContain("cancelled.status = 'cancelled'");
    expect(sql).toContain("voucher_code LIKE 'TREE-%'");
    expect(sql).toContain('COALESCE(SUM(quantity), 0)');
    expect(sql).not.toContain("p.category = 'carbon'");
  });

  it('returns a safe error when aggregation fails', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 9, email: 'x@x.com' } as never);
    mockGet.mockImplementationOnce(() => { throw new Error('database unavailable'); });

    const response = await GET(getRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: '获取个人成果失败' });
  });
});
