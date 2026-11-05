# x402 结算台账与 facilitator 运维记录

状态: **2026-10-27 复核归档**（Gate-2 Monad x402 付款演练后的审计修正记录）。
本文记录两件事: eip155:143 结算 facilitator 的身份证据链，以及服务端结算台账的落库路径与对账流程。

## 1. Facilitator 拓扑（production）

配置全部来自 Vercel production 环境变量（见 §3 的类型速查）:

| 变量                                              | Vercel 类型 | 值                                                                                                                              |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `X402_EVM_NETWORKS`                               | encrypted   | `eip155:8453,eip155:137,eip155:42161,eip155:143,eip155:56`                                                                      |
| `X402_FACILITATOR_URLS`                           | plain       | 按链覆盖: `eip155:56=https://facilitator.aeon.xyz`、`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp=https://facilitator.payai.network` |
| `X402_FACILITATOR_URL`                            | sensitive   | 不可经 API 回读；`eip155:143`（及 8453/137/42161）无覆盖，走此默认值                                                            |
| `X402_CDP_API_KEY_ID` / `X402_CDP_API_KEY_SECRET` | sensitive   | 存在 → 面向 CDP（Coinbase Developer Platform）的凭据                                                                            |

代码 fallback（[`src/lib/api/x402/config.ts`](../../src/lib/api/x402/config.ts)）默认 `https://x402.org/facilitator`，但该免费 facilitator 仅支持测试网，主网构建期校验（`resourceServer.ts` 对 `/supported` 的 exact 广告校验）不允许它承担主网报价，可排除。

### 链上观测（Gate 2 演练，2026-10-27）

- Insight 结算交易 `0x7363e7c2d3c5de24cf6a6232f6595db9fd142ca0a97410fe1fc05142ec44cff6`（Monad 区块 116834305, status 0x1）的提交者 EOA 为
  **`0x8F5cB67B49555E614892b7233CFdDEBFB746E531`** —— 即 Insight 生产 facilitator 的结算热钱包。
- 同一时点该钱包在 Base 主网约 **342 万笔** `transferWithAuthorization`、Monad 61 笔、以太坊 0 笔 —— 大型主网 facilitator 特征。
- 已排除的候选（外部匿名审计）: x402.org（仅测试网）、molandak（signer `0x95d1…`）、daydreams systems（无 143 支持）、PayAI（仅 Solana）。
- 区分: PriorSeal readiness 端点的结算提交者 `0x97acce27d5069544480bde0f04d9f47d7422a016` 是 **PriorSeal 自己的 facilitator**（其 Cloudflare D1 台账），与 Insight 无关。

### 推断与待确认项

配置拓扑（默认 URL + CDP 凭据成对存在）+ 钱包规模特征 → **默认 facilitator 极可能为 Coinbase CDP x402 facilitator**。
`X402_FACILITATOR_URL` 为 sensitive、CDP 未公开其热钱包地址，因此最终归属需操作者对照 CDP 控制台一次性确认后回填本节。

## 2. 结算台账（已实现，本轮复核确认）

> 2026-10-27 审计修正: 此前"服务端结算持久化未确认"的结论**有误**。台账自迁移 0077 起即为生产功能。

### 写路径

- REST: [`src/lib/api/x402/guard.ts`](../../src/lib/api/x402/guard.ts) `recordX402Settlement()` —— 生命周期状态 `quote_issued / payment_rejected / payment_verified / business_failed / business_succeeded / settled / settlement_failed`，`settled` 行携带 `tx_hash`、`payer`、`amount_usdc`、`verdict`。
- MCP: [`src/lib/api/x402/mcpBridge.ts`](../../src/lib/api/x402/mcpBridge.ts) 同一函数，`surface: 'mcp'`。
- 写入用 service-role 客户端，`after()` 后置执行，Supabase 不可用时指数退避跳过（审计为 advisory，绝不阻塞付费响应路径）。

### 存储与读路径

- 表: `public.x402_settlements`（Supabase）。迁移演进: [`0077_x402_settlements.sql`](../../supabase/migrations/0077_x402_settlements.sql) 建表 → 0078（network 改 CAIP-2）→ 0079（生命周期状态 + `surface`/`resource`/`response_time_ms`）→ 0080（MPP）→ 0088/0089/0091（多链网络枚举）。
- RLS 启用且**无任何策略**: 匿名/认证角色默认拒绝，仅 service role 读写。
- 运营看板: `/ops/x402`（[`src/lib/ops/opsQueries.ts`](../../src/lib/ops/opsQueries.ts)），按状态/时间/网络聚合生命周期审计。

### 生产验证（2026-10-27）

匿名 REST 探测 `GET {SUPABASE_URL}/rest/v1/x402_settlements?select=id&limit=1` 返回 **`42501 permission denied for table x402_settlements`**（HTTP 401）而非 404/PGRST205 —— 证明表已存在于生产库且按设计默认拒绝匿名。

### 对账运行手册

1. 每周从 `/ops/x402`（或 service-role 直查）导出 `status='settled'` 行。
   可直接运行 `npm run audit:x402 -- --days=7`（只读、可重复；全时段用 `--all`）得到外部付费调用数、独立外部 payer 与自有/运营钱包排除结果；用 `--self=<address>` 确认自有钱包，用 `--json` 接入自动化。
   注意：**自有/运营钱包识别始终基于全时段 `settled` 行**，即使指定 `--days=7`。否则高频运营钱包在短窗口内只有 1 次调用、1 个活跃日，会被误判成「新外部付费客户」（2026-11-03 的 `0x1bf19c0e…091dec` 即触发过该误判，已修复）。漏斗与 headline 仍按所选窗口计算。
2. 将 `tx_hash` + `amount_usdc` 与链上 `X402_PAY_TO` 地址的 USDC 余额变动对账（0077 迁移注释中的既定流程；Gate-2 演练行 `0x7363e7c2…`、2026-10-27 亦可用作锚点样本）。
3. 关注 `settlement_failed` / `business_failed` 比例异常与 `payment_rejected` 突增（facilitator 拒签往往是密钥/域名配置漂移的第一信号）。

## 3. Vercel env 类型速查（审计用）

| 类型        | 列表端点 `GET /v9/projects/:id/env`           | 单值端点 `GET /v9/projects/:id/env/:envId` |
| ----------- | --------------------------------------------- | ------------------------------------------ |
| `plain`     | 明文可读                                      | 明文可读                                   |
| `encrypted` | **不解密**（返回 `{v:"v2",c,k}` PKCS#7 信封） | 加 `?decrypt=true` 可解密为明文            |
| `sensitive` | 不可回读                                      | 不可回读（仅运行时由平台注入明文）         |

注意: 解密必须走**单值端点**；列表端点传 `decrypt=true` 无效。仓库代码中不存在任何 env 解密层 —— `{v:"v2",c,k}` 信封由 Vercel 平台处理。
