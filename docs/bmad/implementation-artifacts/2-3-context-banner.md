# Story 2.3: 上下文推荐 Banner

Status: done

## Story

As a 从计算器进入商城的用户,
I want 在商城顶部看到与我的碳排放关联的推荐,
So that 我知道需要抵消多少碳排放。

## Acceptance Criteria

1. 用户在计算器页面点击"前往绿色商城抵消"后，商城顶部显示 ContextBanner
2. Banner 显示"抵消您本次飞行的 XXXkg 碳排"
3. Banner 使用 accent 色背景
4. 右侧有关闭按钮，关闭后隐藏
5. 碳排数据通过 Zustand carbonStore 传递
6. 用户直接访问商城（非计算器跳转）时，ContextBanner 不显示

## Tasks / Subtasks

- [x] 创建 carbonStore (AC: #5)
  - [x] 创建 src/stores/carbonStore.ts
  - [x] Zustand store 存储 co2Kg 和 analogy
  - [x] setCarbonResult / clearCarbonResult 方法
- [x] 创建 ContextBanner 组件 (AC: #1, #2, #3, #4, #6)
  - [x] 创建 src/components/ContextBanner.tsx
  - [x] 从 carbonStore 读取碳排数据
  - [x] 显示"抵消您本次飞行的 XXXkg 碳排"
  - [x] accent 色背景
  - [x] 关闭按钮，关闭后隐藏并清除 store
  - [x] 无数据时不显示
- [x] 更新 CarbonCalculator CTA (AC: #1, #5)
  - [x] 点击时调用 setCarbonResult 存入碳排数据
  - [x] 跳转到 /mall
- [x] 创建商城页面 (AC: #1)
  - [x] 创建 src/app/(pages)/mall/page.tsx
  - [x] 嵌入 ContextBanner
  - [x] 占位内容

## Dev Notes

### Architecture Context

- **状态管理:** Zustand carbonStore 存储碳排计算结果
- **页面跳转:** Next.js router.push('/mall')
- **组件复用:** ContextBanner 从 carbonStore 读取数据，无数据时返回 null

### Data Flow

```
CarbonCalculator → setCarbonResult(co2Kg, analogy) → carbonStore
                                                        ↓
mall/page.tsx → ContextBanner → useCarbonStore() → 读取并展示
```

### Enforcement Rules

- Banner 无数据时返回 null，不渲染任何 DOM
- 关闭时同时清除 store 数据
- 使用 shadcn/ui Button + lucide-react 图标

### References

- [UX Design: ContextBanner](ux-design-specification.md#contextbanner)
- [Epic 2: Story 2.3](epics.md#story-23-上下文推荐-banner)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- carbonStore 已创建：src/stores/carbonStore.ts
- ContextBanner 组件已创建：src/components/ContextBanner.tsx
- CarbonCalculator CTA 已更新，点击时存入碳排数据并跳转 /mall
- 商城占位页面已创建：src/app/(pages)/mall/page.tsx
- TypeScript 编译通过

### File List
- greenmiles/src/stores/carbonStore.ts
- greenmiles/src/components/ContextBanner.tsx
- greenmiles/src/app/(pages)/mall/page.tsx
- greenmiles/src/components/CarbonCalculator.tsx (updated)
