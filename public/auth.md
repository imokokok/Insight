# Authentication for Insight APIs

Insight supports two access paths: account-based API keys billed against credits, or
keyless pay-per-call through x402 (and MPP where enabled). Choose one for each
request; API keys do not require a payment signature or wallet.

Keyless paid requests use HTTP 402 payment challenges on two interoperable
rails. Payment is verified before the response is settled, and settlement
only happens after the business outcome succeeds. API-key requests use the
account's credit balance instead.

## Free (no payment required)

| Route                          | Notes                               |
| ------------------------------ | ----------------------------------- |
| MCP `initialize`, `tools/list` | Free discovery of the tool catalog. |

An unauthenticated pre-trade request is not a free health check: when
pay-per-call is enabled, it returns a `402` payment quote. Issuing the quote
does not charge; payment is required to run the assessment. Use `/api/v1/health`
for a free service-health response.

## API key access

Sign in, create an API key in Settings, and send it in the `X-API-Key`
header on metered REST calls or configure `INSIGHT_API_KEY` for the MCP
launcher. Key-authenticated calls consume account credits and do not start a
wallet payment flow. Email verification is required for the one-time 400-credit
trial grant; it is not part of API-key authentication.

## Paid (pay per call, $0.02 USDC on configured EVM networks; Base and Polygon in production)

Every keyless paid request starts as `402` carrying **both** rails — use
whichever your client stack speaks:

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
