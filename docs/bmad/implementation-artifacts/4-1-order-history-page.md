# Story 4.1: 订单历史页

Status: done

## Story

As a 用户,
I want 查看我的兑换历史和凭证,
So that 我可以回顾之前的兑换记录。

## Acceptance Criteria

1. 调用 GET /api/orders 获取当前用户订单列表
2. 显示订单列表：商品名 + 兑换时间 + 消耗里程 + 状态
3. 点击某条订单展开显示凭证详情
4. 骑行卡订单显示券码（可复制）
5. 酒店券订单显示二维码
6. 植树订单显示碳抵消数据 + 小贴士
7. 帆布袋订单显示"待发货"状态标签
8. 无订单时显示空状态："暂无兑换记录" + CTA"去商城看看"

## Tasks / Subtasks

- [x] 创建订单页面 (AC: #1-#8)
  - [x] 创建 src/app/(pages)/orders/page.tsx
  - [x] 获取订单列表
  - [x] 订单卡片展示
  - [x] 凭证详情 Dialog
  - [x] 空状态展示

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### File List
- greenmiles/src/app/(pages)/orders/page.tsx
