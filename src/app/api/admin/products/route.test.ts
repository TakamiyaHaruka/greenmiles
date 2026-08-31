import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAll = vi.fn();
const mockGet = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  PRODUCT_SELECT: 'SELECT * FROM products',
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  verifyAdminJwt: vi.fn(),
}));

import { GET, POST } from './route';
import { verifyAdminJwt } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makeRequest(method: string, body?: unknown, cookie = 'admin_token=valid') {
  return new NextRequest('http://localhost/api/admin/products', {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('/api/admin/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 without an admin session', async () => {
      const response = await GET(makeRequest('GET', undefined, ''));
      expect(response.status).toBe(401);
    });

    it('returns 401 when the admin token is invalid', async () => {
      vi.mocked(verifyAdminJwt).mockResolvedValueOnce(false);
      const response = await GET(makeRequest('GET'));
      expect(response.status).toBe(401);
    });

    it('returns the product list for an admin session', async () => {
      vi.mocked(verifyAdminJwt).mockResolvedValueOnce(true);
      mockAll.mockReturnValueOnce([{ id: 1, name: '骑行卡' }]);
      const response = await GET(makeRequest('GET'));
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });
  });

  describe('POST', () => {
    it('returns 401 without an admin session', async () => {
      const response = await POST(makeRequest('POST', {}, ''));
      expect(response.status).toBe(401);
    });

    it('returns 400 for an invalid product payload', async () => {
      vi.mocked(verifyAdminJwt).mockResolvedValueOnce(true);
      const response = await POST(
        makeRequest('POST', { name: '', category: 'virtual', mileage_cost: -1, stock: -5 })
      );
      expect(response.status).toBe(400);
    });

    it('creates a product and returns it', async () => {
      vi.mocked(verifyAdminJwt).mockResolvedValueOnce(true);
      mockRun.mockReturnValueOnce({ lastInsertRowid: 5 });
      mockGet.mockReturnValueOnce({ id: 5, name: '新商品', mileage_cost: 800, stock: 10 });

      const response = await POST(
        makeRequest('POST', {
          name: '新商品',
          category: 'virtual',
          mileage_cost: 800,
          stock: 10,
          icon_type: 'bike',
        })
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.id).toBe(5);
      expect(mockRun).toHaveBeenCalledWith(
        '新商品',
        null,
        'virtual',
        800,
        10,
        'bike'
      );
    });
  });
});
