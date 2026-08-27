# Story 3.4: 里程结算与凭证生成

Status: done

## Story

As a 用户,
I want 用里程兑换购物车中的商品,
So that 我获得绿色商品和服务。

## Acceptance Criteria

1. 点击"结算"按钮弹出确认 Dialog："确认用 XXX 里程兑换 YYY？"
2. 确认后调用 POST /api/orders
3. 后端使用 SQLite 事务：扣减 miles_balance + 创建 order 记录
4. 事务中原子性校验：余额充足才扣减
5. 该商品从购物车移除
6. 导航栏里程余额实时更新
7. 显示凭证展示 Dialog（不同商品类型不同展示）
8. 兑换骑行卡/酒店券：显示券码 + 复制按钮
9. 兑换酒店券：显示二维码
10. 兑换植树：显示碳抵消数据 + 绿色出行小贴士
11. 兑换帆布袋：显示"待发货"状态
12. 凭证展示后提供"继续购物"和"查看订单"两个出口

## Tasks / Subtasks

- [x] 创建 POST /api/orders 接口 (AC: #2, #3, #4)
  - [x] 事务扣减余额 + 创建订单
  - [x] 生成凭证码
  - [x] 错误处理（余额不足、商品不存在等）
- [x] 创建 GET /api/orders 接口
  - [x] 返回当前用户订单列表
- [x] 创建 VoucherDisplay 组件 (AC: #7-#12)
  - [x] 券码展示 + 复制按钮
  - [x] 二维码展示（qrcode.react）
  - [x] 碳抵消数据 + 小贴士
  - [x] 待发货状态
  - [x] 继续购物 / 查看订单出口
- [x] 更新 CartDialog (AC: #1, #5, #6)
  - [x] 结算确认 Dialog
  - [x] 调用 API 后更新余额
  - [x] 移除已结算商品
  - [x] 显示 VoucherDisplay

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### File List
- greenmiles/src/app/api/orders/route.ts
- greenmiles/src/components/VoucherDisplay.tsx
- greenmiles/src/components/CartDialog.tsx (updated)
