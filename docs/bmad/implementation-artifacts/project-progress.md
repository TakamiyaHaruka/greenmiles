# GreenMiles 项目进度报告

**更新日期：** 2026-05-27

---

## 一、项目概况

| 项目 | 说明 |
|------|------|
| 项目名称 | GreenMiles — 航司绿色里程生态商城 |
| 项目定位 | Demo / PoC（概念验证） |
| 技术栈 | Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui + SQLite + Zustand |
| 开发方式 | AI Agent 协作（BMad Method v6.7.1） |

---

## 二、整体进度

| 阶段 | 状态 | 产出物 |
|------|------|--------|
| Phase 1: 需求分析 | done | Product Brief |
| Phase 2: 产品规划 | done | PRD, UX Design Specification |
| Phase 3: 方案设计 | done | Architecture, Epics & Stories, Implementation Readiness Report |
| Phase 4: 开发实施 | done | 15 Stories 全部完成 |

**总体完成率：100%（15/15 Stories）**

---

## 三、Epic 完成明细

### Epic 1: 项目基础设施与用户认证（5/5 done）

| Story | 名称 | 状态 | 核心产出 |
|-------|------|------|----------|
| 1-1 | 项目初始化与设计系统 | done | Next.js 项目、Tailwind 设计 tokens、shadcn/ui 组件 |
| 1-2 | 数据库与种子数据 | done | SQLite 4 张表、测试用户 + 4 个商品 |
| 1-3 | 用户注册 | done | POST /api/auth/register、Zod 校验、bcrypt 加密 |
| 1-4 | 用户登录与鉴权 | done | JWT、httpOnly cookie、中间件路由保护 |
| 1-5 | 导航栏与里程余额 | done | Navbar、MilesBalance、UserInitializer |

### Epic 2: 碳排放计算工具（3/3 done）

| Story | 名称 | 状态 | 核心产出 |
|-------|------|------|----------|
| 2-1 | 碳排放计算引擎 | done | calculateCarbonEmission、getCarbonAnalogy、预设航线 |
| 2-2 | 碳排放计算器 UI | done | CarbonCalculator 组件、Recharts 圆环图 |
| 2-3 | 上下文推荐 Banner | done | carbonStore、ContextBanner、商城联动 |

### Epic 3: 绿色商城与兑换流程（5/5 done）

| Story | 名称 | 状态 | 核心产出 |
|-------|------|------|----------|
| 3-1 | 商品列表页 | done | GET /api/products、ProductCard、分类 Tab、排序 |
| 3-2 | 商品详情 Sheet | done | ProductDetailSheet、地址表单、兑换条款 |
| 3-3 | 购物车 Dialog | done | cartStore、CartDialog、导航栏角标 |
| 3-4 | 里程结算与凭证生成 | done | POST /api/orders、事务扣减、VoucherDisplay |
| 3-5 | 商品与订单 API | done | /api/products、/api/orders 完整 CRUD |

### Epic 4: 会员控制台与数据看板（2/2 done）

| Story | 名称 | 状态 | 核心产出 |
|-------|------|------|----------|
| 4-1 | 订单历史页 | done | /orders 页面、凭证详情 Dialog |
| 4-2 | Dashboard 与 KPI 看板 | done | 首页 KPI 卡片、Recharts 图表、推荐商品 |

---

## 四、文件清单

### 组件（src/components/）

| 文件 | 说明 |
|------|------|
| Navbar.tsx | 导航栏（Logo、导航、搜索、购物车、里程余额） |
| MilesBalance.tsx | 里程余额展示 |
| UserInitializer.tsx | 用户状态初始化 |
| LoginForm.tsx | 登录表单 |
| RegisterForm.tsx | 注册表单 |
| CarbonCalculator.tsx | 碳排放计算器 |
| ContextBanner.tsx | 上下文推荐 Banner |
| ProductCard.tsx | 商品卡片 |
| ProductDetailSheet.tsx | 商品详情 Sheet |
| CartDialog.tsx | 购物车 Dialog |
| VoucherDisplay.tsx | 凭证展示 |

### 页面（src/app/）

| 路由 | 说明 |
|------|------|
| / | 首页（KPI 看板 + 推荐商品） |
| /login | 登录页 |
| /register | 注册页 |
| /calculator | 碳排放计算器页 |
| /mall | 绿色商城页 |
| /orders | 订单历史页 |

### API（src/app/api/）

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/auth/register | POST | 用户注册 |
| /api/auth/login | POST | 用户登录 |
| /api/user | GET | 获取用户信息 |
| /api/products | GET | 商品列表 |
| /api/orders | POST | 创建订单（事务） |
| /api/orders | GET | 订单列表 |

### 状态管理（src/stores/）

| 文件 | 说明 |
|------|------|
| userStore.ts | 用户状态（认证、里程余额） |
| carbonStore.ts | 碳排放计算结果 |
| cartStore.ts | 购物车状态 |

### 工具库（src/lib/）

| 文件 | 说明 |
|------|------|
| carbon.ts | 碳排放计算引擎 |
| db.ts | SQLite 数据库连接 + 种子数据 |
| schemas.ts | Zod 校验 schemas |
| auth.ts | JWT 工具函数 |
| utils.ts | 通用工具（cn） |

---

## 五、技术债务与已知问题

| 项目 | 说明 | 优先级 |
|------|------|--------|
| 测试基础设施 | 无测试框架、无测试用例 | 高 |
| Google Fonts | Geist 字体网络加载失败，已移除 | 低 |
| Middleware 弃用 | Next.js 16 标记 middleware 为 deprecated，建议迁移到 proxy | 中 |
| 数据库文件 | greenmiles.db 未加入 .gitignore | 低 |

---

## 六、下一步建议

1. **Code Review** — 对已完成代码进行审查
2. **QA 自动化测试** — 搭建 Vitest + Playwright，编写测试用例
3. **Retrospective** — 项目回顾，总结经验教训
4. **代码提交** — 初始化 git，提交所有代码
