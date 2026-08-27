# GreenMiles ✈️🌱

**航司绿色里程生态商城 Demo —— 让飞行碳足迹可见，让闲置里程变绿。**

[![CI](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml/badge.svg)](https://github.com/TakamiyaHaruka/greenmiles/actions/workflows/ci.yml)
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

## 功能特性

- 🔐 **用户认证** —— 注册 / 登录，JWT（httpOnly Cookie）+ bcrypt 密码加密
- 🧮 **碳排放计算器** —— 输入距离、机型、舱位，得出 CO₂ 排放量及生活化类比（"相当于一棵树 X 天的吸收量"）
- 🛒 **里程商城** —— 4 类商品（实物、电子券、碳抵消、公益捐赠），含库存、购物车、里程结算
- 🎫 **凭证证明** —— 每笔兑换生成带二维码的兑换凭证
- 📊 **订单与看板** —— 历史订单 + KPI 总览
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

以上为演示用的简化系数，并非官方核算方法。完整实现见 [`src/lib/carbon.ts`](src/lib/carbon.ts)。

## 项目结构

```
src/
├── app/
│   ├── (pages)/        # 首页、计算器、商城、订单、登录、注册
│   └── api/            # auth、products、orders、user 接口
├── components/         # 业务组件 + shadcn/ui 基础组件
├── lib/                # 数据库、认证、碳排放引擎、Zod 校验
├── stores/             # Zustand 状态（用户、购物车、碳排放）
└── middleware.ts       # JWT 路由守卫
```

## 用 AI Agent 全流程开发 🤖

本项目从需求到落地全流程使用 **BMad Method v6.7.1** 与 AI Agent 协作完成：产品简介 → PRD（含 19 条决策日志）→ 架构设计 → UX 设计 → Epics & Stories → 逐 Story 实现。

全部规划与实现产出物见 [`docs/bmad/`](docs/bmad/)，完整复盘文章见 [`docs/zh-CN/`](docs/zh-CN/)。

## 参与贡献

欢迎提 Issue 和 Pull Request！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

基于 [MIT License](LICENSE) 开源。
