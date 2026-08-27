# Story 3.3: 购物车 Dialog

Status: done

## Story

As a 用户,
I want 查看和管理我的购物车,
So that 我可以规划兑换组合。

## Acceptance Criteria

1. 点击导航栏购物车图标弹出居中 Dialog
2. 显示已加购商品列表：商品名 + 所需里程 + 移除按钮
3. 显示总消耗里程
4. 购物车为空时显示空状态：空购物车图标 + "购物车空空如也" + CTA"去商城逛逛"
5. 余额不足时结算按钮置灰
6. 创建 cartStore 管理购物车状态
7. 导航栏购物车角标显示商品数量，空时不显示

## Tasks / Subtasks

- [x] 创建 cartStore (AC: #6)
  - [x] 创建 src/stores/cartStore.ts
  - [x] Zustand store: items, addItem, removeItem, clearCart, totalMiles, itemCount
- [x] 创建 CartDialog 组件 (AC: #1, #2, #3, #4, #5)
  - [x] 创建 src/components/CartDialog.tsx
  - [x] shadcn/ui Dialog 组件
  - [x] 商品列表 + 移除按钮
  - [x] 总里程显示
  - [x] 空状态展示
  - [x] 余额不足时结算按钮置灰
- [x] 更新导航栏 (AC: #7)
  - [x] 购物车图标点击打开 CartDialog
  - [x] 角标显示商品数量
- [x] 更新 ProductDetailSheet
  - [x] "加入购物车"按钮调用 cartStore.addItem

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### File List
- greenmiles/src/stores/cartStore.ts
- greenmiles/src/components/CartDialog.tsx
- greenmiles/src/components/Navbar.tsx (updated)
- greenmiles/src/components/ProductDetailSheet.tsx (updated)
