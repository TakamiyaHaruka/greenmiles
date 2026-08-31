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

vi.mock('bcryptjs', () => ({
  default: {
    genSalt: vi.fn().mockResolvedValue('salt'),
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid body', async () => {
    const response = await POST(makeRequest({ email: 'bad', password: '123' }));
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    mockGet.mockReturnValueOnce({ id: 1 }); // existing user found

    const response = await POST(makeRequest({
      email: 'existing@test.com',
      password: 'password123',
      confirmPassword: 'password123',
    }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('该邮箱已注册');
  });

  it('returns 201 on successful registration', async () => {
    mockGet.mockReturnValueOnce(undefined); // no existing user
    mockRun.mockReturnValueOnce({ lastInsertRowid: 1 }); // INSERT user
    mockRun.mockReturnValueOnce({ lastInsertRowid: 2 }); // INSERT ledger

    const response = await POST(makeRequest({
      email: 'new@test.com',
      password: 'password123',
      confirmPassword: 'password123',
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.message).toBe('注册成功，请登录');
  });

  it('writes the 10000 welcome-miles grant into the ledger for the new user', async () => {
    mockGet.mockReturnValueOnce(undefined); // no existing user
    mockRun.mockReturnValueOnce({ lastInsertRowid: 7 }); // INSERT user
    mockRun.mockReturnValueOnce({ lastInsertRowid: 8 }); // INSERT ledger

    const response = await POST(makeRequest({
      email: 'ledger@test.com',
      password: 'password123',
      confirmPassword: 'password123',
    }));

    expect(response.status).toBe(201);
    // Ledger row carries the new user's id; amount/type/description are inline in the SQL
    expect(mockRun).toHaveBeenNthCalledWith(2, 7);
  });

  it('returns 409 on UNIQUE constraint violation', async () => {
    mockGet.mockReturnValueOnce(undefined); // no existing user found
    mockRun.mockImplementationOnce(() => {
      throw new Error('UNIQUE constraint failed: users.email');
    });

    const response = await POST(makeRequest({
      email: 'race@test.com',
      password: 'password123',
      confirmPassword: 'password123',
    }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('该邮箱已注册');
  });

  it('returns 500 on other db error', async () => {
    mockGet.mockReturnValueOnce(undefined);
    mockRun.mockImplementationOnce(() => {
      throw new Error('Disk full');
    });

    const response = await POST(makeRequest({
      email: 'new@test.com',
      password: 'password123',
      confirmPassword: 'password123',
    }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('注册失败，请稍后重试');
  });
});
