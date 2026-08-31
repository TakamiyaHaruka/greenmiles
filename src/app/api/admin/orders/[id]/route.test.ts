import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
      run: mockRun,
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

import { PATCH } from './route';
import { requireAdmin } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makeRequest(id: string, status?: string) {
  return new NextRequest(`http://localhost/api/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: 'admin_token=valid' },
    body: JSON.stringify(status ? { status } : {}),
  });
}

const UPDATED_ROW = {
  id: 7,
  email: 'member@test.com',
  product_name: '帆布袋',
  status: 'shipped',
  quantity: 1,
  mileage_cost: 500,
};

describe('PATCH /api/admin/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(true);
  });

  it('returns 401 without an admin session', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(false);
    const response = await PATCH(makeRequest('7', 'shipped'), { params: Promise.resolve({ id: '7' }) });
    expect(response.status).toBe(401);
  });

  it('returns 400 for a non-numeric id', async () => {
    const response = await PATCH(makeRequest('abc', 'shipped'), { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(400);
  });

  it('returns 400 when the target status is missing', async () => {
    const response = await PATCH(makeRequest('7'), { params: Promise.resolve({ id: '7' }) });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('缺少目标状态');
  });

  it('returns 404 when the order does not exist', async () => {
    mockGet.mockReturnValueOnce(undefined);
    const response = await PATCH(makeRequest('99', 'shipped'), { params: Promise.resolve({ id: '99' }) });
    expect(response.status).toBe(404);
  });

  it('moves a pending order to shipped', async () => {
    mockGet
      .mockReturnValueOnce({ id: 7, status: 'pending' }) // SELECT order
      .mockReturnValueOnce(UPDATED_ROW); // SELECT updated row
    mockRun.mockReturnValueOnce({ changes: 1 });

    const response = await PATCH(makeRequest('7', 'shipped'), { params: Promise.resolve({ id: '7' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe('shipped');
    expect(mockRun).toHaveBeenCalledWith('shipped', 7);
  });

  it('moves a shipped order to completed', async () => {
    mockGet
      .mockReturnValueOnce({ id: 7, status: 'shipped' })
      .mockReturnValueOnce({ ...UPDATED_ROW, status: 'completed' });
    mockRun.mockReturnValueOnce({ changes: 1 });

    const response = await PATCH(makeRequest('7', 'completed'), { params: Promise.resolve({ id: '7' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe('completed');
  });

  it('rejects skipping the pipeline (pending → completed)', async () => {
    mockGet.mockReturnValueOnce({ id: 7, status: 'pending' });

    const response = await PATCH(makeRequest('7', 'completed'), { params: Promise.resolve({ id: '7' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('不允许的状态转移');
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('rejects transitions out of a cancelled order', async () => {
    mockGet.mockReturnValueOnce({ id: 7, status: 'cancelled' });

    const response = await PATCH(makeRequest('7', 'shipped'), { params: Promise.resolve({ id: '7' }) });
    expect(response.status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('rejects moving backwards (completed → shipped)', async () => {
    mockGet.mockReturnValueOnce({ id: 7, status: 'completed' });

    const response = await PATCH(makeRequest('7', 'shipped'), { params: Promise.resolve({ id: '7' }) });
    expect(response.status).toBe(400);
    expect(mockRun).not.toHaveBeenCalled();
  });
});
