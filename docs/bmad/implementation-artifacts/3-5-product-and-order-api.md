# Story 3.5: 商品与订单 API

Status: done

## Story

As a 开发者,
I want 完善商品和订单的 API 端点,
So that 前端可以完整调用后端服务。

## Acceptance Criteria

1. GET /api/products 返回商品列表
2. POST /api/orders 创建订单（事务扣减余额 + 创建记录）
3. GET /api/orders 返回当前用户订单列表
4. 所有 API 返回统一格式 { data } 或 { error }

## Tasks / Subtasks

- [x] GET /api/products (AC: #1)
- [x] POST /api/orders (AC: #2)
- [x] GET /api/orders (AC: #3)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### File List
- greenmiles/src/app/api/products/route.ts
- greenmiles/src/app/api/orders/route.ts
