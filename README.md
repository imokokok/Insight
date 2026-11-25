# Insight — Oracle Risk Intelligence & Decision-Input Integrity

Insight is an **independent oracle risk assessment layer** for DeFi and AI agents, built on **BNB Smart Chain (BSC)** and compatible with other EVM networks.

Insight evaluates the oracle inputs DeFi applications and AI agents are about to trust — checking freshness, source diversity, cross-provider agreement, and data anomalies — and returns **verifiable risk judgments** (signed EIP-712 when configured). Applications and agents decide whether to continue, proceed with caution, or halt. Insight does **not** quote prices, settle transactions, or prove a price is correct; it proves Insight's own assessment of that price.

```text
Oracle observations → Cross-source comparison → Risk assessment → Verifiable judgment → Application decides action
```

**Pre-Trade Safety Check** assesses a proposed action. **Oracle Watch** monitors changing conditions between actions. The REST API, MCP server, [Guard SDK](sdk/README.md), and [independent verifier](verifier/README.md) make these capabilities available. Insight also works independently of [PriorSeal](https://github.com/imokokok/PriorSeal); see the [product positioning guide](docs/product-positioning.md) for the combined assessment, authorization, execution, and review workflow.

### Coverage, not universal availability

Insight pulls from 13 oracle providers across 40+ networks, but **no single provider covers every asset on every chain**. Each guard family reviews specific exact-call profiles, and each profile maps to a particular set of oracles. The coverage table below shows what has been audited and wired; anything outside it is unsupported, even if a provider nominally lists that pair.

## Start here

| Goal                                                                     | Where to go                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspect current oracle evidence                                          | [Oracle Evidence](https://www.oracleinsight.xyz/price-insight?stage=observe)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Verify the oracle inputs behind a decision or monitor changed conditions | [Decision Integrity](https://www.oracleinsight.xyz/decision-integrity), [Guard SDK](sdk/README.md#non-intervening-assessment-and-verification), or [API reference](https://www.oracleinsight.xyz/docs/api)                                                                                                                                                                                                                                                                                   |
| Compare sources or investigate a risk question                           | [Risk Intelligence](https://www.oracleinsight.xyz/risk-intelligence)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Choose REST, AI / MCP, or SDK                                            | [Build](https://www.oracleinsight.xyz/build)                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Install a focused Agent Skill                                            | [Pre-Trade Safety](skills/insight-pre-trade-safety/README.md) · [Base Aave V3 Lending Guard](skills/insight-lending-guard/README.md) · [Base Agent Swap Guard](skills/insight-base-agent-swap-guard/README.md) · [Solana Swap Guard](skills/insight-solana-swap-guard/README.md) · [Base Perp Guard](skills/insight-base-perp-guard/README.md) · [Hyperliquid Perp Guard](skills/insight-hyperliquid-perp-guard/README.md) · [Solana Perp Guard](skills/insight-solana-perp-guard/README.md) |
| Verify a signed receipt with your own trusted keys                       | [Independent verifier](verifier/README.md) or [browser demo](https://www.oracleinsight.xyz/verify)                                                                                                                                                                                                                                                                                                                                                                                           |
| Run the website and API locally                                          | [Local development](#local-development)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Reviewed coverage at a glance

| Guard family | Base                | BNB + multichain EVM                                   | Solana                                         | Monad                                                                | Elsewhere / notes                                                                                                                      |
| ------------ | ------------------- | ------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Lending      | 4 reviewed profiles | 13 multichain EVM profiles (Base/Polygon/Arbitrum/BNB) | 5                                              | 2 + Euler V2 (reviewed)                                              | ERC-4626 vault reduction (Base, 2 reviewed Morpho Blue markets registered); Monad Euler V2 VERIFIED with 4 reviewed stablecoin EVaults |
| Swap         | 3 EVM profiles      | 2 BNB EVM profiles                                     | 2 Orca Whirlpool profiles (legacy `swap` only) | 1 EVM profile                                                        | `SETTLEMENT_CHAIN_IDS = {8453, 56, 143}`                                                                                               |
| Perp         | Synthetix Perps V3  | Aster — half tier, no attestation / exact layer        | Drift v2 — **frozen / `STALE`**                | Perpl + exact-order binding / EIP-712 over centralized order payload | Hyperliquid                                                                                                                            |
| Prediction   | —                   | —                                                      | —                                              | —                                                                    | One chain-neutral metadata screen + entry-chain × settlement-chain map; no per-chain guard                                             |

**Lending Guard** covers reviewed direct-call profiles on Base (Aave V3, Morpho Blue, Compound V3, Moonwell), BNB and multichain EVM (Aave V3, Venus, Compound V3, Morpho Blue, Lista, Euler V2, Dolomite, Fluid), Solana (Kamino, Marginfi, Jupiter Lend Earn, Save, Loopscale), Monad (Aave V3, Morpho Blue, Euler V2), and HyperEVM (HyperLend, Morpho Blue, Euler V2). HyperLend is limited to reviewed markets. Each profile checks collateral and loan oracle integrity plus caller-declared post-action LTV; the guard is read-only. See the [Base](docs/base-lending-guard.md), [Monad](docs/monad-lending-guard.md), and [HyperEVM](docs/hyperevm-lending-guard.md) guides.

**Agent Swap Guard** evaluates reviewed exact-call swap profiles across Base, BNB, Monad, and Solana. It checks quote and call identity, execution thresholds, and price inputs; CAUTION or BLOCK returns no calls, and the guard never routes, signs, or broadcasts. Solana Orca supports the legacy `swap` instruction only. See the [Agent Swap Guard guide](docs/base-agent-swap-guard.md).

**Perp Guard** covers reviewed profiles on Base, BNB, Monad, Solana, and Hyperliquid. It checks underlying and margin-oracle integrity plus caller-declared leverage, but not a venue's mark-price or liquidation engine; it never signs or broadcasts orders. Solana Drift has been frozen since 2026-04-01 and is marked `STALE`, so the guard blocks it by default. Monad's Perpl attestation binds a centralized order-payload hash, not chain calldata; BNB Aster has no exact-order attestation. See the [Base Perp Guard guide](docs/base-perp-guard.md).

**Prediction Guard** covers Polymarket/Gamma and Kalshi market metadata. For reviewed Polymarket crypto Up/Down contracts it also reads a fresh CLOB top of book for the selected outcome and blocks if that executable quote is missing or stale. It checks market lifecycle, resolution timing, quotes, settlement rules, and evidence limits; it is chain-agnostic, applies no cross-oracle consensus, and does not assess event outcomes or control execution. Kalshi evidence is off-chain and official-API-declared; the guard is read-only and never handles API keys, submits orders, or observes fills.

Polymarket settlement-evidence packs compare the declared Up/Down result with an independent Kraken 1-minute candle direction and may include aligned Insight oracle-consensus data. They are cross-source consistency checks, not exact replays of Polymarket's Chainlink TWAP start/end calculation. Packs disclose candle coverage and are signed only when the production attester is configured.
**Prediction Guard** additionally provides a signed market-assessment API with a short-lived EIP-712 attestation. The signature is evidence of the returned assessment payload and does not authorize or execute any order.

> Insight is **not a real-time oracle tracker**. Price snapshots and feed health are collected every 15 minutes, reputation scores are recalculated hourly, and data is aggregated into daily reports. Check each assessment's freshness and validity window before using it.

## Scope & non-goals

Insight sells **independently recomputable, tamper-evident risk judgments** — not conclusions, not execution guarantees, not custody, and not order routing. These limits are explicit, not hidden:

- Insight **never signs or broadcasts transactions**. It returns a verdict + optional EIP-712 attestation; the application or agent decides whether to act on it. An agent receiving `BLOCK` can still swap — Insight does not enforce. This is by design: a read-only advisory layer cannot be a single point of failure for trading. This boundary is published as a machine-readable convention (`meta.insightDoesNotEnforce: true` on every response) — see the [Advisory-Only Boundary convention](docs/advisory-only-boundary.md).
- Every guarded swap evaluates an **exact call only**. It does **not** cover aggregator routes (Jupiter / 1inch / 0x), arbitrary multicalls, smart-account UserOperations, permit / EIP-2612 flows, native-value swaps, or alternate routes. Solana Orca admits only the legacy `swap` discriminator and rejects `swapV2` / two-hop variants.
- The reviewed Uniswap V3 lane and the aggregator route quote are **read-only quotes**, not transaction simulations and not fill / landing guarantees.
- Prediction Guard applies no oracle consensus and does not assess the truth of event-outcome probabilities. Kalshi support is read-only: it never handles Kalshi API keys, signs orders, submits orders or observes fills.
- `manipulationCost`, token-security, decision-input and GoPlus evidence are **advisory-only**: never a verdict input and never part of a signed attestation. `manipulationCost` is additionally limited to Ethereum mainnet (`chainId === 1`), so it is unavailable on Base, BNB, Solana, and Monad and is not part of the public capability list.

### About the EIP-712 attestation

A signature proves who issued the signed fields and whether they changed. It does **not** prove that the underlying prices were correct or that an agent obeyed the verdict. See the [verifier's supported schemas](verifier/README.md#supported-schemas) for version-specific verification requirements.

### The promotion chain

Insight's protocol surface (`.well-known/oracle-*`, key registry, partner policies) evolves through an immutable, append-only **promotion chain**. Each promotion is a JSON file with a keccak256 `promotionId`, a `predecessorPromotionId` linking to the prior one, and a global monotonic `promotionVersion`. Anyone can reconstruct the chain from `current-promotion.json` and verify no fork exists.

However: the `current-promotion.json` pointer is a regular file committed to main, and the attester keys are configured via environment variables. A pointer commit can be wrong; a production key can expire. The promotion chain provides **verifiability**, not automatic trust — callers must independently establish trust in which `current-promotion.json` to read and which attester keys to accept.

### Pulse Trail — the 15-minute heartbeat

The [insight-pulse-trail](https://github.com/imokokok/insight-pulse-trail) GitHub repo signs an Oracle Pulse EIP-712 attestation every 15 minutes and weekly anchors it with OpenTimestamps on Bitcoin. This is a **historical verification record**, not a real-time pre-trade check. Trail attestations are signed by a dedicated sample key (`0x25cD...3a0`, role `sample`) and carry no production trust weight. Trail verification runs offline and independently of the Insight service.

## Technology Stack

- **Blockchain:** BNB Smart Chain (BSC) — the primary deployment chain — + EVM-compatible chains (oracle data covers 40+ networks; coverage per guard family varies — see above)
- **Smart Contracts:** none deployed by Insight — it integrates the official ERC-8004 Identity & Reputation Registries and x402 (AEON facilitator) settlement
- **Frontend:** Next.js (React) + viem
- **Development:** TypeScript, Node.js 22.x, Jest, Supabase
- **BNB Chain deployment configuration:** [`bnbconfig.json`](./bnbconfig.json) — chain, contracts, agent registration, and x402 settlement details

## Supported Networks

- Oracle data covers 40+ networks; guard and protocol support varies by asset and chain. See the reviewed coverage above and the linked guides.
- Payment availability is route-specific and dynamic; the live 402 `accepts[]` is authoritative. Callers must choose a currently advertised option. The public [x402 manifest](https://www.oracleinsight.xyz/.well-known/x402) and each endpoint's unsigned `PAYMENT-REQUIRED` response show those options; do not infer settlement availability from assessment coverage.

## Contract Addresses

Insight is an API/agent service and issues no token. Its on-chain footprint is its ERC-8004 agent registration on BNB Mainnet and Monad Mainnet:

| Network       | Core Contract                                                                                                                                                               | Token Contract  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| BNB Mainnet   | ERC-8004 Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (Insight agent #375779) · ERC-8004 Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | None — no token |
| Monad Mainnet | ERC-8004 Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (Insight agent #10414) · ERC-8004 Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`  | None — no token |
| BNB Testnet   | None                                                                                                                                                                        | None            |

## What Insight provides

### For AI agents: decision-input integrity

Agents fail differently from humans: they act on the prices they read, and a manipulated or stale price produces a confident agent executing a bad trade. `pre_trade_safety_check` answers the question the transaction simulator cannot — **whether the price the agent is about to trust is currently healthy** — with cross-provider agreement and feed health, returned as a signed EIP-712 judgment. Advisory-only risk context (manipulation cost, token security) is reported separately and never enters the verdict or the signed attestation; see [Scope & non-goals](#scope--non-goals). Agents reach it via the [MCP endpoint](#mcp-endpoint-production) or [x402 pay-per-call](#x402-quickstart-pay-per-call); humans re-verify the receipt with the [independent verifier](verifier/README.md).

### Pre-Trade Safety Check

Before a swap, borrow, lend, liquidation, or repayment, an application can request a cross-oracle assessment. The response combines price agreement, deviation, freshness, stablecoin peg status, reputation, and relevant protocol risk into a **PASS, CAUTION, DANGER, or BLOCK** verdict with a recommended maximum position size.

> ⚠️ Insight never enforces BLOCK. The verdict is advisory — the calling application or agent owns the decision. A verdict of DANGER or BLOCK means "Insight recommends against proceeding," not "Insight will prevent you." This is intentionally read-only: Insight cannot be a single point of failure for trading, and agents must retain autonomy to override judgments they have independently evaluated.

The verdict comes from deterministic rules; experimental ML scores provide additional context but do not drive it. Lending checks can freeze new borrowing when sustained oracle dispersion consumes the protocol's liquidation buffer. Successfully returned judgments are audit-logged before issuance; an audit-storage failure prevents a successful response.

When signing is configured, the check can include an EIP-712 attestation. A signature proves who issued the signed fields and whether they changed. It does **not** prove that the underlying prices were correct or that an agent obeyed the verdict. See the [verifier's supported schemas](verifier/README.md#supported-schemas) for version-specific verification requirements.

### Oracle Watch

Oracle Watch gives a running strategy a cross-oracle **NORMAL, CAUTION, or DANGER** signal and a `proceed`, `proceed_with_caution`, or `halt` recommendation. Applications can poll it between trades and pause on `halt` — but as with all Insight verdicts, the pause is the caller's choice, not enforced. It checks deviation, agreement, stale or outlying feeds, coverage, and independent source groups; it can also issue signed receipts when an attester key is configured.

Historical coverage is guaranteed for **ETH, BTC, USDC, and USDT on Ethereum, Arbitrum, and Base**. Other pairs can return a current signal without a historical curve; check `meta.historyGuaranteed` rather than treating an empty series as evidence of no incidents. Use the [Decision Integrity page](https://www.oracleinsight.xyz/decision-integrity#oracle-watch-demo) or `GET /api/v1/oracle-watch?symbol=ETH&chain=ethereum` to explore the signal.

### Explore oracle and protocol risk

The web app also provides cross-oracle price comparison, feed health and reputation, position safety and liquidation analysis, Peg Risk for stablecoins and wrapped assets, and daily reports. Researchers can inspect source timestamps and export results; developers can use the corresponding API endpoints.

Integrated providers include Chainlink, Pyth Core, Stork, Chronicle, API3, RedStone, DIA, WINkLink, Supra, Uniswap V3 TWAP, Reflector, Flare, and Band. Monad also has a separate, block-pinned Uniswap V3 WMON/USDC execution-market layer: spot, 15-minute TWAP, in-range liquidity, fixed-size Quoter V2 slippage, and finalized Swap-event volume. DEX evidence never counts as an independent oracle or enters oracle consensus. Position safety supports selected Aave V3, Compound V3, Morpho Blue, Venus, and BENQI markets. Coverage varies by asset and chain, so confirm the available sources and protocol parameters for the position being assessed.

### SDK, API, MCP, and verifier

- **[Guard SDK](sdk/README.md)** — TypeScript integration for assessment, monitoring, and supported execution-price evidence. `assessSwap()` supports an assessment-only workflow; optional helpers can gate transaction submission and request execution receipts. The SDK uses the Insight API and its credit wallet.
- **[REST API](https://www.oracleinsight.xyz/docs/api)** — versioned `/api/v1/` endpoints for prices, risk, safety checks, and Oracle Watch. Metered calls use an `X-API-Key`; public receipt-verification endpoints do not require one. The [API reference](https://www.oracleinsight.xyz/docs/api) has request and response details.
- **MCP server** — exposes the same services to compatible agents through stdio, HTTP, or the app's `/api/mcp` endpoint. See the [AI/MCP hub](https://www.oracleinsight.xyz/ai) for client configuration and tools.
- **[Independent verifier](verifier/README.md)** — verifies receipt signatures and signed fields locally without depending on the Insight API. Consumers must independently establish trust in the attester key or key registry; successful signature verification is not an endorsement of a trade or verdict.

REST, MCP, and SDK calls draw from the same API-key credit wallet. Plans add credit capacity rather than separate feature tiers. See [current pricing](https://www.oracleinsight.xyz/pricing) for rates and trial terms; route-specific x402 quotes and billing outcomes are covered in the [x402 quickstart](#x402-quickstart-pay-per-call).

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

Requires Node.js 22.x (the repository pins 22.23.2). From the repository root:

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
