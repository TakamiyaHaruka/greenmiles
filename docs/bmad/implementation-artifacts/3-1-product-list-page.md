# Story 3.1: 商品列表页

Status: done

## Story

As a 用户,
I want 浏览绿色商品并按分类筛选,
So that 我找到感兴趣的商品。

## Acceptance Criteria

1. 调用 GET /api/products 获取商品列表
2. 显示分类 Tab 栏：All / 虚拟卡券 / 碳抵消 / 实体
3. 显示排序下拉：里程从低到高 / 里程从高到低
4. 显示商品卡片网格（grid-cols-1 md:grid-cols-2 lg:grid-cols-4）
5. 每个 ProductCard 包含：渐变色块 + Lucide Icon + 分类 Badge + 名称 + 描述 + 里程价格 + "立即兑换"按钮
6. 所有卡片加 border border-[#E2E8F0]，rounded-2xl，shadow-sm，hover 时阴影增强
7. 点击分类 Tab 切换分类过滤
8. 商品列表为空时显示空状态："暂无商品"

## Tasks / Subtasks

- [x] 创建 GET /api/products 接口 (AC: #1)
  - [x] 创建 src/app/api/products/route.ts
  - [x] 查询 products 表返回全部商品
- [x] 创建 ProductCard 组件 (AC: #4, #5, #6)
  - [x] 创建 src/components/ProductCard.tsx
  - [x] 渐变色块 + Lucide Icon（Bike/Hotel/TreePine/ShoppingBag）
  - [x] 分类 Badge + 名称 + 描述 + 里程价格 + "立即兑换"按钮
  - [x] border, rounded-2xl, shadow-sm, hover:shadow-md
- [x] 更新商城页面 (AC: #1, #2, #3, #4, #7, #8)
  - [x] 更新 src/app/(pages)/mall/page.tsx
  - [x] useEffect 获取商品列表
  - [x] 分类 Tab 栏（Tabs 组件）
  - [x] 排序下拉（Select 组件）
  - [x] 商品卡片网格
  - [x] 空状态展示

## Dev Notes

### Architecture Context

- **数据获取:** 客户端 useEffect + fetch('/api/products')
- **分类筛选:** 前端数组 filter
- **排序:** 前端数组 sort
- **UI 组件:** shadcn/ui Tabs, Select

### Product Categories

| category | 中文 | Icon | 渐变色 |
|----------|------|------|--------|
| virtual | 虚拟卡券 | Bike/Hotel | blue/purple |
| carbon | 碳抵消 | TreePine | green |
| physical | 实体商品 | ShoppingBag | amber |

### References

- [UX Design: 商城页面](ux-design-specification.md)
- [Epic 3: Story 3.1](epics.md#story-31-商品列表页)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### File List
- greenmiles/src/app/api/products/route.ts
- greenmiles/src/components/ProductCard.tsx
- greenmiles/src/app/(pages)/mall/page.tsx (updated)
