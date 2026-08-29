# Insight — Oracle Transparency & Risk Infrastructure

Insight is an oracle transparency and risk infrastructure platform for DeFi. It tracks prices across **10 oracle providers and 40+ blockchain networks** — and turns that cross-oracle data into a **decision-grade safety check** that AI agents run before touching on-chain money, plus an **always-on cross-oracle trust signal (Oracle Watch)** that keeps running strategies safe between trades.

**See through every oracle. Trust with clarity.**

> Insight is **not** a real-time oracle tracker. Price snapshots and feed health are collected every 15 minutes; reputation scores are recalculated hourly. All data is aggregated into daily reports. The API quotas are sized to this cadence.

## Table of Contents

- [The Flagship: Pre-Trade Oracle Safety Check](#the-flagship-pre-trade-oracle-safety-check)
- [Oracle Watch: Always-On Cross-Oracle Monitoring](#oracle-watch-always-on-cross-oracle-monitoring)
- [Key Features](#key-features)
- [Supported Oracles](#supported-oracles)
- [Supported Protocols](#supported-protocols-safety-check)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Access](#api-access)
- [AI Agent Integration (MCP Server)](#ai-agent-integration-mcp-server)
- [Data Pipeline](#data-pipeline)

## The Flagship: Pre-Trade Oracle Safety Check

The "AI agent immune system." Before an agent (or human) executes any on-chain **swap / borrow / lend / liquidate / repay**, it calls one checkpoint that aggregates cross-oracle consensus prices, per-provider deviation, data freshness, stablecoin peg status, and reputation — and returns a single, machine-readable verdict:

> **PASS · CAUTION · DANGER · BLOCK** + a recommended maximum position size

Agents must not execute when the verdict is DANGER or BLOCK. Every call is audit-logged, building the data flywheel for the ML risk model.

### How it decides — deterministic rule engine

| Signal                                    | What it catches                                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Max provider deviation                    | One oracle diverging from consensus                                                                                               |
| Cross-provider spread                     | Oracles disagreeing with each other                                                                                               |
| Provider agreement                        | Consensus quality breaking down                                                                                                   |
| Cadence-relative staleness                | A feed falling behind its own observed rhythm (soft CAUTION) — plus a 7-day absolute hard-block backstop for genuinely dead feeds |
| Stablecoin depeg                          | Peg breakages contaminating lending markets                                                                                       |
| **Protocol buffer consumption (lending)** | How much of a protocol's max-LTV liquidation buffer the current oracle dispersion already eats                                    |

**Lending freeze — the "decisive & actionable" layer.** When cross-oracle dispersion consumes **≥95% of a protocol's max-LTV liquidation buffer** _and_ the erosion is sustained (24h z-score elevated or 3h deviation velocity still rising), **new borrowing is frozen (BLOCK)**. One-tick volatility spikes are not frozen. Instead of only flagging risk, the check returns concrete actions: `freeze_borrow`, `wait_convergence`, `add_collateral`, `reduce_position`. Recommended borrow size shrinks in step with buffer consumption (floor 10%). Swap remains unaffected — a swap opens no liquidatable position.

### ML augmentation (experimental — never drives the verdict)

- A **multi-horizon ML model** (1h + 6h) produces a manipulation risk score [0,1] that feeds the displayed risk level and audit log. The verdict itself is produced by the deterministic rule engine only.
- **Unsupervised anomaly detection** (z-score + EWMA residual vs 24h baseline) catches novel manipulation the supervised model has never seen.
- If no verified model is active, the score gracefully falls back to a hand-tuned rule-based formula — the check never depends on ML availability.

### Verifiable attestations

Every check can be signed as an **EIP-712 offchain attestation** — a portable, gasless, tamper-evident proof that "Insight verified oracle state for this trade at time T". Agents relay it in tx memo / calldata / logs so users and protocols can recognize the agent ran the oracle immune-system check.

- **v1** — 11-field attestation (default, backward compatible).
- **v2** — 26-field attestation: CAIP-19 asset-pair binding, request hash, provider-observations hash, reason-codes hash, plus a **quorum gate** (≥3 independent providers) and an **independence gate** (≥2 distinct non-derived operator groups) that escalate to BLOCK. Unresolvable assets are signed with an explicit `unresolved:` marker rather than silently dropped.
- **v3** — 27-field attestation: identical evidence to v2 plus **the independence threshold itself** (`requiredSourceGroupCount`). v2 signs `sourceGroupCount` without the number it is compared against, so a third party cannot tell whether the gate passed without reading this codebase. v3 puts both operands inside the signature, which makes the gate checkable from the bytes alone. Same gates, same verdict policy as v2.

Anyone can verify a signature against the published attester address via `POST /api/v1/safety/attestation/verify` (public, no API key). The feature is disabled (non-breaking) when no signer key is configured. v1/v2/v3 coexist; the endpoint routes by the attestation's own `schemaVersion` and publishes all three type layouts from `GET` (`latestSchemaVersion` is 3).

### Access

- **MCP tool** — `pre_trade_safety_check` (one of 33 tools).
- **REST** — `GET /api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=100000`.
- **Web** — interactive demo at `/ai`; the same lending check is embedded live on every position at `/safety-check`.

## Oracle Watch: Always-On Cross-Oracle Monitoring

The always-on companion to Pre-Trade. Pre-trade answers "can I trade this price right now?" for a single moment; Oracle Watch answers "can my strategy keep depending on this feed?" with a consolidated, live cross-oracle trust signal any agent can poll and gate on — no trade required.

> **NORMAL · CAUTION · DANGER** + a `proceed` / `proceed_with_caution` / `halt` recommendation

Agents running long-lived strategies (yield bots, keepers, portfolio managers) should poll the signal on a schedule and **pause when the verdict turns DANGER**. It is the counterpart to the one-off pre-trade checkpoint for the between-trades window.

### How it decides

Oracle Watch condenses the same underlying consensus data into one verdict using **the same severity thresholds as Pre-Trade** (max deviation: caution 1.0% / danger 3.0%; agreement: caution 0.95 / danger 0.85), so both surfaces speak one consistent risk language:

| Signal                      | NORMAL | CAUTION                   | DANGER                                                                  |
| --------------------------- | ------ | ------------------------- | ----------------------------------------------------------------------- |
| Max cross-oracle deviation  | < 1.0% | 1.0% – 3.0%               | ≥ 3.0%                                                                  |
| Cross-provider agreement    | ≥ 0.95 | 0.85 – 0.95               | < 0.85                                                                  |
| Outliers / staleness        | none   | any outlier or stale feed | — (escalated by deviation/agreement)                                    |
| Independent operator groups | ≥ 2    | —                         | < 2 (`insufficient_oracle_independence`)                                |
| No cross-oracle coverage    | —      | —                         | `DANGER` / `halt` (`no_cross_oracle_coverage`) — degrades, never errors |

**Independence is not the same as headcount.** Three responses can come from one
operator — three white-labelled wrappers of Chainlink, or two real sources plus a
TWAP — and still satisfy a quorum of 3 while describing a single point of
failure. The independence gate counts _distinct non-derived operator groups_
(`sourceGroupCount`); TWAP feeds the consensus and the quorum count but never the
independence count. It is the same gate Pre-Trade has enforced since v2.1.

### Reason codes

A single `reason` string can only name the dominant cause, so every response also
carries `reasonCodes` — the full set of conditions that fired. That is what makes
a "pause when DANGER" policy explainable after the fact:

`NO_COVERAGE` · `INSUFFICIENT_QUORUM` · `INSUFFICIENT_INDEPENDENCE` ·
`MAX_DEVIATION` · `LOW_AGREEMENT` · `OUTLIER_PRESENT` · `STALE_DATA` ·
`ML_FORWARD_RISK_HIGH`

v2 receipts sign `reasonCodesHash` alongside them, so the diagnosis travels with
the proof instead of living only in a log.

### Access

- **MCP tools** — `oracle_watch` (live point signal) and `oracle_watch_history`
  (retrospective trend), two of 34. Pair them with `pre_trade_safety_check` for
  the decision moment.
- **REST** — `GET /api/v1/oracle-watch?symbol=ETH&chain=ethereum` and
  `GET /api/v1/oracle-watch/history?symbol=ETH&chain=arbitrum&days=7`.
- **Web** — interactive demo with MCP + REST calling methods at `/ai#oracle-watch`.

### History coverage — what we promise

Oracle Watch is positioned as always-on, but "always-on" cannot mean "every pair
has a retrospective curve". Collection costs one full cross-oracle evaluation per
pair every 30 minutes, so we publish a narrow promise and keep it:

> **History is guaranteed for ETH / BTC / USDC / USDT on Ethereum, Arbitrum and
> Base.** Every other pair still returns a live point signal from `oracle_watch`,
> but no curve.

An out-of-universe pair returns an empty `series` plus
`meta.historyGuaranteed: false` — never a silent empty array, which a dependent
agent would otherwise read as "no incidents".

### Per-issuance audit log

Every judgment actually returned to a caller — receipt or not — is recorded in
`oracle_watch_checks` (uid, symbol, chain, verdict, recommendation, reason codes,
both gate counts with their thresholds, validity window, issuing surface). That
is what lets us answer "which receipt did this agent gate on" after the fact.
The write is fire-and-forget: it can never fail, slow, or change a signal.

### Signed Watch attestations (EIP-712)

Every Watch signal can carry a signed `OracleWatchCheck` receipt — the always-on
counterpart to the pre-trade attestation. It uses the same attester key and the
same evidence-binding primitives, so one verifier handles both surfaces. Pass
`?attest=false` to skip it.

New receipts are **v2 — 26 signed fields**: verdict, recommendation, trust
score/level, consensus price, deviation, agreement, participant count, outlier/
stale counts, ML risk, reputation, `providerObservationsHash`, `requestHash`,
evaluatedAt, validUntil, plus:

- **The quorum threshold** — `requiredParticipantCount` next to the
  `participantCount` it gates.
- **The independence gate** — `sourceGroupCount`, `requiredSourceGroupCount` and
  `independenceSatisfied`. Without them a holder cannot tell whether "quorum
  satisfied" means three independent operators or three wrappers of one.
- **`reasonCodesHash`** — binds the composable reason-code set above.

Every threshold is signed next to the value it judges, so a receipt is
self-contained: a holder can re-derive the verdict without Insight's source code.

- **v1 stays verifiable** — its 22-field layout is frozen rather than rewritten,
  so receipts already in counterparties' hands keep validating. Both layouts are
  published in `.well-known/oracle-keys.json`, which also carries Watch's own
  `verify` / `sample` pointers.
- **Sample** — `GET /api/v1/oracle-watch/attestation/sample?symbol=ETH`.
- **Verify** — `POST /api/v1/oracle-watch/attestation/verify` with `{ "attestation": <receipt> }`.
  Public and unauthenticated; anyone holding a receipt can check it.

Signing is additive: if no attester key is configured the field is `null` and the
signal itself is unchanged.

## Key Features

### For DeFi Users

- **Safety Check** — enter a lending position to get the exact oracle price deviation that would trigger liquidation, health factor gauge, safety buffer analysis, and per-asset bidirectional deviation — now with the pre-trade lending check (buffer-consumption bar + recommended actions) right on the position page.
- **Stablecoin Depeg Tracker** — 15-minute tracking of USDC, USDT, DAI and others across providers and chains, with depeg duration, affected lending protocols, and impact explanation.
- **Wrapped Asset Peg Tracker** — WBTC, wstETH, cbETH and other wrapped / liquid-staking tokens vs their underlying, including on-chain LST exchange rates and protocol impact mapping.
- **Price Query** — query any provider with on-chain data, confidence intervals, and freshness at a glance.

### For Researchers & Analysts

- **Price Insight** — unified cross-oracle / cross-chain analysis with 4 consensus algorithms, risk analysis, divergence signal detection, and feed health tracking.
- **Oracle Reputation System** — persistent 7-day rolling scores (accuracy, uptime, reliability, latency, freshness) with provider profiles and trend charts.
- **Daily Reports** — aggregated oracle market snapshots with consensus prices, provider rankings, depeg / peg summaries, and risk highlights.

### For AI Agents

- **Pre-Trade Oracle Safety Check** — the flagship checkpoint described above.
- **32-tool MCP server** — prices, consensus, risk, reputation, stablecoin pegs, protocol parameters, position safety, pre-trade checks — callable by Claude, Cursor, Windsurf, and any MCP-compatible client.
- **Verifiable attestations** — signed EIP-712 proof agents can relay to users and protocols.

### Shared

- **Data Export** — CSV, JSON, Excel, PDF, PNG.
- **Consensus Price** — median, trimmed mean, weighted median, IQR-filtered.
- **Data Transparency** — source indicators and update-time tracking.
- **Accessibility** — keyboard navigation, colorblind mode, screen reader support.

## Supported Oracles

| Provider    | Type           | Supported Chains                                                                                                                         |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Chainlink   | On-chain       | Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain, Base                                                                        |
| API3        | On-chain dAPIs | Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base, Optimism                                                                        |
| RedStone    | API / On-chain | Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Base, BNB Chain, Fantom, Linea, Mantle, Scroll, zkSync                                 |
| DIA         | API / On-chain | Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base                                                                                  |
| WINkLink    | On-chain       | TRON                                                                                                                                     |
| Supra       | API / On-chain | Ethereum, Arbitrum, Optimism, Polygon, Base, Solana, BNB Chain, Avalanche, zkSync, Scroll, Mantle, Linea, Supra Chain, Aptos, Sui        |
| TWAP        | On-chain (DEX) | Ethereum, Arbitrum, Optimism, Polygon, Base, BNB Chain (Uniswap V3 TWAP)                                                                 |
| Reflector   | On-chain       | Stellar (Soroban)                                                                                                                        |
| Flare       | On-chain       | Flare (FTSO)                                                                                                                             |
| Switchboard | API (Crossbar) | Ethereum, Arbitrum, Optimism, Polygon, Solana, Avalanche, BNB Chain, Base, Scroll, zkSync, Aptos, Sui, Mantle, Linea, Flare, Supra Chain |

## Supported Protocols (Safety Check)

| Protocol       | Chain     | TVL   | Supported Assets                                 |
| -------------- | --------- | ----- | ------------------------------------------------ |
| Aave V3        | Ethereum  | $12B  | ETH, WBTC, tBTC, USDC, USDT, LINK                |
| Compound V3    | Ethereum  | $2.5B | ETH, WBTC, USDC, USDT                            |
| Morpho Blue    | Ethereum  | $8B   | ETH, WBTC, tBTC, wstETH, USDC, USDT, DAI         |
| Aave V3        | Arbitrum  | $3B   | ETH, WBTC, cbBTC, tBTC, USDC, USDT, ARB          |
| Compound V3    | Arbitrum  | $800M | ETH, WBTC, USDC, USDT                            |
| Aave V3        | Optimism  | $1.8B | ETH, WBTC, USDC, USDT, DAI, wstETH, OP           |
| Aave V3        | Polygon   | $1.2B | ETH, WBTC, USDC, USDT, DAI, wstETH, MATIC        |
| Aave V3        | Base      | $2B   | ETH, WBTC, cbBTC, tBTC, USDC, USDT, cbETH        |
| Compound V3    | Base      | $1B   | ETH, WBTC, USDC, USDT                            |
| Morpho Blue    | Base      | $5B   | ETH, WBTC, cbBTC, cbETH, wstETH, USDC, USDT, DAI |
| Venus Protocol | BNB Chain | $1.7B | BNB, BTCB, ETH, USDT, USDC                       |
| BENQI          | Avalanche | $500M | AVAX, WETH, BTC.b, WBTC, USDC, USDt, DAI, LINK   |

The safety check calculates critical deviation percentage, liquidation trigger price, health factor (circular gauge), safety buffer level (safe / moderate / risky / dangerous), per-asset bidirectional deviation analysis, collateral ratio curve, and oracle reliability warnings. Per-asset deviation bounds are derived from each protocol's own liquidation-threshold parameters — the same values power the pre-trade lending freeze.

## Technology Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: React Query 5, Zustand 5
- **Charts**: Recharts 3
- **Database & Auth**: Supabase (PostgreSQL + RLS + pg_cron)
- **Blockchain**: viem 2, @api3/contracts, supra-oracle-sdk, @stellar/stellar-sdk
- **AI Agent Layer**: @modelcontextprotocol/sdk 1.x (stdio + HTTP transports)
- **Billing**: Creem (Merchant of Record) — API-key subscriptions and plan gating
- **Validation**: zod 4
- **Error Tracking**: Sentry
- **Observability**: Vercel Analytics, Vercel Speed Insights

## Getting Started

```bash
npm install
npm run dev
```

Set up environment variables first (see `src/lib/config/env.ts` for the full reference). Required in production: Supabase URL + anon key + service-role key, `CSRF_SECRET`, `JWT_SECRET`. In non-production, missing secrets fall back to safe dev defaults so the app runs without a full env setup. Optional: Sentry DSN, Creem billing keys (degrades to free-only when unset), per-chain `ALCHEMY_<CHAIN>_RPC` endpoints, TRON / WINkLink access, and `ATTESTATION_SIGNER_PRIVATE_KEY` to enable signed pre-trade attestations.

## Project Structure

```
src/
├── app/          # Next.js App Router — pages + API routes (/api/v1, /api/mcp)
├── components/   # React UI components (incl. shared safety/ LendingSafetyPanel)
├── hooks/        # React hooks
├── lib/          # Core logic — analytics, api, attestations, billing, ml, oracles,
│                 #   protocols, risk, stablecoins, supabase, ...
├── mcp/          # MCP server implementation (stdio + http transports, 33 tools)
├── providers/    # React context providers
├── stores/       # Zustand state stores
├── types/        # TypeScript type definitions
└── __mocks__/    # Jest mocks
```

Database migrations and Supabase config live under `supabase/`. The ML training pipeline lives under `ml/` (`ml/train.py`, models output to `ml/models/`). Standalone TypeScript runners for scheduled jobs live under `scripts/`.

## API Access

Insight exposes a versioned REST API (`/api/v1/`) authenticated with `X-API-Key` (created from the Settings page; plaintext shown once, stored as SHA-256 hash). The full interactive reference (OpenAPI 3.1, live "Try It Out", code snippets) is at **`/docs/api`**.

### Data Access Tiers

| Tier | Access level          | Data                                                                                              | Required plan            |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| 0    | Public Metadata       | Health check, symbols, providers, active feeds                                                    | None                     |
| 1    | Reliability Snapshots | Current prices, reputation rankings, daily reports                                                | Any (incl. Free)         |
| 2    | Deep Analysis         | Deviation, correlation, latency, anomaly signals, 15-min snapshots, price history, feed freshness | Pro+ (Free: 5/day trial) |
| 3    | Protocol Intelligence | Oracle exposure, cross-chain spreads, incident timeline, coverage analysis                        | Protocol+                |

Reputation trend history is tiered too: Free 7 days, Pro 30 days, Protocol/Enterprise 90 days.

### Plans

| Plan       | Rate limit | Monthly quota | Price         |
| ---------- | ---------- | ------------- | ------------- |
| Free       | 5 req/min  | 1,000         | $0            |
| Pro        | 30 req/min | 10,000        | $49/mo        |
| Protocol   | 60 req/min | 100,000       | $499/mo       |
| Enterprise | Unlimited  | Unlimited     | Contact sales |

See `src/lib/billing/plans.ts` for the single source of truth.

Key endpoint groups (all under `/api/v1/`): `prices*`, `reputation*`, `feeds*`, `deviation`, `correlation`, `latency`, `anomalies`, `signals`, `safety/*` (position, liquidation, pre-trade, attestation/verify), `oracle-watch`, `stablecoins/depeg`, `wrapped-assets/peg`, `protocols*`, `cross-chain/spreads`, `incidents`, `coverage`, `reports/daily/[date]`, `hourly-snapshots`, `price-snapshots`, `symbols`, `oracles/health`, `metrics`, `health`.

## AI Agent Integration (MCP Server)

Insight exposes its oracle and risk capabilities as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server — **33 tools** covering prices, consensus, risk summaries, liquidation stress tests, stablecoin pegs, reputation, feed health, and protocol parameters, with the flagship `pre_trade_safety_check` and the always-on `oracle_watch` signal on top. The MCP layer is a thin adapter over the same `/api/v1/*` services — no duplicated business logic.

Quick start:

```bash
npm run mcp:stdio   # stdio transport for local agents
npm run mcp:http    # HTTP transport on http://127.0.0.1:3001/mcp
```

When the Next.js app is running, the endpoint is also available at `/api/mcp` with the same authentication, rate limiting, and quota enforcement as the REST API.

**Web hub — visit `/ai`** in the app to run the interactive pre-trade safety demo and the Oracle Watch demo, copy one-click MCP configs for Cursor / Windsurf / Claude Desktop, manage API keys, and test all 33 tools in the browser-based MCP Playground.

## Data Pipeline

Snapshot and reputation collection runs on a fixed cadence: **15-minute price snapshots** (dual-written to hourly + 15-min tables), **hourly reputation recalculation** (in-database `pg_cron`), and **daily report publication**. Supporting jobs — feed discovery, feed reactivation, protocol TVL / risk-params sync (DefiLlama + lending protocols), safety-outcome label backfill, ML retraining (every 3 days), and billing lifecycle — run as scheduled GitHub Actions workflows using the runners in `scripts/` (this escapes Vercel's serverless timeout; the equivalent `/api/cron/*` routes remain as manual-trigger fallbacks). Snapshot retention is 6 months.
