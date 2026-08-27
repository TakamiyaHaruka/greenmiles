# Story 1.2: 数据库层与种子数据

Status: done

## Story

As a 开发者,
I want 初始化 SQLite 数据库并写入种子数据,
so that 系统有可用的数据存储和演示数据。

## Acceptance Criteria

1. 创建 `src/lib/db.ts` 数据库连接模块，使用 better-sqlite3 连接 `./greenmiles.db`
2. 执行 CREATE TABLE IF NOT EXISTS 创建 4 张表：users, products, orders, carbon_records
3. users 表包含：id, email, password_hash, miles_balance, created_at
4. products 表包含：id, name, description, category, mileage_cost, stock, icon_type
5. orders 表包含：id, user_id, product_id, status, voucher_code, address, created_at
6. carbon_records 表包含：id, user_id, distance, aircraft_type, cabin_class, co2_kg, created_at
7. 种子数据包含：1 个测试用户（email: test@greenmiles.com, miles_balance: 10000）
8. 种子数据包含：4 个商品（骑行卡 1200 里程、酒店券 2000 里程、植树 3000 里程、帆布袋 5000 里程）
9. 创建 `src/lib/schemas.ts` 含 Zod schema：LoginSchema, RegisterSchema, ProductSchema, OrderSchema

## Tasks / Subtasks

- [x] 安装 better-sqlite3 依赖 (AC: #1)
  - [x] npm install better-sqlite3
  - [x] npm install -D @types/better-sqlite3
- [x] 创建数据库连接模块 (AC: #1)
  - [x] 创建 src/lib/db.ts
  - [x] 使用 better-sqlite3 连接 ./greenmiles.db
  - [x] 导出 db 实例
- [x] 创建 users 表 (AC: #2, #3)
  - [x] id INTEGER PRIMARY KEY AUTOINCREMENT
  - [x] email TEXT UNIQUE NOT NULL
  - [x] password_hash TEXT NOT NULL
  - [x] miles_balance INTEGER DEFAULT 10000
  - [x] created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- [x] 创建 products 表 (AC: #2, #4)
  - [x] id INTEGER PRIMARY KEY AUTOINCREMENT
  - [x] name TEXT NOT NULL
  - [x] description TEXT
  - [x] category TEXT NOT NULL
  - [x] mileage_cost INTEGER NOT NULL
  - [x] stock INTEGER DEFAULT 0
  - [x] icon_type TEXT
- [x] 创建 orders 表 (AC: #2, #5)
  - [x] id INTEGER PRIMARY KEY AUTOINCREMENT
  - [x] user_id INTEGER REFERENCES users(id)
  - [x] product_id INTEGER REFERENCES products(id)
  - [x] status TEXT DEFAULT 'pending'
  - [x] voucher_code TEXT
  - [x] address TEXT
  - [x] created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- [x] 创建 carbon_records 表 (AC: #2, #6)
  - [x] id INTEGER PRIMARY KEY AUTOINCREMENT
  - [x] user_id INTEGER REFERENCES users(id)
  - [x] distance REAL NOT NULL
  - [x] aircraft_type TEXT NOT NULL
  - [x] cabin_class TEXT NOT NULL
  - [x] co2_kg REAL NOT NULL
  - [x] created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- [x] 插入种子数据 - 测试用户 (AC: #7)
  - [x] email: test@greenmiles.com
  - [x] password_hash: 使用 bcrypt 哈希 "password123"
  - [x] miles_balance: 10000
- [x] 插入种子数据 - 4 个商品 (AC: #8)
  - [x] 共享单车骑行卡: 1200 里程, category: virtual
  - [x] 酒店 50 元券: 2000 里程, category: virtual
  - [x] 植树公益: 3000 里程, category: carbon
  - [x] 帆布袋: 5000 里程, category: physical
- [x] 创建 Zod schemas (AC: #9)
  - [x] 创建 src/lib/schemas.ts
  - [x] LoginSchema: email, password
  - [x] RegisterSchema: email, password, confirmPassword
  - [x] ProductSchema: name, description, category, mileage_cost, stock, icon_type
  - [x] OrderSchema: product_id, address (optional)

## Dev Notes

### Architecture Context

- **Database:** SQLite + better-sqlite3（零配置，单文件数据库）
- **文件路径:** `./greenmiles.db`
- **API:** better-sqlite3 是同步 API，适合 PoC 并发量（QPS < 50）
- **Schema 定义:** 使用 CREATE TABLE IF NOT EXISTS，启动时自动建表
- **种子数据:** 使用 INSERT OR IGNORE 防止重复插入

### Data Model

| 表名 | 主要字段 | 说明 |
|------|----------|------|
| users | id, email, password_hash, miles_balance | 用户表，新用户默认 10000 里程 |
| products | id, name, category, mileage_cost, stock | 商品表，4 种类型 |
| orders | id, user_id, product_id, status, voucher_code | 订单表，关联用户和商品 |
| carbon_records | id, user_id, distance, co2_kg | 碳排放记录表 |

### Seed Data

**测试用户:**
- email: test@greenmiles.com
- password: password123 (bcrypt hashed)
- miles_balance: 10000

**商品列表:**
| 名称 | 里程 | 分类 | icon_type |
|------|------|------|-----------|
| 共享单车骑行卡 | 1200 | virtual | bike |
| 酒店 50 元券 | 2000 | virtual | hotel |
| 植树公益 | 3000 | carbon | tree |
| 帆布袋 | 5000 | physical | bag |

### Zod Schema Definitions

```typescript
// LoginSchema
{ email: string (email format), password: string (min 6) }

// RegisterSchema
{ email: string (email format), password: string (min 6), confirmPassword: string }

// ProductSchema
{ name: string, description: string, category: string, mileage_cost: number (positive), stock: number (non-negative), icon_type: string }

// OrderSchema
{ product_id: number (positive), address?: string }
```

### Enforcement Rules

- 使用 `cn()` 工具函数合并 Tailwind 类名
- 所有卡片加 `border border-[#E2E8F0]`（无障碍强制）
- 组件 props 类型用 TypeScript interface 定义
- Zod schema 放在 `lib/schemas.ts` 统一管理

### References

- [Architecture: Data Architecture](architecture.md#data-architecture)
- [Architecture: Implementation Patterns](architecture.md#implementation-patterns--consistency-rules)
- [Epic 1: Story 1.2](epics.md#story-12-数据库层与种子数据)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- better-sqlite3 已安装，同步 API 适合 PoC 并发量
- 数据库文件路径：./greenmiles.db
- 4 张表已创建：users, products, orders, carbon_records
- 种子数据已插入：1 个测试用户 + 4 个商品
- Zod schemas 已创建：LoginSchema, RegisterSchema, ProductSchema, OrderSchema
- 使用 INSERT OR IGNORE 防止重复插入种子数据

### File List
- greenmiles/src/lib/db.ts
- greenmiles/src/lib/schemas.ts
- greenmiles/package.json (updated: added better-sqlite3)
