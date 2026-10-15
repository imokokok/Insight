# Authentication for Insight APIs

**No accounts. No API keys. No OAuth. Payment is the authentication.**

Insight's paid endpoints use HTTP 402 payment challenges on two interoperable
rails. You authenticate by paying — and settlement only happens after the
business outcome succeeds.

## Free (no payment required)

| Route                                                  | Notes                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `GET /api/v1/safety/pre-trade` without payment headers | Returns `402` + payment challenge. Doubles as a free health check. |
| MCP `initialize`, `tools/list`                         | Free discovery of the tool catalog.                                |

## Paid (pay per call, $0.02 USDC on configured EVM networks; Base and Polygon in production)

Every paid response starts as `402` carrying **both** rails — use whichever
your client stack speaks:

- **x402 v2** — `PAYMENT-REQUIRED` header (base64). Clients: `@x402/fetch`,
  `x402-axios`, or any EIP-3009 signer. The quote lists configured EVM and
  optional Solana networks; pay on one listed network and retry with the
  `PAYMENT-SIGNATURE` header.
- **MPP** — `WWW-Authenticate: Payment` header, realm `www.oracleinsight.xyz`.
  Clients: `mppx` 0.12+. Pay USDC on the single configured EVM network
  (EIP-3009, gasless), retry with the MPP proof header.

For x402, `X402_EVM_NETWORKS` can enable multiple EVM networks. If unset, the
service uses `X402_NETWORK` alone. The same EVM pay-to address is used on every
listed chain, but each chain has its own USDC contract and balance. Only enable
networks that the configured facilitator advertises for x402 v2 `exact` in
`/supported`.

Set `X402_EVM_ENABLED=false` to keep a configured EVM recipient inactive while
enabling Solana x402. If unset, EVM behavior remains compatible with the
existing `X402_ENABLED` and `X402_PAY_TO` settings.

The challenge scope binds the payment to the exact resource (REST URL, or MCP
tool name + canonicalized arguments), so receipts cannot be replayed against
different requests.

## Settlement guarantee

`quote_issued → business_succeeded → payment_verified → settled`

The oracle check runs first; **settlement only executes after the check
succeeds**. If the check fails, you are not charged.

## References

- OpenAPI (with `x-payment-info` per endpoint): https://www.oracleinsight.xyz/openapi.json
- llms.txt: https://www.oracleinsight.xyz/llms.txt
- Docs: https://www.oracleinsight.xyz/docs/x402
- EVM payee: `0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231` (same address on each configured EVM chain)
