# x402 and MPP pay-per-call quickstart

Call the Insight pre-trade safety check with **no account and no API key**. An
unauthenticated request receives an HTTP 402 challenge ($0.02 USDC on Base,
network `eip155:8453`); an x402 client retries with `PAYMENT-SIGNATURE`, while
an MPP client retries with `Authorization: Payment`. Both sign EIP-3009
`transferWithAuthorization` and use the configured facilitator. MPP is available
when enabled on the deployment. A failed call is never settled.

Live docs: https://www.oracleinsight.xyz/docs/x402

## Files

| File                    | Stack                                                                                        | Run                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pre-trade.mjs`         | TypeScript/Node, official `@x402/fetch` + `@x402/evm` (same version line the server runs on) | `npm i @x402/fetch @x402/evm viem` then `EVM_PRIVATE_KEY=0x... node pre-trade.mjs`                         |
| `pre-trade.py`          | Python, official `x402[httpx,evm]` SDK                                                       | `pip install "x402[httpx,evm]"` then `EVM_PRIVATE_KEY=0x... python pre-trade.py`                           |
| `pre-trade-mpp.mts`     | TypeScript/Node, official `mppx` EVM client                                                  | `npm i mppx viem zod` then `EVM_PRIVATE_KEY=0x... npx tsx pre-trade-mpp.mts`                               |
| `mcp-pre-trade-mpp.mts` | TypeScript/Node, MCP SDK with `mppx/mcp/client`                                              | `npm i @modelcontextprotocol/sdk mppx viem zod` then `EVM_PRIVATE_KEY=0x... npx tsx mcp-pre-trade-mpp.mts` |

Both need a wallet with a small USDC balance on Base mainnet (a few cents is
plenty at $0.02 per check).

## MCP tools/call

The same x402 client pays for unauthenticated `tools/call` against the hosted
MCP server (`https://www.oracleinsight.xyz/api/mcp`). `initialize`,
`tools/list`, and `ping` are free; `tools/call` is priced by the tool's
metering class (1 credit = $0.004: C1 = $0.002, C2 = $0.008, C3 = $0.02,
C4 = $0.04). Body shape:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "pre_trade_safety_check",
    "arguments": { "asset": "ETH", "chainId": 1, "action": "swap", "tradeAmountUsd": 1000 }
  }
}
```

The settle receipt arrives in the `payment-response` response header; decode it
(base64 JSON) and read `.transaction` for the BaseScan link.

When `MPP_MCP_ENABLED=true`, the separate MPP endpoint
(`https://www.oracleinsight.xyz/api/mcp/mpp`) supports only
`pre_trade_safety_check` at $0.02. Its MCP client uses standard MPP challenge,
credential, and receipt metadata. The challenge is bound to the canonical tool
arguments, and failed tool calls do not settle. The full catalog at `/api/mcp`
continues to support x402 and API keys.

## Verify what you paid for

- Online, keyless: `POST https://www.oracleinsight.xyz/api/v1/safety/attestation/verify`
- Offline: `npm install verify-insight-receipt` recomputes the EIP-712 hash
  locally with no API key and no network request.
