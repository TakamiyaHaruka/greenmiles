import { describe, it, expect, vi, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Builds a database in its pre-ledger shape (no miles_transactions, no project
// columns on products), then lets db.ts migrate it on import. DATABASE_PATH is
// read at module init, so it must be set before the dynamic import below.
const DB_PATH = path.join(os.tmpdir(), `gm-legacy-${process.pid}.db`);
process.env.DATABASE_PATH = DB_PATH;

function createLegacyDb() {
  const legacy = new Database(DB_PATH);
  legacy.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      miles_balance INTEGER DEFAULT 10000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      mileage_cost INTEGER NOT NULL,
      stock INTEGER DEFAULT 0,
      icon_type TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      product_id INTEGER REFERENCES products(id),
      status TEXT DEFAULT 'pending',
      voucher_code TEXT UNIQUE,
      address TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE carbon_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      distance REAL NOT NULL,
      aircraft_type TEXT NOT NULL,
      cabin_class TEXT NOT NULL,
      co2_kg REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO products (id, name, description, category, mileage_cost, stock, icon_type)
    VALUES
      (1, '共享单车骑行卡', '畅享城市绿色出行', 'virtual', 1200, 100, 'bike'),
      (3, '植树公益', '为地球种下一棵树', 'carbon', 3000, 999, 'tree');

    INSERT INTO users (id, email, password_hash, miles_balance) VALUES
      (1, 'one@test.com', 'x', 7600),
      (2, 'two@test.com', 'x', 7000);
  `);
  // u1 redeemed 2 × bike (10000 − 2400); u2 redeemed 1 × tree (10000 − 3000)
  legacy.prepare(
    "INSERT INTO orders (id, user_id, product_id, status, voucher_code, quantity) VALUES (10, 1, 1, 'completed', 'BIKE-AA', 2)"
  ).run();
  legacy.prepare(
    "INSERT INTO orders (id, user_id, product_id, status, voucher_code, quantity) VALUES (11, 2, 3, 'completed', 'TREE-BB', 1)"
  ).run();
  legacy.close();
}

createLegacyDb();

const connections: Array<{ close(): void }> = [];

afterAll(() => {
  for (const connection of connections) {
    connection.close();
  }
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(DB_PATH + suffix, { force: true });
  }
});

describe('db.ts migration on a pre-ledger database', () => {
  it('backfills grants and redeems so the ledger matches every balance', async () => {
    const db = (await import('@/lib/db')).default;
    connections.push(db);

    const mismatches = db.prepare(`
      SELECT u.id, u.miles_balance, COALESCE(SUM(t.amount), 0) AS ledger_sum
      FROM users u
      LEFT JOIN miles_transactions t ON t.user_id = u.id
      GROUP BY u.id
      HAVING u.miles_balance != ledger_sum
    `).all();
    expect(mismatches).toEqual([]);

    // One welcome grant per user — including db.ts's own seeded test user
    const grants = db.prepare(
      "SELECT COUNT(*) AS c FROM miles_transactions WHERE type = 'grant'"
    ).get() as { c: number };
    expect(grants.c).toBe(3);

    // Redeem rows carry the order total (mileage_cost × quantity) and description
    const bikeRedeem = db.prepare(
      "SELECT amount, description FROM miles_transactions WHERE type = 'redeem' AND order_id = 10"
    ).get() as { amount: number; description: string };
    expect(bikeRedeem.amount).toBe(-2400);
    expect(bikeRedeem.description).toBe('兑换「共享单车骑行卡」');

    // The tree product gains its offset project attribution
    const tree = db.prepare(
      'SELECT project_name, project_standard, project_vintage FROM products WHERE id = 3'
    ).get() as { project_name: string; project_standard: string; project_vintage: string };
    expect(tree.project_name).toBe('阿拉善荒漠植树造林');
    expect(tree.project_vintage).toBe('2026');
  });

  it('is idempotent — a second startup does not duplicate backfilled rows', async () => {
    const db = (await import('@/lib/db')).default;
    connections.push(db);
    const before = db.prepare('SELECT COUNT(*) AS c FROM miles_transactions').get() as { c: number };
    expect(before.c).toBe(5); // 3 grants + 2 redeems

    vi.resetModules();
    const dbAgain = (await import('@/lib/db')).default;
    connections.push(dbAgain);
    const after = dbAgain.prepare('SELECT COUNT(*) AS c FROM miles_transactions').get() as { c: number };
    expect(after.c).toBe(before.c);
  });
});
