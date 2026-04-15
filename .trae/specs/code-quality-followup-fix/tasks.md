# Tasks

- [x] Task 1: 安全修复 - getUserId 改用 anon key
  - [x] 1.1: 修改 `src/lib/api/utils.ts` 中 `getUserId` 函数，将 `SUPABASE_SERVICE_ROLE_KEY` 替换为 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [x] 1.2: 修改 `src/lib/api/middleware/authMiddleware.ts` 中角色提取，从 `user.user_metadata?.role` 改为 `user.app_metadata?.role`

- [x] Task 2: 安全修复 - CSP 头移除 unsafe-inline/unsafe-eval
  - [x] 2.1: 修改 `src/lib/security/xss.ts` 中 `createXSSProtectionHeaders`，将 `script-src 'self' 'unsafe-inline' 'unsafe-eval'` 改为 `script-src 'self' 'nonce-{nonce}'`，添加 nonce 参数支持
  - [x] 2.2: 更新调用 `createXSSProtectionHeaders` 的地方传入 nonce 值

- [x] Task 3: API 路由添加速率限制
  - [x] 3.1: `src/app/api/alerts/[id]/route.ts` 的 GET/PUT/DELETE 添加 `moderateRateLimit`
  - [x] 3.2: `src/app/api/alerts/events/route.ts` 的 GET 添加 `moderateRateLimit`
  - [x] 3.3: `src/app/api/alerts/events/[id]/acknowledge/route.ts` 的 POST 添加 `strictRateLimit`
  - [x] 3.4: `src/app/api/favorites/[id]/route.ts` 的 GET/PUT/DELETE 添加 `moderateRateLimit`
  - [x] 3.5: `src/app/api/oracles/[provider]/route.ts` 的 GET 添加 `lenientRateLimit`

- [x] Task 4: 性能修复 - 全表扫描改为直接查询
  - [x] 4.1: 检查 `src/lib/supabase/server.ts` 中 `getServerQueries` 是否有按 ID 查询的方法（如 `getAlertById`、`getFavoriteById`、`getAlertEventById`），如果没有则添加
  - [x] 4.2: 修改 `src/app/api/alerts/[id]/route.ts` 中 `getAlertById` 使用直接查询
  - [x] 4.3: 修改 `src/app/api/favorites/[id]/route.ts` 中 `getFavoriteById` 使用直接查询
  - [x] 4.4: 修改 `src/app/api/alerts/events/[id]/acknowledge/route.ts` 使用直接查询替代全表扫描

- [x] Task 5: 硬编码路径添加 locale 前缀
  - [x] 5.1: 修复 `src/app/[locale]/alerts/page.tsx` 中的 `href="/login"`
  - [x] 5.2: 修复 `src/app/[locale]/favorites/page.tsx` 中的 4 处 router.push
  - [x] 5.3: 修复 `src/app/[locale]/login/page.tsx` 中的 `href="/"`
  - [x] 5.4: 修复 `src/app/[locale]/register/page.tsx` 中的 6 处硬编码路径
  - [x] 5.5: 修复 `src/app/[locale]/auth/forgot-password/page.tsx` 中的 3 处硬编码路径
  - [x] 5.6: 修复 `src/app/[locale]/auth/reset-password/page.tsx` 中的 4 处硬编码路径
  - [x] 5.7: 修复 `src/app/[locale]/auth/verify-email/page.tsx` 中的 4 处硬编码路径
  - [x] 5.8: 修复 `src/app/[locale]/auth/resend-verification/page.tsx` 中的 4 处硬编码路径

- [x] Task 6: 13 个页面添加 metadata
  - [x] 6.1: 为 `alerts/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.2: 为 `favorites/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.3: 为 `login/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.4: 为 `register/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.5: 为 `cross-chain/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.6: 为 `cross-oracle/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.7: 为 `price-query/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.8: 为 `settings/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.9: 为 `docs/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.10: 为 `auth/forgot-password/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.11: 为 `auth/reset-password/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.12: 为 `auth/verify-email/page.tsx` 添加 generateMetadata，拆分客户端组件
  - [x] 6.13: 为 `auth/resend-verification/page.tsx` 添加 generateMetadata，拆分客户端组件

- [x] Task 7: 8 个路由添加 loading.tsx
  - [x] 7.1: 创建 `src/app/[locale]/loading.tsx`
  - [x] 7.2: 创建 `src/app/[locale]/alerts/loading.tsx`
  - [x] 7.3: 创建 `src/app/[locale]/cross-chain/loading.tsx`
  - [x] 7.4: 创建 `src/app/[locale]/cross-oracle/loading.tsx`
  - [x] 7.5: 创建 `src/app/[locale]/price-query/loading.tsx`
  - [x] 7.6: 创建 `src/app/[locale]/favorites/loading.tsx`
  - [x] 7.7: 创建 `src/app/[locale]/settings/loading.tsx`
  - [x] 7.8: 创建 `src/app/[locale]/docs/loading.tsx`

- [x] Task 8: 运行 typecheck 和 lint 验证所有修复

# Task Dependencies

- [Task 4] depends on [Task 4.1] (需要先确认/添加 server queries 中的直接查询方法)
- [Task 6] depends on [Task 5] (metadata 拆分时需同时修复路径)
- [Task 8] depends on [Task 1-7] (所有修复完成后验证)
- [Task 1, 2, 3, 4, 7] 可并行执行
- [Task 5, 6] 可并行执行但需注意文件冲突
