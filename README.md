# Insight - Oracle Transparency & Risk Infrastructure

Insight is an oracle transparency and risk infrastructure platform that serves both professional researchers and everyday DeFi users. It provides hourly price tracking, cross-oracle comparison, risk analysis, and position safety checks across 11 oracle providers and 40+ blockchain networks.

**See through every oracle. Trust with clarity.**

> Insight is **not** a real-time oracle tracker. Data is polled on an hourly cadence (price snapshots, reputation recalculation, feed health) and aggregated into daily reports. Polling faster than hourly yields no fresher data, so the API quotas are sized to that cadence.

## Table of Contents

- [Key Features](#key-features)
- [Supported Oracles](#supported-oracles)
- [Supported Protocols (Safety Check)](#supported-protocols-safety-check)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Access](#api-access)
- [API Endpoints](#api-endpoints)
- [Navigation](#navigation)
- [AI Agent Integration (MCP Server)](#ai-agent-integration-mcp-server)

## Key Features

### For DeFi Users

- **Safety Check (Position Critical Deviation)** - Enter your DeFi lending position to calculate the exact oracle price deviation that would trigger liquidation. Supports multi-asset positions across Aave V3, Compound V3, Morpho Blue, Venus, and BENQI. Provides health factor gauge, safety buffer analysis, and oracle reliability warnings.
- **Stablecoin Depeg Tracker** - Hourly tracking of USDC, USDT, DAI, and other stablecoins across oracle providers and chains. Detects depegs, tracks duration, maps affected lending protocols, and explains how collateral and borrow positions are impacted.
- **Wrapped Asset Peg Tracker** - Tracks WBTC, wstETH, cbETH, and other wrapped or liquid-staking tokens for deviations against their underlying assets. Includes on-chain LST exchange rates, cross-source deviation analysis, and protocol impact mapping.
- **Price Query** - Query current prices from any oracle provider with a simple interface. View on-chain data, confidence intervals, and price freshness at a glance.

### For Researchers & Analysts

- **Price Insight** - Unified cross-oracle and cross-chain price analysis with dimension switching. Compare prices across providers and blockchains with 4 consensus algorithms, risk analysis, divergence signal detection, and feed health tracking.
- **Oracle Reputation System** - Persistent 7-day rolling reputation scores with accuracy, uptime, reliability, latency, and freshness metrics. Detailed provider profiles with trend charts and score breakdowns.
- **Daily Reports** - Daily aggregated oracle market snapshots with consensus prices, provider rankings, stablecoin depeg summaries, wrapped asset peg summaries, and risk highlights.

### For AI Agents

- **Pre-Trade Oracle Safety Check** - The "AI agent immune system." Before an AI agent executes any on-chain swap/borrow/lend/liquidation/repay, it calls this checkpoint to verify oracle integrity. Aggregates cross-oracle consensus, per-provider deviation, data freshness, stablecoin peg status, and reputation into a single **PASS / CAUTION / DANGER / BLOCK** verdict with a recommended maximum position size. Agents must not execute trades when the verdict is DANGER or BLOCK. Available as an MCP tool (`pre_trade_safety_check`) and a REST endpoint (`GET /api/v1/safety/pre-trade`); every call is audit-logged to build a data flywheel for a future ML risk model.
- **Verifiable Safety Attestation** - When the optional `ATTESTATION_SIGNER_PRIVATE_KEY` is configured, every pre-trade check is signed as an EIP-712 **offchain attestation** — a portable, gasless, tamper-evident proof that "Insight verified oracle state for this trade at time T". Agents relay the attestation in tx memo / calldata / logs so users and protocols can recognize that the agent ran the oracle immune-system check. Anyone can verify a signature against the published attester address via `POST /api/v1/safety/attestation/verify` (public, no API key). The attester identity + EIP-712 schema are published at `GET /api/v1/safety/attestation/verify`. Unset key = feature disabled (non-breaking).
- **MCP Server** - 32 tools exposing the full platform (prices, consensus, risk, reputation, stablecoin pegs, protocol parameters, position safety) to Claude, Cursor, Windsurf, and any MCP-compatible client. The MCP layer is a thin adapter over the same `/api/v1/*` services — no duplicated business logic.

### Shared Features

- **Data Export** - Export data in CSV, JSON, Excel, PDF, and PNG formats.
- **Consensus Price** - Multiple consensus algorithms (median, trimmed mean, weighted median, IQR-filtered).
- **Data Transparency** - Data source indicators and update time tracking.
- **Accessibility Support** - Keyboard navigation, colorblind mode, screen reader support.

## Supported Oracles

| Provider    | Type           | Supported Chains                                                                                                                         |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Chainlink   | On-chain       | Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain, Base                                                                        |
| Pyth        | API / On-chain | Ethereum, Arbitrum, Optimism, Polygon, Solana, Avalanche, BNB Chain, Aptos, Sui, Base                                                    |
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

Safety Check calculates: critical deviation percentage, liquidation trigger price, health factor (with circular gauge), safety buffer level (safe/moderate/risky/dangerous), per-asset bidirectional deviation analysis, collateral ratio curve chart, and oracle reliability warnings. Per-asset deviation bounds are derived from each protocol's own liquidation-threshold parameters.

## Technology Stack

- **Framework**: Next.js 16.2.4 (App Router) + React 19.2.3 + TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Query 5.99.0, Zustand 5.0.11
- **Charts**: Recharts 3.8.0
- **Database & Auth**: Supabase 2.98.0 (PostgreSQL + RLS + pg_cron)
- **Blockchain**: viem 2.47.6, @pythnetwork/hermes-client 2.0.0, @api3/contracts 27.0.0, supra-oracle-sdk 1.0.4, @stellar/stellar-sdk 15.0.1
- **Billing**: Creem 1.5.4 (Merchant of Record) - API-key subscriptions and plan gating
- **Error Tracking**: Sentry 10.43.0
- **Observability**: Vercel Analytics, Vercel Speed Insights, web-vitals 5.1.0

## Getting Started

```bash
npm install
```

Set up environment variables (see `src/lib/config/env.ts` for reference), then:

```bash
npm run dev
```

### Key Environment Variables

**Required (production):**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)
- `CSRF_SECRET` - CSRF protection secret
- `JWT_SECRET` - JWT signing secret

**Optional:**

- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN (enables error tracking)
- `NEXT_PUBLIC_APP_URL` - Public app URL (defaults to `http://localhost:3000`)
- `NEXT_PUBLIC_ENABLE_ANALYTICS` / `NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING` - feature flags
- `USE_REAL_CHAINLINK_DATA` / `USE_REAL_API3_DATA` / `USE_REAL_TWAP_DATA` / `USE_REAL_REFLECTOR_DATA` / `USE_REAL_FLARE_DATA` - toggle real on-chain data (default `true`)
- `CREEM_API_KEY`, `CREEM_PRODUCT_PRO_MONTHLY`, `CREEM_PRODUCT_PRO_YEARLY`, `CREEM_PRODUCT_PROTOCOL_MONTHLY`, `CREEM_PRODUCT_PROTOCOL_YEARLY`, `CREEM_WEBHOOK_SECRET_TEST` / `CREEM_WEBHOOK_SECRET_LIVE` - Creem billing (gracefully degrades to free-only when unset)
- `ALCHEMY_<CHAIN>_RPC` - Alchemy RPC endpoints per chain (Ethereum, Arbitrum, Polygon, Base, Optimism, Solana, BNB, Avalanche, zkSync, Scroll, Mantle, Linea)
- `TRON_RPC_URL`, `TRONGRID_API_KEY` - TRON / WINkLink access
- `ALLOWED_ORIGINS`, `SESSION_TIMEOUT`, `MAX_REQUEST_SIZE` - security tuning

In non-production, missing secrets fall back to safe dev defaults so the app runs without a full env setup.

## Project Structure

```
src/
├── app/          # Next.js App Router — pages + API routes (/api/v1, /api/mcp, internal /api/*)
├── components/   # React UI components (home, risk, settings, navigation, ui, ...)
├── hooks/        # React hooks (e.g. useAutoRefresh)
├── lib/          # Core logic — analytics, api, billing, config, oracles, protocols, risk, supabase, ...
├── mcp/          # MCP server implementation (stdio + http transports)
├── providers/    # React context providers
├── stores/       # Zustand state stores
├── types/        # TypeScript type definitions
└── __mocks__/    # Jest mocks
```

Database migrations and Supabase config live under `supabase/` (split into 7 migration files by object type; new migrations start at `0008`). GitHub Actions cron workflows live under `.github/workflows/`.

## API Access

Insight exposes a versioned REST API (`/api/v1/`) for programmatic access, authenticated with `X-API-Key`. API keys are created from the Settings page; the plaintext key is shown only once at creation and stored as a SHA-256 hash. Request handling order is authentication first, then per-key rate limiting.

### Data Access Tiers

Endpoints are grouped into 4 access tiers. Free users get a limited daily trial quota on Tier 2; Tier 3 is hard-gated.

| Tier | Access level          | Data                                                                                              | Required plan            |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| 0    | Public Metadata       | Health check, symbols, providers, active feeds                                                    | None                     |
| 1    | Reliability Snapshots | Current prices, reputation rankings, daily reports                                                | Any (incl. Free)         |
| 2    | Deep Analysis         | Deviation, correlation, latency, anomaly signals, hourly snapshots, price history, feed freshness | Pro+ (Free: 5/day trial) |
| 3    | Protocol Intelligence | Oracle exposure, cross-chain spreads, incident timeline, coverage analysis                        | Protocol+                |

Reputation trend history is also tiered: Free 7 days, Pro 30 days, Protocol/Enterprise 90 days.

### Plans

| Plan       | Rate limit | Monthly quota | Price         |
| ---------- | ---------- | ------------- | ------------- |
| Free       | 5 req/min  | 1,000         | $0            |
| Pro        | 30 req/min | 10,000        | $49/mo        |
| Protocol   | 60 req/min | 100,000       | $499/mo       |
| Enterprise | Unlimited  | Unlimited     | Contact sales |

See `src/lib/billing/plans.ts` for the single source of truth. Quotas align with the hourly data cadence noted above.

## API Endpoints

### Public REST API (`/api/v1/`)

API-key authenticated (`X-API-Key`), versioned. Categories include:

- **Prices** - `/api/v1/prices`, `/api/v1/prices/consensus`, `/api/v1/prices/batch`, `/api/v1/prices/history`
- **Reputation** - `/api/v1/reputation`, `/api/v1/reputation/rankings`, `/api/v1/reputation/[provider]`
- **Feeds** - `/api/v1/feeds`, `/api/v1/feeds/freshness`, `/api/v1/feeds/heartbeat-stats`, `/api/v1/feeds/[feedId]/health`
- **Analysis** - `/api/v1/deviation`, `/api/v1/correlation`, `/api/v1/latency`, `/api/v1/anomalies`, `/api/v1/signals`, `/api/v1/risk/summary`
- **Safety** - `/api/v1/safety/position`, `/api/v1/safety/liquidation`, `/api/v1/safety/pre-trade`, `/api/v1/safety/attestation/verify` (public, no API key)
- **Risk assets** - `/api/v1/stablecoins/depeg`, `/api/v1/wrapped-assets/peg`
- **Protocols** - `/api/v1/protocols`, `/api/v1/protocols/risk-params`, `/api/v1/protocols/[id]/risk-params`, `/api/v1/protocols/[id]/oracle-exposure`, `/api/v1/cross-chain/spreads`, `/api/v1/incidents`, `/api/v1/coverage`
- **Reports & metadata** - `/api/v1/reports/daily/[date]`, `/api/v1/hourly-snapshots`, `/api/v1/symbols`, `/api/v1/oracles/health`, `/api/v1/metrics`, `/api/v1/health`, `/api/v1/price-records/export`

The full interactive reference (OpenAPI 3.1, live "Try It Out", code snippets) is at **`/docs/api`**.

### Internal API (Session Authentication)

Used by the web UI; authenticated via Supabase session or an HttpOnly internal token cookie.

- `GET/PUT /api/auth/profile`, `POST /api/auth/delete-account`, `GET /api/auth/callback`
- `GET /api/oracles/[provider]`, `POST /api/oracles/batch`
- `GET/POST /api/reputation`, `GET /api/reputation/[provider]`
- `POST /api/protocol-health`, `GET /api/protocol-health/plan`, `POST /api/protocol-health/import`
- `GET /api/reports`, `GET /api/reports/[date]`
- `GET /api/symbols`, `GET /api/protocols`, `GET /api/stablecoin-depeg`, `GET /api/wrapped-assets`
- `GET/POST /api/price-records/export`
- `GET/POST /api/user/api-keys`, `GET/DELETE /api/user/api-keys/[id]`, `GET /api/user/api-keys/[id]/usage`
- `POST /api/billing/checkout`, `POST /api/billing/portal`, `GET/POST /api/billing/subscription`, `POST /api/billing/trial`, `POST /api/billing/webhook`

### Cron Jobs

Protected by a cron secret; run on a schedule via pg_cron / Next.js API routes.

- `/api/cron/sync-feeds` - refresh active oracle feed metadata
- `/api/cron/reputation` - sample prices and recalculate rolling scores
- `/api/cron/protocol-metrics` - update protocol health metrics
- `/api/cron/daily-report` and `/api/cron/daily-report/publish` - generate and publish the daily report
- `/api/cron/billing` - subscription lifecycle (deactivation, rate-limit cleanup, usage cleanup)

## Navigation

| Page                      | Path                        | Description                                                                                   | Auth Required |
| ------------------------- | --------------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| Home                      | `/`                         | Dashboard with consensus prices, oracle health status, and quick actions                      | No            |
| Price Query               | `/price-query`              | Single oracle price query with on-chain data and confidence intervals                         | No            |
| Safety Check              | `/safety-check`             | Position critical deviation calculator with liquidation risk analysis                         | No            |
| Stablecoin Depeg Tracker  | `/stablecoin-depeg`         | Stablecoin depeg tracking with protocol impact analysis                                       | No            |
| Wrapped Asset Peg Tracker | `/wrapped-assets`           | Wrapped and LST peg risk tracking against underlying assets                                   | No            |
| Price Insight             | `/price-insight`            | Unified cross-oracle and cross-chain price analysis                                           | No            |
| Oracle Directory          | `/reputation`               | Oracle provider profiles and 7-day rolling reputation scores                                  | No            |
| Provider Detail           | `/reputation/[provider]`    | Detailed provider profile with trend charts and score breakdowns                              | No            |
| Daily Reports             | `/reports`                  | Daily oracle performance summaries with price deviations, rankings, and risk highlights       | No            |
| Report Detail             | `/reports/[date]`           | Detailed daily report with metrics, deviations, and risk analysis                             | No            |
| API & Pricing             | `/api`                      | API product page, data access tiers, plans, and pricing                                       | No            |
| Pricing (alias)           | `/pricing`                  | Redirects to `/api#pricing`                                                                   | No            |
| AI Agents                 | `/ai`                       | AI agent hub: pre-trade oracle safety check, MCP config generator, and tool playground        | No            |
| Documentation             | `/docs`                     | Quick start, feature guides, methodology, architecture, data sources, and developer resources | No            |
| API Reference             | `/docs/api`                 | Interactive REST API reference (OpenAPI 3.1) with code examples                               | No            |
| API Reference (alt)       | `/docs/api-reference`       | Alternate API reference entry                                                                 | No            |
| Settings                  | `/settings`                 | Profile, preferences, API keys, and billing management                                        | Yes           |
| Login                     | `/login`                    | User login page                                                                               | No            |
| Register                  | `/register`                 | User registration page                                                                        | No            |
| Forgot Password           | `/auth/forgot-password`     | Password reset request page                                                                   | No            |
| Reset Password            | `/auth/reset-password`      | Password reset confirmation page                                                              | No            |
| Verify Email              | `/auth/verify-email`        | Email verification page                                                                       | No            |
| Resend Verification       | `/auth/resend-verification` | Resend email verification link                                                                | No            |
| Contact                   | `/contact`                  | Contact page                                                                                  | No            |
| Privacy Policy            | `/privacy`                  | Privacy policy page                                                                           | No            |
| Terms of Service          | `/terms`                    | Terms of service page                                                                         | No            |

## AI Agent Integration (MCP Server)

Insight exposes its oracle and risk capabilities as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server so AI agents like Claude, Cursor, and Windsurf can query prices, consensus, risk summaries, liquidation risk, stablecoin pegs, and protocol parameters directly in natural language — no raw REST calls or SQL required. The flagship capability is the **pre-trade oracle safety check** (`pre_trade_safety_check`), an "immune system" agents call before executing any on-chain trade to verify oracle data is not being manipulated.

The MCP layer reuses the same internal services as `/api/v1/*` — no duplicated business logic.

- **[`MCP.md`](./MCP.md)** — value proposition, quick start, use cases, pricing, and deployment overview.
- **[`MCP-TECH.md`](./MCP-TECH.md)** — detailed architecture, transports, authentication, environment variables, and development.

**Web hub:** Visit **`/ai`** in the app to:

- Run the interactive pre-trade safety check demo.
- Copy one-click MCP configurations for Cursor, Windsurf, and Claude Desktop.
- Manage API keys for MCP access.
- Test all 32 tools in the browser-based MCP Playground.

Quick start:

```bash
npm run mcp:stdio   # stdio transport for local agents
npm run mcp:http    # HTTP transport on http://127.0.0.1:3001/mcp
```

When the Next.js app is running, the MCP endpoint is also available at `/api/mcp` with the same authentication, rate limiting, and quota enforcement as the REST API. The pre-trade safety check is also available as a plain REST endpoint: `GET /api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=100000`.
