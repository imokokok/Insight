# Insight: Pre-Trade Safety for Trading Agents

Insight tells an agent whether the price it is about to trade on is trustworthy. For one trade it returns an oracle-manipulation-aware verdict (PASS / WARN / BLOCK) computed from multi-provider oracle consensus, with optional verifiable EIP-712 attestation. Paid per call in USDC via x402 v2. No signup, no API key, no subscription.

Agent-facing contacts:

- Discovery manifest: `GET https://www.oracleinsight.xyz/.well-known/x402` (x402 v2; fixed-route `accepts[]`, plus explicit request-bound route and quote metadata)
- OpenAPI 3.1 contract: `GET https://www.oracleinsight.xyz/openapi.json`
- This manual: `GET https://www.oracleinsight.xyz/skill.md`

## Installable Agent Skills

- [Pre-Trade Safety Skill](https://www.oracleinsight.xyz/downloads/insight-pre-trade-safety-skill-v0.2.0.zip) — installable MCP configuration, no-money discovery check, and prompts for one proposed trade or DeFi action.
- [Base Aave V3 Lending Guard Skill](https://www.oracleinsight.xyz/downloads/insight-lending-guard-skill-v0.1.0.zip) — a deliberately narrow, exact-call decision layer for direct Base Aave V3 EOA `supply` and variable-rate `borrow` calls.
- [Base Agent Swap Guard Skill](https://www.oracleinsight.xyz/downloads/insight-base-agent-swap-guard-skill-v0.1.0.zip) — a narrow pre-signing workflow for reviewed direct single-hop swaps: three Base profiles (Aerodrome Slipstream WETH→USDC, Aerodrome Slipstream USDC→USDT, PancakeSwap V3 USDC→USDT), two BNB Chain PancakeSwap V3 profiles (USDT→USDC, USDT→WBNB), and one Monad PancakeSwap V3 profile (WMON→USDC). Settlement closure is pinned to Base, BNB Chain, and Monad. It can be paid with x402 at C3 / $0.02 and returns no calldata for `CAUTION` or `BLOCK`.
- [Solana Swap Guard Skill](https://www.oracleinsight.xyz/downloads/insight-solana-swap-guard-skill-v0.1.0.zip) — a narrow pre-signing workflow and signed settlement closure for one exact unsigned Orca Whirlpool swap on Solana mainnet (reviewed USDC/USDT and SOL/USDC pools, legacy `swap` discriminator only). It can be paid with x402 at C3 / $0.02 per decision and C4 / $0.04 per settlement call and returns no signable payload for `CAUTION` or `BLOCK`.
- [Base Perp Guard Skill](https://www.oracleinsight.xyz/downloads/insight-base-perp-guard-skill-v0.1.0.zip) — a decision-input skill for one Synthetix Perps V3 Base open-position intent, with disclosed spot/TWAP liquidity evidence and exact `commitOrder` call binding.
- [Hyperliquid Perp Guard Skill](https://www.oracleinsight.xyz/downloads/insight-hyperliquid-perp-guard-skill-v0.1.0.zip) — a decision-input skill for one reviewed Hyperliquid HyperCore open-position intent (BTC, ETH), with disclosed venue evidence and exact IOC order envelope binding.
- [Solana Perp Guard Skill](https://www.oracleinsight.xyz/downloads/insight-solana-perp-guard-skill-v0.1.0.zip) — a decision-input skill for one reviewed Drift Protocol v2 Solana open-position intent (SOL, BTC, ETH), with disclosed on-chain venue evidence (mark/oracle deviation, funding rate, open interest). Status disclosure: Drift's reviewed profile is currently **STALE**. First-hand on-chain verification (2026-11-05) confirmed the Drift AMM has been frozen since 2026-04-01 and the team migrated to Velocity, so position openings hard-BLOCK by default and no decision attestation is signed; the skill remains available for reading venue evidence.

## Oracle Config Snapshot (advisory input record)

`POST /api/v1/oracle-config/snapshot` returns a signed, idempotent record of one oracle configuration and its independent-source state at a point in time. The request is strict: `chainId`, `protocolId`, `assetSymbol` only. Caller-supplied feed lists, parameters, source claims or declared outcomes are rejected; all observable state is read server-side.

This is an advisory INPUT record, not a safety assessment. It does not assert that a configuration is safe or unsafe and does not recommend parameter changes. The response carries `configHash`, `checksHash`, a D1 to D6 check record, `registryPin`, `payloadHash` and an EIP-712 attestation with no expiry, so the holder can keep and verify the record offline later. Within one hour bucket the same configuration yields a byte-identical payload and typed-data hash. $0.50 USDC via x402 v2, or equivalent credits with an API key. Settlement happens only after the record is produced.

The older `POST /api/v1/markets/settlement-evidence/grade` endpoint and the `get_settlement_evidence` MCP tool are retained as legacy historical records of resolved prediction markets. They are not the recommended entry point for configuration evidence and make no safety claim about a live configuration.

## Reviewed profiles and evidence grading

Every guard verdict is enforced against a reviewed-profile registry (currently 38 profiles: 25 lending, 8 swap, 5 perp, 1 prediction). The enforcement is evidence-graded and fail-closed:

- Profiles carry an evidence status (`ACTIVE` or `STALE`). A profile whose venue activity premise fails first-hand on-chain verification is marked `STALE` and its guard hard-BLOCKs by default; decision attestations are refused for `STALE` profiles.
- Deployment constants are never guessed. A reviewed protocol without verified deployment addresses (e.g. Monad Euler v2) is admitted only as `UNVERIFIED` and refused by guards until real addresses are registered.
- Base ERC-4626 vault calls are reduced to reviewed Morpho Blue markets; the vault registry starts empty, so every vault call is refused until a market is registered through review.
- Guard families cover five perp venues (Synthetix Perps V3 on Base, Aster on BNB Chain, Perpl on Monad, Hyperliquid, Drift on Solana, the latter `STALE`), eight swap profiles across Base, BNB Chain, Monad and Solana, and one chain-neutral prediction screen.

Install a package, then run its free discovery check before configuring a
credential or an x402 wallet. A successful discovery check does not call a
paid tool, ask for a signature, or send a transaction. Insight risk evidence
does not authorize execution; use a separate wallet-authorization and evidence
workflow when the caller needs one.

## Optional attribution and one-command install

Clients may send `x-insight-entry-source` with one bounded, non-identifying
label (`direct`, `docs`, `bazaar`, `mcp`, `sdk`, `skill`, `wallet_mcp`,
`sendaifun`, `solana_directory`, `unknown`). It is aggregate conversion
metadata only; it never affects pricing, authorization, verification, or
settlement, and may be omitted. Never put a wallet address, API key, or
free-form campaign value in this header.

An MCP host can connect with no API key using
`npx -y --package=oracle-insight-mcp insight-mcp`. The launcher pins the hosted
endpoint and the `mcp` attribution label; set `INSIGHT_MCP_URL`,
`INSIGHT_API_KEY`, or `INSIGHT_ENTRY_SOURCE` in the host's `env` block to
override them. HTTP 402 responses also carry `x-insight-quickstart`,
`x-insight-mcp-install` and `x-insight-no-wallet` hints.

## No-wallet trial (no crypto needed)

An agent without a wallet can use the credit rail instead of x402:

1. Sign up at https://www.oracleinsight.xyz and verify the email address. A
   one-time, idempotent 100-credit grant is issued (about 20 C3 decisions).
2. Create an API key at https://www.oracleinsight.xyz/settings?tab=api-keys.
3. Send `X-API-Key: <key>` on REST calls, or set `INSIGHT_API_KEY` in the MCP
   host's `env` block. No wallet, USDC, private key or x402 client is needed.

This is a per-account, email-verified, one-time grant, not an anonymous or
recurring free tier. It uses the same metering, quota, and safety boundary as
a paid API key; verdicts are identical.

## Endpoints

### 1. HTTP: pre-trade safety check

```
GET https://www.oracleinsight.xyz/api/v1/safety/pre-trade
    ?asset=USDC
    &chainId=1
    &action=swap
    &tradeAmountUsd=1000
    &tokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

Parameters:

| Param            | Meaning                                                         |
| ---------------- | --------------------------------------------------------------- |
| `asset`          | The asset your agent is trading (e.g. `USDC`)                   |
| `chainId`        | EVM chain id of the trade venue (e.g. `1` mainnet, `8453` Base) |
| `action`         | `swap`, `borrow`, `lend`, `liquidate`, or `repay`               |
| `tradeAmountUsd` | Notional size in USD                                            |
| `tokenAddress`   | Contract address of the token being priced/traded               |

Unauthenticated calls receive `HTTP 402` with a base64url `PAYMENT-REQUIRED` header (x402 v2). Sign one `accepts[]` entry and retry with the payment header.

### 2. HTTP: Monad Lending Guard

```
GET https://www.oracleinsight.xyz/api/v1/safety/monad-lending-guard
    ?protocolId=aave-v3-monad
    &action=borrow
    &collateralSymbol=WETH
    &loanSymbol=USDC
    &collateralValueUsd=10000
    &debtValueUsd=4000
```

This is a read-only, pre-signing decision gate for direct Aave V3 Monad calls or exact Morpho Blue Monad markets. Required query parameters are `protocolId` (`aave-v3-monad` or `morpho-blue-monad`), `action` (`supply` or `borrow`), `collateralSymbol`, `loanSymbol`, `collateralValueUsd`, and `debtValueUsd`; add the immutable `marketId` for Morpho. The response is an `ALLOW`, `CAUTION`, or `BLOCK` decision based on live protocol controls and separate collateral/debt oracle evidence. It never authorizes, signs, relays, or broadcasts a transaction.

`POST` to the same endpoint may bind that assessment to one caller-built unsigned direct Monad call and return an EIP-712 decision attestation when an eligible Insight attester is configured. The attestation remains non-authorizing.

### 3. MCP: tools/call over Streamable HTTP

```
POST https://www.oracleinsight.xyz/api/mcp
```

JSON-RPC `tools/call` access to the Insight tool catalog for x402-aware MCP clients. Each call is priced by its tool metering class; the 402 challenge carries the live quote.

### 4. Hyperliquid perpetual execution loop (MCP)

For reviewed `BTC`, `ETH`, and `HYPE` perpetuals, use the MCP tools in this order:

1. `prepare_hyperliquid_perp_order` — validates the exact IOC intent against fresh market metadata, tick/lot constraints, an explicit notional cap, mark/oracle divergence, and displayed L2 fill/impact limits. A `READY_TO_SIGN` result includes a short-expiry unsigned exchange action and the original client order id.
2. Sign and submit that action in the account owner's own Hyperliquid client or approved API-wallet process. Insight does not accept or hold an API key, private key, nonce, signature, or exchange submission.
3. `verify_hyperliquid_perp_execution` — provides a bounded public observation of the exact order status and matching fills, compared with the original expected intent.

Only IOC is admitted, so an action that cannot fully satisfy its caller-selected displayed-book constraints is returned as `BLOCK` and has no signable envelope. The final observation is not a signed Insight receipt or a guarantee of the exchange's future state.

### 5. HTTP: Prediction Guard (Polymarket)

```
GET https://www.oracleinsight.xyz/api/v1/safety/prediction-guard
    ?protocolId=polymarket-prediction-mainnet
    &action=buy_up
    &marketSlug=<market-slug>
```

A chain-agnostic pre-signing metadata screen for one Polymarket event position (`action` is `buy_up` or `buy_down`). It screens Gamma price-contract metadata, market lifecycle, resolution timing, quoted-probability integrity, and post-hoc settlement verifiability, and returns an entry-chain × settlement-chain evidence map (for example, a Jupiter-embedded Polymarket entry is on Solana while settlement remains primarily on Polygon). It applies no cross-oracle consensus, does not judge the truth of event outcomes, and is not execution risk control. Keyless calls are x402 metered; the live 402 challenge carries the price. API-key callers use the standard v1 path.

## Payment

Paid calls use x402 v2. The pre-trade C3 price is **$0.02 USDC** (`20000` atomic units on a 6-decimal rail), but available networks, assets, payees, schemes, and facilitator-specific fields are deployment-specific.

Before signing, issue a plain unsigned request and select an entry from its live `PAYMENT-REQUIRED` header. The public [x402 manifest](https://www.oracleinsight.xyz/.well-known/x402) derives fixed-route options from the same route scope as production; routes whose rail depends on validated input are listed under `requestBoundResources`. HyperCore quotes contain a short-lived `quoteId` and are listed under `dynamicPaymentOptions`, not fabricated in static `accepts[]`. The live `accepts[]` array is always the binding payment contract. Do not infer a payment rail from the action chain or reuse a network, asset, or `payTo` value from an example.

## Billing semantics

- A **BLOCK verdict is a complete check** and is charged: your agent just learned it should not trade, which is the product.
- Settlement executes only after the check completes and the response is deliverable.
- No chargebacks. Failed or invalid payments produce no response body.

## Response (paid call)

JSON containing: `verdict` (`PASS` / `WARN` / `BLOCK`), consensus price, max deviation %, manipulation-risk score, cross-provider agreement/quorum, and attestation data when requested. BLOCK means: do not execute this trade against the price you read.

## MCP tool metering classes

| Class | Credits | Atomic (USDC 6dp) | USD    |
| ----- | ------- | ----------------- | ------ |
| C1    | 2       | 2000              | $0.002 |
| C2    | 4       | 4000              | $0.004 |
| C3    | 20      | 20000             | $0.02  |
| C4    | 40      | 40000             | $0.04  |

One credit is $0.001. Offline verification kinds (`execution_pair`,
`base_agent_swap`, `solana_swap`) are free; only `hyperliquid_perp`
verification reads live state and costs C2.

## Compliance notes

The service is a safety oracle. It does not custody funds, execute trades, or provide investment advice; it returns data and verdicts about price-feed integrity.
