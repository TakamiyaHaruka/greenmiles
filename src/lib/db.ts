import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'greenmiles.db');

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
`);

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

export default db;
