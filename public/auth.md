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

## Paid (pay per call, $0.02 USDC on Base)

Every paid response starts as `402` carrying **both** rails — use whichever
your client stack speaks:

- **x402 v2** — `PAYMENT-REQUIRED` header (base64). Clients: `@x402/fetch`,
  `x402-axios`, or any EIP-3009 signer. Pay USDC on Base, retry with the
  `X-PAYMENT` header.
- **MPP** — `WWW-Authenticate: Payment` header, realm `www.oracleinsight.xyz`.
  Clients: `mppx` 0.12+. Pay USDC on Base (EIP-3009, gasless), retry with the
  MPP proof header.

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
- Payee: `0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231` (USDC, Base)
