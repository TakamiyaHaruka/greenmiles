import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'greenmiles.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    miles_balance INTEGER DEFAULT 10000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    mileage_cost INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    icon_type TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    status TEXT DEFAULT 'pending',
    voucher_code TEXT UNIQUE,
    address TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS miles_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,                -- + 发放/退款, - 兑换
    type TEXT NOT NULL CHECK (type IN ('grant','redeem','refund')),
    order_id INTEGER REFERENCES orders(id),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS carbon_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    distance REAL NOT NULL,
    aircraft_type TEXT NOT NULL,
    cabin_class TEXT NOT NULL,
    co2_kg REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_miles_tx_user ON miles_transactions(user_id, id);
`);

// Migrate databases created before the quantity column was added
try {
  db.exec('ALTER TABLE orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1');
} catch {
  // Column already exists
}

// Migrate databases created before the route label was stored on carbon records
try {
  db.exec('ALTER TABLE carbon_records ADD COLUMN route TEXT');
} catch {
  // Column already exists
}

// Migrate databases created before offset project attribution was stored on products
for (const column of ['project_name', 'project_standard', 'project_vintage']) {
  try {
    db.exec(`ALTER TABLE products ADD COLUMN ${column} TEXT`);
  } catch {
    // Column already exists
  }
}

// Seed data - Test user (password: password123)
import bcrypt from 'bcryptjs';

const testUserPasswordHash = bcrypt.hashSync('password123', 10);

db.prepare(
  'INSERT OR IGNORE INTO users (email, password_hash, miles_balance) VALUES (?, ?, 10000)'
).run('test@greenmiles.com', testUserPasswordHash);

// Seed data - 4 products
db.exec(`
  INSERT OR IGNORE INTO products (id, name, description, category, mileage_cost, stock, icon_type)
  VALUES
    (1, '共享单车骑行卡', '畅享城市绿色出行，有效期30天', 'virtual', 1200, 100, 'bike'),
    (2, '酒店 50 元券', '全国合作酒店通用优惠券', 'virtual', 2000, 50, 'hotel'),
    (3, '植树公益', '为地球种下一棵树，获得碳抵消证书', 'carbon', 3000, 999, 'tree'),
    (4, '帆布袋', '环保帆布袋，实用又时尚', 'physical', 500, 30, 'bag');
`);

// Backfill the miles ledger for databases created before it existed.
// All statements are guarded so repeat startups are no-ops.
db.prepare(`
  INSERT INTO miles_transactions (user_id, amount, type, description)
  SELECT u.id, 10000, 'grant', '注册赠礼'
  FROM users u
  WHERE NOT EXISTS (SELECT 1 FROM miles_transactions t WHERE t.user_id = u.id AND t.type = 'grant')
`).run();

db.prepare(`
  INSERT INTO miles_transactions (user_id, amount, type, order_id, description)
  SELECT o.user_id, -(p.mileage_cost * o.quantity), 'redeem', o.id, '兑换「' || p.name || '」'
  FROM orders o JOIN products p ON o.product_id = p.id
  WHERE NOT EXISTS (SELECT 1 FROM miles_transactions t WHERE t.type = 'redeem' AND t.order_id = o.id)
`).run();

// Seed the tree product's offset project attribution (INSERT OR IGNORE above
// won't update an existing row, so this guarded UPDATE handles old databases)
db.prepare(`
  UPDATE products
  SET project_name = '阿拉善荒漠植树造林', project_standard = 'CCER（演示口径）', project_vintage = '2026'
  WHERE id = 3 AND project_name IS NULL
`).run();

// Normalized product select — nullable columns coalesced to match the shared Product type
export const PRODUCT_SELECT = `
  SELECT id, name, COALESCE(description, '') AS description, category,
    mileage_cost, stock, COALESCE(icon_type, 'bag') AS icon_type,
    COALESCE(project_name, '') AS project_name,
    COALESCE(project_standard, '') AS project_standard,
    COALESCE(project_vintage, '') AS project_vintage
  FROM products
`;

export default db;
