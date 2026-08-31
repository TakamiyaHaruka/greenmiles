import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockAll = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: mockGet,
      all: mockAll,
      run: mockRun,
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

import { POST, GET } from './route';
import { getAuthUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

function makePostRequest(body: unknown, cookie = 'token=valid') {
  return new NextRequest('http://localhost/api/carbon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });
}

function getRequest(cookie = 'token=valid') {
  return new NextRequest('http://localhost/api/carbon', {
    method: 'GET',
    headers: { cookie },
  });
}

describe('POST /api/carbon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token', async () => {
    const response = await POST(makePostRequest({}, ''));
    expect(response.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce(null as never);
    const response = await POST(makePostRequest({}));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    const response = await POST(makePostRequest({ distance: -1, aircraftType: 'NOPE', cabinClass: 'X' }));
    expect(response.status).toBe(400);
  });

  it('recomputes emission server-side and persists the record', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockRun.mockReturnValueOnce({ lastInsertRowid: 9 });

    const response = await POST(
      makePostRequest({ distance: 1075, aircraftType: 'NARROW_STANDARD', cabinClass: 'Y' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    // 1075 × 0.090 × 1.0 = 96.75, recomputed on the server
    expect(data.data.co2Kg).toBe(96.75);
    expect(mockRun).toHaveBeenCalledWith(1, 1075, 'NARROW_STANDARD', 'Y', 96.75, null);
  });

  it('persists the route label when provided', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockRun.mockReturnValueOnce({ lastInsertRowid: 10 });

    const response = await POST(
      makePostRequest({ distance: 1077, aircraftType: 'NARROW_STANDARD', cabinClass: 'Y', route: 'PEK→SHA' })
    );

    expect(response.status).toBe(200);
    expect(mockRun).toHaveBeenCalledWith(1, 1077, 'NARROW_STANDARD', 'Y', 96.93, 'PEK→SHA');
  });
});

describe('GET /api/carbon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token', async () => {
    const response = await GET(getRequest(''));
    expect(response.status).toBe(401);
  });

  it('returns personal flight stats and records', async () => {
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 1, email: 'x@x.com' } as never);
    mockGet.mockReturnValueOnce({ flightCount: 2, totalCo2Kg: 193.5 });
    mockAll.mockReturnValueOnce([{ id: 1, co2_kg: 96.75 }]);
    mockGet.mockReturnValueOnce({ trees: 3 });

    const response = await GET(getRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.flightCount).toBe(2);
    expect(data.data.totalCo2Kg).toBe(193.5);
    expect(data.data.records).toHaveLength(1);
    // Standing trees = carbon redemptions excluding cancelled orders (2nd get: stats → trees)
    expect(data.data.myTrees).toBe(3);
    expect(mockGet).toHaveBeenNthCalledWith(2, 1);
  });
});
