import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null as unknown as Database.Database }));
vi.mock('@/lib/db', () => ({ default: {
  prepare: (sql: string) => state.db.prepare(sql),
  transaction: (fn: () => unknown) => state.db.transaction(fn),
} }));
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn(), requireAdmin: vi.fn() }));

import { getAuthUser, requireAdmin } from '@/lib/auth';
import { GET, POST } from './route';
import { GET as adminGET } from '@/app/api/admin/orders/route';
import { PATCH } from '@/app/api/admin/orders/[id]/route';
import { POST as cancelPOST } from '@/app/api/orders/[id]/cancel/route';

const request = (path: string) => new NextRequest(`http://localhost${path}`);
const context = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

async function createOrder(quantity = 1) {
  const response = await POST(new NextRequest('http://localhost/api/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 4, quantity, expectedUnitCost: 500, address: '测试收货地址（虚构）' }),
  }));
  expect(response.status).toBe(200);
  return (await response.json()).data.id as number;
}

async function histories() {
  const member = await GET(request('/api/orders'));
  const admin = await adminGET(request('/api/admin/orders'));
  expect(member.status).toBe(200);
  expect(admin.status).toBe(200);
  return { member: (await member.json()).data, admin: (await admin.json()).data } as {
    member: Array<{ id: number; mileage_cost: number | null; status: string }>;
    admin: Array<{ id: number; mileage_cost: number | null; status: string }>;
  };
}

async function transition(id: number, status: string) {
  return PATCH(new NextRequest(`http://localhost/api/admin/orders/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
  }), context(id));
}

function snapshot() {
  return ['users', 'products', 'orders', 'miles_transactions'].map((table) => (
    state.db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()
  ));
}

beforeEach(() => {
  vi.mocked(getAuthUser).mockReset().mockResolvedValue({ userId: 1, email: 'member@example.test' });
  vi.mocked(requireAdmin).mockReset().mockResolvedValue(true);
  state.db = new Database(':memory:');
  state.db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, miles_balance INTEGER);
    CREATE TABLE products (
      id INTEGER PRIMARY KEY, name TEXT, category TEXT, icon_type TEXT, mileage_cost INTEGER, stock INTEGER,
      project_name TEXT, project_standard TEXT, project_vintage TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY, user_id INTEGER, product_id INTEGER, quantity INTEGER, status TEXT,
      voucher_code TEXT, address TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE miles_transactions (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, order_id INTEGER, amount INTEGER NOT NULL,
      type TEXT, description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO users VALUES (1, 'member@example.test', 10000), (2, 'other@example.test', 10000);
    INSERT INTO products VALUES (4, '测试帆布袋', 'physical', 'bag', 500, 30, NULL, NULL, NULL);
    INSERT INTO miles_transactions (user_id, amount, type) VALUES (1, 10000, 'grant'), (2, 10000, 'grant');
  `);
});
afterEach(() => state.db.close());

describe('historical order totals against real SQLite', () => {
  it.each([800, 200])('keeps the original 500 in both lists and fulfilment responses after repricing to %s', async (price) => {
    const id = await createOrder();
    state.db.prepare('UPDATE products SET mileage_cost = ? WHERE id = 4').run(price);
    const before = snapshot();
    const lists = await histories();
    expect(lists.member).toHaveLength(1);
    expect(lists.admin).toHaveLength(1);
    expect(lists.member[0].mileage_cost).toBe(500);
    expect(lists.admin[0].mileage_cost).toBe(500);
    expect(snapshot()).toEqual(before); // Displaying history never repairs or rewrites the ledger.
    for (const status of ['shipped', 'completed']) {
      const response = await transition(id, status);
      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({ id, status, mileage_cost: 500 });
    }
  });

  it('uses the two-item debit total once and retains it after an original-amount refund', async () => {
    const id = await createOrder(2);
    state.db.prepare('UPDATE products SET mileage_cost = 800 WHERE id = 4').run();
    let lists = await histories();
    expect(lists.member[0].mileage_cost).toBe(1000);
    expect(lists.admin[0].mileage_cost).toBe(1000);
    const response = await cancelPOST(new NextRequest(`http://localhost/api/orders/${id}/cancel`, { method: 'POST' }), context(id));
    expect(response.status).toBe(200);
    expect((await response.json()).data.new_balance).toBe(10000);
    lists = await histories();
    expect(lists.member[0]).toMatchObject({ mileage_cost: 1000, status: 'cancelled' });
    expect(lists.admin[0]).toMatchObject({ mileage_cost: 1000, status: 'cancelled' });
    expect(state.db.prepare("SELECT amount FROM miles_transactions WHERE type = 'refund'").all()).toEqual([{ amount: 1000 }]);
  });

  it.each([
    "DELETE FROM miles_transactions WHERE type = 'redeem'",
    "INSERT INTO miles_transactions (user_id, order_id, amount, type) SELECT user_id, order_id, amount, type FROM miles_transactions WHERE type = 'redeem'",
    "UPDATE miles_transactions SET user_id = 2 WHERE type = 'redeem'",
    "INSERT INTO miles_transactions (user_id, order_id, amount, type) SELECT 2, order_id, -800, 'redeem' FROM miles_transactions WHERE type = 'redeem'",
    "UPDATE miles_transactions SET amount = 0 WHERE type = 'redeem'",
    "UPDATE miles_transactions SET amount = 500 WHERE type = 'redeem'",
    "UPDATE miles_transactions SET amount = -500.5 WHERE type = 'redeem'",
    "UPDATE miles_transactions SET amount = -9007199254740992 WHERE type = 'redeem'",
    "UPDATE miles_transactions SET amount = 'invalid' WHERE type = 'redeem'",
  ])('returns a single unknown total without guessing or changing data: %s', async (mutation) => {
    const id = await createOrder();
    state.db.exec(mutation);
    const before = snapshot();
    const lists = await histories();
    expect(lists.member).toHaveLength(1);
    expect(lists.admin).toHaveLength(1);
    expect(lists.member[0].mileage_cost).toBeNull();
    expect(lists.admin[0].mileage_cost).toBeNull();
    const refund = await cancelPOST(new NextRequest(`http://localhost/api/orders/${id}/cancel`, { method: 'POST' }), context(id));
    expect(refund.status).toBe(409);
    expect(snapshot()).toEqual(before);
    const shipped = await transition(id, 'shipped');
    expect(shipped.status).toBe(200);
    expect((await shipped.json()).data).toMatchObject({ id, mileage_cost: null, status: 'shipped' });
  });

  it('keeps valid orders readable alongside a broken order and filters member history', async () => {
    const invalid = await createOrder();
    const valid = await createOrder(2);
    state.db.prepare("DELETE FROM miles_transactions WHERE order_id = ? AND type = 'redeem'").run(invalid);
    vi.mocked(getAuthUser).mockResolvedValueOnce({ userId: 2, email: 'other@example.test' });
    const other = await createOrder();
    const lists = await histories();
    expect(lists.member.map((row) => row.id).sort()).toEqual([invalid, valid].sort());
    expect(lists.member.find((row) => row.id === invalid)?.mileage_cost).toBeNull();
    expect(lists.member.find((row) => row.id === valid)?.mileage_cost).toBe(1000);
    expect(lists.admin).toHaveLength(3);
    expect(lists.admin.find((row) => row.id === other)?.mileage_cost).toBe(500);
  });

  it('supports the largest safe original debit without rounding or quantity multiplication', async () => {
    await createOrder(2);
    state.db.exec("UPDATE miles_transactions SET amount = -9007199254740991 WHERE type = 'redeem'");
    const lists = await histories();
    expect(lists.member[0].mileage_cost).toBe(Number.MAX_SAFE_INTEGER);
    expect(lists.admin[0].mileage_cost).toBe(Number.MAX_SAFE_INTEGER);
  });
});
