# Insight: Pre-Trade Safety for Trading Agents

Insight tells an agent whether the price it is about to trade on is trustworthy. For one trade it returns an oracle-manipulation-aware verdict (PASS / WARN / BLOCK) computed from multi-provider oracle consensus, with optional verifiable EIP-712 attestation. Paid per call in USDC via x402 v2. No signup, no API key, no subscription.

Agent-facing contacts:

- Discovery manifest: `GET https://www.oracleinsight.xyz/.well-known/x402` (x402 v2, full accepts[] for every endpoint)
- OpenAPI 3.1 contract: `GET https://www.oracleinsight.xyz/openapi.json`
- This manual: `GET https://www.oracleinsight.xyz/skill.md`

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
| `action`         | `swap`, `buy`, `sell`, or other trade verb                      |
| `tradeAmountUsd` | Notional size in USD                                            |
| `tokenAddress`   | Contract address of the token being priced/traded               |

Unauthenticated calls receive `HTTP 402` with a base64url `PAYMENT-REQUIRED` header (x402 v2). Sign one `accepts[]` entry and retry with the payment header.

### 2. MCP: tools/call over Streamable HTTP

```
POST https://www.oracleinsight.xyz/api/mcp
```

JSON-RPC `tools/call` access to the Insight tool catalog for x402-aware MCP clients. Each call is priced by its tool metering class; the 402 challenge carries the live quote.

## Payment

Scheme: `exact` (x402 v2, EIP-3009 transferWithAuthorization for EVM). Price: **$0.02 USDC** (`20000` atomic, 6 decimals) for the pre-trade check. The same 402 advertises:

| Network       | CAIP-2              | USDC asset                                     |
| ------------- | ------------------- | ---------------------------------------------- |
| Base          | `eip155:8453`       | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`   |
| Polygon PoS   | `eip155:137`        | `0x3c499c542cef5e3811e1192ce70d8cC03d5c3359`   |
| Arbitrum One  | `eip155:42161`      | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`   |
| Monad         | `eip155:143`        | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`   |
| BNB Chain     | `eip155:56`         | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`   |
| Solana devnet | `solana:EtWT…2xqa1` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

All entries pay to `0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231` (EVM). Pick the network matching your wallet's USDC inventory; the facilitator sponsors gas on EVM chains (no native gas needed). Notes: BNB Chain settles in the 18-decimal bridged USDC and has no EIP-3009 path — pay it with an x402 client that speaks the AEON facilitator flow (e.g. the AEON SDK); the other EVM entries use standard EIP-3009.

Readiness check: the endpoint answers a well-formed 402 at all times; verify before paying by issuing a plain unsigned GET.

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
| C2    | 8000              | $0.008 |
| C3    | 20000             | $0.02  |
| C4    | 40000             | $0.04  |

## Compliance notes

The service is a safety oracle. It does not custody funds, execute trades, or provide investment advice; it returns data and verdicts about price-feed integrity.
