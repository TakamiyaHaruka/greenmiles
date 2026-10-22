import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null as unknown as Database.Database }));
vi.mock('@/lib/db', () => ({
  default: {
    prepare: (sql: string) => state.db.prepare(sql),
    transaction: (fn: () => unknown) => state.db.transaction(fn),
  },
}));
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({ userId: 1, email: 'member@test.com' })),
  requireAdmin: vi.fn(async () => true),
}));

import { POST } from './route';
import { PATCH } from '@/app/api/admin/orders/[id]/route';

const context = () => ({ params: Promise.resolve({ id: '5' }) });
const cancel = () => POST(new NextRequest('http://localhost/api/orders/5/cancel', { method: 'POST' }), context());
const ship = () => PATCH(new NextRequest('http://localhost/api/admin/orders/5', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'shipped' }),
}), context());

function snapshot() {
  return {
    orders: state.db.prepare('SELECT * FROM orders ORDER BY id').all(),
    users: state.db.prepare('SELECT * FROM users ORDER BY id').all(),
    products: state.db.prepare('SELECT * FROM products ORDER BY id').all(),
    ledger: state.db.prepare('SELECT * FROM miles_transactions ORDER BY id').all(),
  };
}

beforeEach(() => {
  state.db = new Database(':memory:');
  state.db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, miles_balance INTEGER);
    CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, icon_type TEXT, mileage_cost INTEGER, stock INTEGER);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, product_id INTEGER, quantity INTEGER, status TEXT, voucher_code TEXT, address TEXT, created_at TEXT);
    CREATE TABLE miles_transactions (id INTEGER PRIMARY KEY, user_id INTEGER, order_id INTEGER, amount INTEGER, type TEXT, description TEXT);
    INSERT INTO users VALUES (1, 'member@test.com', 9000);
    INSERT INTO products VALUES (4, '已改价的帆布袋', 'physical', 'bag', 200, 28);
    INSERT INTO orders VALUES (5, 1, 4, 2, 'pending', 'BAG-TEST', 'address', '2026-10-22 00:00:00');
    INSERT INTO miles_transactions VALUES (1, 1, NULL, 10000, 'grant', '注册赠礼');
    INSERT INTO miles_transactions VALUES (2, 1, 5, -1000, 'redeem', '兑换「帆布袋」');
  `);
});
afterEach(() => state.db.close());

describe('cancellation against real SQLite transactions', () => {
  it('refunds the immutable redemption and restores exactly the order quantity once', async () => {
    const responses = await Promise.all([cancel(), cancel(), cancel()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409, 409]);
    expect(state.db.prepare('SELECT status FROM orders WHERE id = 5').get()).toEqual({ status: 'cancelled' });
    expect(state.db.prepare('SELECT miles_balance FROM users WHERE id = 1').get()).toEqual({ miles_balance: 10000 });
    expect(state.db.prepare('SELECT stock FROM products WHERE id = 4').get()).toEqual({ stock: 30 });
    expect(state.db.prepare("SELECT amount, description FROM miles_transactions WHERE type = 'refund'").all())
      .toEqual([{ amount: 1000, description: '取消订单「帆布袋」退款' }]);
    expect(state.db.prepare('SELECT SUM(amount) AS total FROM miles_transactions WHERE user_id = 1').get())
      .toEqual({ total: 10000 });
  });

  it.each([
    ['order status', "BEFORE UPDATE OF status ON orders WHEN NEW.status = 'cancelled'"],
    ['balance refund', 'BEFORE UPDATE OF miles_balance ON users'],
    ['stock restoration', 'BEFORE UPDATE OF stock ON products'],
    ['refund ledger', "BEFORE INSERT ON miles_transactions WHEN NEW.type = 'refund'"],
  ])('rolls back every table if the %s write throws', async (_label, trigger) => {
    const before = snapshot();
    state.db.exec(`CREATE TRIGGER fail_write ${trigger} BEGIN SELECT RAISE(ABORT, 'injected failure'); END;`);
    const response = await cancel();
    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe('CANCELLATION_FAILED');
    expect(snapshot()).toEqual(before);
    expect(state.db.inTransaction).toBe(false);
  });

  it.each([
    ['order status', "BEFORE UPDATE OF status ON orders WHEN NEW.status = 'cancelled'", 409],
    ['balance refund', 'BEFORE UPDATE OF miles_balance ON users', 500],
    ['stock restoration', 'BEFORE UPDATE OF stock ON products', 500],
    ['refund ledger', "BEFORE INSERT ON miles_transactions WHEN NEW.type = 'refund'", 500],
  ])('rolls back every table if the %s write affects no rows', async (_label, trigger, status) => {
    const before = snapshot();
    state.db.exec(`CREATE TRIGGER ignore_write ${trigger} BEGIN SELECT RAISE(IGNORE); END;`);
    expect((await cancel()).status).toBe(status);
    expect(snapshot()).toEqual(before);
  });

  it.each([
    "DELETE FROM miles_transactions WHERE type = 'redeem'",
    "INSERT INTO miles_transactions (user_id, order_id, amount, type) VALUES (1, 5, -1000, 'redeem')",
    "INSERT INTO miles_transactions (user_id, order_id, amount, type) VALUES (1, 5, 1000, 'refund')",
    "UPDATE miles_transactions SET user_id = 2 WHERE type = 'redeem'",
    "UPDATE miles_transactions SET amount = 0 WHERE type = 'redeem'",
    "UPDATE miles_transactions SET amount = -1.5 WHERE type = 'redeem'",
    'UPDATE orders SET quantity = 0',
    'UPDATE orders SET quantity = 1.5',
    'UPDATE products SET stock = 9007199254740991',
    'UPDATE users SET miles_balance = 9007199254740991',
  ])('rejects inconsistent data without writes: %s', async (mutation) => {
    state.db.exec(mutation);
    const before = snapshot();
    expect((await cancel()).status).toBe(409);
    expect(snapshot()).toEqual(before);
  });

  it.each(['cancel-first', 'ship-first'])('preserves the winning pending transition: %s', async (order) => {
    const responses = order === 'cancel-first'
      ? [await cancel(), await ship()]
      : [await ship(), await cancel()];
    expect(responses[0].status).toBe(200);
    expect([400, 409]).toContain(responses[1].status);
    const cancelled = order === 'cancel-first';
    expect(state.db.prepare('SELECT status FROM orders WHERE id = 5').get())
      .toEqual({ status: cancelled ? 'cancelled' : 'shipped' });
    expect(state.db.prepare('SELECT miles_balance FROM users WHERE id = 1').get())
      .toEqual({ miles_balance: cancelled ? 10000 : 9000 });
    expect(state.db.prepare('SELECT stock FROM products WHERE id = 4').get())
      .toEqual({ stock: cancelled ? 30 : 28 });
    expect(state.db.prepare("SELECT COUNT(*) AS count FROM miles_transactions WHERE type = 'refund'").get())
      .toEqual({ count: cancelled ? 1 : 0 });
  });

  it('does not let an admin stale read overwrite a cancellation', async () => {
    // Inject the competing commit exactly between the admin read and its write.
    const originalPrepare = state.db.prepare.bind(state.db);
    const prepare = vi.spyOn(state.db, 'prepare').mockImplementation(((sql: string) => {
      if (sql === 'UPDATE orders SET status = ? WHERE id = ? AND status = ?') {
        originalPrepare("UPDATE orders SET status = 'cancelled' WHERE id = 5").run();
      }
      return originalPrepare(sql);
    }) as typeof state.db.prepare);
    try {
      expect((await ship()).status).toBe(409);
      expect(originalPrepare('SELECT status FROM orders WHERE id = 5').get()).toEqual({ status: 'cancelled' });
    } finally {
      prepare.mockRestore();
    }
  });
});
