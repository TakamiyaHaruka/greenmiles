# Story 1.3: 用户注册

Status: done

## Story

As a 新用户,
I want 通过邮箱注册账号,
so that 我可以使用 GreenMiles 系统。

## Acceptance Criteria

1. 显示注册表单：邮箱、密码、确认密码
2. 表单使用 react-hook-form + zod 校验：邮箱格式、密码 ≥ 6 位、确认密码一致
3. 必填字段用 `*` 标记，校验错误在 onBlur 时显示
4. 调用 POST /api/auth/register，密码使用 bcrypt 哈希存储
5. 新用户 miles_balance 初始化为 10,000
6. 返回成功提示，引导用户登录
7. 邮箱已被注册时返回错误提示"该邮箱已注册"

## Tasks / Subtasks

- [x] 安装 bcrypt 依赖 (AC: #4)
  - [x] npm install bcryptjs
  - [x] npm install -D @types/bcryptjs
- [x] 创建注册 API 端点 (AC: #4, #5, #6, #7)
  - [x] 创建 src/app/api/auth/register/route.ts
  - [x] 使用 Zod RegisterSchema 校验请求体
  - [x] 检查邮箱是否已注册
  - [x] 使用 bcryptjs 哈希密码
  - [x] 插入新用户，miles_balance 默认 10000
  - [x] 返回成功响应
- [x] 创建注册页面 (AC: #1, #2, #3)
  - [x] 创建 src/app/(pages)/register/page.tsx
  - [x] 使用 react-hook-form + zod 校验
  - [x] 邮箱、密码、确认密码三个输入框
  - [x] 必填字段用 * 标记
  - [x] onBlur 时显示校验错误
  - [x] 提交成功后显示提示并引导登录
- [x] 创建注册表单组件 (AC: #1, #2, #3)
  - [x] 创建 src/components/RegisterForm.tsx
  - [x] 使用 shadcn/ui Input 和 Button 组件
  - [x] 集成 react-hook-form
  - [x] 显示加载状态和错误信息

## Dev Notes

### Architecture Context

- **认证层:** JWT (jose) + httpOnly cookie + middleware.ts
- **密码哈希:** bcryptjs（纯 JS 实现，无需原生编译）
- **API 格式:** `{ data }` 或 `{ error }`
- **校验:** Zod schema 前后端共享

### API Endpoint

```
POST /api/auth/register
Request: { email: string, password: string, confirmPassword: string }
Response: { data: { message: string } } | { error: string }
```

### Form Fields

| 字段 | 类型 | 校验规则 | 错误提示 |
|------|------|----------|----------|
| email | string | email format | 请输入有效的邮箱地址 |
| password | string | min 6 | 密码至少 6 位 |
| confirmPassword | string | match password | 两次密码不一致 |

### Enforcement Rules

- 使用 `cn()` 工具函数合并 Tailwind 类名
- 所有卡片加 `border border-[#E2E8F0]`（无障碍强制）
- 组件 props 类型用 TypeScript interface 定义
- Zod schema 放在 `lib/schemas.ts` 统一管理
- API Routes 返回统一 `{ data }` 或 `{ error }` 格式

### References

- [Architecture: Authentication & Security](architecture.md#authentication--security)
- [Architecture: API & Communication Patterns](architecture.md#api--communication-patterns)
- [Epic 1: Story 1.3](epics.md#story-13-用户注册)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- bcryptjs 已安装，纯 JS 实现无需原生编译
- 注册 API 端点已创建：POST /api/auth/register
- 密码使用 bcryptjs 哈希存储，salt rounds = 10
- 新用户默认 miles_balance = 10000
- 邮箱重复检查已实现，返回 409 状态码
- 注册页面使用 react-hook-form + zod 校验
- 必填字段用 * 标记，校验错误在 onBlur 时显示

### File List
- greenmiles/src/app/api/auth/register/route.ts
- greenmiles/src/app/(pages)/register/page.tsx
- greenmiles/src/components/RegisterForm.tsx
- greenmiles/package.json (updated: added bcryptjs)
