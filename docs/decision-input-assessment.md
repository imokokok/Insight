# Decision-input sufficiency assessment (v1)

The pre-trade API can optionally assess whether an application's asset price
input and venue quote are supported by current external evidence. Its
`decisionInputAssessment` is separate from the existing oracle `verdict`. When
the Insight attester is configured, the assessment carries its own EIP-712
attestation over the canonical JSON assessment (with the nested `attestation`
property omitted from the digest). This leaves the existing oracle attestation
schema unchanged.

The MCP `agent_begin_trade` workflow uses the assessment as a required
pre-execution gate for both assets in a swap. It independently simulates the
exact-notional route through reviewed Uniswap V3 pools on Ethereum mainnet. The
input amount is sized with a fresh Chainlink USD observation (WBTC follows the
existing BTC/USD fallback and records that peg assumption), and two distinct
RPC hosts must agree on the chain, block hash, and exact route output. The
caller-reported route quote remains as a comparison input. A handle is issued
only when both asset assessments are `SUFFICIENT`, both the on-chain quote and
caller quote are fresh, the on-chain quote matches the oracle cross-rate, the
caller quote matches the on-chain quote within the tightest policy (capped at
50 bps), both oracle verdicts allow execution, and both oracle and
decision-input attestations are signed. Supported routes are ETH/WETH, USDC,
and WBTC pairs on Ethereum mainnet; unsupported pairs or unavailable RPC
agreement fail closed. The signed Execution Receipt later references both
pre-trade UIDs. Once migration
`0085_decision_input_assessment.sql` is applied, those UIDs join the receipt to
the source and destination assessments in `pre_trade_checks`. Migration
`0086_market_reference_source_coverage.sql` makes the CEX source count reflect
independent exchanges by reducing each exchange's 15-minute observations to
one hourly median before cross-exchange aggregation.

The separate decision-input signature commits to the exact assessment JSON,
including its policy, prices, normalized per-source snapshot hashes, source
evidence summary, caller-supplied prices, the route quote and any on-chain
block/path/amount evidence, and `quoteInputHash`. It is linked to the
corresponding pre-trade UID and expires after five minutes. The snapshot hashes cover the
normalized Chainlink observation, stored CEX rollup, and DEX advisory consumed
by the assessment. The Execution Receipt still commits to the pre-trade UIDs; a verifier
can follow those UIDs to the separately signed assessment in the audit rows.
The signature proves assessment integrity and issuer identity. It does not
authenticate the caller's quote source, prove an external source is correct, or
authorize a transaction.

## Request

Call the existing authenticated or paid endpoint with the opt-in flag and all
six accompanying fields:

```sh
curl --get 'https://www.oracleinsight.xyz/api/v1/safety/pre-trade' \
  --data-urlencode 'asset=ETH' \
  --data-urlencode 'chainId=1' \
  --data-urlencode 'action=swap' \
  --data-urlencode 'tradeAmountUsd=10000' \
  --data-urlencode 'decisionInputCheck=1' \
  --data-urlencode 'decisionPriceUsd=2500' \
  --data-urlencode 'quotePriceUsd=2501' \
  --data-urlencode "quoteObservedAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --data-urlencode 'maxReferenceDeviationBps=50' \
  --data-urlencode 'maxSlippageBps=75' \
  --data-urlencode 'maxQuoteAgeSeconds=30' \
  --header 'x-api-key: YOUR_API_KEY'
```

`decisionPriceUsd` and `quotePriceUsd` are USD per asset. The quote and its
timestamp come from the caller. The timestamp must include a timezone. The
caller supplies the three tolerances; the API does not silently select a
trading strategy's risk limits.

The MCP `pre_trade_safety_check` tool accepts the same six values nested under
`decisionInput`; this direct tool remains advisory. `agent_begin_trade` requires
source and destination `decisionInput` objects, each containing those six
values, plus a `routeQuotePrice` (destination per source) and
`routeQuoteObservedAt` for comparison. Insight independently obtains the
execution-sized Uniswap V3 quote for supported Ethereum pairs; the
caller-reported values do not establish the price source.

## Verify the assessment signature

If `decisionInputAssessment.attestation` is present, submit the exact
`decisionInputAssessment` object from the API response:

```sh
curl 'https://www.oracleinsight.xyz/api/v1/safety/decision-input/verify' \
  --header 'content-type: application/json' \
  --data-binary "$(jq -c '{assessment: .data.decisionInputAssessment}' pretrade.json)"
```

The endpoint recomputes the assessment digest, EIP-712 UID, and signature, and
checks that the signer is Insight's published attester and that the
five-minute validity window has not expired. The result returns the pre-trade
UID committed by the signature; the caller compares it with the paired signed
pre-trade attestation. `GET` on the same endpoint returns the attester address
and frozen EIP-712 descriptor for independent verifiers.
If the signature is absent, the assessment remains an advisory result and
`agent_begin_trade` will not issue an execution handle.
Before issuing a handle, `agent_begin_trade` verifies each assessment's strict
v1 shape, canonical digest, EIP-712 signature, published key window and expiry,
then checks that its signed `linkedPreTradeUid` matches that asset's pre-trade
attestation UID. A signature string by itself is never accepted as proof.

For an `agent_begin_trade` handle, the signed assessment also contains the
Uniswap V3 path, exact input/output amounts, Chainlink notional-price round and
pricing basis, and the agreed block number/hash. The verifier endpoint checks Insight's signature;
the Quoter call is pinned to that block hash and requires the block to remain
canonical. An independent chain replay can call the published Quoter V2
contract with that path and input amount at the same block hash and compare the
output. A reorg or RPC that cannot honor the hash-pinned call fails closed.
This is an RPC-reproducible record, not a light-client proof.

## SDK integration

The SDK's `PreTradeRequest.decisionInput` sends the six fields above through the
authenticated endpoint. `verifyDecisionInputAssessment()` verifies the
assessment digest, EIP-712 signature, key-registry window, and consumer-pinned
numeric policy locally. `verifyDecisionInputPair()` additionally checks each
assessment against the request and its matching pre-trade UID, and checks the
operator's label-to-CAIP-19 asset mapping.

The unreleased SDK source adds `executeTrustedV3SwapWithPriorSeal()` for the
exact original Uniswap V3 `exactInputSingle` shape. It binds the two decision
inputs, two oracle attestations, unsigned local transaction review, and any
enabled coverage reports into the one-use PriorSeal intent before submission.
Use `createPriorSealDefiSubmitter()` with PriorSeal's Node DeFi gateway to
recheck the approved router, runtime code hash, transaction and authorization
at the signing/broadcast boundary. The SDK rechecks the quote timestamps before
authorization and submission, caps the receipt slippage ceiling to the
consumer policy, and expires authorization at the earliest quote freshness
deadline. It then collects Insight's execution
receipt and PriorSeal's observation independently and preserves a checkpoint
for evidence-only recovery. The combined report still labels verification as
service-derived; local input verification and RPC simulation do not
independently verify the issuers' execution receipts. The application remains
responsible for routing every signing path for the covered strategy through
the gateway. Other router selectors, multi-hop calls, and unsupported token
deployments are outside this adapter. The SDK source changes are not included
in the published package yet.

## Evidence used

- **Chainlink:** a catalogued on-chain USD feed for the requested asset and
  chain, checked against that feed's heartbeat.
- **RedStone:** an additional USD reference from the existing RedStone API
  adapter. A fresh observation (at most five minutes old) is compared with the
  decision price and can block on excess deviation. Missing or stale RedStone
  data is retained as optional evidence where available and does not by itself
  lower the assessment status.
- **CEX reference:** the latest stored hourly market reference, provided it is
  less than three hours old, has at least two independent exchanges, and
  includes a cross-exchange spread. Each venue is first reduced to one hourly
  median, so the four 15-minute samples from one exchange cannot inflate the
  source count or outweigh another venue.
- **DEX depth context:** the latest manipulation-cost snapshots for the
  Ethereum mainnet pool map, provided they are less than two hours old. The v1
  map covers ETH/WETH, USDC, and WBTC on chain 1.
- **Caller inputs:** decision price, venue quote, quote timestamp, and explicit
  tolerances.

Chainlink, fresh RedStone, and CEX prices are compared against the caller's
decision price. The supplied per-asset quotes are compared against their
decision prices. The CEX spread is also compared against
`maxReferenceDeviationBps`. The DEX manipulation-cost figure is included as
market-depth context and is not used as an execution-slippage estimate. In
`agent_begin_trade`, the independent Uniswap V3 quote is separately compared
against the oracle cross-rate and the caller-reported route quote.

RedStone is a separate provider path, but its API response is not independently
signature-verified by this assessment and may share upstream market venues with
the other references. The signed snapshot records its reported timestamp,
provider/source label, and observed price so a verifier can inspect exactly what
the assessment used.

## Additional source candidates

- **Pyth Hermes:** a useful next oracle reference for ETH, BTC, and stablecoin
  coverage. The current Hermes integration requires a Pyth API key, so it is
  not enabled here until that credential and feed-specific freshness limits are
  configured. See [Pyth's current setup guide](https://docs.pyth.network/price-feeds/core/getting-started).
- **Uniswap V3:** already used for block-pinned, exact-notional route simulation
  in the gated MCP flow and for the separate manipulation-cost pool map. A
  future multi-pool TWAP can add a time-windowed on-chain signal, but should be
  kept distinct from the execution quote.
- **Kraken and Crypto.com for WBTC/USD:** both list direct WBTC/USD spot
  markets: Kraken's [WBTC/USD market page](https://www.kraken.com/convert/wbtc/usd)
  confirms the pair, and Crypto.com's [current instrument catalog](https://api.crypto.com/exchange/v1/public/get-instruments)
  lists `WBTC_USD` as a tradable currency pair. Coinbase's [WBTC availability page](https://www.coinbase.com/how-to-buy/wrapped-bitcoin)
  specifies DEX trading rather than a Coinbase centralized-exchange market.
  The collector now records Kraken and Crypto.com for WBTC, while Coinbase
  remains an explicit unsupported-pair observation. The manual historical
  backfill now uses Kraken and Crypto.com for WBTC; existing rows are not
  changed automatically. Crypto.com's
  [`public/get-tickers` API](https://exchange-developer.crypto.com/exchange/v1/docs/api/rest-single-page/)
  supplies the latest trade, top of book, 24-hour volume, instrument, and
  publish time. The `public/get-candlestick` endpoint on the same API supplies
  historical hourly closes and volume for backfill. Both paths validate the
  returned pair and timestamps before storage. The collector also rejects a
  latest trade outside the same ticker response's best bid/ask so an internally
  inconsistent quote does not count toward WBTC coverage.
  The two-venue CEX reference becomes usable after successful rows from both
  sources land in the same hour through scheduled sampling or the manual
  historical backfill. Until then, the assessment remains
  `INSUFFICIENT_EVIDENCE` for WBTC.
- **Binance for WBTC/USD:** Binance's public market catalog currently lists
  active WBTC/USDT and USDT/USD spot markets. The collector derives an explicit
  USD quote from the product of the two best bid/ask books and takes the
  converted midpoint as the reference price. It validates both fresh trade
  timestamps and both books, and preserves the older trade time. This
  provides a third exchange observation alongside Kraken and Crypto.com while
  keeping the USDT conversion visible. Live sampling and matched hourly
  backfill are implemented behind the commercial-license switch; Binance stays
  off until commercial-use terms are confirmed. CEX.IO was removed after live
  verification found its newest returned WBTC trade was stale despite a current
  ticker response.
- **Bitstamp and Bitfinex:** both are implemented as optional direct-USD spot
  sources. The collector discovers active USD spot pairs from each venue's
  public catalog, validates live source timestamps, and keeps each venue as an
  independent row in the hourly reference. Licensed hourly-candle backfill is
  also available for both. Collection stays disabled until written commercial
  data-use permission is confirmed and the venue is added to
  `MARKET_REFERENCE_LICENSED_EXCHANGES`.
- **Gemini:** provides a direct USD spot source for its supported ticker set.

## Result

- `SUFFICIENT`: all required evidence is present and fresh, the CEX has at least
  two observations, and the supplied prices fit the caller's limits.
- `BLOCK`: an observed price difference or CEX spread exceeds an explicit
  caller-supplied tolerance.
- `INSUFFICIENT_EVIDENCE`: a required source is missing or stale, the quote is
  stale, the CEX coverage is too low, or the DEX evidence is outside the v1
  coverage map.

`eligibleToProceed` is true only for `SUFFICIENT`. That status is one gate in
`agent_begin_trade`; it is not a transaction authorization. Integrators still
need their own transaction authorization, simulation, wallet, and protocol
checks. A `SUFFICIENT` result does not authenticate caller-supplied per-asset
quotes. The on-chain route simulation proves that the reviewed Uniswap V3 path
returned an output against a block agreed by two configured RPC hosts; it is
not a cryptographic light-client proof and does not guarantee a later
transaction will execute at that price. The user may submit through another
router, and state, gas, MEV, and liquidity can change after the quoted block.
The DEX manipulation-cost figure remains a separate pool-depth proxy, not an
execution quote. Unsupported assets or chain coverage fail closed in
`agent_begin_trade` and return no execution handle.

## Audit linkage

The persisted assessment rows link to a completed receipt through the
attestation UIDs already present on the receipt audit table:

```sql
SELECT
  receipt.uid AS execution_receipt_uid,
  receipt.execution_status,
  source.attestation_uid AS source_pre_trade_uid,
  source.decision_input_assessment AS source_input_assessment,
  source.decision_input_gate AS combined_input_gate,
  destination.attestation_uid AS destination_pre_trade_uid,
  destination.decision_input_assessment AS destination_input_assessment
FROM public.execution_receipts AS receipt
LEFT JOIN public.pre_trade_checks AS source
  ON source.attestation_uid = receipt.pre_trade_uid
LEFT JOIN public.pre_trade_checks AS destination
  ON destination.attestation_uid = receipt.destination_pre_trade_uid
WHERE receipt.uid = '<execution-receipt-uid>';
```

`decision_input_gate` is written to both pre-trade rows before an execution
handle is issued. If that durable audit write fails, `agent_begin_trade` fails
closed and returns no handle.

To export one operation's full evidence chain — the signed assessments, the
gate audit, the signed receipt, and client-held oracle envelopes or PriorSeal
objects — as a single manifest-hashed bundle, see [evidence-pack.md](evidence-pack.md).
