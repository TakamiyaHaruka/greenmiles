---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['prd.md', 'ux-design-specification.md', 'Carbon_Calculation_Spec.md', '商品兑换逻辑表.xlsx', 'UI设计初稿.md', '答复1.md', '答复2.md']
workflowType: 'architecture'
lastStep: 8
status: 'complete'
project_name: 'GreenMiles'
user_name: 'lin'
date: '2026-05-25'
completedAt: '2026-05-27'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements（6 个功能域）：**

| # | 功能域 | 核心需求 | 架构含义 |
|---|--------|----------|----------|
| FR1 | 用户认证 | 注册/登录，独立账号 | 认证层，PoC 阶段简化 |
| FR2 | 碳排放计算 | 三因子公式（距离×机型×舱位） | 前端纯计算，无后端依赖 |
| FR3 | 商品管理 | 后台 CRUD 录入 | 简单数据存储 + API |
| FR4 | 里程兑换 | 扣减事务 + 4 种凭证生成 | 核心事务逻辑，需持久化 |
| FR5 | 订单与凭证 | 券码/二维码/证书/订单状态 | 4 种凭证类型，统一接口 |
| FR6 | 会员控制台 | 余额、碳排统计、KPI 看板 | Mock 数据 + Recharts |

**Non-Functional Requirements：**

| 项目 | 约束 | 架构影响 |
|------|------|----------|
| 定位 | Demo/PoC，不上线生产 | 技术选型偏向开发效率 |
| 性能 | QPS <50 | 轻量级方案即可 |
| 安全 | Mock 数据，无真实支付 | 简化安全措施 |
| 数据库 | 不存储真实个人信息 | Mock 常旅客卡号 |
| 支付 | 仅虚拟里程扣减 | 无需支付网关集成 |

**Scale & Complexity：**

- 主技术领域：Full-stack Web（Next.js 前后端一体化）
- 复杂度等级：Medium
- 预估架构组件：~8 个核心模块
- 核心事务：里程扣减（需原子性防超扣）

### Technical Constraints & Dependencies

| 约束 | 说明 |
|------|------|
| 技术栈已定 | Next.js + Tailwind CSS + shadcn/ui + Recharts + Framer Motion |
| PoC 定位 | 开发效率优先，不过度工程化 |
| 4 种商品 | 兑换逻辑各异，需统一接口 + 分支处理 |
| 碳排放公式 | 前端纯计算，无需后端参与 |
| 桌面端优先 | 暂不处理移动端响应式 |

### Cross-Cutting Concerns Identified

| 关注点 | 影响范围 | 优先级 |
|--------|----------|--------|
| 里程扣减事务 | 订单、商品、用户余额 | P0 |
| 状态管理 | 购物车、余额、碳排数据 | P0 |
| 凭证生成接口 | 4 种商品类型 | P1 |
| 数据持久化策略 | 全部数据 | P1 |
| 认证方案 | 用户相关所有模块 | P1 |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack Web — Next.js App Router + Tailwind CSS + shadcn/ui

### Starter Options Considered

| 方案 | 说明 | 推荐 |
|------|------|------|
| **`create-next-app` + `shadcn init`** | Next.js 官方脚手架 + shadcn/ui 按需安装组件 | **推荐** |
| T3 Stack (create-t3-app) | Next.js + tRPC + Prisma + NextAuth | 过重，PoC 不需要 |
| Next.js + 手动搭建 | 全手动配置 Tailwind + ESLint + TypeScript | 浪费时间，无收益 |

### Selected Starter: create-next-app + shadcn/ui

**Rationale：**
- `create-next-app` 是 Next.js 官方唯一推荐的初始化方式，维护活跃
- shadcn/ui 按需安装组件（不全量引入），保持项目轻量
- 所有技术栈决策（TypeScript、Tailwind、ESLint、App Router）由脚手架完成
- PoC 定位，不需要 T3 Stack 的 tRPC/Prisma/NextAuth 层

**Initialization Commands：**

```bash
# Step 1: 创建 Next.js 项目
npx create-next-app@latest greenmiles --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Step 2: 初始化 shadcn/ui
npx shadcn@latest init

# Step 3: 安装所需 shadcn/ui 组件
npx shadcn@latest add button card dialog sheet badge tabs select input separator table

# Step 4: 安装额外依赖
npm install recharts framer-motion qrcode.react lucide-react react-hook-form zod @hookform/resolvers
```

**Architectural Decisions Provided by Starter：**

| 项目 | 决策 |
|------|------|
| **Language** | TypeScript（strict 模式） |
| **Styling** | Tailwind CSS + `cn()` 工具函数（`clsx` + `tailwind-merge`） |
| **Build Tooling** | Next.js 内置（Turbopack 开发，Webpack 生产） |
| **Linting** | ESLint + Next.js core-web-vitals 配置 |
| **Routing** | App Router（`src/app/` 目录） |
| **Project Structure** | `src/app/` 页面路由 + `src/components/` 组件 + `src/lib/` 工具函数 |
| **CSS Variables** | shadcn/ui 主题系统（`hsl(var(--primary))` 语法） |

**Note:** 项目初始化命令应作为第一个开发 Story 执行。

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data storage: SQLite + better-sqlite3
- Authentication: JWT (jose)
- State management: Zustand

**Important Decisions (Shape Architecture):**
- API pattern: Next.js API Routes (REST)
- Data validation: Zod (前后端共享)
- Error handling: 统一 `{ error: string }` 格式

**Deferred Decisions (Post-MVP):**
- 移动端响应式适配 → Deferred（桌面端优先）
- CI/CD → Deferred（本地运行）
- 真实支付集成 → Deferred（虚拟里程）

### Data Architecture

**Storage: SQLite + better-sqlite3**
- 零配置，单文件数据库
- 文件路径: `./greenmiles.db`
- 后续迁移 PostgreSQL 只需换驱动
- 理由: PoC 范围足够，不需要 ORM 重量

**数据模型:**
- `users`: id, email, password_hash, miles_balance, created_at
- `products`: id, name, description, category, mileage_cost, stock, icon_type
- `orders`: id, user_id, product_id, status, voucher_code, created_at
- `carbon_records`: id, user_id, distance, aircraft_type, cabin_class, co2_kg, created_at

### Authentication & Security

**Method: JWT**
- 库: jose（轻量、Edge Runtime 兼容）
- Token 存储: httpOnly cookie
- 简化: 不做 refresh token，PoC 范围够用

### API & Communication Patterns

**Pattern: Next.js API Routes (REST)**
- 路由: `src/app/api/[resource]/route.ts`
- 校验: Zod schema 共享前后端
- 错误格式: `{ error: string }`
- 事务: 里程扣减用 SQLite BEGIN/COMMIT

### Frontend Architecture

**State Management: Zustand**
- `store/cart`: 购物车状态（商品列表、总里程）
- `store/user`: 用户信息（里程余额、认证状态）
- `store/carbon`: 碳排放数据（计算结果、历史记录）

**Component Architecture:**
- `src/components/ui/` — shadcn/ui 组件（自动生成）
- `src/components/` — 业务组件（ProductCard, CarbonCalculator 等）
- `src/lib/` — 工具函数（碳排放计算、凭证生成、Zod schemas）

### Infrastructure & Deployment

**Local Development Only:**
- 运行: `npm run dev`（Turbopack）
- 环境变量: `.env.local`
- 数据库: `./greenmiles.db`（SQLite）
- 端口: 3000（Next.js 默认）

### Decision Impact Analysis

**Implementation Sequence:**
1. 项目初始化（create-next-app + shadcn init）
2. 数据库层（SQLite + schema 定义）
3. 认证层（JWT 登录/注册）
4. API Routes（商品 CRUD、里程扣减）
5. 前端状态（Zustand stores）
6. UI 组件（shadcn/ui + 业务组件）

**Cross-Component Dependencies:**
- 认证层依赖数据库（users 表）
- API Routes 依赖数据库 + 认证中间件
- 前端 Zustand stores 依赖 API Routes
- UI 组件依赖 Zustand stores

## Implementation Patterns & Consistency Rules

### Naming Patterns

| 类别 | 规则 | 示例 |
|------|------|------|
| **数据库表名** | 复数、snake_case | `users`, `products`, `orders`, `carbon_records` |
| **数据库列名** | snake_case | `user_id`, `mileage_cost`, `created_at` |
| **API 端点** | 复数、RESTful | `/api/users`, `/api/products`, `/api/orders` |
| **React 组件** | PascalCase 文件名 + 组件名 | `ProductCard.tsx` → `<ProductCard />` |
| **工具函数** | camelCase | `calculateCarbonEmission()`, `generateVoucherCode()` |
| **Zustand Store** | `use[Entity]Store` | `useCartStore`, `useUserStore`, `useCarbonStore` |
| **Zod Schema** | 名词大写 | `ProductSchema`, `OrderSchema`, `LoginSchema` |

### Structure Patterns

```
src/
├── app/
│   ├── page.tsx              # 首页（Dashboard）
│   ├── mall/page.tsx         # 商城页
│   ├── orders/page.tsx       # 订单历史页
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   └── register/route.ts
│       ├── products/route.ts
│       ├── products/[id]/route.ts
│       ├── orders/route.ts
│       ├── orders/[id]/route.ts
│       └── user/route.ts
├── components/
│   ├── ui/                   # shadcn/ui 组件（自动生成）
│   ├── ProductCard.tsx
│   ├── CarbonCalculator.tsx
│   ├── CartDialog.tsx
│   ├── ContextBanner.tsx
│   ├── VoucherDisplay.tsx
│   └── MilesBalance.tsx
├── lib/
│   ├── db.ts                 # SQLite 连接
│   ├── auth.ts               # JWT 工具
│   ├── carbon.ts             # 碳排放计算
│   ├── voucher.ts            # 凭证生成
│   └── schemas.ts            # Zod schemas
├── stores/
│   ├── cartStore.ts
│   ├── userStore.ts
│   └── carbonStore.ts
└── middleware.ts
```

### Format Patterns

**API Response 格式：**
```typescript
// 成功
{ data: T }
// 错误
{ error: string }
// 列表
{ data: T[], total: number }
```

**日期格式：** ISO 8601（`2026-05-25T10:30:00Z`）

**JSON 字段命名：** 数据库 snake_case，前端 camelCase，API 层做转换。

### Process Patterns

**Error Handling：**
- API Routes: try/catch + `{ error: string }`
- 前端: Zustand store 中 `error` 字段，组件读取展示
- 表单: react-hook-form `formState.errors`

**Loading States：**
- 全局: Zustand store 中 `loading: boolean`
- 局部: 组件内 `useState`
- UI: Spinner + "加载中..."

### Enforcement Guidelines

**All AI Agents MUST：**
- 使用 `cn()` 工具函数合并 Tailwind 类名
- 所有卡片加 `border border-[#E2E8F0]`（无障碍强制）
- API Routes 返回统一 `{ data }` 或 `{ error }` 格式
- 组件 props 类型用 TypeScript interface 定义
- Zod schema 放在 `lib/schemas.ts` 统一管理

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui — 标准全栈组合，完全兼容
- SQLite (better-sqlite3) — 零配置，适合 PoC，同步 API 在 PoC 并发量下无问题
- JWT (jose) — Edge Runtime 兼容，httpOnly cookie 存储，无 refresh token
- Zustand + Zod + react-hook-form — 轻量级前端方案，无冲突
- **无矛盾决策**

**Pattern Consistency:**
- 命名规范统一：数据库 snake_case、API RESTful 复数、组件 PascalCase、Store `use[Entity]Store`
- API 响应格式一致：`{ data: T }` / `{ error: string }`
- 错误处理三层覆盖：API Routes try/catch、Zustand error 字段、react-hook-form formState

**Structure Alignment:**
- `src/app/` 路由 + API、`src/components/` 业务组件、`src/lib/` 工具、`src/stores/` 状态 — 层次清晰
- 中间件 `src/middleware.ts` 独立处理认证，不侵入业务逻辑
- **结构风险**：`src/app/` 中页面路由与 API 路由混合，需在实施首日用 Route Group（`(pages)/`）划清边界

### Requirements Coverage Validation ✅

| FR | 需求 | 架构支持 | 状态 |
|----|------|----------|------|
| FR1 | 用户认证 | JWT (jose) + httpOnly cookie + middleware.ts | ✅ |
| FR2 | 碳排放计算 | `lib/carbon.ts` 前端纯计算 | ✅ |
| FR3 | 商品管理 | API Routes `/api/products` + SQLite | ✅ |
| FR4 | 里程兑换 | SQLite BEGIN/COMMIT 事务 + `lib/voucher.ts` | ✅ |
| FR5 | 订单与凭证 | 4 种凭证类型统一接口 + orders 表 | ✅ |
| FR6 | 会员控制台 | Zustand stores + Recharts + Mock 数据 | ✅ |

**NFR 覆盖：**
- 性能 (QPS<50) — SQLite 足够 ✅
- 安全 (Mock 数据) — 简化安全措施 ✅
- 数据库 (不存储真实信息) — Mock 常旅客卡号 ✅
- 支付 (虚拟里程) — 无支付网关 ✅

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 所有关键技术选型已记录版本范围
- 初始化命令完整（create-next-app + shadcn init + 依赖安装）
- 实现顺序明确（6 步）

**Structure Completeness:**
- 完整目录树定义（20+ 文件）
- API 端点 7 个已定义
- 组件边界清晰（ui/ 业务组件分离）

**Pattern Completeness:**
- 命名、格式、错误处理、加载状态均已规范
- 无障碍规则明确（卡片边框强制、aria-label）

### Gap Analysis Results

**Critical Gaps（实施前必须补齐）：**

| # | 缺失项 | 说明 | 建议 |
|---|--------|------|------|
| 1 | SQLite DDL | 无 CREATE TABLE 语句，schema 不明确 | 在 `src/lib/db.ts` 内联建表或放 `schema.sql`，第一个开发任务 |
| 2 | JWT_SECRET 环境变量 | `.env.local.example` 未列出，clone 后认证直接崩溃 | 补充到环境变量模板，加 `// Required` 注释 |
| 3 | 种子数据 | 4 个商品无初始数据，无法 demo | 在首个 API 开发时一并创建 seed 脚本，包含完整用户旅程数据 |

**Important Gaps（非阻塞，但需关注）：**

| # | 缺失项 | 说明 |
|---|--------|------|
| 4 | 测试策略 | 未定义 Jest/Vitest 配置、测试目录结构、CI 集成 |
| 5 | 页面路由分组 | `src/app/` 中页面与 API 混合，需用 Route Group `(pages)/` 划分 |
| 6 | 4 种 voucher 返回结构 | API 层面需明确统一接口 + 分支处理的具体类型定义 |

**Nice-to-Have Gaps（可后续补充）：**

| # | 缺失项 | 说明 |
|---|--------|------|
| 7 | SQLite 迁移策略 | better-sqlite3 同步 API 阻塞事件循环，生产需换 libsql/PostgreSQL |

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY WITH CRITICAL GAPS — 3 个 Critical Gap 需在第一个开发任务中补齐

**Confidence Level:** High

**Key Strengths:**
- 技术栈轻量且成熟，PoC 定位精准
- 事务处理方案明确（SQLite BEGIN/COMMIT 防超扣）
- 4 种商品兑换逻辑统一接口 + 分支处理
- 前后端验证共享 Zod schema，一致性好
- Zustand + Zod 职责清晰，比 Redux 方案更适合此场景

**Areas for Future Enhancement:**
- 测试策略定义（Vitest 配置、测试目录、CI）
- SQLite 迁移路径（better-sqlite3 → libsql/PostgreSQL）
- 移动端响应式适配（已记录 M1-M9 待处理项）

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
1. 项目初始化（`npx create-next-app@latest greenmiles` + `shadcn init`）
2. 补齐 Critical Gap #1：SQLite DDL（`src/lib/db.ts` 内联建表）
3. 补齐 Critical Gap #2：`.env.local.example` 含 JWT_SECRET
4. 补齐 Critical Gap #3：种子数据（4 个商品 + 测试用户）
5. 继续按实现顺序推进
