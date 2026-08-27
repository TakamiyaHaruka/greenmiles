# Story 1.1: 项目初始化与 Design System

Status: done

## Story

As a 开发者,
I want 搭建完整的 Next.js 项目并配置 Design System,
so that 后续开发有一致的技术基础和视觉规范。

## Acceptance Criteria

1. 执行 `npx create-next-app@latest greenmiles --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` 创建项目，`npm run dev` 可启动
2. 执行 `npx shadcn@latest init` 初始化 shadcn/ui
3. 安装 10 个 shadcn 组件：button, card, dialog, sheet, badge, tabs, select, input, separator, table
4. 安装额外依赖：recharts, framer-motion, qrcode.react, lucide-react, react-hook-form, zod, @hookform/resolvers
5. 配置 Tailwind 主题：primary #0A2540, accent #10B981, background #F8FAFC, warning #F59E0B
6. 创建 `.env.local.example` 含 `JWT_SECRET=your-secret-here` 注释说明
7. `src/app/` 使用 Route Group：`(pages)/` 放页面路由，`api/` 放 API 路由

## Tasks / Subtasks

- [x] 创建 Next.js 项目 (AC: #1)
  - [x] 执行 npx create-next-app 命令
  - [x] 验证 npm run dev 可启动
- [x] 初始化 shadcn/ui (AC: #2, #3)
  - [x] 执行 npx shadcn@latest init
  - [x] 安装 10 个 shadcn 组件
- [x] 安装额外依赖 (AC: #4)
  - [x] npm install recharts framer-motion qrcode.react lucide-react react-hook-form zod @hookform/resolvers
- [x] 配置 Design System (AC: #5)
  - [x] 配置 Tailwind 主题色彩变量
  - [x] 验证 cn() 工具函数可用
- [x] 配置环境变量 (AC: #6)
  - [x] 创建 .env.local.example
- [x] 配置路由分组 (AC: #7)
  - [x] 创建 src/app/(pages)/ 目录结构
  - [x] 确认 api/ 路由位置

## Dev Notes

### Architecture Context

- **Starter:** create-next-app + shadcn/ui（官方推荐方案）
- **Language:** TypeScript（strict 模式）
- **Styling:** Tailwind CSS + cn() 工具函数（clsx + tailwind-merge）
- **Build:** Next.js 内置（Turbopack 开发，Webpack 生产）
- **Linting:** ESLint + Next.js core-web-vitals 配置
- **Routing:** App Router（src/app/ 目录）

### Design System Tokens

| Token | 色值 | 用途 |
|-------|------|------|
| primary | #0A2540 | 导航栏、标题、系统基调（航司蓝） |
| accent | #10B981 | CTA 按钮、碳数据（生态绿） |
| background | #F8FAFC | 页面大背景 |
| warning | #F59E0B | 高碳排警告 |

### shadcn/ui Components to Install

button, card, dialog, sheet, badge, tabs, select, input, separator, table

### Extra Dependencies

recharts, framer-motion, qrcode.react, lucide-react, react-hook-form, zod, @hookform/resolvers

### Project Structure After This Story

```
greenmiles/
├── src/
│   ├── app/
│   │   ├── (pages)/          # 页面路由组
│   │   │   └── page.tsx      # 首页
│   │   ├── api/              # API 路由
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/               # shadcn/ui 组件（自动生成）
│   └── lib/
│       └── utils.ts          # cn() 工具函数
├── .env.local.example
├── tailwind.config.ts
└── package.json
```

### Enforcement Rules

- 所有卡片加 `border border-[#E2E8F0]`（无障碍强制）
- 使用 `cn()` 工具函数合并 Tailwind 类名
- 组件 props 类型用 TypeScript interface 定义

### References

- [Architecture: Starter Template Evaluation](architecture.md#starter-template-evaluation)
- [Architecture: Implementation Patterns](architecture.md#implementation-patterns--consistency-rules)
- [UX Design: Design System Foundation](ux-design-specification.md#design-system-foundation)
- [UX Design: Visual Design Foundation](ux-design-specification.md#visual-design-foundation)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- Next.js 16.2.6 项目创建成功，TypeScript strict 模式
- shadcn/ui 4.8.1 初始化完成，10 个组件全部安装
- Tailwind CSS v4 主题配置完成：primary #0A2540, accent #10B981, background #F8FAFC, warning #F59E0B
- cn() 工具函数已验证可用
- .env.local.example 已创建，含 JWT_SECRET 说明
- Route Group (pages)/ 已创建，page.tsx 已移入

### File List
- greenmiles/package.json
- greenmiles/tsconfig.json
- greenmiles/next.config.ts
- greenmiles/components.json
- greenmiles/.env.local.example
- greenmiles/src/app/globals.css
- greenmiles/src/app/layout.tsx
- greenmiles/src/app/(pages)/page.tsx
- greenmiles/src/lib/utils.ts
- greenmiles/src/components/ui/button.tsx
- greenmiles/src/components/ui/card.tsx
- greenmiles/src/components/ui/dialog.tsx
- greenmiles/src/components/ui/sheet.tsx
- greenmiles/src/components/ui/badge.tsx
- greenmiles/src/components/ui/tabs.tsx
- greenmiles/src/components/ui/select.tsx
- greenmiles/src/components/ui/input.tsx
- greenmiles/src/components/ui/separator.tsx
- greenmiles/src/components/ui/table.tsx
