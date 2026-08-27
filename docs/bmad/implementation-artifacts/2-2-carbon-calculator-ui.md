# Story 2.2: 碳排放计算器 UI

Status: done

## Story

As a 用户,
I want 输入航班数据查看碳排放量,
So that 我了解飞行对环境的影响。

## Acceptance Criteria

1. 显示常用航线预设按钮（4 条航线），点击自动填充距离
2. 显示手动输入表单：距离(km) 输入框、机型 Select、舱位 Select
3. 表单使用 react-hook-form + zod 校验
4. 数据变化时实时计算并展示 CO2 排放量数字
5. 显示 Recharts 圆环图可视化
6. 显示直觉化比喻文字
7. 显示 CTA 按钮"前往绿色商城抵消"
8. 输入不完整时显示空状态提示"请输入完整的航班信息"

## Tasks / Subtasks

- [x] 创建 CarbonCalculator 组件 (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [x] 创建 src/components/CarbonCalculator.tsx
  - [x] 常用航线预设按钮（4 条航线），点击自动填充距离
  - [x] 手动输入表单：距离 Input、机型 Select、舱位 Select
  - [x] react-hook-form + Controller 管理表单状态
  - [x] 实时计算 CO2 排放量（useMemo）
  - [x] Recharts PieChart 圆环图可视化
  - [x] 直觉化比喻文字（getCarbonAnalogy）
  - [x] CTA 按钮"前往绿色商城抵消"
  - [x] 空状态提示"请输入完整的航班信息"
- [x] 创建计算器页面 (AC: #1)
  - [x] 创建 src/app/(pages)/calculator/page.tsx
  - [x] 页面标题和描述
  - [x] 嵌入 CarbonCalculator 组件

## Dev Notes

### Architecture Context

- **表单管理:** react-hook-form + Controller（Select 需要 Controller 包装）
- **图表:** Recharts PieChart（圆环图，innerRadius=60, outerRadius=80）
- **碳排放计算:** 复用 src/lib/carbon.ts 纯函数
- **UI 组件:** shadcn/ui (Card, Button, Input, Select, Badge, Separator)

### Component Structure

```
┌─────────────────────────────────────────────────────────┐
│ 碳排放计算器                                              │
├──────────────────────┬──────────────────────────────────┤
│ 航班信息              │ 碳排放结果                        │
│                      │                                  │
│ [常用航线预设按钮]     │     ┌─────────┐                 │
│ ──────────────────── │     │  156.8  │ 圆环图           │
│ 飞行距离 (km)         │     │  kg CO₂ │                 │
│ [_______________]    │     └─────────┘                 │
│                      │                                  │
│ 机型                  │   相当于开车行驶 1307 公里         │
│ [选择机型        ▼]  │                                  │
│                      │   [156.8 kg CO₂]                │
│ 舱位                  │                                  │
│ [选择舱位        ▼]  │   [前往绿色商城抵消 →]            │
└──────────────────────┴──────────────────────────────────┘
```

### Enforcement Rules

- 使用 `cn()` 工具函数合并 Tailwind 类名
- 所有卡片加 `border border-[#E2E8F0]`（无障碍强制）
- 组件 props 类型用 TypeScript interface 定义

### References

- [UX Design: CarbonCalculator](ux-design-specification.md#carboncalculator)
- [Epic 2: Story 2.2](epics.md#story-22-碳排放计算器-ui)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- CarbonCalculator 组件已创建：src/components/CarbonCalculator.tsx
- 4 条常用航线预设按钮，点击自动填充距离
- 手动输入表单：距离 Input、机型 Select、舱位 Select
- react-hook-form + Controller 管理表单状态
- 实时计算 CO2 排放量（useMemo）
- Recharts PieChart 圆环图可视化
- 直觉化比喻文字（getCarbonAnalogy）
- CTA 按钮"前往绿色商城抵消"
- 空状态提示"请输入完整的航班信息"
- 计算器页面已创建：src/app/(pages)/calculator/page.tsx
- TypeScript 编译通过，无类型错误

### File List
- greenmiles/src/components/CarbonCalculator.tsx
- greenmiles/src/app/(pages)/calculator/page.tsx
