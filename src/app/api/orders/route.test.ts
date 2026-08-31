import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockRun = vi.fn();
const mockTransactionFn = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    })),
    transaction: vi.fn((fn) => {
      mockTransactionFn.mockImplementation(fn);
      return () => mockTransactionFn();
    }),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

import { POST, GET } from './route';
import { getAuthUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makePostRequest(body: unknown, cookie = 'token=valid') {
  return new NextRequest('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });
}

function getRequest(cookie = 'token=valid') {
  return new NextRequest('http://localhost/api/orders', {
    method: 'GET',
    headers: { cookie },
  });
}

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token', async () => {
    const response = await POST(makePostRequest({ productId: 1 }, ''));
    const data = await response.json();
    expect(response.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce(null as never);
    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    const response = await POST(makePostRequest({ productId: -1 }));
    const data = await response.json();
    expect(response.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 999, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('USER_NOT_FOUND');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(404);
  });

  it('returns 404 when product not found', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('PRODUCT_NOT_FOUND');
    });

    const response = await POST(makePostRequest({ productId: 999 }));
    const data = await response.json();
    expect(response.status).toBe(404);
  });

  it('returns 400 when out of stock', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('OUT_OF_STOCK');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(400);
  });

  it('returns 400 when insufficient balance', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('INSUFFICIENT_BALANCE');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(400);
  });

  it('returns order data on success', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => ({
      orderId: 1,
      voucherCode: 'BIKE-ABC12345',
      product: { id: 1, name: 'Test', icon_type: 'bike', category: 'virtual', mileage_cost: 1000 },
      newBalance: 9000,
    }));

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.voucher_code).toMatch(/^BIKE-/);
    expect(data.data.new_balance).toBe(9000);
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('Unknown error');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(500);
  });

  it('returns 400 when quantity exceeds the per-order cap', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);

    const response = await POST(makePostRequest({ productId: 1, quantity: 11 }));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('单次最多兑换 10 件');
  });

  it('returns 400 when physical product has no address', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet
      .mockReturnValueOnce({ id: 1, miles_balance: 10000 })
      .mockReturnValueOnce({ id: 4, name: '帆布袋', mileage_cost: 500, stock: 30, icon_type: 'bag', category: 'physical' });

    const response = await POST(makePostRequest({ productId: 4 }));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('实体商品需要填写收货地址');
  });

  it('returns 400 when stock is lower than quantity', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet
      .mockReturnValueOnce({ id: 1, miles_balance: 10000 })
      .mockReturnValueOnce({ id: 1, name: '骑行卡', mileage_cost: 1200, stock: 2, icon_type: 'bike', category: 'virtual' });

    const response = await POST(makePostRequest({ productId: 1, quantity: 3 }));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('商品库存不足');
  });

  it('charges mileage_cost times quantity and reflects it in the response', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet
      .mockReturnValueOnce({ id: 1, miles_balance: 10000 })
      .mockReturnValueOnce({ id: 1, name: '骑行卡', mileage_cost: 1200, stock: 100, icon_type: 'bike', category: 'virtual' });
    mockRun.mockReturnValue({ lastInsertRowid: 42 });

    const response = await POST(makePostRequest({ productId: 1, quantity: 3 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.mileage_cost).toBe(3600);
    expect(data.data.quantity).toBe(3);
    expect(data.data.new_balance).toBe(6400);
    // UPDATE users deducts the total, UPDATE products decreases stock by quantity
    expect(mockRun).toHaveBeenNthCalledWith(1, 3600, 1);
    expect(mockRun).toHaveBeenNthCalledWith(2, 3, 1);
    // 4th write is the ledger row: negative total, linked to the new order id
    expect(mockRun).toHaveBeenNthCalledWith(4, 1, -3600, 42, '兑换「骑行卡」');
  });

  it('creates pending order with address for physical products', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet
      .mockReturnValueOnce({ id: 1, miles_balance: 10000 })
      .mockReturnValueOnce({ id: 4, name: '帆布袋', mileage_cost: 500, stock: 30, icon_type: 'bag', category: 'physical' });
    mockRun.mockReturnValue({ lastInsertRowid: 7 });

    const response = await POST(
      makePostRequest({ productId: 4, quantity: 2, address: '张三，13800138000，北京市朝阳区' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe('pending');
    expect(data.data.mileage_cost).toBe(1000);
    // INSERT receives status, address and quantity
    expect(mockRun).toHaveBeenNthCalledWith(
      3,
      1,
      4,
      'pending',
      expect.stringMatching(/^BAG-/),
      '张三，13800138000，北京市朝阳区',
      2
    );
  });
});

describe('GET /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token', async () => {
    const response = await GET(getRequest(''));
    const data = await response.json();
    expect(response.status).toBe(401);
  });

  it('returns order list on success', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    const orders = [
      { id: 1, product_name: 'Test', status: 'completed', voucher_code: 'BIKE-ABC' },
    ];
    mockAll.mockReturnValueOnce(orders);

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(orders);
  });
});
