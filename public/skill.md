# Insight: Pre-Trade Safety for Trading Agents

Insight tells an agent whether the price it is about to trade on is trustworthy. For one trade it returns an oracle-manipulation-aware verdict (PASS / WARN / BLOCK) computed from multi-provider oracle consensus, with optional verifiable EIP-712 attestation. Paid per call in USDC via x402 v2. No signup, no API key, no subscription.

Agent-facing contacts:

- Discovery manifest: `GET https://www.oracleinsight.xyz/.well-known/x402` (x402 v2; fixed-route `accepts[]`, plus explicit request-bound route and quote metadata)
- OpenAPI 3.1 contract: `GET https://www.oracleinsight.xyz/openapi.json`
- This manual: `GET https://www.oracleinsight.xyz/skill.md`

## Installable Agent Skills

- [Pre-Trade Safety Skill](https://www.oracleinsight.xyz/downloads/insight-pre-trade-safety-skill-v0.2.0.zip) — installable MCP configuration, no-money discovery check, and prompts for one proposed trade or DeFi action.
- [Base Aave V3 Lending Guard Skill](https://www.oracleinsight.xyz/downloads/insight-lending-guard-skill-v0.1.0.zip) — a deliberately narrow, exact-call decision layer for direct Base Aave V3 EOA `supply` and variable-rate `borrow` calls.
- [Base Agent Swap Guard Skill](https://www.oracleinsight.xyz/downloads/insight-base-agent-swap-guard-skill-v0.1.0.zip) — a narrow pre-signing workflow for reviewed Base Aerodrome Slipstream WETH→USDC or PancakeSwap V3 USDC→USDT direct swaps. It can be paid with x402 at C3 / $0.02 and returns no calldata for `CAUTION` or `BLOCK`.
- [Solana Swap Guard Skill](https://www.oracleinsight.xyz/downloads/insight-solana-swap-guard-skill-v0.1.0.zip) — a narrow pre-signing workflow and signed settlement closure for one exact unsigned Orca Whirlpool USDC/USDT 0.01% swap on Solana mainnet. It can be paid with x402 at C3 / $0.02 per decision and C4 / $0.04 per settlement call and returns no signable payload for `CAUTION` or `BLOCK`.
- [Base Perp Guard Skill](https://www.oracleinsight.xyz/downloads/insight-base-perp-guard-skill-v0.1.0.zip) — a decision-input skill for one Synthetix Perps V3 Base open-position intent, with disclosed spot/TWAP liquidity evidence and exact `commitOrder` call binding.
- [Hyperliquid Perp Guard Skill](https://www.oracleinsight.xyz/downloads/insight-hyperliquid-perp-guard-skill-v0.1.0.zip) — a decision-input skill for one reviewed Hyperliquid HyperCore open-position intent (BTC, ETH), with disclosed venue evidence and exact IOC order envelope binding.
- [Solana Perp Guard Skill](https://www.oracleinsight.xyz/downloads/insight-solana-perp-guard-skill-v0.1.0.zip) — a decision-input skill for one reviewed Drift Protocol v2 Solana open-position intent (SOL, BTC, ETH), with disclosed on-chain venue evidence (mark/oracle deviation, funding rate, open interest).

Install a package, then run its free discovery check before configuring a
credential or an x402 wallet. A successful discovery check does not call a
paid tool, ask for a signature, or send a transaction. Insight risk evidence
does not authorize execution; use a separate wallet-authorization and evidence
workflow when the caller needs one.

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

| Class | Atomic (USDC 6dp) | USD    |
| ----- | ----------------- | ------ |
| C1    | 2000              | $0.002 |
| C2    | 4000              | $0.004 |
| C3    | 20000             | $0.02  |
| C4    | 40000             | $0.04  |

## Compliance notes

The service is a safety oracle. It does not custody funds, execute trades, or provide investment advice; it returns data and verdicts about price-feed integrity.
