import { describe, it, expect, vi } from 'vitest';

const mockAll = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      all: mockAll,
    })),
  },
}));

import { GET } from './route';

describe('GET /api/products', () => {
  it('returns product list with status 200', async () => {
    const products = [
      { id: 1, name: '共享单车骑行卡', category: 'virtual', mileage_cost: 1200 },
      { id: 2, name: '酒店 50 元券', category: 'virtual', mileage_cost: 2000 },
    ];
    mockAll.mockReturnValueOnce(products);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(products);
  });

  it('returns 500 on db error', async () => {
    mockAll.mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('获取商品列表失败');
  });
});
