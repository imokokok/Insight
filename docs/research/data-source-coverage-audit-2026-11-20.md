# Portfolio data-source coverage audit — 2026-11-20

## Scope and resource policy

This is a static audit of the Insight and PriorSeal repositories plus a bounded
check of first-party provider documentation for the already-implemented Monad
AUSD feeds. It does not query production databases, provider accounts, or every
chain/feed. Those checks would add load and require credentials or commercial
rights that are not present in the repository.

No source is admitted from a catalog listing alone. Decision sources must have
an identified pair/chain, observed timestamp, heartbeat/freshness rule, source
identity, quorum eligibility, and licensing where applicable. No bulk polling
or historical backfill is part of this audit.

## Closed in this change

| Gap                                                                                                                              | Change                                                                                                                                                                                                              | Resource impact                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Perpl's AUSD margin coverage stayed `UNVERIFIED` even though Monad Pyth Core AUSD/USD was already in the checked-in feed catalog | The guard now requests AUSD consensus on Monad and derives a coverage record from that same request's fresh, non-outlier, quorum-eligible Pyth observation. The strict option also requires the complete v2 quorum. | No additional provider request: coverage reuses the existing AUSD consensus result. |

Pyth's official sponsored-feed page lists AUSD/USD on Monad with a one-hour
heartbeat and 0.2% update threshold. Insight already commits the Pyth feed ID
and uses the Monad Pyth Core contract; runtime coverage remains false when the
source read is absent, stale, shadow-only, anomalous, or excluded from quorum.

## Remaining source and evidence gaps

| Priority | Area                                | Current state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | What is required to close it                                                                                                                                                                                                                                      |
| -------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Monad MON/USD quorum                | Pyth and Chainlink are quorum participants. Stork MON/USD has a dedicated promotion draft based on shadow history; it requires explicit source-overlap review before merge. Other Stork and Chronicle Monad observations remain shadow-only.                                                                                                                                                                                                                                                                     | Review the documented source overlap and 18-day evidence, approve only the MON/USD feed if independence remains defensible, then merge and monitor. Do not promote all feeds together.                                                                            |
| P1       | Reviewed protocol activity          | The reviewed registry contains many profiles without an independent activity signal (`UNKNOWN`). Existing enforcement does not silently treat these as live.                                                                                                                                                                                                                                                                                                                                                     | Add bounded heartbeat/activity reads for buyer-relevant protocols, beginning with high-usage profiles; record failures as unknown/stale and verify source identity. Avoid polling all 38 profiles at high frequency.                                              |
| P1       | WBTC CEX cross-check                | Kraken and Crypto.com collectors exist, but their same-hour data cannot be used until commercial-use rights are recorded. Binance, Bitstamp, and Bitfinex are also rights-gated.                                                                                                                                                                                                                                                                                                                                 | Obtain and record vendor permission before enabling collection or backfill. This cannot be inferred from a public unauthenticated endpoint.                                                                                                                       |
| P1       | Request-level source economics      | Provider collection latency exists, but API-request fan-out, per-request retries, RPC/API dollar cost, and full infrastructure allocation are missing.                                                                                                                                                                                                                                                                                                                                                           | Add privacy-safe `request_id`/provider/attempt/cost accounting and reconcile monthly invoices. Do not infer costs from cron sampling or latency.                                                                                                                  |
| P2       | Decision-input route coverage       | The exact-notional decision-input path is limited to its reviewed Ethereum/Uniswap V3 asset and route map. Other guards cover some Base, BNB, Monad, and Solana venue profiles separately.                                                                                                                                                                                                                                                                                                                       | Expand only for validated buyer routes, with reviewed router/pool identity, independent price inputs, block-pinned quotes, and source rights. Do not create a broad, unreviewed all-chain router path.                                                            |
| P2       | RWA issuer and execution sources    | The committed instrument/execution entries are Robinhood-only and in `SHADOW`; the action flow still needs an independent second price source, issuer/session facts, and sender/receiver eligibility evidence.                                                                                                                                                                                                                                                                                                   | Admit an issuer/instrument only after first-party deployment identity, two independent prices, session/issuer sources, eligibility evidence, and data rights are reviewed.                                                                                        |
| P2       | Solana-native prediction settlement | First-party docs now identify Jupiter Forecast (`provider=bisonfi`) as a native Solana 15-minute BTC up/down market, state that rounds settle from the Chainlink BTC/USD stream, and expose market IDs/outcome mints plus `marketResultPubkey` through the Prediction API. This is a concrete discovery and resolution source, unlike the remaining name-only ecosystem placeholders. The docs do not establish an independently replayable settlement adapter or verified program/account decoding for Insight. | Add a dedicated Jupiter Forecast classification and read adapter only after verifying the published program/market-result account layout and mapping it to an independent Chainlink observation. Until then, keep settlement evidence `UNVERIFIED` / fail-closed. |

## PriorSeal boundary

PriorSeal verifies and binds the external evidence supplied by an integration;
it does not run an oracle/feed catalog. No new market-data provider belongs in
PriorSeal. Its relevant completion criterion is that the evidence digest,
issuer/source identity, validity window, and any independent verification
result are bound into authorization and receipt evidence.

## Evidence references

- Insight's [decision-input assessment](../decision-input-assessment.md)
  records WBTC licensing gates and the bounded route map.
- The [AUSD coverage registry](../../src/lib/oracles/ausdCoverage.ts) and
  [Monad Perp Guard](../../src/lib/perps/monadPerpGuard.ts) show request-time
  AUSD source eligibility.
- The [RWA action-preflight guide](../rwa-action-preflight.md) records the
  Robinhood `SHADOW` scope and required caller-provided sources.
- The [unit-economics floor report](../operations/unit-economics-floor-inputs-2026-11-07.md)
  records the missing request-level cost and infrastructure inputs.
- The [settlement venue map](../../src/lib/settlementEvidence/venueChainMapping.ts)
  lists unverified Solana-native entries.
- Official Pyth sources: [Monad sponsored feeds](https://docs.pyth.network/pro/sponsored-feeds)
  and [contract addresses](https://docs.pyth.network/pro/contract-addresses).
- Official Jupiter sources: [Prediction Market API](https://developers.jup.ag/docs/prediction/index.md),
  [Jupiter Forecast](https://developers.jup.ag/docs/prediction/forecast.md), and
  [API documentation index](https://developers.jup.ag/docs/llms.txt). Jupiter documents
  keyless access at 0.5 requests/second; no live polling was performed for this audit.
