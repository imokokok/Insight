---
name: insight-pre-trade-safety
description: Check whether the price an agent is about to trade on is trustworthy. Returns an oracle-manipulation-aware verdict (PASS / WARN / BLOCK) for one trade, computed from multi-provider oracle consensus, with max deviation, manipulation-risk score, and an optional verifiable EIP-712 attestation. $0.02 per check in USDC via x402 v2 — no signup, no API key, no subscription. Invoke before executing any swap / buy / sell, when sizing DEX trades, when a quoted price looks off, or when the user asks "is this price safe to trade", "check for oracle manipulation", "run a pre-trade check", or asks to verify price-feed integrity. Works for agents settling on Monad (eip155:143), Base, Polygon, Arbitrum One, BNB Chain, and Solana.
---

# Insight — Pre-Trade Safety Check

Insight answers one question: **can this price be trusted right now?** For a
single trade it returns:

- `verdict` — `PASS` / `WARN` / `BLOCK` (BLOCK = do not execute against the price you read)
- consensus price and max deviation %
- manipulation-risk score with cross-provider agreement / quorum
- optional EIP-712 attestation any third party can re-verify offline

## How to call

Plain HTTP:

```
GET https://www.oracleinsight.xyz/api/v1/safety/pre-trade
    ?asset=USDC
    &chainId=8453
    &action=swap
    &tradeAmountUsd=1000
    &tokenAddress=0x...
```

| Param            | Meaning                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `asset`          | The asset being traded (e.g. `USDC`)                                        |
| `chainId`        | EVM chain id of the trade venue (`1` Ethereum, `8453` Base, `143` Monad, …) |
| `action`         | `swap`, `borrow`, `lend`, `liquidate`, or `repay`                           |
| `tradeAmountUsd` | Notional size in USD                                                        |
| `tokenAddress`   | Contract address of the token being priced/traded                           |

MCP clients: `POST https://www.oracleinsight.xyz/api/mcp` (JSON-RPC `tools/call`, metered per tool class).

## Payment (x402 v2, exact scheme)

An unauthenticated call returns `HTTP 402` with a base64url `PAYMENT-REQUIRED`
header listing `accepts[]`. Sign one entry and retry with the payment header.
Price: **$0.02 USDC** (`20000` atomic, 6 decimals) for the pre-trade check.

Settle in USDC on whichever network matches your wallet's inventory:

| Network      | CAIP-2               | USDC asset                                     |
| ------------ | -------------------- | ---------------------------------------------- |
| Base         | `eip155:8453`        | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`   |
| Polygon PoS  | `eip155:137`         | `0x3c499c542cef5e3811e1192ce70d8cC03d5c3359`   |
| Arbitrum One | `eip155:42161`       | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`   |
| Monad        | `eip155:143`         | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`   |
| BNB Chain    | `eip155:56`          | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`   |
| Solana       | `solana:5eykt4…Kvdp` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

The facilitator sponsors gas on EVM chains and Solana — no native gas token
needed. BNB Chain settles in the 18-decimal bridged USDC via the AEON
facilitator flow; the other EVM entries use standard EIP-3009; Solana uses the
exact-scheme SVM flow.

Full discovery manifest: `GET https://www.oracleinsight.xyz/.well-known/x402`
OpenAPI 3.1 contract: `https://www.oracleinsight.xyz/openapi.json`
Full manual: `https://www.oracleinsight.xyz/skill.md`

## Billing semantics

- A `BLOCK` verdict is a completed check and is charged — your agent just
  learned it should not trade, which is the product.
- Settlement executes only after the check completes and the response is
  deliverable. No chargebacks; failed payments produce no response body.

Insight is a safety oracle: it does not custody funds, execute trades, or
provide investment advice.
