# First pricing review — per-call metering ladder (roadmap C3)

Status: shipped 2026-11-03. The roadmap gated the first pricing review on
"30 days of live Bazaar telemetry"; the operator explicitly waived that gate.
This document records the review, the one change made, and what would trigger
the next one.

## Telemetry snapshot (2026-11-03, live DB, read-only audit)

API-key rail (`api_key_usage`, last 30 days):

| Endpoint                                    | Class | Calls (ok/total) |
| ------------------------------------------- | ----- | ---------------- |
| `/api/v1/execution/solana/simulate`         | C1    | 52 / 65          |
| `/api/v1/safety/pre-trade`                  | C3    | 5 / 8            |
| `/api/v1/partners/veritas/safety/pre-trade` | C3    | 1 / 2            |
| `/api/v1/execution/attestation/issue`       | C4    | 1 / 2            |

Last 7 days: zero calls. Credit ledger, last 30 days: −41.00 credits usage
against +205.00 granted. Product sales (`oracle_watch_windows`,
`position_lifecycles`): zero — both products shipped 2026-11-03. The x402
keyless rail settles per-request on-chain and is not recorded in the DB, so
Bazaar volume is not observable from here; no on-chain reconciliation was done.

Honest read: 77 calls is not an elasticity signal. Any conclusion drawn from
volume alone would be noise. The review therefore rests on ladder design,
marginal cost, and value anchors — with explicit revisit triggers below.

> **2026-11-05 correction (read-only audit; the pricing decision above is unchanged).**
> The statement above that the x402 rail "is not recorded in the DB" is **incorrect**.
> `public.x402_settlements` has been a production lifecycle ledger since
> migration 0077; REST/MCP `settled` rows carry `tx_hash`, `payer` and
> `amount_usdc`. See `docs/operations/x402-settlement-ops.md` §2, which already
> corrected the same misconception on 2026-10-27. The cause here was an
> unqueried audit table, not missing data.
>
> Full-table read-only audit on 2026-11-05 (`npm run audit:x402 -- --all`):
>
> | Metric                                          | Value                                 |
> | ----------------------------------------------- | ------------------------------------- |
> | Ledger rows                                     | 23,948                                |
> | `quote_issued`                                  | 23,701                                |
> | `settled`                                       | 77                                    |
> | Gross settled USDC                              | $1.468                                |
> | Distinct payers                                 | 8                                     |
> | Single high-frequency operations wallet         | 69 / 77 settled (89.6%)               |
> | **External paid calls** (excluding that wallet) | **8 calls / 7 payers / $0.16**        |
> | Last external payment                           | 2026-10-23 (13 days before the audit) |
>
> Impact on this review: the C1–C4 decisions stand (there was no elasticity
> signal then and there is none now). But the funnel evidence is much harder
> than "77 calls": 23,701 quotes produced 77 settlements (0.32%), and there
> have been no external payments since 2026-10-23. That is a retention and
> conversion problem, not a pricing problem, and it does not support adding
> more supply. Chain-level `tx_hash` reconciliation still has not been run;
> it follows the weekly procedure in `x402-settlement-ops.md` §2.4.

## Decision

| Class                         | Was            | Now            | Change |
| ----------------------------- | -------------- | -------------- | ------ |
| C1                            | 0.5cr / $0.002 | 0.5cr / $0.002 | keep   |
| C2                            | 2cr / $0.008   | 1cr / $0.004   | halve  |
| C3                            | 5cr / $0.02    | 5cr / $0.02    | keep   |
| C4                            | 10cr / $0.04   | 10cr / $0.04   | keep   |
| Oracle Watch Window 24h       | $0.50          | $0.50          | keep   |
| Position Lifecycle Bundle 24h | $0.55          | $0.55          | keep   |

**C2 is the only change: 2cr → 1cr ($0.008 → $0.004).** Rationale:

1. **Funnel role.** C2 deep analysis is how an agent decides whether it needs a
   C3 gate at all. It is a trial surface, not the monetization anchor. Zero C2
   calls in 30 days while C1 (65) and C3 (10) both saw use says the bridge
   between commodity data and gates is overpriced, not that analysis is
   unwanted.
2. **Ladder shape.** 0.5 → 2 → 5 → 10 credits has a 4× first step; 0.5 → 1 → 5
   → 10 reads as "two 2× steps, then value-priced gates". The new rule of thumb
   is clean: any analysis call = 2 data calls.
3. **Cost backing.** C2 is aggregation over snapshots already persisted for C1;
   its marginal cost is barely above C1's, far below C3's multi-provider
   consensus pass. $0.004 still prices it at 2× C1 revenue per call.

Kept, and why:

- **C1 $0.002** — the discovery surface. Competitive with paid market-data
  APIs ($0.001–$0.01/call) and cheap enough for a directory-indexed agent to
  try without budget approval. Raising it suppresses the funnel; lowering it
  approaches per-settlement friction on x402.
- **C3 $0.02** — the monetization anchor. A gate that blocks one bad trade on a
  $1,000 swap saves 1–5% ($10–50); $0.02 is ~0.2% of a single saved trade.
  With zero Bazaar volume evidence, raising it risks the adoption this phase
  exists to win.
- **C4 $0.04** — cost-backed (RPC read + KMS signing) and strongest
  willingness-to-pay (audit-grade evidence), but no volume signal justifies a
  raise yet.
- **Products $0.50 / $0.55** — shipped today with documented rationale against
  per-call à la carte (window ≈ cost of ~26 C3 calls; bundle ~11% below the
  pieces on both rails). Repricing them hours later would be noise.

## Revisit triggers

Run the next review when any of these fires, whichever comes first:

1. ≥ 500 successful paid calls in a calendar month on either rail (enough
   signal to measure mix, not elasticity), or
2. ≥ 20 product purchases cumulative, or
3. 2026-12-31 (hard deadline — review even if quiet, since quiet months are
   themselves evidence the funnel is broken above pricing).

First question for the next review: does C2 usage move after the halving? If
C2 volume stays at zero while C1/C3 grow, the problem is the C2 catalog's
discovery copy, not its price.

## Change surface (all pinned values updated in the same PR)

`src/lib/billing/metering.ts` (single source of truth), the byte-identical
`public/.well-known/x402` + `.json` pair, `public/skill.md`, `public/llms.txt`,
`/docs/x402` page table, `src/lib/api/openapi/discovery.{ts,json}`,
`src/lib/billing/plans.ts` comment, the x402 quickstart example, the
coverage-SLO runbook, and the derivation tests that pin the pack-description
strings. Pack prices themselves are unchanged: descriptions are derived from
`CREDIT_COST` and update automatically.
