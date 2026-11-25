# Polymarket market evidence

## Product boundary

Polymarket support in Insight provides **market metadata integrity and source evidence** for callers building their own workflows. It does not decide event outcomes, rank sides, estimate probabilities, recommend positions, or execute trades. User authorization and any downstream action remain outside Insight and belong to the user-controlled application and its authorization system.

The existing `/api/v1/safety/prediction-guard` path is a separate, reviewed contract-integrity check for its supported short-horizon Up/Down markets. Its checks cover market lifecycle and quote/evidence integrity. Its `PASS`/`CAUTION`/`BLOCK` states describe those checks only; they do not describe which market outcome will occur or authorize an order.

The generalized source-evidence route is deployed but disabled by default. Production must explicitly set `POLYMARKET_EVIDENCE_ENABLED=true` and provide a server-side `POLYMARKET_RULE_BINDINGS_JSON` entry reviewed for the exact market rules. Enabling BLS bindings also requires the server-side `BLS_API_REGISTRATION_KEY`; NWS-only bindings do not. The production release check rejects enabled deployments without their required binding or BLS key. No market binding is enabled by default. A binding is an operator review record; the service does not infer one from a market category or resolution text.

## Capabilities and limits

| Capability                       | Current implementation                                                                                                                                  | Output meaning                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market discovery                 | Gamma search and category paging; normalized market metadata, outcome names/prices, liquidity and volume                                                | Venue-provided metadata with its source context. It does not establish the real-world event facts.                                                              |
| Existing Up/Down integrity check | Reviewed contract profiles, market lifecycle checks, fresh CLOB top of book, supported settlement evidence                                              | Integrity state for the checked contract and quote inputs. It does not select an outcome.                                                                       |
| BLS raw observation              | Exact series/month value, footnotes, source URL, API version and retrieval time                                                                         | Captured source data. The caller or reviewed source binding supplies the series and period.                                                                     |
| BLS 12-month calculation         | Registered BLS v2 monthly calculation; captures the current and same-month prior-year index values and independently recomputes the one-decimal change  | Source evidence and consistency check. The result is not compared with a market threshold. Missing months or mismatches fail closed.                            |
| NWS station observation          | Latest published measurement for a reviewed station and explicit measurement field, including source observation URL, timestamp, unit and quality flags | Source observation only. The NWS API can delay observations during quality checks; station providers and data quality vary. No threshold or result is inferred. |
| AviationWeather METAR            | Up to 100 raw METAR/SPECI reports for one reviewed station and UTC query window                                                                         | Timestamped raw reports only; the snapshot may not cover a still-open observation window. No temperature parsing or outcome inference is performed.             |
| PriorSeal binding                | Schema validation and canonical commitment to the market snapshot, source records, and integrity checks                                                 | Later changes to the committed record are detectable. The commitment does not authenticate BLS or Polymarket itself.                                            |
| Other event data                 | No source adapters yet                                                                                                                                  | Sports, elections, weather, court decisions, and crypto-price event evidence require separate source adapters and verification before collection is supported.  |

Eligibility is determined by whether an operator can name a precise public source record for a specific market rule and review that mapping. Market category alone does not establish eligibility. Insight records the approved source mapping and current Gamma rule digest; it does not interpret natural-language resolution rules or derive which side they imply.

## Read market metadata

`GET /api/v1/polymarket/markets?query=election&limit=20` requires an Insight API key. It reads Gamma metadata, normalizes V1 `clobTokenIds` and V2 `positionIds`, and returns market fields and source-reported prices, liquidity and volume. Search and category cursor paging are separate modes; `limit` is capped at 50. Gamma metadata is not an independent statement of event truth.

## Read BLS observations

`GET /api/v1/polymarket/data/bls?seriesId=CUUR0000SA0&year=2026&period=M10` requires an Insight API key. It returns one exact BLS observation, footnotes, source URL, API version and retrieval timestamp. In production, the server-side `BLS_API_REGISTRATION_KEY` is required; without it, requests fail closed. The public unregistered v1 quota is 25 requests per day; registered v2 allows up to 500 daily queries and requires annual renewal. Each process caches series data for one hour. Callers still need the correct series ID. [BLS API limits](https://www.bls.gov/developers/api_faqs.htm)

BLS terms require citing the retrieval date and showing this notice: “BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov.” Each evidence record contains the retrieval timestamp and notice. [BLS API terms](https://www.bls.gov/developers/termsOfService.htm)

## Read NWS observations

The source-evidence binding may use `nws.latest-observation` with a reviewed station ID and one explicit field, for example `{ "stationId": "KTOP", "property": "temperature" }`. Insight requests only the fixed `https://api.weather.gov/stations/{stationId}/observations/latest` endpoint; bindings cannot supply arbitrary URLs or JSON paths. The record includes the numeric value, WMO unit code, observation time, source record URL, quality-control flags and retrieval time. This endpoint is public and requires no API key. NWS retains only seven days of station observations; some records can be delayed up to about 20 minutes while upstream quality checks complete, and station providers vary. A missing or null measurement fails closed. [NWS API documentation](https://www.weather.gov/documentation/services-web-api)

## Collect reviewed source evidence

`POST /api/v1/polymarket/evidence` requires an Insight API key. The caller sends only a market ID. A server-side `POLYMARKET_RULE_BINDINGS_JSON` entry selects the sources Insight may collect for that market:

```json
[
  {
    "marketId": "7004033",
    "rulesDigest": "0x…current Gamma digest…",
    "reviewedAt": "2026-11-25T00:00:00.000Z",
    "reviewer": "market-source-review",
    "observations": [
      {
        "id": "cpi-november-yoy-source",
        "provider": "bls.percent-change",
        "input": {
          "seriesId": "CUUR0000SA0",
          "year": "2026",
          "period": "M11",
          "months": 12
        }
      }
    ]
  }
]
```

Supported providers are `bls.series`, `bls.percent-change`, `nws.latest-observation`, and `aviationweather.metar`. The BLS percent-change provider accepts monthly series and `months: 12`; it captures the source values and checks BLS's calculation against an independent exact-decimal recomputation. NWS supports a fixed allowlist of station measurement fields. AviationWeather supports one reviewed four-character station and bounded UTC query window whose exact URL must match the market's declared resolution source. These providers preserve source values and provenance without comparing readings with market thresholds. Missing required observations fail closed.

In production, `POLYMARKET_EVIDENCE_ENABLED`, `BLS_API_REGISTRATION_KEY` and `POLYMARKET_RULE_BINDINGS_JSON` are passed to the Worker through the production deployment allowlist. `POLYMARKET_EVIDENCE_ENABLED` is off unless explicitly set to `true`. The BLS key is needed for BLS requests in production; NWS and AviationWeather requests do not use it. `ATTESTATION_SIGNER_PRIVATE_KEY` signs completed records. Keep the feature disabled until a reviewer has checked the current Gamma rules digest, source record, unit, location/station and timing semantics. A configured binding becoming stale causes collection to stop.

Before returning a complete record, Insight checks that the market is active and open, its rule-bearing Gamma fields still match the reviewed digest, and the declared resolution source is an HTTPS URL. It fetches all configured observations, then rereads the market and checks the digest again. The API returns `{ evidence, attestation }`: the exact evidence record plus a five-minute EIP-712 signature from the Insight attester. If `ATTESTATION_SIGNER_PRIVATE_KEY` is unavailable, the route returns HTTP 503 and no unsigned record. The evidence has no threshold, operator, `all`/`any` logic, side mapping, outcome result, probability score or trade action.

The API does not fetch or hash the contents of the external resolution-source page. Human review establishes why a source belongs with a market; the source binding does not claim the source proves the final settlement.

## PriorSeal evidence commitment

Use `verifyInsightPolymarketSourceEvidenceAttestation()` with a caller-pinned Insight key-registry snapshot to verify the API signature, key validity/revocation epoch, expiry and exact evidence bytes. Then use `verifyInsightPolymarketSourceEvidence()` and `insightPolymarketSourceEvidenceCommitment()` to validate the evidence schema and create a `ContextCommitment`. A bot must fail closed on an invalid or untrusted signature; it must never substitute the plain content hash for signature verification. The commitment can be attached to a later PriorSeal intent or stored with a separately retained evidence artifact. It does not by itself create a durable PriorSeal receipt or prove source truth/settlement.

The existing Telegram adapter keeps the Insight API key and key-registry URL on the server side. `/evidence <market-id>` requests the endpoint, verifies the signed envelope and exact evidence bytes with the PriorSeal SDK, stores the signed payload and commitment in the per-chat Durable Object for up to 30 days, and replies with the digest and source summary. It fails closed on missing or untrusted keys, invalid signatures, expired attestations, malformed evidence, or changed records. It does not accept caller-supplied bindings or emit an outcome, prediction, trade recommendation, or action button. The stored record is an evidence archive and context commitment, not a PriorSeal execution receipt or proof that the external source is correct.

## Expansion rules

Further verticals such as sports, election results, court decisions and crypto prices are not enabled yet. Add one only after a specific authoritative source and market rule are reviewed; those categories do not share one universal source. Each new provider needs:

1. An authoritative, public source and a precise field or series mapping.
2. Defined release cadence, freshness, revisions, units and missing-data behavior.
3. Runtime validation and bounded retrieval in Insight.
4. A PriorSeal verifier for the exact evidence schema and source record.
5. Tests for valid, missing, malformed, revised, mismatched and tampered data.

New providers add source evidence only. They do not add thresholds, outcome comparisons, recommendations, execution authority or automated market conclusions.

## Dallas AviationWeather pilot

The Dallas 11/26 weather event has eleven temperature-band contracts. Each contract must have its own reviewed market binding and current Gamma rules digest; all eleven can use the `aviationweather.metar` adapter when their rule page declares the same fixed AviationWeather query. The binding pins station `KDAL`, the query end `2026-11-27T09:00:00.000Z` and the reviewed 30-hour window. Insight checks the market's exact HTTPS query URL before fetching and stores a bounded snapshot of raw METAR/SPECI reports with query and retrieval timestamps. It does not decode temperatures or compare them with any of the eleven contract thresholds.

The snapshot can be partial until the query window has elapsed, and the response always carries a human-review warning. The adapter caps responses at 24,000 bytes and 100 reports, with an eight-second timeout. AviationWeather's API retains up to 30 days of METAR data and asks callers to limit query scope and frequency. See [AviationWeather Data API](https://www.connect.aviationweather.gov/data/api/) and [METAR guidance](https://aviationweather.gov/help/data/).
