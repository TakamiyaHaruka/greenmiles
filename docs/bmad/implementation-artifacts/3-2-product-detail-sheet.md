# Story 3.2: 商品详情 Sheet

Status: done

## Story

As a 用户,
I want 查看商品详情和兑换条款,
So that 我决定是否兑换。

## Acceptance Criteria

1. 点击商品卡片，右侧滑出 Sheet 抽屉
2. 显示商品名称、描述、所需里程、库存
3. 虚拟商品显示兑换条款和有效期说明
4. 实体商品显示收货地址表单（姓名、手机号、详细地址）
5. 地址表单使用 react-hook-form + zod 校验：姓名非空、手机号格式、地址非空
6. 必填字段用 * 标记，校验错误在 onBlur 时显示
7. 底部显示"加入购物车"按钮
8. 点击 Sheet 外部或按 ESC 关闭

## Tasks / Subtasks

- [x] 创建 ProductDetailSheet 组件 (AC: #1-#8)
  - [x] 创建 src/components/ProductDetailSheet.tsx
  - [x] shadcn/ui Sheet 组件
  - [x] 商品名称、描述、里程、库存展示
  - [x] 虚拟商品：兑换条款说明
  - [x] 实体商品：收货地址表单（react-hook-form + 校验）
  - [x] "加入购物车"按钮
- [x] 集成到商城页面 (AC: #1)
  - [x] ProductCard 点击打开 Sheet
  - [x] 传递选中商品到 Sheet

## Dev Notes

### References

- [UX Design: Sheet](ux-design-specification.md)
- [Epic 3: Story 3.2](epics.md#story-32-商品详情-sheet)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### File List
- greenmiles/src/components/ProductDetailSheet.tsx
- greenmiles/src/components/ProductCard.tsx (updated)
- greenmiles/src/app/(pages)/mall/page.tsx (updated)
