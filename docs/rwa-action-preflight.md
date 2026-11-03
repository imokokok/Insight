# RWA action preflight SDK

`preflightRwaAction` is the source-adapter workflow for applications that need to check one
tokenized-equity action before continuing. The caller supplies its own issuer, market, price and
eligibility adapters; Insight collects their evidence, checks it against a pinned policy, decodes
the exact proposed transaction, and returns the existing RWA v2 assessment format.

The first supported product scope remains EVM tokenized equities and ETFs, with buy/sell as the
initial exact-call workflow. The adapter interface is issuer-neutral: an app can add another issuer
without changing the RWA report protocol. No second issuer's facts or deployment are assumed here;
selecting and admitting one should follow buyer validation and source/deployment review.
The committed instrument and execution registries currently contain only Robinhood entries, all in
`SHADOW`; another issuer cannot use the production-admission path until its identity, source rights
and exact execution deployment have been separately reviewed and admitted.

`createRobinhoodRwaMarketProvider` connects the existing first-party issuer context to this flow.
It checks the reported issuer, ticker, chain and token address, and only contributes market state;
Robinhood quote data does not enter the independent price quorum. By default, session remains
`UNKNOWN`. To supply one, create a validated `createRobinhoodRwaSessionResolver` and pass the same
resolver instance to the market and Chainlink providers. It shares one session observation within
the preflight request so the adapters cannot disagree because they fetched across a session
boundary. When a resolver is enabled, set `marketSourceId` to a policy-pinned composite ID; the
resulting market state combines Robinhood halt/corporate-action fields with the external session.
If issuer integrity is unresolved, clear halt or corporate-action fields are downgraded to
`UNKNOWN`.

`createRobinhoodChainlinkPriceProvider` reads a caller-pinned Chainlink feed and the registered
Robinhood token contract at one Robinhood Chain block. Chainlink documents that the feed value is
the underlying equity market price multiplied by the token's `uiMultiplier`, including corporate
action adjustments; the adapter divides by the on-chain multiplier and rounds half-up to the SDK's
1e-8 fixed-point precision to produce the registry's `underlying-spot` basis. It checks the token
UID, chain, feed policy entry, round completeness, multiplier state and `oraclePaused()` before
contributing a price. A paused feed, staged multiplier, or future `effectiveAt` returns no price;
RPC errors are reported as source unavailable. See [Chainlink's Robinhood feed documentation](https://docs.chain.link/data-feeds/tokenized-equity-feeds/robinhood).

The consuming application must obtain and pin the feed address from [Chainlink's official feed
address directory](https://docs.chain.link/docs/data-feeds/price-feeds/addresses), confirm its ticker-to-token mapping against the reviewed
instrument registry, and decide how the source maps to the policy's source group and `derived`
setting. The adapter does not verify that an arbitrary address came from that directory. It also
does not infer market session from `updatedAt`: Chainlink documents that these feeds may hold their
last value off-hours and have no off-hours heartbeat. Supply a separately sourced observation
through a session resolver such as `createIsOpenNowRwaSessionResolver`; leaving it unset attaches
`UNKNOWN`, which cannot satisfy price/session evaluation. Session observations include the pinned source ID, MIC,
observation time and validity deadline. The feed's `updatedAt` is still subject to the policy's
`maxPriceAgeSeconds` bound.

For instruments whose admitted primary MIC is `XNAS` or `XNYS`, the SDK provides
`createIsOpenNowRwaSessionResolver()`. It queries the public [isopennow status API](https://www.isopennow.com/api/)
at `/api/status/nasdaq` or `/api/status/nyse`, binds the response to the expected MIC and
`America/New_York`, and caches each market's response for at most one minute. No API key or account
is required. The API publishes a 30-second HTTP cache lifetime and recommends no more than one
request per minute per market. It reports only whether the continuous core session is open: `open`
maps to `REGULAR`, `closed` maps to `CLOSED`, and `unknown` maps to `UNKNOWN`. It does not separate
pre-market from post-market; those sessions, auctions and other non-continuous phases count as
closed. Other MICs, including `ARCX`, are rejected. A reported unscheduled suspension maps to
`CLOSED`.

This is a zero-cost secondary source, not an exchange authority. Its calendar is compiled from
exchange publications and third-party data; it may be wrong or out of date, has no service-level
commitment, and may change or disappear. The maintainer explicitly says not to present its result to
users as authoritative. The calendar and derived status are offered under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
which permits commercial use with attribution and disclosure of modifications. If surfaced in the
application, label it as an unofficial secondary signal and include a visible link such as
“Market calendar from [isopennow.com](https://isopennow.com/) (CC BY 4.0), status normalized by
Insight.” Do not use it as the sole basis for execution. The API response is not cryptographically
signed; the resulting report retains its adapter-asserted, unverified provenance. Robinhood issuer
context continues to supply its own halt and corporate-action fields.

## Request flow

1. The SDK hashes the full instrument identity and builds the action request from the actual
   transaction fields.
2. It checks the consumer-pinned call profile and decodes the transaction before contacting any
   evidence provider. A mismatched asset, operation, amount, route, receiver, deadline or call is
   rejected before collection starts.
3. It invokes the configured source adapters concurrently. Each adapter ID must match a source ID
   in the policy. Its price, market and evidence records must name that same source.
4. It validates every adapter response with the existing RWA policy evaluator. Missing adapters,
   failed calls and empty results are reported separately. Multiple market-state responses are not
   silently selected; the market input is left unavailable and the assessment becomes non-allowing.
5. It builds an unsigned v2 report, including decoded transaction semantics and receiver
   eligibility. Missing or ambiguous receiver eligibility is represented as `UNKNOWN`.

## SDK example

```ts
import {
  createIsOpenNowRwaSessionResolver,
  createRobinhoodChainlinkPriceProvider,
  createRobinhoodRwaMarketProvider,
  InsightClient,
  preflightRwaAction,
} from 'oracle-insight-guard';

const insight = new InsightClient({ apiKey: process.env.INSIGHT_API_KEY! });
const marketSession = createIsOpenNowRwaSessionResolver({
  sourceId: 'isopennow-us-equity-session', // include this ID in policy.stateSources
});
const robinhoodMarket = createRobinhoodRwaMarketProvider({
  symbol: 'AAPL',
  marketSourceId: 'aapl-rhj-market-composite', // include this ID in policy.stateSources
  sessionResolver: marketSession,
  loadContext: ({ symbol, context }) =>
    insight.robinhoodRwaContext(symbol, { verifyOnchain: true }, context.signal),
});
const chainlinkPrice = createRobinhoodChainlinkPriceProvider({
  symbol: 'AAPL',
  feedId: 'chainlink-rh-aapl', // same ID as the policy.feeds key
  feedAddress: process.env.CHAINLINK_RHJ_AAPL_FEED!, // pin from the official directory
  expectedTokenUid: '0x...', // native asset UID in the reviewed instrument registry
  rpcUrl: process.env.ROBINHOOD_RPC_URL,
  sessionResolver: marketSession,
});

const result = await preflightRwaAction({
  instrument,
  action: 'buy',
  amount: transactionAmount,
  transaction,
  callProfile, // independently pinned by the consuming application
  policy, // independently pinned and scoped to this instrument
  sequence: '0',
  previousDigest: null,
  instrumentAdmission, // required by production policy
  providers: [
    chainlinkPrice,
    {
      sourceId: 'licensed-feed-a',
      collect: async ({ instrument, request, signal }) => ({
        prices: await readAndNormalizePrice(instrument, request, signal),
      }),
    },
    robinhoodMarket,
    {
      sourceId: 'issuer-eligibility',
      collect: async ({ instrument, request, transaction, signal }) => ({
        evidence: await readSenderEligibility(instrument, request, signal),
        receiverEvidence: await readReceiverEligibility(instrument, transaction, signal),
      }),
    },
  ],
});

if (result.decision !== 'ALLOW') {
  // Keep the action in the application's review or rejection path.
}
```

The example's other adapter functions are application code, not built-in Insight feeds. Each adapter
must set an upstream timeout, honor the optional abort signal, authenticate to its upstream as
required, validate the response/deployment and preserve the provider's original observation time
before returning normalized values. The SDK checks that the output is consistent with the selected
policy; it cannot prove that the adapter authenticated its upstream. Without a session resolver, the selected policy must
include `robinhood-rhj` in `stateSources`. With a resolver, include the configured composite
`marketSourceId` instead. The same resolver instance should be shared by the market and Chainlink
providers.

## Result and boundaries

The result contains:

- the `insight.rwa-report.v2` assessment, with `evaluation.verdict`, reason codes, eligible feeds,
  excluded prices, consensus price, exact decoded call semantics and validity deadline;
- top-level `decision` and `reasons`, which also apply the separate v2 receiver-eligibility check;
- per-source `COLLECTED`, `EMPTY`, `UNAVAILABLE`, `INVALID` or `NOT_CONFIGURED` status;
- issues such as `SOURCE_COLLECTION_FAILED`, `RECEIVER_EVIDENCE_MISSING` or
  `MULTIPLE_MARKET_SOURCES`.

Use the top-level `decision` for the action review path. The nested
`report.assessment.evaluation.verdict` is the v1 market/price assessment and does not include the
separate receiver-eligibility decision.

Every result has `mode: diagnostic`, `mayAuthorizeExecution: false` and
`evidenceProvenance: adapter-asserted-unverified`. An `ALLOW` means only that the normalized input
passed this policy evaluation. It is not a signed Insight attestation, a source-authentication
claim, issuer solvency or legal-rights proof, a trade guarantee, or permission to broadcast.

Production use still requires independently admitted and licensed sources, an ACTIVE instrument
registry entry and pinned admission commitment, a separately operated signer, current deployment
and liquidity checks, key/revocation operations, and a shadow-to-capped-pilot review. For exact
principal authorization, single-use submission and execution evidence, compose with PriorSeal's
existing RWA v2 flow. Neither product activates or broadcasts from this SDK function.

The REST and MCP `assess_rwa_evidence` tools remain caller-supplied diagnostics. The new orchestration
is a local SDK API so applications can keep their provider credentials and source contracts in
their own backend. It does not add a public server-side source proxy or make licensed data
redistributable.

## First AAPL shadow readiness probe

Run `npm run rwa:preflight:readiness` after configuring `ROBINHOOD_RPC_URL` and setting
`CHAINLINK_RHJ_AAPL_FEED` from Chainlink's official Robinhood Chain feed directory. The command
checks the free IsOpenNow session endpoint, Robinhood's first-party issuer context, the committed
AAPL token UID and multiplier on Robinhood Chain, and the configured AAPL/USD Chainlink proxy at
one block. It writes a private, mode-0600 readiness record under
`.local/rwa-action-preflight/readiness/`; the record contains normalized observations and sanitized
error codes, never RPC URLs or credentials.

The configured feed address is checked for an AAPL/USD description and a valid round, but this
probe cannot authenticate that the address was copied from Chainlink's directory. Its reported
round age is informational; the action policy's freshness limit is not evaluated here.

This is a source readiness probe, not a completed action preflight. A real action assessment still
needs a second independent AAPL price source, source-backed eligibility for both the sender and
the decoded receiver, plus the caller's exact unsigned transaction and pinned policy. The probe
never signs or broadcasts. Exit code `1` means a required source is unavailable, invalid or
unconfigured; exit code `2` means all four source probes returned data, but the full action
prerequisites remain open.
