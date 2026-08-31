# GreenMiles ✈️🌱

**航司绿色里程生态商城 Demo —— 让飞行碳足迹可见，让闲置里程变绿。**

[![CI](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml/badge.svg)](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml)
[![E2E: Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) | [简体中文](README.zh-CN.md)

> [!NOTE]
> GreenMiles 是一个 **Demo / 概念验证（PoC）** 项目。本地运行、使用种子数据，不接入真实支付、真实航司或真实用户数据。

## 项目背景

传统航空公司会员的里程面临两大问题：

- **零碎里程难兑换** —— 兑换机票门槛太高，大量里程长期沉睡；
- **碳足迹认知空白** —— 旅客越来越关注绿色出行，却缺少把"认知"转化为"行动"的工具。

GreenMiles 探索的答案是：一个轻量级绿色生态商城，让每次飞行的碳排放变得可见，让闲置里程兑换成环保商品与碳抵消服务，形成"飞得越多，绿得越深"的正向循环。

核心体验旅程：**Reveal（揭示碳排）→ Offset（采取行动）→ Proof（携带证明）**。

## 界面截图

**会员控制台 —— 所有 KPI 均由数据库实时计算（非 Mock 数据）：**

![控制台](docs/screenshots/dashboard.png)

**碳排放计算器：**

![计算器](docs/screenshots/calculator.png)

**里程商城：**

![商城](docs/screenshots/mall.png)

**管理后台**（`/admin`，由 `ADMIN_PASSWORD` 登录）：

![管理后台](docs/screenshots/admin.png)

## 功能特性

- 🔐 **用户认证** —— 注册 / 登录 / 登出，JWT（httpOnly Cookie）+ bcrypt 密码加密
- 🧮 **碳排放计算器** —— 输入航班号一键导入（演示数据），或选择起降机场由内置机场坐标自动计算大圆距离；结合机型、舱位得出 CO₂ 排放量及生活化类比（"相当于一棵树 X 天的吸收量"）；支持保存行程到碳足迹历史（服务端复算后再落库，不信任前端数值）
- 🛒 **里程商城** —— 4 类商品（实物、电子券、碳抵消、公益捐赠），含库存、购物车、多数量结算（单笔 1-10 件）与实体商品收货地址表单
- 🎫 **凭证证明** —— 每笔兑换生成带二维码的兑换凭证；实体商品订单进入"待发货"状态并展示收货信息
- 📊 **订单与实时看板** —— 历史订单 + `/api/stats` 实时平台指标：累计碳减排（每棵树 22 kg CO₂/年）、里程绿色转化率、兑换次数、我的飞行碳足迹
- 🛠️ **管理后台** —— `/admin` 商品增删改查，`ADMIN_PASSWORD` 独立会话（与会员账号分离）；已有订单的商品禁止删除
- 🗄️ **零配置 SQLite** —— 首次运行自动建库、建表、写入种子数据

## 技术栈

Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui · SQLite (better-sqlite3) · Zustand · Zod · JWT (jose) · Vitest · Testing Library

## 快速开始

前置要求：**Node.js 20+** 和 npm。

```bash
# 1. 克隆项目
git clone https://github.com/TakamiyaHaruka/greenmiles.git
cd greenmiles

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，设置 JWT_SECRET（可用 `openssl rand -base64 32` 生成）
# 可选：设置 ADMIN_PASSWORD 以启用 /admin 商品管理后台

# 4. 启动
npm run dev
```

打开 <http://localhost:3000>。SQLite 数据库（`greenmiles.db`）会在首次运行时自动创建并写入种子数据，无需手动迁移。

**测试账号：** `test@greenmiles.com` / `password123`（里程余额 10,000）

### 脚本命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 <http://localhost:3000> |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm test` | 运行单元测试（Vitest） |
| `npm run test:coverage` | 单元测试 + 覆盖率报告 |
| `npm run test:e2e` | 运行 Playwright E2E 旅程 —— 自动构建、重置隔离 SQLite 库并在 `:3100` 启动 |
| `npm run lint` | ESLint 检查 |

## 碳排放计算方法

```
CO₂ (kg) = 航距 (km) × 机型系数 (kg/km) × 舱位权重
```

| 机型 | 系数 (kg CO₂/km) | | 舱位 | 权重 |
| --- | --- | --- | --- | --- |
| 窄体高效机型 | 0.075 | | 经济舱 | ×1.0 |
| 窄体标准机型 | 0.090 | | 超级经济舱 | ×1.5 |
| 宽体高效机型 | 0.110 | | 商务舱 | ×2.5 |
| 宽体大型机型 | 0.140 | | 头等舱 | ×4.0 |

以上为演示用的简化系数，并非官方核算方法。每兑换一棵树按 **22 kg CO₂/年** 计入累计碳减排，与计算器的树木类比文案保持一致。飞行距离由 [`src/lib/airports.ts`](src/lib/airports.ts) 内置的机场坐标（Haversine 大圆距离）本地计算；航班号查询走 [`src/lib/flightInfo.ts`](src/lib/flightInfo.ts) 的 Provider 抽象，演示环境使用种子数据（VariFlight / AeroAPI 等真实数据源为商业接口，可作为适配器接入）。完整排放公式见 [`src/lib/carbon.ts`](src/lib/carbon.ts)。

## 测试

- **单元测试（Vitest + Testing Library）**—— 170 条用例，覆盖碳排放引擎、机场坐标与距离计算、航班 Provider、认证工具、Zod 校验、API 路由（订单、碳足迹、航班、统计、管理后台）、路由守卫 proxy 和 Zustand store。`npm test`
- **E2E（Playwright）**—— 7 条旅程，跑在独立、每次全新种子的 SQLite 数据库上：注册登录、碳排放计算、航班号导入预填、里程兑换含凭证二维码、订单历史、未登录路由守卫、余额不足结算守卫。首次运行先 `npx playwright install chromium`，然后 `npm run test:e2e`

## 项目结构

```
src/
├── app/
│   ├── (pages)/        # 首页、计算器、商城、订单、管理后台、登录、注册
│   └── api/            # auth、products、orders、carbon、stats、admin 接口
├── components/         # 业务组件 + shadcn/ui 基础组件
├── lib/                # 数据库、认证、碳排放引擎、机场坐标、航班 Provider、Zod 校验
├── stores/             # Zustand 状态（用户、购物车、碳排放）
└── proxy.ts            # JWT 路由守卫（Next.js 16 proxy 约定）
```

## 用 AI Agent 全流程开发 🤖

本项目从需求到落地全流程使用 **BMad Method v6.7.1** 与 AI Agent 协作完成：产品简介 → PRD（含 19 条决策日志）→ 架构设计 → UX 设计 → Epics & Stories → 逐 Story 实现。

逐 Story 实现记录见 [`docs/bmad/`](docs/bmad/)，完整复盘文章见 [`docs/zh-CN/`](docs/zh-CN/)。

## 参与贡献

欢迎提 Issue 和 Pull Request！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

基于 [MIT License](LICENSE) 开源。
