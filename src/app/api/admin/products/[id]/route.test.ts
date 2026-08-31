import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  PRODUCT_SELECT: 'SELECT * FROM products',
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
      all: vi.fn(),
      run: mockRun,
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

import { PUT, DELETE } from './route';
import { requireAdmin } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makeRequest(method: string, body?: unknown, cookie = 'admin_token=valid') {
  return new NextRequest('http://localhost/api/admin/products/3', {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const validProduct = {
  name: '骑行卡',
  category: 'virtual' as const,
  mileage_cost: 1200,
  stock: 50,
  icon_type: 'bike',
};

describe('PUT /api/admin/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(true);
  });

  it('returns 401 without an admin session', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(false);
    const response = await PUT(makeRequest('PUT', validProduct, ''), {
      params: Promise.resolve({ id: '3' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 400 for a non-numeric id', async () => {
    const response = await PUT(makeRequest('PUT', validProduct), {
      params: Promise.resolve({ id: 'abc' }),
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 when the product does not exist', async () => {
    mockRun.mockReturnValueOnce({ changes: 0 });
    const response = await PUT(makeRequest('PUT', validProduct), {
      params: Promise.resolve({ id: '999' }),
    });
    expect(response.status).toBe(404);
  });

  it('updates and returns the product', async () => {
    mockRun.mockReturnValueOnce({ changes: 1 });
    mockGet.mockReturnValueOnce({ id: 3, ...validProduct });

    const response = await PUT(makeRequest('PUT', validProduct), {
      params: Promise.resolve({ id: '3' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe(3);
  });

  it('always SETs the project columns — an edit must not wipe attribution', async () => {
    mockRun.mockReturnValueOnce({ changes: 1 });
    mockGet.mockReturnValueOnce({ id: 3, ...validProduct });

    const response = await PUT(
      makeRequest('PUT', {
        ...validProduct,
        project_name: '阿拉善荒漠植树造林',
        project_standard: 'CCER（演示口径）',
        project_vintage: '2026',
      }),
      { params: Promise.resolve({ id: '3' }) }
    );

    expect(response.status).toBe(200);
    expect(mockRun).toHaveBeenCalledWith(
      '骑行卡',
      null,
      'virtual',
      1200,
      50,
      'bike',
      '阿拉善荒漠植树造林',
      'CCER（演示口径）',
      '2026',
      3
    );
  });
});

describe('DELETE /api/admin/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(true);
  });

  it('returns 401 without an admin session', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(false);
    const response = await DELETE(makeRequest('DELETE', undefined, ''), {
      params: Promise.resolve({ id: '3' }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 409 when orders reference the product', async () => {
    mockGet.mockReturnValueOnce({ count: 2 });
    const response = await DELETE(makeRequest('DELETE'), {
      params: Promise.resolve({ id: '3' }),
    });
    const data = await response.json();
    expect(response.status).toBe(409);
    expect(data.error).toContain('无法删除');
  });

  it('returns 404 when the product does not exist', async () => {
    mockGet.mockReturnValueOnce({ count: 0 });
    mockRun.mockReturnValueOnce({ changes: 0 });
    const response = await DELETE(makeRequest('DELETE'), {
      params: Promise.resolve({ id: '999' }),
    });
    expect(response.status).toBe(404);
  });

  it('deletes the product', async () => {
    mockGet.mockReturnValueOnce({ count: 0 });
    mockRun.mockReturnValueOnce({ changes: 1 });
    const response = await DELETE(makeRequest('DELETE'), {
      params: Promise.resolve({ id: '3' }),
    });
    expect(response.status).toBe(200);
  });
});
