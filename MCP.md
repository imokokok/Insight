# Insight MCP Server

> **AI-native oracle & risk data for Claude, Cursor, Windsurf, and any MCP client.**

Insight MCP exposes the platform's oracle transparency and risk infrastructure as a [Model Context Protocol](https://modelcontextprotocol.io) server. Instead of switching between dashboards, REST clients, and SQL queries, your AI agent can call 32 tools to fetch prices, run risk analysis, track stablecoin pegs, stress-test DeFi positions, run pre-trade oracle safety checks, and more — directly in natural language.

The MCP layer is a thin adapter over the existing `/api/v1/*` services: no business logic is duplicated, so every tool returns the same data as the web app and the REST API.

---

## What can you ask it?

The 32 tools are organized around real workflows. Below are example prompts you can use right after connecting.

### Latest prices & consensus

| Tool                      | Example prompt                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| `get_oracle_price`        | "What's the latest Chainlink price for ETH on Ethereum?"                       |
| `get_consensus_price`     | "Give me the manipulation-resistant consensus price for BTC."                  |
| `get_oracle_prices_batch` | "Fetch current prices for ETH, BTC, and SOL from Chainlink and Pyth."          |
| `get_price_history`       | "Show me Chainlink's ETH price history for the last 24 hours."                 |
| `get_cross_chain_spreads` | "Are there any cross-chain ETH price spreads for Pyth that suggest arbitrage?" |

### Oracle health & reliability

| Tool                 | Example prompt                                                            |
| -------------------- | ------------------------------------------------------------------------- |
| `get_feeds`          | "List all active ETH feeds and their providers."                          |
| `get_feed_health`    | "Is feed `uuid-...` healthy? How many consecutive failures does it have?" |
| `get_feed_freshness` | "Which feeds are currently stale or outdated?"                            |
| `get_oracle_health`  | "Give me today's overall oracle health report."                           |
| `get_latency`        | "Compare oracle latency percentiles for ETH over the last 7 days."        |

### Risk analysis & market structure

| Tool                       | Example prompt                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `get_risk_summary`         | "What's the composite risk summary for ETH, including HHI concentration and volatility?" |
| `compare_oracle_deviation` | "Which oracle provider diverges most from consensus for BTC over the past week?"         |
| `get_correlation`          | "Are Chainlink and Redstone deviations correlated for ETH?"                              |
| `get_coverage`             | "Which assets rely on a single oracle provider?"                                         |
| `get_metrics`              | "Give me a high-level overview of the oracle ecosystem."                                 |
| `get_anomalies`            | "What were the top oracle anomaly events in the last 7 days?"                            |

### DeFi protocol & position safety

| Tool                           | Example prompt                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `check_position_safety`        | "Is my Aave V3 ETH/USDC position safe against oracle deviations?"                 |
| `get_protocol_risk_params`     | "What are Aave V3 Ethereum's LTV and liquidation thresholds?"                     |
| `get_protocols`                | "List lending protocols supported by Insight."                                    |
| `get_protocol_oracle_exposure` | "How concentrated is Aave V3 Base's oracle provider exposure?"                    |
| `check_liquidation_risk`       | "Show today's protocol liquidation stress-test results."                          |
| `pre_trade_safety_check`       | "I'm about to swap $100k of ETH on Ethereum — is the oracle data safe right now?" |

### Stablecoin & wrapped asset tracking

| Tool                    | Example prompt                                 |
| ----------------------- | ---------------------------------------------- |
| `get_stablecoin_peg`    | "Is USDC de-pegging right now?"                |
| `get_stablecoin_list`   | "Which stablecoins does Insight track?"        |
| `get_wrapped_asset_peg` | "How is wstETH pegging to its underlying ETH?" |

### Reputation & incidents

| Tool                      | Example prompt                                            |
| ------------------------- | --------------------------------------------------------- |
| `get_reputation_rankings` | "Rank oracle providers by 7-day reputation score."        |
| `get_provider_reputation` | "How reliable is Redstone, and what's its recent trend?"  |
| `get_incidents`           | "Show me critical oracle incidents from the last 3 days." |
| `get_daily_report`        | "Give me yesterday's full daily oracle/risk report."      |

### Discovery helpers

| Tool                     | Example prompt                                             |
| ------------------------ | ---------------------------------------------------------- |
| `get_symbols`            | "Is AAVE a supported symbol?"                              |
| `recommend_oracle_setup` | "Which providers should I include for robust BTC pricing?" |

---

## Why Insight MCP?

- **Comprehensive data** — 11 oracle providers, 40+ chains, hourly snapshots, consensus algorithms, cross-chain spreads, and 7-day rolling reputation scores.
- **Agent-native** — No JSON wrangling or SQL. Ask in plain English and let the agent choose the right tools.
- **Production-ready** — Reuses the same authentication, rate limiting, monthly quotas, and plan gating as the REST API.

---

## Who is it for?

- **DeFi risk managers** tracking oracle concentration, feed freshness, and liquidation boundaries.
- **Quant researchers & traders** comparing provider deviations, correlations, latency, and cross-chain spreads.
- **Smart-contract auditors & protocol developers** validating oracle dependencies and recommending robust feed setups.

---

## Quick start

### 1. Get an API key

Log in to the Insight app and create an API key from **Settings → API Keys**. The key is shown only once and is stored as a SHA-256 hash.

### 2. Add the MCP server to your client

#### Cursor / Windsurf

Create or edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "insight-oracle": {
      "url": "https://yourdomain.com/api/mcp",
      "headers": {
        "X-API-Key": "ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

#### Claude Desktop

Use the stdio transport and replace `/absolute/path/to/Insight` with your local repo path:

```json
{
  "mcpServers": {
    "insight-oracle": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/Insight/src/mcp/index.ts"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

> For local stdio, the machine needs your `.env.local` (Supabase service role key + RPC endpoints). For remote clients, use the HTTP/Next.js route with an API key instead.

### 3. Start asking

Try one of the prompts from the tables above, for example:

> "Give me the consensus price for BTC and compare it with Chainlink's latest price."

---

## Web hub

Visit **`/ai`** in the Insight app to:

- Generate one-click MCP configurations for Cursor, Windsurf, and Claude Desktop.
- Create and manage API keys.
- Test every tool in the browser-based MCP Playground without installing a client.

---

## Data coverage

- **Oracle providers**: Chainlink, Pyth, API3, RedStone, DIA, WINkLink, Supra, TWAP, Reflector, Flare, Switchboard.
- **Chains**: 40+ networks including Ethereum, Arbitrum, Optimism, Base, Polygon, BNB Chain, Avalanche, Solana, Aptos, Sui, TRON, Stellar, Flare, zkSync, Scroll, Mantle, Linea.
- **Update cadence**: Price snapshots, reputation recalculation, and feed health are polled hourly. Polling faster than hourly yields no fresher data.

See [`README.md`](./README.md) for the full provider/chain matrix.

---

## How it works

```
AI Agent (Claude / Cursor / Windsurf / etc.)
    ↓ MCP protocol
MCP Server  ←  src/mcp/
    ↓ imports internal services
Existing v1 services  ←  src/lib/api/services, src/lib/oracles/services
    ↓
Data layer (Supabase, RPC, caches)
```

- **Business logic lives in one place**: the same services used by `/api/v1/*` are reused.
- **MCP layer is thin**: only protocol handling, parameter validation, and result formatting.
- **Multiple transports**: stdio for local agents, HTTP (Streamable HTTP) for remote/self-hosted deployments, and a Next.js API route for existing deployments.

---

## Deployment options

| Option                 | Best for                               | Auth                                  | How to run                                 |
| ---------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------------ |
| **Local stdio**        | Personal Cursor / Claude Desktop users | None (runs in your environment)       | `npm run mcp:stdio`                        |
| **Self-hosted HTTP**   | Teams / internal tools                 | Session JWT, API Key, or Bearer token | `npm run mcp:http`                         |
| **Next.js `/api/mcp`** | Existing Insight app users             | Session JWT or API Key                | Ships with `npm run dev` / `npm run build` |

For detailed transport setup, authentication mechanics, environment variables, and packaging options, see [`MCP-TECH.md`](./MCP-TECH.md).

---

## Pricing & limits

MCP requests use the same plan tiers and quotas as the REST API. See [`README.md`](./README.md#api-access) for the full plan table.

| Plan       | Rate limit | Monthly quota | Notes                                 |
| ---------- | ---------- | ------------- | ------------------------------------- |
| Free       | 5 req/min  | 1,000         | Tier 1 tools only; Tier 2/3 gated     |
| Pro        | 30 req/min | 10,000        | Tier 1 + Tier 2 (deep analysis)       |
| Protocol   | 60 req/min | 100,000       | All tools incl. Tier 3 protocol intel |
| Enterprise | Unlimited  | Unlimited     | Contact sales                         |

MCP tool access mirrors the REST API's plan tiers — the same data is gated identically whether you call the REST endpoint or the MCP tool. Session (signed-in website) and shared-bearer callers bypass the gate; only `X-API-Key` callers are subject to it. The full tier map lives in [`src/mcp/tiers.ts`](./src/mcp/tiers.ts).

- **Tier 3 — Protocol+** (protocol-level intelligence, hard gate): `get_protocol_oracle_exposure`, `get_cross_chain_spreads`, `get_incidents`, `get_coverage`
- **Tier 2 — Pro+** (deep analysis; Free keys with an active Pro trial also pass): `get_consensus_price`, `get_oracle_health`, `check_liquidation_risk`, `get_stablecoin_peg`, `get_wrapped_asset_peg`, `get_protocol_risk_params`, `get_feed_freshness`, `get_feed_health`, `get_feed_uptime`, `get_latency`, `get_anomalies`, `get_risk_summary`, `get_correlation`, `compare_oracle_deviation`, `get_oracle_prices_batch`, `get_price_history`, `check_position_safety`, `pre_trade_safety_check`
- **Tier 1 — Free**: all remaining tools (current prices, listings, rankings, reports, metrics)

Response headers include `X-RateLimit-*` and `X-Quota-*` so clients can track usage.

---

## Tool reference

For the full list of 32 tools with descriptions and source services, see the "What can you ask it?" sections above. Source-code definitions live in [`src/mcp/tools/`](./src/mcp/tools/).

---

## Validation status

All transports have been verified end-to-end:

- ✅ `tools/list` returns all 32 tools with valid JSON Schema input schemas.
- ✅ `get_oracle_price` returns live BTC price from Chainlink.
- ✅ `get_consensus_price` returns aggregated BTC consensus price.
- ✅ `get_risk_summary` returns composite risk metrics for BTC.
- ✅ `get_stablecoin_peg` returns USDC peg status.
- ✅ `get_symbols`, `recommend_oracle_setup`, `get_stablecoin_list` work.
- ✅ `get_oracle_prices_batch`, `get_price_history`, `get_cross_chain_spreads` work.
- ✅ `get_wrapped_asset_peg`, `get_protocols`, `get_protocol_oracle_exposure` work.
- ✅ `get_feed_freshness`, `get_feeds`, `get_feed_health`, `get_feed_uptime` work.
- ✅ `get_reputation_rankings`, `get_provider_reputation` work.
- ✅ `get_daily_report`, `get_incidents` work.
- ✅ `get_latency`, `get_anomalies`, `get_correlation`, `get_coverage`, `get_metrics` work.
- ✅ `check_position_safety` validates DeFi positions against oracle stress tests.
- ✅ `pre_trade_safety_check` aggregates cross-oracle consensus, freshness, and depeg signals into a PASS/CAUTION/DANGER/BLOCK verdict before executing a trade.
- ✅ HTTP transport responds correctly to `initialize`, `tools/list`, and `tools/call`.

Run the included e2e test:

```bash
npm run test:mcp:e2e
```

This requires `.env.local` with valid `SUPABASE_SERVICE_ROLE_KEY` and RPC endpoints.

---

## Next steps

- **Try the web hub**: open `/ai` in the app.
- **Read the technical guide**: [`MCP-TECH.md`](./MCP-TECH.md) for architecture, transports, auth, and self-hosting.
- **Read the REST API docs**: [`/docs/api`](https://yourdomain.com/docs/api) for the underlying endpoints and data model.
