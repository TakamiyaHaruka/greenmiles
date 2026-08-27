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
  verifyJwt: vi.fn(),
}));

import { POST, GET } from './route';
import { verifyJwt } from '@/lib/auth';

function makePostRequest(body: unknown, cookie = 'token=valid') {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });
}

function getRequest(cookie = 'token=valid') {
  return new Request('http://localhost/api/orders', {
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
    vi.mocked(verifyJwt).mockResolvedValueOnce(null as never);
    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    const response = await POST(makePostRequest({ productId: -1 }));
    const data = await response.json();
    expect(response.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 999, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('USER_NOT_FOUND');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(404);
  });

  it('returns 404 when product not found', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('PRODUCT_NOT_FOUND');
    });

    const response = await POST(makePostRequest({ productId: 999 }));
    const data = await response.json();
    expect(response.status).toBe(404);
  });

  it('returns 400 when out of stock', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('OUT_OF_STOCK');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(400);
  });

  it('returns 400 when insufficient balance', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('INSUFFICIENT_BALANCE');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(400);
  });

  it('returns order data on success', async () => {
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
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
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockTransactionFn.mockImplementationOnce(() => {
      throw new Error('Unknown error');
    });

    const response = await POST(makePostRequest({ productId: 1 }));
    const data = await response.json();
    expect(response.status).toBe(500);
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
    vi.mocked(verifyJwt).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
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
