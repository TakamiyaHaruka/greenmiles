# Story 4.2: Dashboard 首页与 KPI 看板

Status: done

## Story

As a 用户,
I want 在首页看到我的里程余额、碳排放统计和推荐商品,
So that 我了解自己的绿色消费状况。

## Acceptance Criteria

1. 显示里程余额卡片（大数字 + 图标）
2. 显示碳排放计算器入口
3. 显示推荐商品区域（3-4 个商品卡片）
4. 显示 Mock 数据看板：累计碳减排量 + 里程绿色转化率
5. KPI 数据使用 Recharts 图表展示

## Tasks / Subtasks

- [x] 更新首页 (AC: #1-#5)
  - [x] 里程余额卡片
  - [x] 碳排放计算器入口
  - [x] 推荐商品区域
  - [x] Mock KPI 看板（Recharts BarChart + PieChart）

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### File List
- greenmiles/src/app/(pages)/page.tsx (updated)
