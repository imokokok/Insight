# 后续遗留问题完整修复 Spec

## Why

前一轮代码审查修复了 20+ 处严重问题，但仍有 8 类遗留问题未修复：Service Role Key 认证安全风险、5 个 API 路由缺失速率限制、全表扫描性能问题、13 个页面缺少 metadata/SEO、缺少 loading.tsx、15+ 处硬编码路径缺少 locale 前缀、用户角色从可篡改的 user_metadata 提取、CSP 头包含 unsafe-inline/unsafe-eval。这些问题影响安全性、性能、SEO 和国际化一致性。

## What Changes

- **getUserId 改用 anon key 验证用户**：将 `SUPABASE_SERVICE_ROLE_KEY` 替换为 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，避免绕过 RLS
- **5 个 API 路由添加速率限制**：alerts/[id]、alerts/events、alerts/events/[id]/acknowledge、favorites/[id]、oracles/[provider]
- **全表扫描改为直接查询**：alerts/[id]、favorites/[id]、acknowledge 路由的 getAlertById/getFavoriteById 改为按 ID 直接查询
- **13 个页面添加 metadata**：为所有缺少 metadata 的页面创建服务端 page.tsx 导出 generateMetadata，客户端逻辑拆到独立组件
- **8 个路由添加 loading.tsx**：为主要路由添加流式加载 UI
- **15+ 处硬编码路径添加 locale 前缀**：所有 Link href 和 router.push 路径使用 `/${locale}/...` 格式
- **用户角色改用 app_metadata**：authMiddleware 中从 `user.app_metadata?.role` 提取角色
- **CSP 头移除 unsafe-inline/unsafe-eval**：改用 nonce-based CSP

## Impact

- Affected code:
  - `src/lib/api/utils.ts` — getUserId 函数
  - `src/lib/api/middleware/authMiddleware.ts` — 角色提取
  - `src/lib/security/xss.ts` — CSP 头
  - `src/app/api/alerts/[id]/route.ts` — 添加速率限制 + 直接查询
  - `src/app/api/alerts/events/route.ts` — 添加速率限制
  - `src/app/api/alerts/events/[id]/acknowledge/route.ts` — 添加速率限制 + 直接查询
  - `src/app/api/favorites/[id]/route.ts` — 添加速率限制 + 直接查询
  - `src/app/api/oracles/[provider]/route.ts` — 添加速率限制
  - `src/app/[locale]/alerts/page.tsx` — 添加 metadata + 修复路径
  - `src/app/[locale]/favorites/page.tsx` — 添加 metadata + 修复路径
  - `src/app/[locale]/login/page.tsx` — 添加 metadata + 修复路径
  - `src/app/[locale]/register/page.tsx` — 添加 metadata + 修复路径
  - `src/app/[locale]/cross-chain/page.tsx` — 添加 metadata
  - `src/app/[locale]/cross-oracle/page.tsx` — 添加 metadata
  - `src/app/[locale]/price-query/page.tsx` — 添加 metadata
  - `src/app/[locale]/settings/page.tsx` — 添加 metadata
  - `src/app/[locale]/docs/page.tsx` — 添加 metadata
  - `src/app/[locale]/auth/forgot-password/page.tsx` — 添加 metadata + 修复路径
  - `src/app/[locale]/auth/reset-password/page.tsx` — 添加 metadata + 修复路径
  - `src/app/[locale]/auth/verify-email/page.tsx` — 添加 metadata + 修复路径
  - `src/app/[locale]/auth/resend-verification/page.tsx` — 添加 metadata + 修复路径
  - 新增 8+ 个 `loading.tsx` 文件

## ADDED Requirements

### Requirement: 安全 - getUserId 使用 anon key 验证用户

系统 SHALL 使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 而非 `SUPABASE_SERVICE_ROLE_KEY` 来验证用户 token，避免绕过行级安全策略（RLS）。

#### Scenario: 使用 anon key 验证用户 token

- **WHEN** API 请求携带 Bearer token
- **THEN** 使用 anon key 创建的 Supabase 客户端验证 token，返回用户 ID

### Requirement: 安全 - 5 个 API 路由添加速率限制

系统 SHALL 为以下路由添加速率限制中间件：

- `alerts/[id]` — moderate
- `alerts/events` — moderate
- `alerts/events/[id]/acknowledge` — strict
- `favorites/[id]` — moderate
- `oracles/[provider]` — lenient

#### Scenario: 速率限制生效

- **WHEN** 用户在时间窗口内超过请求限制
- **THEN** 返回 429 状态码和 Retry-After 头

### Requirement: 性能 - 全表扫描改为直接查询

系统 SHALL 将 `getAlertById`、`getFavoriteById`、acknowledge 路由中的全表扫描+内存过滤模式改为按 ID 直接查询数据库。

#### Scenario: 按 ID 查询单条记录

- **WHEN** 请求获取/更新/删除特定 ID 的资源
- **THEN** 使用数据库的 WHERE id = ? 查询，而非获取全部后内存过滤

### Requirement: SEO - 13 个页面添加 metadata

系统 SHALL 为所有缺少 metadata 的页面导出 `generateMetadata` 函数，提供多语言 title、description 和 openGraph 信息。客户端组件页面需拆分为服务端 page.tsx（导出 metadata）+ 客户端内容组件。

#### Scenario: 页面包含正确的 SEO metadata

- **WHEN** 搜索引擎爬虫访问页面
- **THEN** 返回包含多语言 title、description、openGraph 的完整 metadata

### Requirement: UX - 8 个路由添加 loading.tsx

系统 SHALL 为以下路由添加 `loading.tsx` 文件，提供即时流式加载 UI：

- `/[locale]/` (首页)
- `/[locale]/alerts/`
- `/[locale]/cross-chain/`
- `/[locale]/cross-oracle/`
- `/[locale]/price-query/`
- `/[locale]/favorites/`
- `/[locale]/settings/`
- `/[locale]/docs/`

#### Scenario: 页面加载时显示骨架屏

- **WHEN** 用户导航到新页面
- **THEN** 立即显示 loading.tsx 中的骨架屏 UI，数据加载完成后替换为实际内容

### Requirement: i18n - 硬编码路径添加 locale 前缀

系统 SHALL 将所有 `Link href` 和 `router.push` 中的硬编码路径改为包含当前 locale 的格式（如 `/${locale}/login`）。

#### Scenario: 非默认语言用户导航

- **WHEN** 中文用户点击登录链接
- **THEN** 导航到 `/zh-CN/login` 而非 `/login`

### Requirement: 安全 - 用户角色从 app_metadata 提取

系统 SHALL 从 `user.app_metadata?.role` 而非 `user.user_metadata?.role` 提取用户角色，因为 app_metadata 只能由服务端修改。

#### Scenario: 角色提取

- **WHEN** 认证中间件提取用户角色
- **THEN** 从 app_metadata 读取，客户端无法伪造

### Requirement: 安全 - CSP 头移除 unsafe-inline/unsafe-eval

系统 SHALL 将 CSP 头中的 `unsafe-inline` 和 `unsafe-eval` 替换为 nonce-based 方案，使用 Next.js 的 `nonce` 属性。

#### Scenario: CSP 头不含 unsafe 指令

- **WHEN** 服务端返回 CSP 头
- **THEN** script-src 使用 nonce 而非 unsafe-inline，不包含 unsafe-eval
