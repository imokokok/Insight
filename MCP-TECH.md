# Insight MCP Server — Technical Guide

This document covers the architecture, transports, authentication, deployment, and development details for the Insight MCP server. For a value-focused introduction and quick start, see [`MCP.md`](./MCP.md).

---

## Architecture

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

## Available tools

| Tool                           | Description                                                 | Source service                        |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------- |
| `get_oracle_price`             | Latest price from a single oracle provider                  | `handleGetPrice`                      |
| `get_consensus_price`          | Aggregated consensus price across providers                 | `getConsensusPrice`                   |
| `get_risk_summary`             | Composite risk metrics (HHI, volatility, correlation, etc.) | `getRiskSummary`                      |
| `get_oracle_health`            | Oracle feed health report for a date                        | `getOracleHealthReport`               |
| `check_liquidation_risk`       | Protocol liquidation stress-test report                     | `reportService`                       |
| `compare_oracle_deviation`     | Historical deviation comparison across providers            | hourly snapshots                      |
| `get_stablecoin_peg`           | Stablecoin de-peg tracking                                  | stablecoin tracker                    |
| `get_protocol_risk_params`     | Lending protocol LTV / liquidation thresholds               | `getProtocolRiskParamsById`           |
| `get_symbols`                  | List supported asset symbols                                | active feed registry                  |
| `recommend_oracle_setup`       | Recommend providers for an asset                            | active feed registry                  |
| `get_stablecoin_list`          | List tracked stablecoins                                    | stablecoin config                     |
| `get_oracle_prices_batch`      | Batch price query for multiple assets/providers             | `fetchPriceWithDatabase`              |
| `get_price_history`            | Historical price data for an asset/provider                 | `handleGetHistoricalPrices`           |
| `get_cross_chain_spreads`      | Cross-chain price spreads for arbitrage/risk tracking       | `getCrossChainSpreads`                |
| `get_wrapped_asset_peg`        | Wrapped asset (WBTC, wstETH, etc.) peg status               | wrapped-asset tracker                 |
| `get_protocols`                | List lending protocols with dynamic data                    | `getAllProtocolsWithDynamicData`      |
| `get_protocol_oracle_exposure` | Oracle provider concentration risk for a protocol           | protocol registry + feeds             |
| `get_feed_freshness`           | Feed freshness/staleness across active feeds                | `oracle_feeds` table                  |
| `get_feeds`                    | List/query oracle feed registry                             | `getOracleFeeds`                      |
| `get_feed_health`              | Detailed health for a specific feed UUID                    | `oracle_feeds` table                  |
| `get_feed_uptime`              | Feed data-delivery reliability over a date range            | `hourly_price_snapshots`              |
| `get_reputation_rankings`      | Provider reputation rankings with trend                     | `reputationService`                   |
| `get_provider_reputation`      | Detailed reputation for a single provider                   | `reputationService`                   |
| `get_daily_report`             | Full daily oracle/risk report                               | `reportService`                       |
| `get_incidents`                | Oracle incidents and deviation events                       | `oracle_feeds` + `reputation_history` |
| `get_latency`                  | Latency statistics (p50/p90/p95/p99)                        | `hourly_price_snapshots`              |
| `get_anomalies`                | Aggregated anomaly events and risk impacts                  | `reportService`                       |
| `get_correlation`              | Pairwise Pearson correlation of provider deviations         | `hourly_price_snapshots`              |
| `get_coverage`                 | Oracle coverage map by provider/chain/symbol                | active feed registry                  |
| `get_metrics`                  | High-level ecosystem metrics                                | active feed registry + reputations    |
| `check_position_safety`        | DeFi position safety against oracle deviations              | `calculatePositionCriticalDeviation`  |

---

## Running locally

### stdio transport (for Cursor / Claude Desktop)

```bash
npm run mcp:stdio
```

This starts the MCP server on standard input/output, which is what local agent clients expect.

### HTTP transport (for remote agents or custom UIs)

```bash
npm run mcp:http
```

Defaults to `http://127.0.0.1:3001/mcp`. Configure via env vars:

- `MCP_HTTP_HOST` — default `127.0.0.1`
- `MCP_HTTP_PORT` — default `3001`

### Next.js route

When the Next.js app is running, the MCP endpoint is also available at:

```
GET|POST|DELETE /api/mcp
```

This uses the Streamable HTTP transport and is stateless.

---

## Configuration examples

### Cursor / Windsurf

Place in `.cursor/mcp.json`:

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

### Claude Desktop

Copy `claude_desktop_config.json.example` to your Claude Desktop config location and update the absolute path:

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

---

## Sharing / deploying for others

There are three common ways to let other people or teams use this MCP server. **Only the stdio transport is unauthenticated by design; both HTTP transports enforce authentication, rate-limiting and quotas.**

### 1. Source-code + local stdio (best for Cursor / Claude Desktop users)

Others clone the repo, install dependencies, create their own `.env.local`, and point their agent client at the stdio entry point.

```bash
git clone https://github.com/imokokok/Insight.git
cd Insight
npm install
# copy .env.local and fill in SUPABASE_SERVICE_ROLE_KEY + RPC endpoints
npm run mcp:stdio
```

Agent config (Cursor / Claude Desktop / Windsurf / etc.):

```json
{
  "mcpServers": {
    "insight-oracle": {
      "command": "npx",
      "args": ["tsx", "src/mcp/index.ts"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

Pros: simple, no network exposure, runs in user's own environment.  
Cons: they need your source code and environment variables (Supabase key, RPC endpoints).

### 2. Self-hosted HTTP transport (best for teams / internal tools)

Run the standalone HTTP server somewhere your users can reach:

```bash
MCP_HTTP_HOST=0.0.0.0 MCP_HTTP_PORT=3001 npm run mcp:http
```

Users configure their agent with the URL and one of the supported credentials:

```json
{
  "mcpServers": {
    "insight-oracle": {
      "url": "https://mcp.yourdomain.com/mcp",
      "headers": {
        "X-API-Key": "ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Supported authentication methods (checked in order):

1. `Authorization: Bearer <supabase-session-jwt>` — website users already logged into the app.
2. `X-API-Key: <ins_...>` — external API consumers. Reuses the existing `api_keys` table, so plan, monthly quota and per-minute rate-limit all apply.
3. `Authorization: Bearer <MCP_BEARER_TOKEN>` — simple shared secret for team/internal deployments that do not want to issue per-user API keys. Set `MCP_BEARER_TOKEN` in the server environment.

In production (`NODE_ENV=production`) authentication is required by default. To disable it locally for testing, set `MCP_AUTH_REQUIRED=false`.

You should still put the standalone HTTP server behind a reverse proxy (Nginx, Caddy, Cloudflare Tunnel) for TLS termination.

### 3. Next.js API route (best if you already deploy the Insight app)

If you deploy the Next.js app to Vercel / your own server, the MCP endpoint is available at:

```
https://yourdomain.com/api/mcp
```

This is the lowest-friction option for existing users, because the endpoint ships with the app. It uses the same authentication layer as the standalone HTTP server:

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

### Rate limits, quotas and plan guards

MCP HTTP requests reuse the same protections as the REST API:

- **Rate limit** — per-identity, per minute. API keys use their plan's own `rate_limit`; sessions and shared bearer tokens use the `moderate` preset (60 req/min).
- **Monthly quota** — only applies to `X-API-Key` users and uses the existing `api_keys.monthly_quota_used` counter.
- **Plan guard** — Each MCP tool is mapped to a minimum plan that mirrors its REST API counterpart's tier (see [`src/mcp/tiers.ts`](./src/mcp/tiers.ts)), so the same data is gated identically via MCP and REST. Session (signed-in website) and shared-bearer callers bypass the gate; only `X-API-Key` callers are subject to it.
  - **Tier 3 (Protocol+)** — `get_protocol_oracle_exposure`, `get_cross_chain_spreads`, `get_incidents`, `get_coverage`. Hard gate; Pro trials do not apply.
  - **Tier 2 (Pro+)** — `get_consensus_price`, `get_oracle_health`, `check_liquidation_risk`, `get_stablecoin_peg`, `get_wrapped_asset_peg`, `get_protocol_risk_params`, `get_feed_freshness`, `get_feed_health`, `get_feed_uptime`, `get_latency`, `get_anomalies`, `get_risk_summary`, `get_correlation`, `compare_oracle_deviation`, `get_oracle_prices_batch`, `get_price_history`, `check_position_safety`. Free keys with an active Pro trial also pass.
  - **Tier 1 (Free)** — all remaining tools (current prices, listings, rankings, reports, metrics).

Response headers include `X-RateLimit-*` and `X-Quota-*` so callers can track usage.

### What recipients need

Whichever transport you choose, the MCP server needs the same environment variables as the main app:

- `SUPABASE_SERVICE_ROLE_KEY` — required for DB queries
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- RPC endpoint env vars (e.g. `ALCHEMY_API_KEY`, `ANKR_API_KEY`, public RPC URLs, etc.) — required for on-chain price feeds
- `MCP_BEARER_TOKEN` (optional) — shared secret for HTTP transports
- `MCP_AUTH_REQUIRED` (optional) — `true`/`false`; defaults to `true` in production, `false` in development
- Optional: cron / billing keys are not needed by the MCP layer

Do **not** share your `.env.local` publicly. If you want to let strangers use the MCP, host the HTTP or Next.js route and gate it with API keys/rate limits rather than handing out the stdio server and its secrets.

### Packaging ideas for broader distribution

- **npm package**: wrap `src/mcp/` as a published CLI so users can run `npx @yourscope/insight-mcp` without cloning.
- **Docker image**: build an image that runs `npm run mcp:http`, so users only need `docker run`.
- **One-click deploy**: add a "Deploy to Vercel" button in the README so the Next.js route is live immediately.

---

## Development

### Type check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint -- src/mcp src/app/api/mcp
```

### Test

```bash
npm test -- src/mcp
```

### End-to-end validation

A real MCP client integration test is included in `src/mcp/__tests__/e2e.test.ts`. It connects to the stdio server and calls actual tools (oracle price, consensus price, risk summary, stablecoin peg, symbols, etc.).

Run it with env vars loaded:

```bash
npm run test:mcp:e2e
```

This requires `.env.local` to be present with valid `SUPABASE_SERVICE_ROLE_KEY` and RPC endpoints. The test exercises the same code path a Cursor / Claude Desktop client would use.

---

## Validation status

All transports have been verified end-to-end:

- ✅ `tools/list` returns all 32 tools with valid JSON Schema input schemas
- ✅ `get_oracle_price` returns live BTC price from Chainlink
- ✅ `get_consensus_price` returns aggregated BTC consensus price
- ✅ `get_risk_summary` returns composite risk metrics for BTC
- ✅ `get_stablecoin_peg` returns USDC peg status
- ✅ `get_symbols` / `recommend_oracle_setup` / `get_stablecoin_list` work
- ✅ `get_oracle_prices_batch` / `get_price_history` / `get_cross_chain_spreads` work
- ✅ `get_wrapped_asset_peg` / `get_protocols` / `get_protocol_oracle_exposure` work
- ✅ `get_feed_freshness` / `get_feeds` / `get_feed_health` / `get_feed_uptime` work
- ✅ `get_reputation_rankings` / `get_provider_reputation` work
- ✅ `get_daily_report` / `get_incidents` work
- ✅ `get_latency` / `get_anomalies` / `get_correlation` / `get_coverage` / `get_metrics` work
- ✅ `check_position_safety` validates DeFi positions against oracle stress tests
- ✅ HTTP transport responds correctly to `initialize`, `tools/list`, and `tools/call`

---

## Notes

- The stdio server redirects `console.log` / `console.info` / `console.warn` to `stderr` so that MCP messages on `stdout` are not corrupted by application logs.
- Authentication/authorization for the MCP endpoint is intentionally wired through the same layer as the REST API. The HTTP transport and Next.js route should be protected before exposing to untrusted clients.
