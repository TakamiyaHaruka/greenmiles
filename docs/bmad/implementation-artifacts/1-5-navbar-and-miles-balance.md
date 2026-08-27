# Story 1.5: 导航栏与里程余额

Status: done

## Story

As a 已登录用户,
I want 在页面顶部看到导航栏和我的里程余额,
so that 我可以快速导航并随时了解可用里程。

## Acceptance Criteria

1. 显示固定导航栏（sticky top-0, backdrop-blur-md 毛玻璃效果）
2. 左侧显示 Logo（绿叶+小飞机图标 + "GreenMiles" 文字）
3. 中间显示主导航：首页 / 商城 / 订单，当前页用 accent 色下划线标识
4. 右侧显示搜索框（禁用状态，placeholder "Coming Soon"）
5. 搜索框左侧显示购物车图标 + 角标（空时不显示数字）
6. 购物车左侧显示 MilesBalance 组件：格式化里程数字（如 10,000）
7. 最大宽度 1280px，居中
8. 用户未登录时，隐藏购物车图标和里程余额，显示登录/注册链接

## Tasks / Subtasks

- [x] 创建 MilesBalance 组件 (AC: #6)
  - [x] 创建 src/components/MilesBalance.tsx
  - [x] 从 userStore 读取 miles_balance
  - [x] 格式化数字（如 10,000）
  - [x] 使用 shadcn/ui Badge 组件
- [x] 创建 Navbar 组件 (AC: #1, #2, #3, #4, #5, #7, #8)
  - [x] 创建 src/components/Navbar.tsx
  - [x] sticky top-0 + backdrop-blur-md
  - [x] 左侧 Logo（绿叶+小飞机 + "GreenMiles"）
  - [x] 中间导航：首页 / 商城 / 订单
  - [x] 当前页用 accent 色下划线标识
  - [x] 右侧搜索框（禁用，Coming Soon）
  - [x] 购物车图标 + 角标
  - [x] MilesBalance 组件
  - [x] 最大宽度 1280px，居中
  - [x] 未登录时显示登录/注册链接
- [x] 更新布局文件 (AC: #1)
  - [x] 修改 src/app/layout.tsx
  - [x] 添加 Navbar 到布局
  - [x] 初始化 userStore（fetchUser）
- [x] 更新首页 (AC: #1)
  - [x] 修改 src/app/(pages)/page.tsx
  - [x] 添加欢迎信息和里程余额展示

## Dev Notes

### Architecture Context

- **状态管理:** Zustand userStore
- **UI 组件:** shadcn/ui (Badge, Button, Input)
- **图标:** lucide-react
- **路由:** Next.js App Router + usePathname

### Design Tokens

| Token | 色值 | 用途 |
|-------|------|------|
| primary | #0A2540 | 导航栏背景 |
| accent | #10B981 | 当前页下划线、CTA |
| background | #F8FAFC | 页面背景 |

### Navbar Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [🌿✈️ GreenMiles]  [首页] [商城] [订单]  [🔍Coming Soon] [🛒] [10,000] │
└─────────────────────────────────────────────────────────────┘
```

### Enforcement Rules

- 使用 `cn()` 工具函数合并 Tailwind 类名
- 所有卡片加 `border border-[#E2E8F0]`（无障碍强制）
- 组件 props 类型用 TypeScript interface 定义

### References

- [UX Design: Navigation Bar](ux-design-specification.md#navigation-bar)
- [UX Design: MilesBalance Component](ux-design-specification.md#milesbalance-component)
- [Epic 1: Story 1.5](epics.md#story-15-导航栏与里程余额)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- MilesBalance 组件已创建，从 userStore 读取里程余额
- Navbar 组件已创建，包含 Logo、导航、搜索框、购物车、里程余额
- sticky top-0 + backdrop-blur-md 毛玻璃效果
- 当前页用 accent 色下划线标识
- 未登录时显示登录/注册链接
- 布局文件已更新，添加 Navbar 和 UserInitializer
- 首页已更新，展示欢迎信息和功能卡片

### File List
- greenmiles/src/components/MilesBalance.tsx
- greenmiles/src/components/Navbar.tsx
- greenmiles/src/components/UserInitializer.tsx
- greenmiles/src/app/layout.tsx (updated)
- greenmiles/src/app/(pages)/page.tsx (updated)
