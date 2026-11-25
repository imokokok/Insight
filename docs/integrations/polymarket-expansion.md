# Polymarket market evidence

## Product boundary

Polymarket support in Insight provides **market metadata integrity and source evidence** for callers building their own workflows. It does not decide event outcomes, rank sides, estimate probabilities, recommend positions, or execute trades. User authorization and any downstream action remain outside Insight and belong to the user-controlled application and its authorization system.

The existing `/api/v1/safety/prediction-guard` path is a separate, reviewed contract-integrity check for its supported short-horizon Up/Down markets. Its checks cover market lifecycle and quote/evidence integrity. Its `PASS`/`CAUTION`/`BLOCK` states describe those checks only; they do not describe which market outcome will occur or authorize an order.

The generalized source-evidence route is deployed but disabled by default. Production must explicitly set `POLYMARKET_EVIDENCE_ENABLED=true` and provide a server-side `POLYMARKET_RULE_BINDINGS_JSON` entry reviewed for the exact market rules. Each configured provider requires its server-side credential where applicable: BLS registration key, SEC contact-bearing User-Agent, BEA API user ID, or FRED API key. FDA's key is optional. The production release check rejects enabled deployments without credentials required by configured bindings. No market binding is enabled by default. A binding is an operator review record; the service does not infer one from a market category or resolution text.

## Capabilities and limits

| Capability                       | Current implementation                                                                                                                                  | Output meaning                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market discovery                 | Gamma search and category paging; normalized market metadata, outcome names/prices, liquidity and volume                                                | Venue-provided metadata with its source context. It does not establish the real-world event facts.                                                              |
| Existing Up/Down integrity check | Reviewed contract profiles, market lifecycle checks, fresh CLOB top of book, supported settlement evidence                                              | Integrity state for the checked contract and quote inputs. It does not select an outcome.                                                                       |
| BLS raw observation              | Exact series/month value, footnotes, source URL, API version and retrieval time                                                                         | Captured source data. The caller or reviewed source binding supplies the series and period.                                                                     |
| BLS 12-month calculation         | Registered BLS v2 monthly calculation; captures the current and same-month prior-year index values and independently recomputes the one-decimal change  | Source evidence and consistency check. The result is not compared with a market threshold. Missing months or mismatches fail closed.                            |
| NWS station observation          | Latest published measurement for a reviewed station and explicit measurement field, including source observation URL, timestamp, unit and quality flags | Source observation only. The NWS API can delay observations during quality checks; station providers and data quality vary. No threshold or result is inferred. |
| AviationWeather METAR            | Up to 100 raw METAR/SPECI reports for one reviewed station and UTC query window                                                                         | Timestamped raw reports only; the snapshot may not cover a still-open observation window. No temperature parsing or outcome inference is performed.             |
| SEC EDGAR submissions            | Up to five recent filing metadata rows for one exact CIK, from the official SEC submissions API                                                         | Filing metadata only; no cross-company search or filing/outcome interpretation.                                                                                 |
| BEA NIPA                         | Up to 20 rows from one exact table, frequency and year                                                                                                  | Source table values only; larger responses are marked partial and require human review.                                                                         |
| FRED observations                | Up to 25 observations for one exact series and a date window capped at ten years                                                                        | Series values and periods only; no thresholds or market result are calculated.                                                                                  |
| openFDA Drugs@FDA                | One exact NDA/BLA/ANDA application and up to 20 submission metadata rows                                                                                | Application metadata only; no medical, approval-likelihood or market conclusion is produced.                                                                    |
| PriorSeal binding                | Schema validation and canonical commitment to the market snapshot, source records, and integrity checks                                                 | Later changes to the committed record are detectable. The commitment does not authenticate BLS or Polymarket itself.                                            |
| Other event data                 | No adapters for sports, elections, court decisions or crypto-price event evidence                                                                       | These categories need separate source mappings and verification before collection is supported.                                                                 |

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

Supported providers are `bls.series`, `bls.percent-change`, `nws.latest-observation`, `aviationweather.metar`, `sec.submissions`, `bea.nipa`, `fred.series`, and `openfda.application`. The BLS percent-change provider accepts monthly series and `months: 12`; it captures the source values and checks BLS's calculation against an independent exact-decimal recomputation. NWS supports a fixed allowlist of station measurement fields. SEC accepts one CIK and at most five recent filings; BEA accepts one NIPA table/frequency/year and returns at most 20 rows; FRED accepts one series, a date range of at most ten years, and at most 25 observations; openFDA accepts one exact application identifier. Each new public-source request has a four-second timeout and bounded response body (SEC 256 KB, BEA 96 KB, FRED/openFDA 64 KB). At most eight observations are allowed per binding; at most two source adapters run concurrently; identical inputs are fetched once per request; and no source is polled or cached between requests. BEA truncation is explicit and carries a human-review warning. These providers preserve public source records without comparing values with market thresholds. Empty required observations fail closed; a bounded partial BEA table remains visibly marked partial and requires human review. FRED evidence includes its API terms URL, and Insight's [Terms of Service](/terms) state that users of FRED-backed features agree to the [FRED API Terms of Use](https://fred.stlouisfed.org/docs/api/terms_of_use.html).

The public-source binding inputs are deliberately narrow:

```json
[
  {
    "id": "sec-filings",
    "provider": "sec.submissions",
    "input": { "cik": "320193", "recordCount": 5 }
  },
  {
    "id": "gdp-table",
    "provider": "bea.nipa",
    "input": { "tableName": "T10101", "frequency": "Q", "year": "2026" }
  },
  {
    "id": "cpi-series",
    "provider": "fred.series",
    "input": {
      "seriesId": "CPIAUCSL",
      "observationStart": "2026-01-01",
      "observationEnd": "2026-12-31",
      "limit": 12
    }
  },
  {
    "id": "drug-application",
    "provider": "openfda.application",
    "input": { "applicationNumber": "NDA021234" }
  }
]
```

These are individual binding objects inside the reviewed market binding's `observations` array. Each of these four providers can appear at most once per market. The market's current `resolutionSource` must use the corresponding official SEC, BEA, St. Louis Fed or FDA domain; a domain match does not replace the human review of the source-to-rule relationship.

In production, provider credentials and `POLYMARKET_RULE_BINDINGS_JSON` are passed to the Worker through the reviewed production deployment allowlist. `POLYMARKET_EVIDENCE_ENABLED` is off unless explicitly set to `true`. `SEC_EDGAR_USER_AGENT` must identify the application and a contact email; `BEA_API_USER_ID` and `FRED_API_KEY` are required only when a binding uses those providers; `OPENFDA_API_KEY` is optional. Credentials are never included in saved evidence URLs or summaries. `ATTESTATION_SIGNER_PRIVATE_KEY` signs completed records. Keep the feature disabled until a reviewer has checked the current Gamma rules digest, source record, units, identifiers and timing semantics. A configured binding becoming stale causes collection to stop.

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

## AviationWeather METAR snapshots

The source registry also supports `aviationweather.metar` for markets whose current Gamma resolution-source URL is the exact fixed AviationWeather Data API METAR query. Each binding pins the four-character station, UTC query date, and bounded hours window. Insight checks those values against the market's declared HTTPS URL before fetching; callers cannot select a host or arbitrary endpoint. It stores bounded raw reports with the original query and retrieval time and does not parse temperatures or infer an outcome.

A snapshot can be partial while the requested market observation window is still in progress. The record includes a human-review warning and does not claim complete window coverage. AviationWeather's API exposes METAR data, keeps up to 30 days of weather data, and asks callers to limit query scope and frequency; the adapter caps its response at 24,000 bytes, 100 reports, and 8 seconds, leaving room for the signed evidence envelope within PriorSeal's 64 KiB archive cap. See [AviationWeather Data API](https://www.connect.aviationweather.gov/data/api/) and [AviationWeather METAR guidance](https://aviationweather.gov/help/data/).

The Dallas 11/26 weather pilot has eleven temperature-band contracts. Each contract requires its own reviewed binding and current Gamma rules digest. The reviewed KDAL query window can provide the same raw METAR/SPECI snapshot to those bindings; the adapter does not decode temperatures or compare them with contract thresholds.
