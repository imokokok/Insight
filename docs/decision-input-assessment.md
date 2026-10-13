# Decision-input sufficiency assessment (v1)

The pre-trade API can optionally assess whether an application's asset price
input and venue quote are supported by current external evidence. Its
`decisionInputAssessment` is separate from the existing oracle `verdict` and is
not included in the EIP-712 oracle attestation.

The MCP `agent_begin_trade` workflow uses the assessment as a required
pre-execution gate for both assets in a swap. It issues a handle only when both
asset assessments are `SUFFICIENT`, the caller-supplied route quote is fresh and
within the tightest caller reference/slippage limit (capped at 50 bps), both oracle verdicts
allow execution, and both pre-trade attestations are signed. The signed
Execution Receipt later references both pre-trade UIDs. Once migration
`0085_decision_input_assessment.sql` is applied, those UIDs join the receipt to
the source and destination assessments in `pre_trade_checks`.

The assessment data and caller quotes remain unsigned audit context. The
EIP-712 receipt cryptographically commits to the pre-trade attestations and
their UIDs, but does not cryptographically commit to the assessment JSON or
caller-supplied route quote. The route quote is persisted alongside each
pre-trade assessment so an auditor can reconstruct what the gate evaluated.

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
`routeQuoteObservedAt`. The agent must obtain these from the application or
venue that produced the proposed operation.

## Evidence used

- **Chainlink:** a catalogued on-chain USD feed for the requested asset and
  chain, checked against that feed's heartbeat.
- **CEX reference:** the latest stored hourly market reference, provided it is
  less than three hours old, has at least two exchanges, and includes a
  cross-exchange spread.
- **DEX depth context:** the latest manipulation-cost snapshots for the
  Ethereum mainnet pool map, provided they are less than two hours old. The v1
  map covers ETH/WETH, USDC, and WBTC on chain 1.
- **Caller inputs:** decision price, venue quote, quote timestamp, and explicit
  tolerances.

Chainlink and CEX prices are compared against the caller's decision price.
The quote is compared against the decision price. The CEX spread is also
compared against `maxReferenceDeviationBps`. The DEX manipulation-cost figure
is included as market-depth context and is not used as an execution-slippage
estimate.

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
checks. A `SUFFICIENT` result does not prove that the caller's quote is
authentic, route-specific, or executable at the time of submission. In
particular, the DEX figure is a manipulation-cost proxy, not a route quote,
price-impact estimate, or guarantee of available liquidity. Unsupported asset
or chain coverage fails closed in `agent_begin_trade` and returns no execution
handle.

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
