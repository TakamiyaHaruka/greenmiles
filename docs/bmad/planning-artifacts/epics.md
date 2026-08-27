---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-05-27'
inputDocuments: ['prd.md', 'ux-design-specification.md', 'architecture.md']
---

# GreenMiles - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for GreenMiles, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: 用户认证 — 独立账号体系（注册/登录），支持邮箱或手机号，新用户初始化赠送 10,000 里程
FR2: 碳排放计算 — 三因子公式（飞行距离 × 机型基准排碳系数 × 舱位分摊权重），前端纯计算无后端依赖
FR3: 商品管理 — 后台管理员手动录入绿色商品/服务（名称、描述、所需里程、库存、分类），支持增删改查
FR4: 里程兑换 — 核心体验旅程 Reveal→Offset→Proof，碳排放结果页面下方直接解锁推荐抵消方案，余额不足时提示具体差额
FR5: 订单与凭证 — 兑换完成后按商品类型生成对应凭证（券码/二维码/碳抵消数据+小贴士/订单状态），会员可查看历史兑换订单
FR6: 会员控制台 — 里程余额概览、碳排放统计（历史航班行程累计）、兑换订单列表、Mock 数据看板（累计碳减排量 + 里程绿色转化率）
FR7: 商品兑换逻辑 — 4 种商品完整购物流程：共享单车骑行卡（券码）、酒店 50 元券（二维码）、植树公益（碳抵消数据+小贴士）、帆布袋（地址表单+待发货状态）

### NonFunctional Requirements

NFR1: 性能 — 预期并发 QPS < 50，本地运行或内部演示环境
NFR2: 安全与隐私 — 前端展示隐私协议勾选框，数据库不存储真实个人信息，全部使用 Mock 常旅客卡号
NFR3: Mock 数据 — 不引入真实三方支付，所有兑换仅消耗虚拟"航司里程"
NFR4: 数据 — PoC 阶段不对接外部数据源

### Additional Requirements

AR1: 项目初始化 — create-next-app + shadcn/ui 初始化，安装 10 个 shadcn 组件 + 6 个额外依赖
AR2: 数据库层 — SQLite + better-sqlite3，CREATE TABLE DDL（users/products/orders/carbon_records），种子数据
AR3: 认证层 — JWT (jose) + httpOnly cookie + middleware.ts，.env.local.example 含 JWT_SECRET
AR4: API 层 — Next.js API Routes (REST)，Zod schema 前后端共享，统一响应格式 { data } / { error }
AR5: 状态管理 — Zustand 3 个 store（cart/user/carbon）
AR6: 页面路由分组 — src/app/ 中用 Route Group (pages)/ 划分页面和 API
AR7: 事务处理 — 里程扣减用 SQLite BEGIN/COMMIT，原子性防超扣

### UX Design Requirements

UX-DR1: Design System 基础 — 色彩主题配置（primary #0A2540, accent #10B981, background #F8FAFC）、排版系统（Inter 字体 6 级）、间距规范（4px 基础单位）、圆角/阴影/边框规范
UX-DR2: ProductCard 组件 — 渐变色块 + Lucide Icon + 分类 Badge + 名称 + 价值钩子 + 里程价格 + CTA 按钮，hover 阴影增强，已兑换灰色遮罩
UX-DR3: CarbonCalculator 组件 — 常用航线预设 + 手动输入（距离/机型/舱位）+ 实时计算结果 + 比喻文字 + 圆环图 (Recharts) + CTA 按钮
UX-DR4: CartDialog 组件 — shadcn Dialog 居中弹窗，已加购商品列表 + 总消耗里程 + 逐个结算 + 余额不足置灰+差额提示 + 结算后凭证展示
UX-DR5: ProductDetailSheet 组件 — shadcn Sheet 右侧滑出抽屉，虚拟商品展示兑换条款，实体商品展示收货地址表单 + "加入购物车" 按钮
UX-DR6: ContextBanner 组件 — 从计算器进入商城时顶部动态 Banner："抵消您本次飞行的 XXXkg 碳排"，可关闭
UX-DR7: VoucherDisplay 组件 — 4 种变体：券码文本（可复制）、二维码图片 (qrcode.react)、碳抵消数据卡片 + 小贴士、订单状态标签
UX-DR8: MilesBalance 组件 — 导航栏右上角常驻里程余额，格式化数字
UX-DR9: 导航栏 — Logo（绿叶+小飞机）+ 主导航（首页/商城/订单）+ 搜索框（Coming Soon 禁用）+ 里程余额 + 购物车图标+角标，sticky top-0 + backdrop-blur-md
UX-DR10: 空状态 — 购物车为空引导去商城、订单为空引导去商城、首次使用 Hero Card + 10,000 里程
UX-DR11: 表单验证 — react-hook-form + zod，必填 * 标记，onBlur 校验，地址表单嵌入帆布袋兑换 Dialog
UX-DR12: 按钮层级 — Primary (生态绿 #10B981)、Secondary (边框)、Ghost (文字链)、Disabled (置灰)，一个视图只有一个 Primary

### FR Coverage Map

| FR | Epic | 说明 |
|----|------|------|
| FR1 | Epic 1 | 用户认证 |
| FR2 | Epic 2 | 碳排放计算 |
| FR3 | Epic 3 | 商品管理 |
| FR4 | Epic 3 | 里程兑换 |
| FR5 | Epic 3 | 订单与凭证 |
| FR6 | Epic 4 | 会员控制台 |
| FR7 | Epic 3 | 4 种商品兑换逻辑 |

## Epic List

### Epic 1: 项目基础设施与用户认证
用户可以注册账号、登录系统、查看里程余额。
**FRs covered:** FR1
**ARs covered:** AR1, AR2, AR3, AR4, AR5, AR6, AR7
**UX-DRs covered:** UX-DR1, UX-DR8, UX-DR9

### Epic 2: 碳排放计算工具
用户可以输入航班数据，查看碳排放量和直观比喻，并一键跳转商城。
**FRs covered:** FR2
**UX-DRs covered:** UX-DR3, UX-DR6

### Epic 3: 绿色商城与兑换流程
用户可以浏览商品、查看详情、加入购物车、用里程结算、获取凭证。
**FRs covered:** FR3, FR4, FR5, FR7
**UX-DRs covered:** UX-DR2, UX-DR4, UX-DR5, UX-DR7, UX-DR10, UX-DR11, UX-DR12

### Epic 4: 会员控制台与数据看板
用户可以查看兑换历史、碳减排统计、里程转化率 KPI。
**FRs covered:** FR6
**UX-DRs covered:** UX-DR10

---

## Epic 1: 项目基础设施与用户认证

用户可以注册账号、登录系统、查看里程余额。

### Story 1.1: 项目初始化与 Design System

As a 开发者,
I want 搭建完整的 Next.js 项目并配置 Design System,
So that 后续开发有一致的技术基础和视觉规范。

**Acceptance Criteria:**

**Given** 项目目录为空
**When** 执行 `npx create-next-app@latest greenmiles --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
**Then** 项目创建成功，`npm run dev` 可启动
**And** 执行 `npx shadcn@latest init` 初始化 shadcn/ui
**And** 安装 10 个 shadcn 组件：button, card, dialog, sheet, badge, tabs, select, input, separator, table
**And** 安装额外依赖：recharts, framer-motion, qrcode.react, lucide-react, react-hook-form, zod, @hookform/resolvers
**And** 配置 Tailwind 主题：primary #0A2540, accent #10B981, background #F8FAFC, warning #F59E0B
**And** 创建 `.env.local.example` 含 `JWT_SECRET=your-secret-here` 注释说明
**And** `src/app/` 使用 Route Group：`(pages)/` 放页面路由，`api/` 放 API 路由

### Story 1.2: 数据库层与种子数据

As a 开发者,
I want 初始化 SQLite 数据库并写入种子数据,
So that 系统有可用的数据存储和演示数据。

**Acceptance Criteria:**

**Given** 项目已初始化
**When** 创建 `src/lib/db.ts` 数据库连接模块
**Then** 使用 better-sqlite3 连接 `./greenmiles.db`
**And** 执行 CREATE TABLE IF NOT EXISTS 创建 4 张表：users, products, orders, carbon_records
**And** users 表包含：id, email, password_hash, miles_balance, created_at
**And** products 表包含：id, name, description, category, mileage_cost, stock, icon_type
**And** orders 表包含：id, user_id, product_id, status, voucher_code, address, created_at
**And** carbon_records 表包含：id, user_id, distance, aircraft_type, cabin_class, co2_kg, created_at
**And** 种子数据包含：1 个测试用户（email: test@greenmiles.com, miles_balance: 10000）
**And** 种子数据包含：4 个商品（骑行卡 1200 里程、酒店券 2000 里程、植树 3000 里程、帆布袋 5000 里程）
**And** 创建 `src/lib/schemas.ts` 含 Zod schema：LoginSchema, RegisterSchema, ProductSchema, OrderSchema

### Story 1.3: 用户注册

As a 新用户,
I want 通过邮箱注册账号,
So that 我可以使用 GreenMiles 系统。

**Acceptance Criteria:**

**Given** 用户未登录
**When** 访问注册页面
**Then** 显示注册表单：邮箱、密码、确认密码
**And** 表单使用 react-hook-form + zod 校验：邮箱格式、密码 ≥ 6 位、确认密码一致
**And** 必填字段用 `*` 标记，校验错误在 onBlur 时显示
**Given** 用户填写有效信息并提交
**When** 调用 POST /api/auth/register
**Then** 密码使用 bcrypt 哈希存储
**And** 新用户 miles_balance 初始化为 10,000
**And** 返回成功提示，引导用户登录
**Given** 邮箱已被注册
**When** 提交注册表单
**Then** 返回错误提示"该邮箱已注册"

### Story 1.4: 用户登录与认证

As a 已注册用户,
I want 通过邮箱和密码登录,
So that 我可以访问个人功能。

**Acceptance Criteria:**

**Given** 用户未登录
**When** 访问登录页面
**Then** 显示登录表单：邮箱、密码
**And** 表单使用 react-hook-form + zod 校验
**Given** 用户填写正确凭据并提交
**When** 调用 POST /api/auth/login
**Then** 返回 JWT token，存入 httpOnly cookie
**And** 跳转到首页 Dashboard
**Given** 用户凭据错误
**When** 提交登录表单
**Then** 返回错误提示"邮箱或密码错误"
**Given** JWT cookie 存在
**When** 访问受保护页面
**Then** middleware.ts 验证 token 有效性
**And** 无效 token 时重定向到登录页
**And** 创建 `src/stores/userStore.ts` 存储用户信息和认证状态

### Story 1.5: 导航栏与里程余额

As a 已登录用户,
I want 在页面顶部看到导航栏和我的里程余额,
So that 我可以快速导航并随时了解可用里程。

**Acceptance Criteria:**

**Given** 用户已登录
**When** 查看页面顶部
**Then** 显示固定导航栏（sticky top-0, backdrop-blur-md 毛玻璃效果）
**And** 左侧显示 Logo（绿叶+小飞机图标 + "GreenMiles" 文字）
**And** 中间显示主导航：首页 / 商城 / 订单，当前页用 accent 色下划线标识
**And** 右侧显示搜索框（禁用状态，placeholder "Coming Soon"）
**And** 搜索框左侧显示购物车图标 + 角标（空时不显示数字）
**And** 购物车左侧显示 MilesBalance 组件：格式化里程数字（如 10,000）
**And** 最大宽度 1280px，居中
**Given** 用户未登录
**When** 查看导航栏
**Then** 隐藏购物车图标和里程余额，显示登录/注册链接

---

## Epic 2: 碳排放计算工具

用户可以输入航班数据，查看碳排放量和直观比喻，并一键跳转商城。

### Story 2.1: 碳排放计算引擎

As a 开发者,
I want 实现碳排放计算的核心逻辑,
So that 前端可以直接调用计算函数。

**Acceptance Criteria:**

**Given** 创建 `src/lib/carbon.ts`
**When** 调用 `calculateCarbonEmission(distance, aircraftType, cabinClass)`
**Then** 返回 CO2 排放量（kg），公式：距离(km) × 机型系数(kg/km) × 舱位权重
**And** 支持 4 种机型：NARROW_EFFICIENT(0.075), NARROW_STANDARD(0.090), WIDE_EFFICIENT(0.110), WIDE_LARGE(0.140)
**And** 支持 4 种舱位：Y(1.0), W(1.5), C(2.5), F(4.0)
**And** 距离 ≤ 0 或机型/舱位无效时抛出 Zod 校验错误
**And** 创建 `getCarbonAnalogy(co2Kg)` 函数，返回直觉化比喻文字（如"相当于一棵树 X 天的吸收量"）
**And** 创建常用航线预设数据：北京→上海(1075km)、北京→广州(1888km)、上海→深圳(1240km)、北京→成都(1515km)

### Story 2.2: 碳排放计算器 UI

As a 用户,
I want 输入航班数据查看碳排放量,
So that 我了解飞行对环境的影响。

**Acceptance Criteria:**

**Given** 用户访问首页
**When** 查看碳排放计算器区域
**Then** 显示常用航线预设按钮（4 条航线），点击自动填充距离
**And** 显示手动输入表单：距离(km) 输入框、机型 Select、舱位 Select
**And** 表单使用 react-hook-form + zod 校验
**Given** 用户输入完整数据
**When** 数据变化时
**Then** 实时计算并展示 CO2 排放量数字
**And** 显示 Recharts 圆环图可视化
**And** 显示直觉化比喻文字
**And** 显示 CTA 按钮"前往绿色商城抵消"
**Given** 用户输入不完整
**When** 查看结果区域
**Then** 显示空状态提示"请输入完整的航班信息"

### Story 2.3: 上下文推荐 Banner

As a 从计算器进入商城的用户,
I want 在商城顶部看到与我的碳排放关联的推荐,
So that 我知道需要抵消多少碳排放。

**Acceptance Criteria:**

**Given** 用户在计算器页面点击"前往绿色商城抵消"
**When** 跳转到商城页面
**Then** 顶部显示 ContextBanner："抵消您本次飞行的 XXXkg 碳排"
**And** Banner 使用 accent 色背景
**And** 右侧有关闭按钮，关闭后隐藏
**And** 碳排数据通过 Zustand carbonStore 传递
**Given** 用户直接访问商城（非计算器跳转）
**When** 查看商城页面
**Then** ContextBanner 不显示

---

## Epic 3: 绿色商城与兑换流程

用户可以浏览商品、查看详情、加入购物车、用里程结算、获取凭证。

### Story 3.1: 商品列表页

As a 用户,
I want 浏览绿色商品并按分类筛选,
So that 我找到感兴趣的商品。

**Acceptance Criteria:**

**Given** 用户访问商城页面
**When** 页面加载
**Then** 调用 GET /api/products 获取商品列表
**And** 显示分类 Tab 栏：All / 虚拟卡券 / 碳抵消 / 实体
**And** 显示排序下拉：里程从低到高 / 里程从高到低
**And** 显示商品卡片网格（grid-cols-1 md:grid-cols-2 lg:grid-cols-4）
**And** 每个 ProductCard 包含：渐变色块 + Lucide Icon + 分类 Badge + 名称 + 价值钩子 + 里程价格 + "立即兑换"按钮
**And** 所有卡片加 `border border-[#E2E8F0]`，rounded-2xl，shadow-sm
**And** hover 时阴影增强
**Given** 用户点击分类 Tab
**When** 切换分类
**Then** 商品列表按分类过滤，带 Framer Motion layoutId 动画
**Given** 商品列表为空
**When** 查看商城页面
**Then** 显示空状态："暂无商品" + 引导 CTA

### Story 3.2: 商品详情 Sheet

As a 用户,
I want 查看商品详情和兑换条款,
So that 我决定是否兑换。

**Acceptance Criteria:**

**Given** 用户点击商品卡片
**When** 触发点击事件
**Then** 右侧滑出 Sheet 抽屉（shadcn/ui Sheet）
**And** 显示商品名称、描述、所需里程、库存
**And** 虚拟商品（骑行卡/酒店券）显示兑换条款和有效期说明
**And** 实体商品（帆布袋）显示收货地址表单（姓名、手机号、详细地址）
**And** 地址表单使用 react-hook-form + zod 校验：姓名非空、手机号格式、地址非空
**And** 必填字段用 `*` 标记，校验错误在 onBlur 时显示
**And** 底部显示"加入购物车"按钮（Primary 绿色）
**Given** 余额不足
**When** 查看"加入购物车"按钮
**Then** 按钮正常显示（加入购物车不校验余额）
**Given** 用户点击 Sheet 外部或按 ESC
**When** 关闭 Sheet
**Then** Sheet 关闭，返回商城页面

### Story 3.3: 购物车 Dialog

As a 用户,
I want 查看和管理我的购物车,
So that 我可以规划兑换组合。

**Acceptance Criteria:**

**Given** 用户点击导航栏购物车图标
**When** 触发点击事件
**Then** 弹出居中 Dialog（shadcn/ui Dialog）
**And** 显示已加购商品列表：商品名 + 所需里程 + 移除按钮
**And** 显示总消耗里程
**And** 每个商品显示"结算"按钮
**Given** 购物车为空
**When** 打开购物车 Dialog
**Then** 显示空状态：空购物车图标 + "购物车空空如也" + CTA"去商城逛逛"
**Given** 某商品所需里程 > 用户余额
**When** 查看该商品的结算按钮
**Then** 按钮置灰（Disabled 样式）
**And** 按钮下方显示红色小字"里程不足（还差 XXX 里程）"
**And** 创建 `src/stores/cartStore.ts` 管理购物车状态
**And** 导航栏购物车角标显示商品数量，空时不显示

### Story 3.4: 里程结算与凭证生成

As a 用户,
I want 用里程兑换购物车中的商品,
So that 我获得绿色商品和服务。

**Acceptance Criteria:**

**Given** 用户点击某商品的"结算"按钮
**When** 余额充足
**Then** 弹出确认 Dialog："确认用 XXX 里程兑换 YYY？"
**And** 用户确认后，调用 POST /api/orders
**And** 后端使用 SQLite BEGIN/COMMIT 事务：扣减 miles_balance + 创建 order 记录
**And** 事务中原子性校验：余额充足才扣减，防止超扣
**And** 该商品从购物车移除
**And** 导航栏里程余额实时更新
**And** 显示凭证展示 Dialog
**Given** 兑换共享单车骑行卡
**When** 结算完成
**Then** VoucherDisplay 显示券码文本 + 复制按钮
**Given** 兑换酒店 50 元券
**When** 结算完成
**Then** VoucherDisplay 显示核销二维码（qrcode.react 生成）
**Given** 兑换植树公益
**When** 结算完成
**Then** VoucherDisplay 显示碳抵消数据卡片 + "绿色出行小贴士"小挂件
**Given** 兑换帆布袋
**When** 结算完成
**Then** VoucherDisplay 显示订单状态"待发货"
**And** 凭证展示后提供"继续购物"和"查看订单"两个出口

### Story 3.5: 商品与订单 API

As a 开发者,
I want 完善商品和订单的 API 端点,
So that 前端可以完整调用后端服务。

**Acceptance Criteria:**

**Given** 创建 API Routes
**When** 调用 GET /api/products
**Then** 返回商品列表 `{ data: Product[], total: number }`
**And** 支持 query 参数：category（筛选）、sort（排序）
**Given** 调用 GET /api/products/[id]
**When** 商品存在
**Then** 返回单个商品 `{ data: Product }`
**And** 商品不存在时返回 `{ error: "商品不存在" }`，状态码 404
**Given** 调用 POST /api/orders
**When** 请求体包含 productId 和可选 address
**Then** Zod 校验请求体
**And** 校验用户余额充足
**And** 事务扣减余额 + 创建订单
**And** 根据商品类型生成凭证码（券码/二维码数据/碳抵消数据/待发货状态）
**And** 返回 `{ data: Order }` 含 voucher_code
**Given** 调用 GET /api/orders
**When** 用户已登录
**Then** 返回当前用户的订单列表 `{ data: Order[], total: number }`
**And** 所有 API 返回统一格式 `{ data }` 或 `{ error }`

---

## Epic 4: 会员控制台与数据看板

用户可以查看兑换历史、碳减排统计、里程转化率 KPI。

### Story 4.1: 订单历史页

As a 用户,
I want 查看我的兑换历史和凭证,
So that 我可以回顾之前的兑换记录。

**Acceptance Criteria:**

**Given** 用户访问订单页面
**When** 页面加载
**Then** 调用 GET /api/orders 获取当前用户订单列表
**And** 显示订单列表：商品名 + 兑换时间 + 消耗里程 + 状态
**And** 点击某条订单展开显示凭证详情
**And** 骑行卡订单显示券码（可复制）
**And** 酒店券订单显示二维码
**And** 植树订单显示碳抵消数据 + 小贴士
**And** 帆布袋订单显示"待发货"状态标签
**Given** 用户无订单记录
**When** 访问订单页面
**Then** 显示空状态：空文件夹图标 + "暂无兑换记录" + CTA"去商城看看"

### Story 4.2: Dashboard 首页与 KPI 看板

As a 用户,
I want 在首页看到我的里程余额、碳排放统计和推荐商品,
So that 我了解自己的绿色消费状况。

**Acceptance Criteria:**

**Given** 用户访问首页
**When** 页面加载
**Then** 显示里程余额卡片（大数字 + 图标）
**And** 显示碳排放计算器入口（来自 Epic 2）
**And** 显示推荐商品区域（3-4 个商品卡片）
**And** 显示 Mock 数据看板：累计碳减排量（Total CO₂ Offset）+ 里程绿色转化率（Green Mileage Conversion Rate）
**And** KPI 数据使用 Recharts 图表展示
**And** 累计碳减排量从 carbon_records 表 SUM 查询
**And** 里程绿色转化率 = 绿色商品消耗里程 / 总发行里程
**Given** 用户首次使用（无碳排记录）
**When** 访问首页
**Then** 显示零状态 Hero Card：大号图标 + "您还没有绿色出行记录。输入您的下一个航班，开启低碳旅程吧！" + CTA
**Given** 用户有碳排记录
**When** 访问首页
**Then** Hero Card 不显示，直接展示正常 Dashboard
