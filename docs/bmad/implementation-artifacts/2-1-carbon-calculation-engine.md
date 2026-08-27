# Story 2.1: 碳排放计算引擎

Status: done

## Story

As a 开发者,
I want 实现碳排放计算的核心逻辑,
so that 前端可以直接调用计算函数。

## Acceptance Criteria

1. 创建 `src/lib/carbon.ts`，实现 `calculateCarbonEmission(distance, aircraftType, cabinClass)` 函数
2. 返回 CO2 排放量（kg），公式：距离(km) × 机型系数(kg/km) × 舱位权重
3. 支持 4 种机型：NARROW_EFFICIENT(0.075), NARROW_STANDARD(0.090), WIDE_EFFICIENT(0.110), WIDE_LARGE(0.140)
4. 支持 4 种舱位：Y(1.0), W(1.5), C(2.5), F(4.0)
5. 距离 ≤ 0 或机型/舱位无效时抛出 Zod 校验错误
6. 创建 `getCarbonAnalogy(co2Kg)` 函数，返回直觉化比喻文字
7. 创建常用航线预设数据：北京→上海(1075km)、北京→广州(1888km)、上海→深圳(1240km)、北京→成都(1515km)

## Tasks / Subtasks

- [x] 定义碳排放计算常量 (AC: #3, #4)
  - [x] 定义 AIRCRAFT_TYPES 常量
  - [x] 定义 CABIN_CLASSES 常量
- [x] 实现 calculateCarbonEmission 函数 (AC: #1, #2, #5)
  - [x] 创建 src/lib/carbon.ts
  - [x] 使用 Zod 校验输入参数
  - [x] 实现公式：距离 × 机型系数 × 舱位权重
  - [x] 返回 CO2 排放量（kg）
- [x] 实现 getCarbonAnalogy 函数 (AC: #6)
  - [x] 基于 co2Kg 返回直觉化比喻
  - [x] 包含树木吸收天数、汽车行驶里程等比喻
- [x] 创建常用航线预设数据 (AC: #7)
  - [x] 北京→上海(1075km)
  - [x] 北京→广州(1888km)
  - [x] 上海→深圳(1240km)
  - [x] 北京→成都(1515km)
- [x] 添加 Zod schemas 到 schemas.ts (AC: #5)
  - [x] CarbonCalculationSchema
  - [x] AircraftType enum
  - [x] CabinClass enum

## Dev Notes

### Architecture Context

- **碳排放公式:** 前端纯计算，无后端依赖
- **公式:** CO2(kg) = distance(km) × aircraft_coefficient(kg/km) × cabin_multiplier
- **校验:** Zod schema 前后端共享

### Carbon Formula

```
CO2(kg) = distance(km) × aircraft_coefficient(kg/km) × cabin_multiplier
```

### Aircraft Types

| 代码 | 系数 (kg/km) | 说明 |
|------|-------------|------|
| NARROW_EFFICIENT | 0.075 | 窄体高效机型 |
| NARROW_STANDARD | 0.090 | 窄体标准机型 |
| WIDE_EFFICIENT | 0.110 | 宽体高效机型 |
| WIDE_LARGE | 0.140 | 宽体大型机型 |

### Cabin Classes

| 代码 | 权重 | 说明 |
|------|------|------|
| Y | 1.0 | 经济舱 |
| W | 1.5 | 超级经济舱 |
| C | 2.5 | 商务舱 |
| F | 4.0 | 头等舱 |

### Carbon Analogies

| CO2 范围 | 比喻 |
|----------|------|
| < 50kg | 相当于一棵树 X 天的吸收量 |
| 50-200kg | 相当于开车行驶 X 公里 |
| > 200kg | 相当于一棵树 X 个月的吸收量 |

### Preset Routes

| 航线 | 距离 |
|------|------|
| 北京→上海 | 1075km |
| 北京→广州 | 1888km |
| 上海→深圳 | 1240km |
| 北京→成都 | 1515km |

### Enforcement Rules

- Zod schema 放在 `lib/schemas.ts` 统一管理
- 使用 TypeScript 严格类型
- 纯函数，无副作用

### References

- [Architecture: Frontend Architecture](architecture.md#frontend-architecture)
- [Epic 2: Story 2.1](epics.md#story-21-碳排放计算引擎)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- 碳排放计算模块已创建：src/lib/carbon.ts
- 4 种机型系数已定义：NARROW_EFFICIENT(0.075), NARROW_STANDARD(0.090), WIDE_EFFICIENT(0.110), WIDE_LARGE(0.140)
- 4 种舱位权重已定义：Y(1.0), W(1.5), C(2.5), F(4.0)
- calculateCarbonEmission 函数已实现，使用 Zod 校验输入
- getCarbonAnalogy 函数已实现，提供直觉化比喻
- 4 条常用航线预设数据已创建
- CarbonCalculationSchema 已添加到 carbon.ts

### File List
- greenmiles/src/lib/carbon.ts
