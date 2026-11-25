# Polymarket market evidence

## Product boundary

Polymarket support in Insight provides **market metadata integrity and source evidence** for callers building their own workflows. It does not decide event outcomes, rank sides, estimate probabilities, recommend positions, or execute trades. User authorization and any downstream action remain outside Insight and belong to the user-controlled application and its authorization system.

The existing `/api/v1/safety/prediction-guard` path is a separate, reviewed contract-integrity check for its supported short-horizon Up/Down markets. Its checks cover market lifecycle and quote/evidence integrity. Its `PASS`/`CAUTION`/`BLOCK` states describe those checks only; they do not describe which market outcome will occur or authorize an order.

The generalized source-evidence route and the November 2026 CPI binding are implemented in the local development worktree. They are not available in production until the normal release process is completed and the production Worker has its server-side BLS v2 key.

## Capabilities and limits

| Capability                       | Current implementation                                                                                                                                 | Output meaning                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market discovery                 | Gamma search and category paging; normalized market metadata, outcome names/prices, liquidity and volume                                               | Venue-provided metadata with its source context. It does not establish the real-world event facts.                                                             |
| Existing Up/Down integrity check | Reviewed contract profiles, market lifecycle checks, fresh CLOB top of book, supported settlement evidence                                             | Integrity state for the checked contract and quote inputs. It does not select an outcome.                                                                      |
| BLS raw observation              | Exact series/month value, footnotes, source URL, API version and retrieval time                                                                        | Captured source data. The caller or reviewed source binding supplies the series and period.                                                                    |
| BLS 12-month calculation         | Registered BLS v2 monthly calculation; captures the current and same-month prior-year index values and independently recomputes the one-decimal change | Source evidence and consistency check. The result is not compared with a market threshold. Missing months or mismatches fail closed.                           |
| PriorSeal binding                | Schema validation and canonical commitment to the market snapshot, source records, and integrity checks                                                | Later changes to the committed record are detectable. The commitment does not authenticate BLS or Polymarket itself.                                           |
| Other event data                 | No source adapters yet                                                                                                                                 | Sports, elections, weather, court decisions, and crypto-price event evidence require separate source adapters and verification before collection is supported. |

Eligibility is determined by whether an operator can name a precise public source record for a specific market rule and review that mapping. Market category alone does not establish eligibility. Insight records the approved source mapping and current Gamma rule digest; it does not interpret natural-language resolution rules or derive which side they imply.

## Read market metadata

`GET /api/v1/polymarket/markets?query=election&limit=20` requires an Insight API key. It reads Gamma metadata, normalizes V1 `clobTokenIds` and V2 `positionIds`, and returns market fields and source-reported prices, liquidity and volume. Search and category cursor paging are separate modes; `limit` is capped at 50. Gamma metadata is not an independent statement of event truth.

## Read BLS observations

`GET /api/v1/polymarket/data/bls?seriesId=CUUR0000SA0&year=2026&period=M10` requires an Insight API key. It returns one exact BLS observation, footnotes, source URL, API version and retrieval timestamp. In production, the server-side `BLS_API_REGISTRATION_KEY` is required; without it, requests fail closed. The public unregistered v1 quota is 25 requests per day; registered v2 allows up to 500 daily queries and requires annual renewal. Each process caches series data for one hour. Callers still need the correct series ID. [BLS API limits](https://www.bls.gov/developers/api_faqs.htm)

BLS terms require citing the retrieval date and showing this notice: “BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov.” Each evidence record contains the retrieval timestamp and notice. [BLS API terms](https://www.bls.gov/developers/termsOfService.htm)

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

Supported providers are `bls.series` and `bls.percent-change`. The BLS percent-change provider accepts monthly series and `months: 12`; it captures the source values and checks BLS's calculation against an independent exact-decimal recomputation. The configured November CPI observation is unavailable until BLS publishes it. Until then, the collection request returns an unavailable-source error and emits no partial record.

Before returning a complete record, Insight checks that the market is active and open, its rule-bearing Gamma fields still match the reviewed digest, and the declared resolution source is an HTTPS URL. It fetches all configured observations, then rereads the market and checks the digest again. The API returns `{ evidence, attestation }`: the exact evidence record plus a five-minute EIP-712 signature from the Insight attester. If `ATTESTATION_SIGNER_PRIVATE_KEY` is unavailable, the route returns HTTP 503 and no unsigned record. The evidence has no threshold, operator, `all`/`any` logic, side mapping, outcome result, probability score or trade action.

The API does not fetch or hash the contents of the external resolution-source page. Human review establishes why a source belongs with a market; the source binding does not claim the source proves the final settlement.

## PriorSeal evidence commitment

Use `verifyInsightPolymarketSourceEvidenceAttestation()` with a caller-pinned Insight key-registry snapshot to verify the API signature, key validity/revocation epoch, expiry and exact evidence bytes. Then use `verifyInsightPolymarketSourceEvidence()` and `insightPolymarketSourceEvidenceCommitment()` to validate the evidence schema and create a `ContextCommitment`. A bot must fail closed on an invalid or untrusted signature; it must never substitute the plain content hash for signature verification. The commitment can be attached to a later PriorSeal intent or stored with a separately retained evidence artifact. It does not by itself create a durable PriorSeal receipt or prove source truth/settlement.

For a Telegram adapter, keep the Insight API key and the pinned registry on the server side. The handler should: (1) accept a market ID, (2) request this endpoint, (3) verify the signed envelope with the PriorSeal SDK, (4) create the exact source-evidence commitment, and (5) reply with the verified/expired status, market ID, retrieval time and digest. Do not accept a caller-supplied source binding or registry as trusted input, and do not emit an outcome, prediction, trade recommendation or action button.

## Expansion rules

Add a provider only for a reviewed data need, with:

1. An authoritative, public source and a precise field or series mapping.
2. Defined release cadence, freshness, revisions, units and missing-data behavior.
3. Runtime validation and bounded retrieval in Insight.
4. A PriorSeal verifier for the exact evidence schema and source record.
5. Tests for valid, missing, malformed, revised, mismatched and tampered data.

New providers add source evidence only. They do not add thresholds, outcome comparisons, recommendations, execution authority or automated market conclusions.
