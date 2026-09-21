# RWA instrument registry: MIC + FIGI

Insight uses ISO 10383 MIC and OpenFIGI as **instrument-admission master data**. They resolve what
an RWA instrument is; they are not market prices, oracle observations, issuer attestations or
execution permissions.

The committed registry is [rwa-instrument-registry.v1.json](../protocol/rwa-instrument-registry.v1.json).
Runtime paths read this pinned file and never depend on a live MIC/OpenFIGI request. Network access
is confined to review and synchronization, so an upstream outage or mutable response cannot change
an instrument identity during a trade.

## Identity model

- `shareClassFigi` is the stable underlying-share-class identifier. Insight encodes it as
  `RwaInstrument.underlyingId = figi-share-class:<FIGI>`.
- `compositeFigi` corroborates the country-level composite mapping. It is retained as reference data
  but is not the canonical underlying ID.
- `mic.mic` identifies the admitted primary market or market segment and must equal
  `RwaInstrument.venueMic`.
- `mic.operatingMic` preserves the ISO operating/segment relationship. For example, `ARCX` is a
  segment operated under `XNYS`, while `XNAS` is itself an operating MIC.
- The issuer binding ties that market identity to the issuer-native UID, ISIN, settlement chain and
  token contract. A ticker is only a lookup key and never establishes identity.
- `instrumentId` remains the hash of the existing `insight.rwa-instrument.v1` object. The signed v1
  schema and PriorSeal exact-call contract are unchanged.

ISIN is used to ask OpenFIGI for a mapping and to cross-check Robinhood's issuer record. It is not
used as the canonical cross-venue underlying identity. LEI is retained inside the MIC evidence for
the market operator; it does not identify the token issuer or holder.

## Admission lifecycle

Registry entries have one of three states:

- `SHADOW`: identity is reviewable and usable in evidence trials, but production identity admission
  fails closed.
- `ACTIVE`: a production report builder may pass `assertRwaInstrumentAdmitted` for the exact
  instrument hash.
- `RETIRED`: the historical mapping remains auditable but new production reports are rejected.

Promotion to `ACTIVE` is an explicit governance change. A live data match does not promote an entry.
Even an active, matching entry only clears the identity gate: prices, market state, corporate-action
version, eligibility, reserves, exact-call semantics, signer trust and PriorSeal authorization still
apply. Every admission response therefore keeps `mayAuthorizeExecution: false` and
`countsTowardOracleQuorum: false`.

The initial AAPL, NVDA and SPY entries are intentionally `SHADOW`. The pinned ISO publication is
dated 2026-09-14 with an effective date of 2026-09-28; validation rejects an `ACTIVE` entry whose
registry publication time precedes that effective date:

| Symbol | Share-class FIGI | Primary MIC | Instrument kind |
| ------ | ---------------- | ----------- | --------------- |
| AAPL   | `BBG001S5N8V8`   | `XNAS`      | equity          |
| NVDA   | `BBG001S5TZJ6`   | `XNAS`      | equity          |
| SPY    | `BBG001S72SM3`   | `ARCX`      | ETF             |

## Runtime surfaces

- REST: `GET /api/v1/rwa/robinhood/instrument?symbol=AAPL&verifyOnchain=true`
- SDK client: `InsightClient.robinhoodRwaInstrument("AAPL")`
- MCP: `get_robinhood_rwa_instrument`
- Portable validation: `validateRwaInstrumentRegistry(registry)`
- Production identity gate: `assertRwaInstrumentAdmitted(registry, instrument)`
- Portable commitment: `buildRwaInstrumentAdmissionCommitment(...)`
- Production builder: `buildAdmittedRwaReportV2(...)`
- Issuer cross-check: `evaluateRobinhoodInstrumentAdmission(registry, context)`

The Robinhood admission service fetches the existing issuer context and compares the committed entry
with the current issuer UID, symbol, ISIN, chain and token contract. It exposes both expected and
observed bindings. Missing registry entries, ISIN absence, UID drift or deployment drift fail closed.
On-chain verification remains separately visible through the issuer-context integrity status.

Production v2 reports sign `registryId`, `registryVersion`, the digest of the complete registry,
the exact `instrumentId`, and an admission digest over the ACTIVE entry and registry snapshot.
Verifiers must independently pin the same commitment in `RwaTrustV2`; changing or retiring the
registry after signing cannot silently change what the report proves. Production v2 construction
without a commitment fails closed. The legacy v1 admitted builder also fails closed because v1 has
no portable admission field.

Execution deployment and pool identity are a separate commitment. See
[Robinhood RWA execution profiles](rwa-execution-profiles.md).

## Verification and update process

Offline structural and hash verification:

```bash
npm run rwa:registry:check
```

Live, read-only drift verification against all three sources:

```bash
npm run rwa:reference:verify
```

The live verifier checks:

1. MIC, operating MIC, market type, legal entity, LEI, country, status and ISO validation date against
   the official CSV;
2. ISIN → share-class/composite FIGI mapping against OpenFIGI;
3. symbol → UID/ISIN/chain/contract mapping against Robinhood RHJ assets.

An OpenFIGI API key is optional and can be supplied as `OPENFIGI_API_KEY`; the public batch remains
small enough for the unauthenticated endpoint. The verifier never edits or promotes the registry.
Review source changes, corporate actions and legal/commercial data rights before updating the JSON,
then recompute the exact `instrumentId`, run SDK/Jest/parity tests and use shadow evidence before an
`ACTIVE` promotion.

## Two-week shadow pilot

The committed [pilot policy](../protocol/rwa-shadow-pilot.v1.json) starts preflight collection
immediately but counts only three checkpoints for AAPL, NVDA and SPY: the MIC snapshot's 2026-09-28
effective date, the 2026-10-05 midpoint and the 2026-10-12 close.

```bash
npm run rwa:pilot:sample
npm run rwa:pilot:status
```

The [GitHub Actions workflow](../.github/workflows/rwa-reference-shadow.yml) runs at 10:00
Asia/Shanghai on those three dates and can also be started manually. It restores the latest evidence
chain from Actions cache, saves the updated chain under a unique cache key, and uploads the complete
local evidence directory as a 90-day workflow artifact. No repository write permission or Insight
API key is used; an optional `OPENFIGI_API_KEY` secret only raises OpenFIGI rate limits.

Each sample reruns the three-source live verification and is appended to
`.local/rwa-shadow-pilot/events.ndjson`. Records carry a sequence number, previous digest and SHA-256
digest; the reader validates the complete chain before appending. A successful sample is idempotent
within one local date. The generated `summary.json` separates upstream availability failures from
identity drift:

- availability failures do not count as successful days and can be retried;
- any UID, ISIN, deployment, MIC, FIGI or registry-version drift changes the status to
  `REVIEW_REQUIRED`;
- all three successful checkpoints with no identity drift produce `READY_FOR_REVIEW`;
- `autoPromote` is permanently false: readiness requests manual evidence review and never edits an
  entry to `ACTIVE`.

The local evidence directory is intentionally gitignored because it belongs to one running
environment. Export or anchor the completed digest chain through the normal controlled evidence
retention process before approving an activation change.

Authoritative sources: [ISO 10383 MIC](https://www.iso20022.org/market-identifier-codes),
[OpenFIGI API](https://www.openfigi.com/api/documentation), and
[OpenFIGI allocation rules](https://www.openfigi.com/docs/figi-allocation-rules.pdf).
