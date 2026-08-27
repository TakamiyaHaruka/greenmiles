# Story 1.4: 用户登录与认证

Status: done

## Story

As a 已注册用户,
I want 通过邮箱和密码登录,
so that 我可以访问个人功能。

## Acceptance Criteria

1. 显示登录表单：邮箱、密码
2. 表单使用 react-hook-form + zod 校验
3. 调用 POST /api/auth/login，返回 JWT token，存入 httpOnly cookie
4. 登录成功后跳转到首页 Dashboard
5. 凭据错误时返回错误提示"邮箱或密码错误"
6. JWT cookie 存在时，middleware.ts 验证 token 有效性
7. 无效 token 时重定向到登录页
8. 创建 src/stores/userStore.ts 存储用户信息和认证状态

## Tasks / Subtasks

- [x] 安装 jose 依赖 (AC: #3)
  - [x] npm install jose
- [x] 创建 JWT 工具模块 (AC: #3, #6)
  - [x] 创建 src/lib/auth.ts
  - [x] 实现 signJwt(payload) 函数
  - [x] 实现 verifyJwt(token) 函数
  - [x] 使用 process.env.JWT_SECRET
- [x] 创建登录 API 端点 (AC: #3, #4, #5)
  - [x] 创建 src/app/api/auth/login/route.ts
  - [x] 使用 Zod LoginSchema 校验请求体
  - [x] 查询用户是否存在
  - [x] 使用 bcryptjs 比对密码
  - [x] 生成 JWT token
  - [x] 设置 httpOnly cookie
  - [x] 返回成功响应
- [x] 创建登录页面 (AC: #1, #2)
  - [x] 创建 src/app/(pages)/login/page.tsx
  - [x] 使用 react-hook-form + zod 校验
  - [x] 邮箱、密码两个输入框
  - [x] 必填字段用 * 标记
  - [x] onBlur 时显示校验错误
- [x] 创建登录表单组件 (AC: #1, #2)
  - [x] 创建 src/components/LoginForm.tsx
  - [x] 使用 shadcn/ui Input 和 Button 组件
  - [x] 集成 react-hook-form
  - [x] 显示加载状态和错误信息
  - [x] 登录成功后跳转首页
- [x] 创建认证中间件 (AC: #6, #7)
  - [x] 创建 src/middleware.ts
  - [x] 验证 JWT token 有效性
  - [x] 无效 token 时重定向到登录页
  - [x] 排除公开路由（/, /login, /register, /api/auth/*）
- [x] 创建用户状态管理 (AC: #8)
  - [x] 安装 zustand
  - [x] 创建 src/stores/userStore.ts
  - [x] 存储用户信息（id, email, miles_balance）
  - [x] 存储认证状态（isAuthenticated）
  - [x] 实现 fetchUser() 方法

## Dev Notes

### Architecture Context

- **认证层:** JWT (jose) + httpOnly cookie + middleware.ts
- **Token 存储:** httpOnly cookie（防止 XSS）
- **简化:** 不做 refresh token，PoC 范围够用
- **状态管理:** Zustand

### API Endpoint

```
POST /api/auth/login
Request: { email: string, password: string }
Response: { data: { user: { id, email, miles_balance } } } | { error }
```

### JWT Payload

```typescript
{
  userId: number;
  email: string;
  exp: number; // 24 hours
}
```

### Middleware Routes

| 路由 | 认证要求 |
|------|----------|
| / | 公开 |
| /login | 公开 |
| /register | 公开 |
| /api/auth/* | 公开 |
| /mall | 需要认证 |
| /orders | 需要认证 |
| /api/* | 需要认证 |

### Enforcement Rules

- 使用 `cn()` 工具函数合并 Tailwind 类名
- 所有卡片加 `border border-[#E2E8F0]`（无障碍强制）
- 组件 props 类型用 TypeScript interface 定义
- Zod schema 放在 `lib/schemas.ts` 统一管理
- API Routes 返回统一 `{ data }` 或 `{ error }` 格式

### References

- [Architecture: Authentication & Security](architecture.md#authentication--security)
- [Architecture: API & Communication Patterns](architecture.md#api--communication-patterns)
- [Epic 1: Story 1.4](epics.md#story-14-用户登录与认证)

## Dev Agent Record

### Agent Model Used
claude-opus-4-7

### Debug Log References
None

### Completion Notes List
- jose 已安装，Edge Runtime 兼容的 JWT 库
- zustand 已安装，轻量级状态管理
- JWT 工具模块已创建：signJwt(), verifyJwt()
- 登录 API 端点已创建：POST /api/auth/login
- 登录页面使用 react-hook-form + zod 校验
- 密码使用 bcryptjs 比对
- JWT token 存储在 httpOnly cookie 中，有效期 24 小时
- 认证中间件已创建，排除公开路由
- 用户状态管理已创建：userStore.ts

### File List
- greenmiles/src/lib/auth.ts
- greenmiles/src/app/api/auth/login/route.ts
- greenmiles/src/app/api/user/route.ts
- greenmiles/src/app/(pages)/login/page.tsx
- greenmiles/src/components/LoginForm.tsx
- greenmiles/src/middleware.ts
- greenmiles/src/stores/userStore.ts
- greenmiles/package.json (updated: added jose, zustand)
