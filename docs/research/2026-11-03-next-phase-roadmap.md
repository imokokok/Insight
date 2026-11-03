# Insight — next-phase iteration plan (2026-11-03)

Status: planning proposal. Nothing here is committed; each track starts with its own
research document and ships behind the same review gates as previous phases.

## Where Insight stands after the Base Perp Guard landing

Shipped capabilities: cross-oracle consensus across 13 providers / 40+ chains,
Pre-Trade Safety Check, Oracle Watch, Lending Guards (Base / Monad / multichain /
Solana), Base Agent Swap Guard + exact-call decision attestations, Base Perp Guard
(assessment + exact-call EIP-712 decisions), Hyperliquid market/order/execution
evidence tools, execution receipts, x402 metering on 7 rails, MCP server, ERC-8004
registration (BNB #375779, Monad #10414), PriorSeal as the authorization/execution
counterpart.

The honest gap: **capability supply now exceeds distribution demand**. Every guard
family is built; too few agents consume them. The next phase must convert
infrastructure into usage and recurring revenue, while deepening the one defensible
moat — decision quality that competitors cannot copy without the oracle corpus.

## Three lenses

**Market.** Perp DEX volume is dominated by Hyperliquid; Base perps (Synthetix V3,
Aevo, Vertex) are a smaller but agent-friendly EVM niche. x402 is gaining agent
payment momentum on Base. AI-agent trading volume is growing faster than agent
safety tooling — the "agent signed a manipulated price" incident class is the wedge.

**Ecosystem.** Base is Insight's richest EVM ecosystem (Aerodrome, Synthetix,
Aave, Morpho, Moonwell, PancakeSwap — all already covered). ERC-8004 and x402 Bazaar
are the two agent-discovery surfaces Insight already speaks. PriorSeal covers
assess → authorize → execute → review; a joint reference agent is the missing demo.

**Capability.** Solo developer + AI agent sessions, proven by this landing: one
guard family from research to merged main per week is realistic. Fully automated
CI (typecheck, lint, 3.1k tests, smoke, gated deploy) means shipping cadence is
bounded by design decisions, not ops. What does NOT scale: bespoke per-venue
integrations. Everything planned below reuses the guard pattern, the oracle
consensus core, or existing evidence tools.

## Track A — deepen the moat (decision quality)

1. **Perp Guard v3 — liquidity evidence layer** (already scoped in the 2026-11-02
   research doc): feed spot/TWAP/in-range liquidity for the underlying into the
   perp decision as context, reusing the Monad Uniswap V3 execution-market
   precedent. Cheap, ships in days, differentiates vs. plain Pyth-echo tools.
2. **Hyperliquid Perp Guard**: Hyperliquid has the perp volume agents actually
   want; `get_hyperliquid_perp_market` / order / execution evidence tools already
   exist, so this is mostly the guard policy + exact-call binding for an L1 order.
   The largest TAM extension available at the lowest integration cost.
3. **Oracle-config defect hunting for perp market parameters** (v4 in the perp
   research doc): extends the established disclosure pipeline; slow-burn reputation
   work, schedule opportunistically.

## Track B — convert supply into demand (distribution)

1. **Joint reference agent with PriorSeal**: one end-to-end demo — agent assesses
   a Base swap/perp with Insight, binds a PriorSeal exact-call authorization,
   executes, and files the execution receipt — recorded and published as the
   canonical case study. Uses the existing partner joint-run playbook.
   (Case study published 2026-11-03:
   `docs/integrations/priorseal-joint-reference-agent.md`; the recorded-run
   section lands with PriorSeal's base-agent-swap-guard SDK adapter release
   plus a GO-gated mainnet rehearsal.)
2. **Discovery surface optimization**: ERC-8004 agent metadata, x402 Bazaar
   listings, and MCP registry entries audited as a set (descriptions, examples,
   pricing) so directory-indexed agents find the guards; add a published
   "build an agent in 10 minutes" quickstart per guard family.
3. **Skill packaging**: the per-guard skills (`insight-base-perp-guard` etc.) are
   the distribution unit for agent platforms; keep them versioned and listed
   wherever agent skills are indexed.

## Track C — recurring revenue (survival)

1. **Oracle Watch subscriptions**: today per-call metering; agents that hold
   positions need continuous between-action monitoring. Sell a monitored-window
   plan (e.g. 24 h of halt/proceed signals for one position) — the first
   non-per-call product; billing infra (plans/credits) already exists.
2. **Position monitoring bundles** (shipped 2026-11-03, see
   `2026-11-03-position-lifecycle-bundle-research.md`): perp/lending guard + watch +
   execution receipt as one priced lifecycle product per position, rather than four
   separate calls.
3. **Pricing review after 30 days of live data**: C1–C4 classes were set a priori;
   let Bazaar telemetry decide the first adjustment. (First review shipped
   2026-11-03 with the 30-day gate waived by the operator — C2 halved to 1cr,
   all other classes and both product prices kept; see
   `2026-11-03-first-pricing-review.md` for the revisit triggers.)

## Sequencing and gates

| Order | Item                               | Why this order                          | Done when                                                                                                                                                      |
| ----- | ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Track B1 joint reference agent     | Makes everything after it sellable      | Published case study + receipts (case study shipped 2026-11-03; receipts pending adapter release + GO-gated mainnet run)                                       |
| 2     | Track A1 perp liquidity evidence   | Cheapest moat deepening; pattern exists | v3 shipped behind perp guard (shipped 2026-11-03)                                                                                                              |
| 3     | Track C1 Oracle Watch subscription | First recurring revenue                 | Live plan purchasable via x402 (shipped 2026-11-03: `/safety/oracle-watch-window` begin/poll/close REST, plus `oracle_watch_window_begin/poll/close` MCP tools) |
| 4     | Track A2 Hyperliquid Perp Guard    | Biggest TAM, moderate cost              | Guard + exact-call on main (shipped 2026-11-03: `/safety/hyperliquid-perp-guard` assess/exact/verify; MCP keyless payment fail-closed on HyperCore)            |
| 5     | Track C2 position lifecycle bundle | Second recurring; first bundle product  | Live bundle purchasable via x402 (shipped 2026-11-03: `/safety/position-lifecycle` begin + token-authed guard/receipt/close, plus `position_lifecycle_begin/guard/receipt/close` MCP tools; embedded window reuses C1 routes) |
| 6     | Track B2/B3 + C3 continuous        | Compounding, run in background          | Audit + first pricing review (shipped 2026-11-03: B2 #367; C3 first review — C2 halved, revisit triggers set)                                                  |

Every item keeps the standing boundaries: assessment and evidence only, no custody,
no execution authority, fail closed outside reviewed scope, x402-metered.

## Explicit non-goals for this phase

- No token, no custody, no order routing, no per-venue integrations beyond
  Hyperliquid (reuse the guard pattern instead of adding bespoke coverage).
- No new chains for payments until the existing seven rails show live volume.
- No frontend surface expansion beyond what the quickstart and case study need.
