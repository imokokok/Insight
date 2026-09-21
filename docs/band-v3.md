# Band Protocol v3 integration

Insight integrates Band Protocol through BandChain v3 Concurrent Price Stream.
It does not use the legacy `oracle/v1/request_prices` endpoint.

## Runtime path

- Price: `GET https://laozi1.bandchain.org/api/feeds/v1beta1/prices/{signalId}`
- Feed discovery: `GET /feeds/v1beta1/current_feeds`
- Discovery validation: `GET /feeds/v1beta1/all_prices?pagination.limit=500`
- Crypto signals use `CS:{BASE}-USD`; fiat and gold signals use
  `FS:{BASE}-USD`.
- Band's integer prices are normalized with 9 decimal places and the original
  Unix source timestamp is converted to milliseconds in `PriceData`.

The public REST endpoint currently requires no API key. That does not imply an
availability SLA or unlimited capacity, so failures remain explicit and
retryable rather than being replaced by fabricated or stale values.

## Freshness and trust boundary

Every response must have `PRICE_STATUS_AVAILABLE`, a positive numeric price,
the requested signal ID, and a valid source timestamp. The Band adapter rejects:

- timestamps more than five minutes in the future;
- unavailable statuses, malformed values and non-positive prices;
- attempts to label the REST observation as evidence from a chain other than
  BandChain. A caller may request an EVM comparison, but the returned
  `PriceData.chain` remains `bandchain`.

The response is labelled `verificationLevel: unsigned`: the underlying value is
validator-aggregated and stored on BandChain, but the public REST JSON is not by
itself a portable state proof. Consumers requiring stronger provenance should
cross-check independent BandChain nodes or verify a supported on-chain consumer
contract.

The adapter preserves Band's source timestamp and `dataAge`; it does not add a
Band-only age cutoff. Insight's shared cache-refresh, consensus-freshness and
coverage rules make the decision in the same way as other providers. The
`strict-300s.v3` coverage policy requires a source age of at most 300 seconds,
three eligible providers, two independent non-derived groups and matching
evidence-chain scope. Therefore the public REST observation may participate in
general cross-oracle comparison but cannot satisfy an EVM exact-chain coverage
gate merely because the comparison request named that EVM chain. A separately
verified Band consumer-contract observation can qualify under its actual chain.

## Operations

Migration `0060_band_protocol_v3_feeds.sql` seeds the committed signal set so a
new deployment can use Band immediately. The weekly feed-discovery job then
reads the live Band signaling set and records currently available prices with
their original source timestamps. The committed symbol list is a degraded-mode
fallback; live discovery remains authoritative. Band's default display cadence
is 120 seconds, while individual live feeds may declare intervals from 60 to
360 seconds.

Run the focused checks with:

```bash
npm test -- --runInBand src/lib/oracles/__tests__/band.test.ts
npm run typecheck
```

Official references: [Band API endpoints](https://docs.bandchain.org/develop/api-endpoints),
[off-chain consumption](https://docs.bandchain.org/concurrent-price-stream/offchain-consumption),
and [v3 smart-contract prices](https://docs.bandchain.org/develop/using-band-dataset/v3).
