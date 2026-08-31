import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
      run: mockRun,
    })),
    // Returns a callable like better-sqlite3's transaction(); the route invokes it immediately
    transaction: vi.fn((fn: () => unknown) => fn),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

import { POST } from './route';
import { getAuthUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makeRequest(id = '5', cookie = 'token=valid') {
  return new NextRequest(`http://localhost/api/orders/${id}/cancel`, {
    method: 'POST',
    headers: { cookie },
  });
}

function ctx(id = '5') {
  return { params: Promise.resolve({ id }) };
}

// The joined row the cancel transaction reads first
function pendingOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    user_id: 1,
    product_id: 4,
    quantity: 2,
    status: 'pending',
    total_cost: 1000,
    product_name: '帆布袋',
    miles_balance: 9000,
    ...overrides,
  };
}

describe('POST /api/orders/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token', async () => {
    const response = await POST(makeRequest('5', ''), ctx());
    expect(response.status).toBe(401);
  });

  it('returns 400 for a non-numeric id', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' });
    const response = await POST(makeRequest('abc'), ctx('abc'));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('订单 ID 无效');
  });

  it('returns 404 when the order does not exist', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' });
    mockGet.mockReturnValueOnce(undefined);

    const response = await POST(makeRequest(), ctx());
    const data = await response.json();
    expect(response.status).toBe(404);
    expect(data.error).toBe('订单不存在');
  });

  it('returns 403 when the order belongs to someone else', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' });
    mockGet.mockReturnValueOnce(pendingOrder({ user_id: 2 }));

    const response = await POST(makeRequest(), ctx());
    const data = await response.json();
    expect(response.status).toBe(403);
  });

  it('returns 400 for an already-completed (voucher) order', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' });
    mockGet.mockReturnValueOnce(pendingOrder({ status: 'completed' }));

    const response = await POST(makeRequest(), ctx());
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain('仅待发货订单可取消');
  });

  it('returns 400 when the conditional update loses the race (changes = 0)', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' });
    mockGet.mockReturnValueOnce(pendingOrder());
    mockRun.mockReturnValueOnce({ changes: 0 });

    const response = await POST(makeRequest(), ctx());
    expect(response.status).toBe(400);
  });

  it('cancels, refunds miles, restores stock and writes the refund ledger row', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' });
    mockGet.mockReturnValueOnce(pendingOrder());
    mockRun.mockReturnValueOnce({ changes: 1 }); // UPDATE orders

    const response = await POST(makeRequest(), ctx());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.new_balance).toBe(10000); // 9000 + 1000 refund
    // UPDATE users refunds the total; UPDATE products restores the quantity
    expect(mockRun).toHaveBeenNthCalledWith(2, 1000, 1);
    expect(mockRun).toHaveBeenNthCalledWith(3, 2, 4);
    // 4th write is the refund ledger row linked to the order
    expect(mockRun).toHaveBeenNthCalledWith(4, 1, 1000, 5, '取消订单「帆布袋」退款');
  });
});
