# Robinhood Stock Token issuer context

Insight integrates Robinhood Stock Token data as **first-party issuer context**, not as an
oracle provider. Robinhood never enters provider counts, independence groups, consensus prices or
provider reputation. Its role is to explain and verify the instrument semantics around independent
Chainlink, Stork and market-price evidence.

## Surfaces

- REST: `GET /api/v1/rwa/robinhood/context?symbol=AAPL&verifyOnchain=true`
- SDK: `InsightClient.robinhoodRwaContext("AAPL")`
- MCP: `get_robinhood_rwa_context`

The companion [MIC/FIGI instrument registry](rwa-instrument-registry.md) adds a separate identity
surface at `GET /api/v1/rwa/robinhood/instrument?symbol=AAPL`. It cross-checks this issuer context's
UID, ISIN and deployment against committed master data without turning either source into a price
vote.

The response is `insight.robinhood-rwa-context.v1` and is always non-authorizing:

- `source.type` is `issuer-first-party`;
- `source.independent` is `false`;
- `source.countsTowardOracleQuorum` is `false`;
- `integrity.mayAuthorizeExecution` is `false`.

## Evidence collected

The service consumes Robinhood's public, read-only Stock Token endpoints for:

- token identity, contract deployment and asset status;
- regular, extended and overnight trading capabilities;
- raw underlying-equity bid/ask and the issuer's halt flag;
- current and pending corporate-action multipliers;
- in-progress and completed corporate actions.

By default it also reads the token contract on Robinhood Chain (chain ID `4663`):

- `uid()` to bind the REST asset identity to the deployed token;
- `uiMultiplier()`;
- `newUIMultiplier()`;
- `effectiveAt()`;
- `oraclePaused()`.

Set `ROBINHOOD_RPC_URL` to a production RPC. The official rate-limited public RPC is used only when
the variable is absent; the response labels that fallback as `public-rate-limited`.

REST responses are schema-validated and cached using the upstream windows (15 seconds for quotes,
one hour for corporate actions). The service accepts both Robinhood trading-capability wire shapes
currently shown across the official documentation and normalizes them to the session-based model.
The asset, quote and corporate-action deployment addresses must agree on chain `4663`.

## Price semantics

Robinhood REST bid/ask values are raw underlying-share prices. Insight calculates:

```text
underlying midpoint × currentMultiplier = Stock Token issuer reference price
```

This reference is useful for deviation checks but remains first-party and does not enter oracle
quorum. Robinhood Chain's Chainlink Stock Token feed is already multiplier-adjusted and must not be
multiplied again.

## Fail-closed integrity states

`integrity.status` is `BLOCK` when the context shows an inactive/unknown asset, halt, stale or
future quote, pending/unknown corporate action, restricted trading, pending multiplier update,
paused oracle, deployment mismatch, asset-UID mismatch or a REST/on-chain multiplier mismatch.
Missing or partial on-chain verification and unknown trading capabilities produce `CAUTION`.

`CLEAR` means only that the issuer context is internally consistent. It does not establish the
current trading session, prove reserves or legal entitlement, supply independent price quorum, or
authorize execution. The existing RWA assessment must still combine an authenticated session,
independent price feeds, issuer/reserve/eligibility evidence and exact-call policy.

## Trust boundary

Robinhood Assets (Jersey) Limited is authoritative for its token contract mapping, multiplier and
processing state, but is not independent of the instrument. Insight therefore preserves the raw
provenance and cross-checks contract state rather than treating the issuer as another oracle vote.

Robinhood describes Stock Tokens as tokenised debt securities that provide economic exposure but
not legal or beneficial rights in the underlying shares. Eligibility and jurisdiction restrictions
remain outside this endpoint; callers must enforce them separately. See the official
[Stock Token overview](https://docs.robinhood.com/chain/stock-tokens/) and
[Stock Token API reference](https://docs.robinhood.com/chain/stock-token-apis/).

## Deployment and smoke check

The route has a 30-second serverless budget. Configure `ROBINHOOD_RPC_URL` in production, deploy to
preview, then make an authenticated request for a liquid symbol such as `AAPL`. Confirm:

- `source.countsTowardOracleQuorum` and `integrity.mayAuthorizeExecution` are `false`;
- all `verification.*` identity, symbol, and deployment consistency checks are `true`;
- `multiplier.onchain.complete` is `true` and `currentMatchesOnchain` is `true`;
- a legitimate `BLOCK` caused by a halt/corporate action is surfaced rather than treated as an
  availability failure.

The repeatable preview/production check is:

```bash
INSIGHT_API_KEY=... npm run integration:doctor -- \
  --offer insight --probe --asset USDC --robinhood-symbol AAPL
```

This is an explicit billable probe. It checks availability, issuer/on-chain binding and the committed
MIC/FIGI identity response, but does not fail merely because a legitimate halt or corporate action
produces an issuer-context `BLOCK`. A matching `SHADOW` registry entry is reported as such and is not
mistaken for production admission.
