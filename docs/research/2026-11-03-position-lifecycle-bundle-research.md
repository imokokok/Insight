# Position Lifecycle Bundle (24h) — research & design (2026-11-03)

Track C2 of the 2026-11-03 next-phase roadmap: "perp/lending guard + watch +
execution receipt as one priced lifecycle product per position, rather than four
separate calls."

## Problem

A position-holding agent today assembles a monitored lifecycle from four
independently billed surfaces:

1. a guard assessment at entry (any of the six position guards, C3),
2. continuous Oracle Watch coverage (the 24 h monitored window, $0.50),
3. a guard re-assessment before managing or exiting (C3 again),
4. an attested execution receipt for the exit fill (C4).

That is four purchases, three payment settlements, two token systems (API key
or x402 per call, plus a window token), and no durable record tying them to one
position. The economics of the window already proved the non-per-call shape;
the lifecycle is the natural second product.

## What already exists and is reused

- **Window engine** (`oracleWatchWindowService.ts`): begin/poll/close, sha256
  bearer-token auth, conditional poll-budget update, per-issuance audit rows in
  `oracle_watch_checks.window_id`. The bundle embeds one window row and reuses
  this machinery untouched — including the existing poll/close REST routes.
- **Guard assessors**: all six position guards export a clean
  `assessX(input, deps?)` plus a zod `XInputSchema`:
  `assessBasePerpGuard`, `assessHyperliquidPerpGuard`, `assessBaseLendingGuard`,
  `assessMonadLendingGuard`, `assessMultichainEvmLendingGuard`,
  `assessSolanaLendingGuard`.
- **Receipt issuance** (`executionReceiptService.ts`): `issueExecutionReceipt`
  - `recordExecutionReceipt`; the REST body schema
    (`ExecutionReceiptIssueBodySchema`) is exported and reusable by a proxy route.
- **Product pricing registry** (`productPricing.ts`): the quota middleware
  consults it before per-call class rules, so a product-priced purchase path is
  a one-line registration.
- **x402 per-route amount override** (`routeConfigWithoutDiscovery(cfg, desc,
amountAtomic)`): exactly how the window route quotes its plan price.

## Product definition

`position-lifecycle-24h` — one purchase covers 24 h of lifecycle coverage for
ONE (symbol, chain) position subject:

| Included                | Amount | À-la-carte cost (credits) | À-la-carte cost (x402) |
| ----------------------- | ------ | ------------------------- | ---------------------- |
| Monitored watch window  | 1      | 125 cr ($0.50)            | $0.50                  |
| Guard assessments       | 4      | 20 cr (4 × 5 cr)          | 4 × $0.02              |
| Execution receipt issue | 1      | 10 cr                     | $0.02                  |
| **Total à la carte**    |        | **155 cr**                | **$0.60**              |

**Bundle price: $0.55** (138 credits at the canonical $0.004/credit) — about
11 % below à la carte on both rails, and marketing-honest: "a monitored window
plus your lifecycle gates and the exit receipt for $0.05 more than the window
alone."

Design decisions:

- **One token, one row pair.** The purchase returns a one-time lifecycle token
  (`plc_<64 hex>`); only its SHA-256 hash is stored. The embedded window row
  stores the same hash, so the token also authenticates against the existing
  `/safety/oracle-watch-window/{windowId}` poll/close routes — watch polling
  needs zero new surface.
- **Guard family is chosen per call, not at purchase.** A lifecycle body of
  `{ family, params }` dispatches to the matching assessor. A hyperliquid perp
  position and its Base-collateral lending check can share one budget. Budget
  decrements use a conditional update (`guard_used < guard_budget`) so
  concurrent calls cannot exceed the cap (same fail-closed pattern as polls).
- **Bundled guard calls are assess-only.** Exact-call decision binding stays on
  the native guard routes (it is intent-specific and cheap); the bundle sells
  the assessment verdicts that gate entry/exit/management.
- **Bundled receipt is a proxy, not a new issuer.** The route validates the
  lifecycle token and receipt credit, then calls `issueExecutionReceipt` and
  `recordExecutionReceipt` verbatim and consumes the credit. No new receipt
  semantics, no journey coupling — the receipt binds to the caller's own
  pre-trade attestations exactly as it does à la carte.
- **Fail-closed everywhere**: unknown id / wrong token answer identically (401);
  closed/expired lifecycle 410; exhausted budget 429 with `Retry-After` hints.

## Surface

- `POST /api/v1/safety/position-lifecycle` — purchase (x402 route-level $0.55
  override, or product-priced credit debit via `productPricing.ts`).
- `POST /api/v1/safety/position-lifecycle/{lifecycleId}/guard` — bundled
  assessment (token-authed, budget-metered).
- `POST /api/v1/safety/position-lifecycle/{lifecycleId}/receipt` — bundled
  receipt issue (token-authed, one credit).
- `POST /api/v1/safety/position-lifecycle/{lifecycleId}` — close (idempotent)
  and return the combined summary: window coverage counts + guard usage +
  receipt state.
- Watch polls: existing `GET /api/v1/safety/oracle-watch-window/{windowId}`
  with the same bearer token (returned in the purchase `usage` block).

Migration 0116 adds `position_lifecycles` (subject, lifecycle, token hash,
guard budget/usage, receipt state, window link, payment provenance) with RLS
mirroring `oracle_watch_windows` and a 180-day cleanup cron.

## Non-goals

- No MCP surface for the bundle in v1 (the window shipped REST-only too; MCP
  catalog addition can follow if agents ask for it).
- No execution authority changes: guards stay assessment-only, receipts stay
  evidence artifacts, the bundle never signs or broadcasts.
- No per-venue lifecycle hooks (position PnL tracking etc.) — the bundle covers
  Insight's existing evidence products, nothing more.
