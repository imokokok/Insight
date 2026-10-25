# Insight — Oracle Transparency & Risk Intelligence

Insight is oracle transparency and risk infrastructure for DeFi and AI agents, built on **BNB Smart Chain (BSC)** and compatible with other EVM networks.

Insight helps DeFi applications, operators, developers, and AI agents inspect oracle prices and the risks of relying on them. It compares data from **13 oracle providers across 40+ blockchain networks**, evaluates deviation, freshness, source independence, and protocol impact, and can issue signed evidence of its assessments. For AI agents specifically, this is **decision-input integrity**: a signed, re-verifiable answer to "can this price be trusted" before a trade is signed.

```text
Oracle observations → Cross-source comparison → Risk assessment → Verifiable evidence
```

**Pre-Trade Safety Check** assesses a proposed action. **Oracle Watch** monitors changing conditions between actions. The REST API, MCP server, [Guard SDK](sdk/README.md), and [independent verifier](verifier/README.md) make these capabilities available to applications and agents. Insight also works independently of [PriorSeal](https://github.com/imokokok/PriorSeal); see the [product positioning guide](docs/product-positioning.md) for the combined assessment, authorization, execution, and review workflow.

**Lending Guard** now covers focused direct-call profiles on Base and Monad. It checks collateral and loan oracle integrity plus caller-declared post-action LTV for Aave V3 and Morpho Blue on both chains, plus Compound V3 Base USDC Comet and reviewed Moonwell Base markets. It is read-only and x402-metered; it never signs or broadcasts a lending transaction. See [Base Lending Guard](docs/base-lending-guard.md) and [Monad Lending Guard](docs/monad-lending-guard.md).

> Insight is **not a real-time oracle tracker**. Price snapshots and feed health are collected every 15 minutes, reputation scores are recalculated hourly, and data is aggregated into daily reports. Check each assessment's freshness and validity window before using it.

## Technology Stack

- **Blockchain:** BNB Smart Chain (BSC) — the primary deployment chain — + EVM-compatible chains (oracle data covers 40+ networks)
- **Smart Contracts:** none deployed by Insight — it integrates the official ERC-8004 Identity & Reputation Registries and x402 (AEON facilitator) settlement
- **Frontend:** Next.js (React) + viem
- **Development:** TypeScript, Node.js 22, Jest, Supabase
- **BNB Chain deployment configuration:** [`bnbconfig.json`](./bnbconfig.json) — chain, contracts, agent registration, and x402 settlement details

## Supported Networks

- **x402 pay-per-call settlement:** Base, Polygon, Arbitrum One, Monad, BNB Smart Chain, and Solana mainnet. The public [x402 manifest](https://www.oracleinsight.xyz/.well-known/x402) is the source of truth for rails currently advertised in production.
- **BNB Smart Chain (Chain ID: 56):** Binance-Peg USDC via the AEON mandate flow; clients must use the supplied mandate scheme rather than a stock EIP-3009 payer.
- **Monad Mainnet (Chain ID: 143):** read-only oracle coverage for 51 official Chainlink USD feeds, with x402 settlement on Circle native USDC.
- **Additional EVM rails:** Ethereum, OP Mainnet, Avalanche, Sei, and X Layer have typed payment-configuration entries, but are not presented as public payment rails until their facilitator support and an end-to-end settlement check are confirmed.
- Additional EVM networks are covered read-only for oracle data (40+ chains)

## Contract Addresses

Insight is an API/agent service and issues no token. Its on-chain footprint is its ERC-8004 agent registration on BNB Mainnet and Monad Mainnet:

| Network       | Core Contract                                                                                                                                                               | Token Contract  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| BNB Mainnet   | ERC-8004 Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (Insight agent #375779) · ERC-8004 Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | None — no token |
| Monad Mainnet | ERC-8004 Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (Insight agent #10414) · ERC-8004 Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`  | None — no token |
| BNB Testnet   | None                                                                                                                                                                        | None            |

## Features

- **Pre-Trade Safety Check** — cross-oracle pre-trade verdict (PASS / CAUTION / DANGER / BLOCK) with signed EIP-712 attestation and a recommended maximum position size
- **Oracle Watch** — continuous between-action monitoring with `proceed` / `proceed_with_caution` / `halt` recommendations
- **Agent-native payments** — x402 pay-per-call in USDC on BNB Chain (AEON mandate flow) and a hosted MCP server at `/api/mcp`; registered ERC-8004 agent #375779
- **Verifiable evidence** — independently verifiable signed receipts, plus opt-in ERC-8004 reputation anchoring of completed checks

## Start here

| Goal                                               | Where to go                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Assess a trade from an application or agent        | [Guard SDK](sdk/README.md#non-intervening-assessment-and-verification) or [API reference](https://www.oracleinsight.xyz/docs/api) |
| Verify a signed receipt with your own trusted keys | [Independent verifier](verifier/README.md) or [browser demo](https://www.oracleinsight.xyz/verify)                                |
| Explore the product                                | [Website](https://www.oracleinsight.xyz) or [AI/MCP hub](https://www.oracleinsight.xyz/ai)                                        |
| Run the website and API locally                    | [Local development](#local-development)                                                                                           |

## What Insight provides

### For AI agents: decision-input integrity

Agents fail differently from humans: they act on the prices they read, and a manipulated or stale price produces a confident agent executing a bad trade. `pre_trade_safety_check` answers the question the transaction simulator cannot — **whether the price the agent is about to trust is currently trustworthy** — with cross-provider agreement, manipulation-risk scoring, and feed health, returned as a signed EIP-712 verdict. Agents reach it via the [MCP endpoint](#mcp-endpoint-production) or [x402 pay-per-call](#x402-quickstart-pay-per-call); humans re-verify the receipt with the [independent verifier](verifier/README.md).

### Pre-Trade Safety Check

Before a swap, borrow, lend, liquidation, or repayment, an application can request a cross-oracle assessment. The response combines price agreement, deviation, freshness, stablecoin peg status, reputation, and relevant protocol risk into a **PASS, CAUTION, DANGER, or BLOCK** verdict with a recommended maximum position size. Agents should not execute when the verdict is DANGER or BLOCK.

The verdict comes from deterministic rules; experimental ML scores provide additional context but do not drive it. Lending checks can freeze new borrowing when sustained oracle dispersion consumes the protocol's liquidation buffer. Successfully returned judgments are audit-logged before issuance; an audit-storage failure prevents a successful response.

When signing is configured, the check can include an EIP-712 attestation. A signature proves who issued the signed fields and whether they changed. It does **not** prove that the underlying prices were correct or that an agent obeyed the verdict. See the [verifier's supported schemas](verifier/README.md#supported-schemas) for version-specific verification requirements.

### Oracle Watch

Oracle Watch gives a running strategy a cross-oracle **NORMAL, CAUTION, or DANGER** signal and a `proceed`, `proceed_with_caution`, or `halt` recommendation. Applications can poll it between trades and pause on `halt`. It checks deviation, agreement, stale or outlying feeds, coverage, and independent source groups; it can also issue signed receipts when an attester key is configured.

Historical coverage is guaranteed for **ETH, BTC, USDC, and USDT on Ethereum, Arbitrum, and Base**. Other pairs can return a current signal without a historical curve; check `meta.historyGuaranteed` rather than treating an empty series as evidence of no incidents. Use the [AI/MCP hub](https://www.oracleinsight.xyz/ai#oracle-watch) or `GET /api/v1/oracle-watch?symbol=ETH&chain=ethereum` to explore the signal.

### Explore oracle and protocol risk

The web app also provides cross-oracle price comparison, feed health and reputation, position safety and liquidation analysis, Peg Risk for stablecoins and wrapped assets, and daily reports. Researchers can inspect source timestamps and export results; developers can use the corresponding API endpoints.

Integrated providers include Chainlink, Pyth Core, Stork, Chronicle, API3, RedStone, DIA, WINkLink, Supra, Uniswap V3 TWAP, Reflector, Flare, and Band. Monad also has a separate, block-pinned Uniswap V3 WMON/USDC execution-market layer: spot, 15-minute TWAP, in-range liquidity, fixed-size Quoter V2 slippage, and finalized Swap-event volume. DEX evidence never counts as an independent oracle or enters oracle consensus. Position safety supports selected Aave V3, Compound V3, Morpho Blue, Venus, and BENQI markets. Coverage varies by asset and chain, so confirm the available sources and protocol parameters for the position being assessed.

### SDK, API, MCP, and verifier

- **[Guard SDK](sdk/README.md)** — TypeScript integration for assessment, monitoring, and supported execution-price evidence. `assessSwap()` supports an assessment-only workflow; optional helpers can gate transaction submission and request execution receipts. The SDK uses the Insight API and its credit wallet.
- **[REST API](https://www.oracleinsight.xyz/docs/api)** — versioned `/api/v1/` endpoints for prices, risk, safety checks, and Oracle Watch. Metered calls use an `X-API-Key`; public receipt-verification endpoints do not require one. The [API reference](https://www.oracleinsight.xyz/docs/api) has request and response details.
- **MCP server** — exposes the same services to compatible agents through stdio, HTTP, or the app's `/api/mcp` endpoint. See the [AI/MCP hub](https://www.oracleinsight.xyz/ai) for client configuration and tools.
- **[Independent verifier](verifier/README.md)** — verifies receipt signatures and signed fields locally without depending on the Insight API. Consumers must independently establish trust in the attester key or key registry; successful signature verification is not an endorsement of a trade or verdict.

REST, MCP, and SDK calls draw from the same API-key credit wallet. Plans add credit capacity rather than separate feature tiers. See [current pricing](https://www.oracleinsight.xyz/pricing) for plans and per-call costs.

### MCP endpoint (production)

The hosted MCP server is live at `https://www.oracleinsight.xyz/api/mcp` (streamable HTTP).

- **Anonymous discovery**: `initialize`, `tools/list`, and `ping` work without credentials, so agents can browse the 40+ tool oracle catalog before committing.
- **Authenticated calls**: pass an API key and calls draw from the credit wallet.
- **x402 pay-per-call**: a single unauthenticated `tools/call` receives an [x402 v2](https://www.x402.org) 402 quote priced by the tool's metering class (USDC on configured EVM and optional Solana networks), then verify → execute → settle. A failed tool result is never settled.
- **One-click install (Cursor)**: [Install Insight Oracle](https://cursor.com/en/install-mcp?name=Insight+Oracle&config=eyJ1cmwiOiAiaHR0cHM6Ly93d3cub3JhY2xlaW5zaWdodC54eXovYXBpL21jcCJ9)
- **Discovery surfaces**: `llms.txt`, `/.well-known/x402`, `/.well-known/mcp/server-card.json`, and `openapi.json` at the site root.
- **Registry listing**: published to the official MCP registry as `io.github.imokokok/insight-oracle`.

### x402 quickstart (pay per call)

The REST pre-trade safety check accepts x402 and, when `MPP_ENABLED=true`, MPP at the same configured USDC price, network, recipient, and facilitator. Its initial HTTP 402 response advertises both rails; business errors are not settled. Set a server-only `MPP_SECRET_KEY` of at least 32 bytes to sign MPP challenges. The full MCP catalog at `/api/mcp` continues to support x402 and API keys. A separately gated MPP MCP pilot (`MPP_MCP_ENABLED=true`) exposes only `pre_trade_safety_check` at `/api/mcp/mpp`; the MPP challenge binds the tool arguments and settles only after success. Live `/openapi.json` discovery publishes canonical MPP offers with the configured USDC contract and atomic amount when enabled. Copy-paste client examples for curl, TypeScript (`@x402/fetch` or `mppx`), Python (`x402[httpx,evm]`), and MCP live in [examples/x402-quickstart](examples/x402-quickstart) and on the [pay-per-call quickstart page](https://www.oracleinsight.xyz/docs/x402).

## Local development

Requires Node.js 22 or later. From the repository root:

```bash
npm install
npm run dev
```

See [`.env.local.example`](.env.local.example) and [`src/lib/config/serverEnv.ts`](src/lib/config/serverEnv.ts) for environment configuration. Development can run with safe defaults for missing secrets; production requires Supabase credentials, `CSRF_SECRET`, and `JWT_SECRET`. Signed pre-trade attestations require `ATTESTATION_SIGNER_PRIVATE_KEY`.

To run the MCP server separately:

```bash
npm run mcp:stdio   # local stdio transport
npm run mcp:http    # HTTP transport at http://127.0.0.1:3001/mcp
```

The application is built with Next.js, React, TypeScript, Tailwind CSS, and Supabase. App routes and API handlers live in `src/app/`; core oracle, risk, attestation, and billing logic lives in `src/lib/`; MCP code lives in `src/mcp/`. Database migrations are under `supabase/`.

## Documentation

| Topic                                        | Details                                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product scope and PriorSeal relationship     | [Product positioning](docs/product-positioning.md) and [Guard SDK](sdk/README.md)                                                                                                                 |
| Receipt schemas and independent verification | [Verifier README](verifier/README.md) and [registry release policy](docs/oracle-registry-release-policy.md)                                                                                       |
| Partner protocol and release isolation       | [Mainline partner isolation](docs/mainline-partner-isolation.md) and [protocol README](protocol/mainline/README.md)                                                                               |
| Operations and data collection               | [Production readiness](docs/operations/production-readiness.md), [cron dispatcher](docs/operations/cron-dispatcher.md), and [integration reliability](docs/operations/integration-reliability.md) |
| Database changes                             | [SQL inventory and execution order](docs/operations/sql-inventory.md)                                                                                                                             |
| Experimental RWA work                        | [RWA v1](docs/rwa-v1.md), [RWA v2](docs/rwa-v2.md), and [instrument registry](docs/rwa-instrument-registry.md)                                                                                    |

RWA/tokenized-equity adaptations remain opt-in research; no production RWA signer or authorization policy is activated. The optional [Robinhood Stock Token issuer context](docs/rwa-robinhood.md) is read-only and does not count as an independent oracle source.

## License

See [LICENSE](LICENSE).
