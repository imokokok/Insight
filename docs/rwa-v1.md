# RWA / tokenized-equity integration v1 (unreleased, opt-in)

This is an additive EVM integration layer. Existing crypto price APIs, Pre-Trade,
Oracle Watch, coverage, execution receipts and partner contracts remain unchanged.
It is not a live stock feed subscription, an issuer attestation service, or legal
verification of token ownership. No production RWA signer or policy is activated.

## Three independently usable offers

- **Insight:** instrument-aware evidence diagnostics and portable, signed assessments
  produced by a customer's admitted signer after upstream authentication.
- **PriorSeal:** exact-call principal authorization and execution evidence, with an
  optional verifier for this assessment format. It remains usable without Insight.
- **Combined:** bind the authorization-time assessment to the actual call, check
  fresh execution-time evidence, then verify the receipt and both assessments.

## Data contract

The instrument ID hashes all of: underlying ID, issuer, token contract, settlement
chain, venue MIC, asset kind, currency, price basis and corporate-action version.
Ticker alone is not identity. Different issuers' tokens are different instruments.
Underlying spot, token-market and token-NAV prices are distinct descriptors.
EVM addresses use canonical lowercase hex; normalize them before constructing IDs.

The versioned [RWA instrument registry](rwa-instrument-registry.md) now maps share-class FIGI to
`underlyingId`, validates primary/segment MIC metadata, and binds the result to issuer UID, ISIN,
chain and token contract. It is an additional fail-closed admission layer; it does not change the
signed v1 shape or enter price quorum.

Prices are positive **integer strings scaled to 1e8**. No floating point median or
spread calculation is used. The upper median is selected for even counts; spread
is (maximum - minimum) / median. Report serialization is canonical sorted JSON.
EIP-712 domain: name `Insight RWA`, version `1`; type `RwaAssessment(bytes32 reportHash)`.
The signed content includes the environment, full input, policy hash, evaluation,
evaluation time and validity deadline.

Settlement chain and evidence chain are separate. An admitted feed read on chain 56
can support an explicitly mapped instrument token on chain 8453. A matching symbol
or token address on another chain is insufficient.

Feed IDs, operator/upstream groups and derived status are **consumer policy pins**,
not self-declarations from each quote. At least two providers and two non-derived
groups are required for price-dependent actions. Two wrappers of one upstream do
not establish independence. This minimum deliberately has no single-source override.

## Operation policy

Policies explicitly list buy, sell, borrow, collateralize, liquidate, redeem and/or
repay. Omitted actions are blocked. There is no universal production default.
The simulation profile is deliberately conservative:

- Price-dependent actions need current matching instrument/venue state, explicit
  permitted session, known-clear instrument halt and corporate-action status,
  sufficient admitted quotes, and configured reserve/eligibility assertions.
- Redemption additionally requires a non-paused redemption assertion.
- Repayment may explicitly skip price/market checks while retaining eligibility.
  No other operation can disable its price requirement.
- Closed-market trading requires a separately identified token-market price basis
  and explicit policy admission; the last underlying close is not a live token price.
- Freshness uses the original provider observation time, never retrieval time as a
  replacement. Expiry is exclusive and capped by the earliest required evidence.
- `UNKNOWN`, missing and expired required facts never authorize execution.
- Splits/dividends or other pending corporate actions block the price-dependent
  workflow. Once resolved, approve a new corporate-action version and instrument/
  policy hash; this module does not calculate distributions or adjust positions.

Reserve, eligibility and redemption are signed-assessor assertions, not proofs of
custody, solvency, legal entitlement or completed KYC. Eligibility here is scoped
to the request sender; production issuers must additionally enforce all required
receiver, jurisdiction and transfer restrictions. The assessor must decode the
actual call and confirm the declared action/amount match its contract semantics.
Exact bytes alone cannot prove economic meaning, position limits, slippage or fills.
Those existing Agent/protocol checks must remain in the workflow.

## SDK usage

Build the workspace SDK with `npm run sdk:build`; the changes are not yet published
in npm version 0.4.0.

1. Define the instrument and compute `rwaInstrumentId(instrument)`.
2. Review and independently pin the exact policy using `rwaPolicyId(policy)`.
3. Authenticate upstream data; preserve timestamps, chains, price basis and
   corporate-action version.
4. Call `buildRwaReport(input, policy, nowSeconds)`.
5. A trusted assessment producer may sign `rwaSigningData(report)` with a separately
   managed key. The public diagnostic endpoint never performs this step.
6. Consumers call `verifyRwaReport(proof, trust, nowSeconds)`. Trust must come from
   out-of-band configuration, not from the same untrusted evidence attachment.

`normalizeRwaChainlinkRound` supports admitted on-chain latestRoundData reads;
it rejects nonpositive/incomplete rounds and retains updatedAt. Authenticate the
proxy, chain, RPC provenance, actual decimals and instrument mapping separately.

`normalizeRwaChainlinkV11` supports **already authenticated and decoded** Data
Streams mid reports, nanosecond mid timestamps and marketStatus 0–5. It does not
authenticate Data Streams reports or reuse mid timestamps for bid/ask data.
Neither adapter fabricates instrument-halt, corporate-action or issuer evidence.
Scaling rejects precision loss/overflow rather than silently rounding.

For Robinhood Stock Tokens, the optional
[Robinhood issuer-context integration](rwa-robinhood.md) supplies first-party halt,
corporate-action and multiplier facts plus an on-chain ERC-8056 cross-check. It is
explicitly excluded from oracle quorum and remains non-authorizing.

## HTTP and MCP

- `POST /api/v1/rwa/assessment`, JSON body `{input, policy}`.
- `GET /api/v1/rwa/robinhood/context?symbol=AAPL` retrieves non-authorizing
  first-party issuer context; it is not an oracle observation.
- `GET /api/v1/rwa/robinhood/instrument?symbol=AAPL` resolves committed MIC/FIGI identity and
  cross-checks issuer UID, ISIN and deployment; it remains non-authorizing master data.
- Typed client: `InsightClient.rwaAssessment(input, policy)`.
- Typed issuer-context client: `InsightClient.robinhoodRwaContext(symbol)`.
- Typed master-data client: `InsightClient.robinhoodRwaInstrument(symbol)`.
- MCP tool: `assess_rwa_evidence`.
- MCP issuer-context tool: `get_robinhood_rwa_context`.
- MCP instrument tool: `get_robinhood_rwa_instrument`.
- [Machine-readable strict request schema](../public/rwa-assessment.schema.json).
- Authentication/credits use existing middleware. HTTP and MCP cost C1 (0.5 credit);
  no paid feed retrieval or production signing occurs in this endpoint.
- Result: `mode: diagnostic`, `mayAuthorizeExecution: false`,
  `evidenceProvenance: caller-supplied-unverified`, and the computed report.
- Server controls evaluation time; caller timestamps are not refreshed. An ALLOW
  diagnostic is not a signature and is insufficient for any execution helper.
- Existing hosted URLs do not gain these capabilities until reviewed deployment.

The [example request](../examples/rwa-v1/diagnostic-request.json) intentionally uses
a fixed simulation clock for reproducible tests. At other times it should fail
freshness checks. Never rewrite real source timestamps to make such a test pass.

## Validation and activation

`npm run sdk:test` covers the portable protocol. Root Jest tests cover HTTP
validation, MCP diagnostics and published schema parity.
`npm run rwa:registry:check` validates the pinned registry offline, while
`npm run rwa:reference:verify` performs an explicit read-only drift check against ISO MIC,
OpenFIGI and Robinhood.
`node examples/rwa-v1/probe-public-feeds.mjs` performs optional public read-only
stock-feed probes without secrets, signing or admission.

The [2026-09-20 probe](../examples/rwa-v1/public-probe-2026-09-20.json) returned rounds
for six configured Chainlink stocks. Their source ages were 45,023–62,007 seconds.
This is one provider across six instruments, not multiple independent sources for
one instrument. It does not meet the simulation profile's 60-second trading limit.
Market closure must be handled by policy and distinct price basis, not by pretending
old observations are fresh.

Before production: procure/admit two independently sourced licensed feeds; define
one exact issuer/token/venue instrument; authenticate instrument-level halt and
corporate-action feeds; contract issuer/eligibility/redemption sources; review
action semantics; provision a dedicated signer and revocation process; measure
coverage under real sessions; run shadow mode and then a capped opt-in pilot.
Never substitute fixture keys, simulation evidence or this snapshot for those gates.

Sources: [Chainlink equities guide](https://docs.chain.link/data-streams/rwa-streams/24-5-us-equities-user-guide),
[Ondo tokenized-stock overview](https://ondo.finance/ondo-stocks).
