# Insight — Decision Integrity & Oracle Risk Intelligence

Insight is oracle transparency, decision integrity, and risk intelligence infrastructure for DeFi and AI agents, built on **BNB Smart Chain (BSC)** and compatible with other EVM networks.

Insight helps DeFi applications, operators, developers, and AI agents inspect oracle prices and the risks of relying on them. It compares data from **13 oracle providers across 40+ blockchain networks**, evaluates deviation, freshness, source independence, and protocol impact, and can issue signed evidence of its assessments. For AI agents specifically, this is **decision-input integrity**: a signed, re-verifiable answer to "can this price be trusted" before a trade is signed.

```text
Oracle observations → Cross-source comparison → Risk assessment → Decision-input integrity → Verifiable evidence
```

**Pre-Trade Safety Check** assesses a proposed action. **Oracle Watch** monitors changing conditions between actions. The REST API, MCP server, [Guard SDK](sdk/README.md), and [independent verifier](verifier/README.md) make these capabilities available to applications and agents. Insight also works independently of [PriorSeal](https://github.com/imokokok/PriorSeal); see the [product positioning guide](docs/product-positioning.md) for the combined assessment, authorization, execution, and review workflow.

**Lending Guard** covers reviewed direct-call profiles across four surfaces: Base (Aave V3, Morpho Blue, Compound V3 USDC Comet, reviewed Moonwell markets), BNB + multichain EVM (Base, Polygon, Arbitrum and BNB Chain — Aave V3, Venus, Compound V3, Morpho Blue, Lista, Euler V2, Dolomite and Fluid vault T1), Solana (Kamino, Marginfi v2, Jupiter Lend Earn, Save and Loopscale), and Monad (Aave V3, Morpho Blue, Euler V2). Each guard checks collateral/loan oracle integrity plus caller-declared post-action LTV; all are read-only, x402-metered, and never sign or broadcast a transaction. Base additionally wires a generic ERC-4626 vault-call reduction path (standard `deposit`/`mint`/`redeem`/`withdraw`) into the guard: every observed market id must sit in the reviewed Morpho Blue market registry (first-party-verified 2026-11-06 via `scripts/verify-morpho-base-reviewed-market.mjs`), so unreviewed vaults are still refused — this is **not** curator-vault support. Monad Euler V2's deployment descriptor is VERIFIED (official `euler-interfaces` chain-143 address book + on-chain `isProxy`/EVC verification via `scripts/verify-euler-monad-vaults.mjs`); only the four reviewed stablecoin EVaults are admitted, and every decision still runs a live resolver that re-proves factory/EVC wiring and reads LTV controls on chain. See [Base Lending Guard](docs/base-lending-guard.md) and [Monad Lending Guard](docs/monad-lending-guard.md).

**Agent Swap Guard** gates six reviewed exact single-hop EVM profiles — three Base (Aerodrome Slipstream WETH↔USDC, Aerodrome Slipstream USDC↔USDT, PancakeSwap V3 USDC↔USDT), two BNB (PancakeSwap V3 USDT↔USDC and USDT↔WBNB), one Monad (PancakeSwap V3 WMON↔USDC) — plus two Solana Orca Whirlpool profiles (USDC/USDT and SOL/USDC, each reviewed direction). Settlement closure is pinned to `SETTLEMENT_CHAIN_IDS = {8453, 56, 143}`. Every guarded swap has exact quote/code identity, canonical calldata decoding, explicit execution thresholds, and independently checked source/destination price inputs; it returns no calls on CAUTION or BLOCK and never routes, signs, or broadcasts. Solana Orca admits only the legacy `swap` discriminator and refuses `swapV2` / two-hop variants. See [Base Agent Swap Guard](docs/base-agent-swap-guard.md).

**Perp Guard** covers five venues: Base Synthetix Perps V3, Solana Drift v2, BNB Aster, Monad Perpl, and Hyperliquid. It evaluates underlying and margin-oracle integrity plus caller-declared post-action leverage against reviewed caps; it does not evaluate the venue's mark-price or liquidation engine and never signs or broadcasts an order. Base binds one unsigned direct `commitOrder` call into a portable EIP-712 decision attestation. **Solana Drift is frozen and not an active venue**: P0-1 first-hand verification (2026-11-05) confirmed the on-chain AMM has been frozen since 2026-04-01 (~218 days), the official repository was archived and migrated to Velocity, and all instructions were commented out. Its program ID, market IDs and margin parameters still match on-chain exactly, so the constants stay unchanged, but the reviewed profile is marked `STALE` and must not be presented as a live venue. Its reviewed-profile enforcement now hard-BLOCKs the guard verdict and refuses to sign a decision attestation by default (evidence-graded; a `strict` switch that BLOCKs all non-ACTIVE profiles stays off until heartbeat infrastructure is ready). Monad adds exact-order binding plus an EIP-712 attestation that binds the **canonical-serialization `payloadHash` of a centralized Perpl order payload, not chain calldata** — it therefore cannot prove on-chain execution; the module currently lives at the lib layer with no HTTP verify route. BNB (Aster) deliberately stays a half tier with no attestation / exact-order layer: BNB perps 24h volume is about 1/50 of its DEX volume (~$15.45M in the 2026-11-05 ecosystem snapshot), so a deeper tier is not justified by volume. See [Base Perp Guard](docs/base-perp-guard.md).

**Prediction Guard** (`src/lib/prediction/polymarketGuard.ts`) is a **chain-agnostic event-metadata screen**, not four per-chain prediction-market guards and not execution risk control. It screens Polymarket/Gamma price-contract metadata, lifecycle, resolution timing, quoted-probability integrity, and post-hoc settlement verifiability. It adds an **entry-chain × settlement-chain** evidence map (for example, a Jupiter-embedded Polymarket entry is on Solana while settlement remains primarily on Polygon; Solana-native projects are `UNVERIFIED` name-only placeholders). It deliberately applies no cross-oracle consensus and does not judge the truth of event-outcome probabilities.

### Reviewed coverage at a glance

| Guard family | Base                | BNB + multichain EVM                                   | Solana                                         | Monad                                                                | Elsewhere / notes                                                                                                                      |
| ------------ | ------------------- | ------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Lending      | 4 reviewed profiles | 13 multichain EVM profiles (Base/Polygon/Arbitrum/BNB) | 5                                              | 2 + Euler V2 (reviewed)                                              | ERC-4626 vault reduction (Base, 2 reviewed Morpho Blue markets registered); Monad Euler V2 VERIFIED with 4 reviewed stablecoin EVaults |
| Swap         | 3 EVM profiles      | 2 BNB EVM profiles                                     | 2 Orca Whirlpool profiles (legacy `swap` only) | 1 EVM profile                                                        | `SETTLEMENT_CHAIN_IDS = {8453, 56, 143}`                                                                                               |
| Perp         | Synthetix Perps V3  | Aster — half tier, no attestation / exact layer        | Drift v2 — **frozen / `STALE`**                | Perpl + exact-order binding / EIP-712 over centralized order payload | Hyperliquid                                                                                                                            |
| Prediction   | —                   | —                                                      | —                                              | —                                                                    | One chain-neutral metadata screen + entry-chain × settlement-chain map; no per-chain guard                                             |

> Insight is **not a real-time oracle tracker**. Price snapshots and feed health are collected every 15 minutes, reputation scores are recalculated hourly, and data is aggregated into daily reports. Check each assessment's freshness and validity window before using it.

## Scope & non-goals

Insight sells **independently recomputable, tamper-evident decision inputs** — not conclusions, not execution guarantees, not custody, and not order routing. These limits are explicit, not hidden:

- Every guarded swap evaluates an **exact call only**. It does **not** cover aggregator routes (Jupiter / 1inch / 0x), arbitrary multicalls, smart-account UserOperations, permit / EIP-2612 flows, native-value swaps, or alternate routes (`src/lib/dex/baseAgentSwapGuard.ts:483`). Solana Orca admits only the legacy `swap` discriminator and rejects `swapV2` / two-hop variants (`src/lib/dex/solanaOrcaWhirlpool.ts:14-17`).
- The reviewed Uniswap V3 lane and the aggregator route quote are **read-only quotes**, not transaction simulations and not fill / landing guarantees (`public/openapi.yaml:1564-1569`).
- Prediction Guard applies no oracle consensus and does not assess the truth of event-outcome probabilities.
- `manipulationCost`, token-security, decision-input and GoPlus evidence are **advisory-only**: never a verdict input and never part of a signed attestation (`src/lib/manipCost/baseline.ts:284`, `src/lib/api/services/preTradeSafetyService.ts:194,344,1752`). `manipulationCost` is additionally hard-limited to `chainId === 1` (`preTradeSafetyService.ts:1764`), so it is unavailable on Base, BNB, Solana and Monad and is **not part of the public capability list**; the code keeps it as advisory while the narrative no longer claims it.

## Technology Stack

- **Blockchain:** BNB Smart Chain (BSC) — the primary deployment chain — + EVM-compatible chains (oracle data covers 40+ networks)
- **Smart Contracts:** none deployed by Insight — it integrates the official ERC-8004 Identity & Reputation Registries and x402 (AEON facilitator) settlement
- **Frontend:** Next.js (React) + viem
- **Development:** TypeScript, Node.js 22, Jest, Supabase
- **BNB Chain deployment configuration:** [`bnbconfig.json`](./bnbconfig.json) — chain, contracts, agent registration, and x402 settlement details

## Supported Networks

- **x402 pay-per-call settlement:** The public [x402 manifest](https://www.oracleinsight.xyz/.well-known/x402) and each endpoint's unsigned `PAYMENT-REQUIRED` response are the source of truth for rails currently advertised in production. A caller must select a live `accepts[]` option; do not infer availability from the action chain.
- **x402 settlement rails:** the live 402 `accepts[]` is authoritative and differs by route and request. In production, generic MCP calls quote HyperEVM (Chain ID: 999), Base (8453) and Solana mainnet in USDC; chain-bound guard routes quote their own chain; HyperEVM settles through the UVD facilitator using the standard EIP-3009 x402 exact flow; HyperCore quotes are issued per request.
- **Product coverage is separate from payment availability:** Base, BNB Chain, Monad, and additional EVM networks can be assessed by the API, but that does not make their native tokens payment rails. Treat the live quote as authoritative.
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
- **Oracle Watch** — between-action monitoring in 24h windows of up to 48 polls (one full reassessment every 30 minutes, escalating to a full scan when the signal jumps), with `proceed` / `proceed_with_caution` / `halt` recommendations
- **Agent-native payments** — x402 pay-per-call in USDC on BNB Chain (AEON mandate flow) and a hosted MCP server at `/api/mcp`; registered ERC-8004 agent #375779
- **Verifiable evidence** — independently verifiable signed receipts, plus opt-in ERC-8004 reputation anchoring of completed checks

## Start here

| Goal                                               | Where to go                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspect current oracle evidence                    | [Oracle Evidence](https://www.oracleinsight.xyz/price-insight?stage=observe)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Assess a proposed action or monitor changed inputs | [Decision Integrity](https://www.oracleinsight.xyz/decision-integrity), [Guard SDK](sdk/README.md#non-intervening-assessment-and-verification), or [API reference](https://www.oracleinsight.xyz/docs/api)                                                                                                                                                                                                                                                                                   |
| Compare sources or investigate a risk question     | [Risk Intelligence](https://www.oracleinsight.xyz/risk-intelligence)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Choose REST, AI / MCP, or SDK                      | [Build](https://www.oracleinsight.xyz/build)                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Install a focused Agent Skill                      | [Pre-Trade Safety](skills/insight-pre-trade-safety/README.md) · [Base Aave V3 Lending Guard](skills/insight-lending-guard/README.md) · [Base Agent Swap Guard](skills/insight-base-agent-swap-guard/README.md) · [Solana Swap Guard](skills/insight-solana-swap-guard/README.md) · [Base Perp Guard](skills/insight-base-perp-guard/README.md) · [Hyperliquid Perp Guard](skills/insight-hyperliquid-perp-guard/README.md) · [Solana Perp Guard](skills/insight-solana-perp-guard/README.md) |
| Verify a signed receipt with your own trusted keys | [Independent verifier](verifier/README.md) or [browser demo](https://www.oracleinsight.xyz/verify)                                                                                                                                                                                                                                                                                                                                                                                           |
| Run the website and API locally                    | [Local development](#local-development)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## What Insight provides

### For AI agents: decision-input integrity

Agents fail differently from humans: they act on the prices they read, and a manipulated or stale price produces a confident agent executing a bad trade. `pre_trade_safety_check` answers the question the transaction simulator cannot — **whether the price the agent is about to trust is currently trustworthy** — with cross-provider agreement and feed health, returned as a signed EIP-712 verdict. Advisory-only risk context (manipulation cost, token security) is reported separately and never enters the verdict or the signed attestation; see [Scope & non-goals](#scope--non-goals). Agents reach it via the [MCP endpoint](#mcp-endpoint-production) or [x402 pay-per-call](#x402-quickstart-pay-per-call); humans re-verify the receipt with the [independent verifier](verifier/README.md).

### Pre-Trade Safety Check

Before a swap, borrow, lend, liquidation, or repayment, an application can request a cross-oracle assessment. The response combines price agreement, deviation, freshness, stablecoin peg status, reputation, and relevant protocol risk into a **PASS, CAUTION, DANGER, or BLOCK** verdict with a recommended maximum position size. Agents should not execute when the verdict is DANGER or BLOCK.

The verdict comes from deterministic rules; experimental ML scores provide additional context but do not drive it. Lending checks can freeze new borrowing when sustained oracle dispersion consumes the protocol's liquidation buffer. Successfully returned judgments are audit-logged before issuance; an audit-storage failure prevents a successful response.

When signing is configured, the check can include an EIP-712 attestation. A signature proves who issued the signed fields and whether they changed. It does **not** prove that the underlying prices were correct or that an agent obeyed the verdict. See the [verifier's supported schemas](verifier/README.md#supported-schemas) for version-specific verification requirements.

### Oracle Watch

Oracle Watch gives a running strategy a cross-oracle **NORMAL, CAUTION, or DANGER** signal and a `proceed`, `proceed_with_caution`, or `halt` recommendation. Applications can poll it between trades and pause on `halt`. It checks deviation, agreement, stale or outlying feeds, coverage, and independent source groups; it can also issue signed receipts when an attester key is configured.

Historical coverage is guaranteed for **ETH, BTC, USDC, and USDT on Ethereum, Arbitrum, and Base**. Other pairs can return a current signal without a historical curve; check `meta.historyGuaranteed` rather than treating an empty series as evidence of no incidents. Use the [Decision Integrity page](https://www.oracleinsight.xyz/decision-integrity#oracle-watch-demo) or `GET /api/v1/oracle-watch?symbol=ETH&chain=ethereum` to explore the signal.

### Explore oracle and protocol risk

The web app also provides cross-oracle price comparison, feed health and reputation, position safety and liquidation analysis, Peg Risk for stablecoins and wrapped assets, and daily reports. Researchers can inspect source timestamps and export results; developers can use the corresponding API endpoints.

Integrated providers include Chainlink, Pyth Core, Stork, Chronicle, API3, RedStone, DIA, WINkLink, Supra, Uniswap V3 TWAP, Reflector, Flare, and Band. Monad also has a separate, block-pinned Uniswap V3 WMON/USDC execution-market layer: spot, 15-minute TWAP, in-range liquidity, fixed-size Quoter V2 slippage, and finalized Swap-event volume. DEX evidence never counts as an independent oracle or enters oracle consensus. Position safety supports selected Aave V3, Compound V3, Morpho Blue, Venus, and BENQI markets. Coverage varies by asset and chain, so confirm the available sources and protocol parameters for the position being assessed.

### SDK, API, MCP, and verifier

- **[Guard SDK](sdk/README.md)** — TypeScript integration for assessment, monitoring, and supported execution-price evidence. `assessSwap()` supports an assessment-only workflow; optional helpers can gate transaction submission and request execution receipts. The SDK uses the Insight API and its credit wallet.
- **[REST API](https://www.oracleinsight.xyz/docs/api)** — versioned `/api/v1/` endpoints for prices, risk, safety checks, and Oracle Watch. Metered calls use an `X-API-Key`; public receipt-verification endpoints do not require one. The [API reference](https://www.oracleinsight.xyz/docs/api) has request and response details.
- **MCP server** — exposes the same services to compatible agents through stdio, HTTP, or the app's `/api/mcp` endpoint. See the [AI/MCP hub](https://www.oracleinsight.xyz/ai) for client configuration and tools.
- **[Independent verifier](verifier/README.md)** — verifies receipt signatures and signed fields locally without depending on the Insight API. Consumers must independently establish trust in the attester key or key registry; successful signature verification is not an endorsement of a trade or verdict.

REST, MCP, and SDK calls draw from the same API-key credit wallet. Plans add credit capacity rather than separate feature tiers. See [current pricing](https://www.oracleinsight.xyz/pricing) for plans and per-call costs.

Product prices: **Trade Guard** is op-priced at **$0.002–$0.040** per call — $0.040 is both the per-call price and the product ceiling for each trade-safety op (`check_safety`, `prepare_swap`, `prepare_perp_order`); **Trade Proof** is **40 credits / $0.040** for `begin_evidence` and `issue_receipt` (`verify_evidence` is free for the three offline kinds — `execution_pair`, `base_agent_swap`, `solana_swap` — and 40 credits / $0.040 only when it reads a live upstream); **Oracle Watch** is **500 credits / $0.500 per 24h window**; **Position Lifecycle** is **550 credits / $0.550 per position**. The 16 deprecated tool names are callable at the same price as their canonical product op until 2027-01-06. New accounts receive a one-time **400-credit** trial grant (1 credit = $0.001).

Billing outcomes on the MCP surface: a `rejected` verdict that carries all five evidence items is charged normally; a `rejected` verdict missing any evidence item is downgraded to `unavailable` and is never charged. REST endpoints do not emit these outcomes; they are charged when data is delivered.

### MCP endpoint (production)

The hosted MCP server is live at `https://www.oracleinsight.xyz/api/mcp` (streamable HTTP).

- **Anonymous discovery**: `initialize`, `tools/list`, and `ping` work without credentials, so agents can browse the 20 advertised names before committing: the four product tools (`trade_guard`, `trade_proof`, `oracle_watch_window`, `position_lifecycle`) and their 16 deprecated aliases. Deprecated names are callable at the same price and are removed on 2027-01-06.
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
