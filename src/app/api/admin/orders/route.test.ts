import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAll = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: mockAll,
      run: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

import { GET } from './route';
import { requireAdmin } from '@/lib/auth';
import { NextRequest } from 'next/server';

function getRequest(cookie = 'admin_token=valid') {
  return new NextRequest('http://localhost/api/admin/orders', {
    method: 'GET',
    headers: { cookie },
  });
}

describe('GET /api/admin/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without an admin session', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(false);
    const response = await GET(getRequest(''));
    expect(response.status).toBe(401);
  });

  it('returns all orders joined with buyer email and product name', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(true);
    const orders = [
      {
        id: 3,
        email: 'member@test.com',
        product_name: '帆布袋',
        status: 'pending',
        quantity: 1,
        mileage_cost: 500,
      },
    ];
    mockAll.mockReturnValueOnce(orders);

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(orders);
  });
});
