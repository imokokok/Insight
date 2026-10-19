# CEX market-reference source integrations

All CEX venues are disabled for customer-facing collection by default. The
collector admits a venue only when the checked-in source-rights register has a
reviewed `vendor-licensed` record with a written-permission reference; an
environment variable cannot manufacture data rights. Public endpoint
availability does not grant commercial redistribution or third-party data
rights.

Kraken is the sole admitted source as of 2026-10-19 Asia/Shanghai. Its written Support reply
permits Insight to collect, store, display, and analyse Kraken market data
without a separate licence for the stated use case, and confirms that derived
analytics may be distributed. Its register entry is deliberately
`derived-analytics-only`: Insight may use it in its existing assessment,
divergence, and evidence workflows, but must not sell, redistribute,
sublicense, publish as a data service, or otherwise make the underlying Kraken
data available to third parties. The public raw market-reference endpoint stays
disabled while this policy is active. Any customer-facing raw-data view, export,
or broader commercial scope requires a new written Kraken review.

## Data contract

- Direct `BASE/USD` spot markets are preferred. The one explicit exception is
  Binance WBTC, whose USD quote is calculated from Binance's live `WBTC/USDT`
  and `USDT/USD` spot markets. The collector does not assume USDT equals USD,
  or infer USD from EUR, derivatives, or a wrapped-asset proxy.
- The configured Insight market-reference universe remains the upper bound;
  discovering an exchange market does not add a new Insight asset.
- `data_age_seconds` remains client-measured collector latency. Live Bitstamp
  ticker time and Bitfinex/Binance latest-public-trade times are recorded
  separately in `source_observed_at`. For Binance, that field is the older of
  the two conversion-leg trade timestamps. Historical Bitstamp and Bitfinex
  candles use the candle timestamp as `snapshot_ts` and leave
  `source_observed_at` null.
- A source timestamp must be no more than 15 minutes old and no more than 60
  seconds in the future. Missing, malformed, or stale source timestamps fail
  closed. No estimate or stale price is substituted.
- Each exchange remains its own source in the hourly rollup. Additional venues
  can improve independent-source count and price-dispersion evidence for
  directly listed assets.

## Bitstamp

Official public endpoints:

- Markets: `GET https://www.bitstamp.net/api/v2/markets/`
- Ticker: `GET https://www.bitstamp.net/api/v2/ticker/{market_symbol}/`
- Hourly candles: `GET https://www.bitstamp.net/api/v2/ohlc/{market_symbol}/`
- API reference: <https://www.bitstamp.net/api/>

The collector discovers the market catalog and retains entries where
`base_currency` is present, `counter_currency` is `USD`, `market_type` is
`SPOT`, and `trading` is `Enabled`. It rejects ambiguous USD spot entries for
the same base. The selected ticker supplies `last`, `bid`, `ask`, 24-hour
`volume`, and Unix-second `timestamp`; that timestamp is freshness-checked.
The rights-gated historical backfill uses the same discovered USD spot market and
hourly OHLC endpoint, excludes the open candle, and pages backward with a
cursor-advance guard.

## Bitfinex

Official public endpoints:

- Exchange-pair catalog: `GET https://api-pub.bitfinex.com/v2/conf/pub:list:pair:exchange`
- Multiple tickers: `GET https://api-pub.bitfinex.com/v2/tickers?symbols=...`
- Latest public trade: `GET https://api-pub.bitfinex.com/v2/trades/{symbol}/hist?limit=1&sort=-1`
- Hourly candles: `GET https://api-pub.bitfinex.com/v2/candles/trade:1h:{symbol}/hist`
- API references: <https://docs.bitfinex.com/reference/rest-public-conf>,
  <https://docs.bitfinex.com/reference/rest-public-tickers>, and
  <https://docs.bitfinex.com/reference/rest-public-trades> and
  <https://docs.bitfinex.com/reference/rest-public-candles>

The adapter matches catalog entries exactly equal to `BASEUSD` or `BASE:USD`.
The ticker provides best bid, best ask, and 24-hour base volume. The latest
public trade supplies price and millisecond epoch timestamp. Margin, futures,
securities, and stablecoin-converted pairs are excluded. Licensed historical
backfill uses Bitfinex's hourly trade candles for the same exact USD spot pair.

## Binance WBTC/USD composite

Binance's dedicated public-market API has the currently enabled spot markets
`WBTCUSDT` and `USDTUSD`. The converted WBTC USD bid is `WBTCUSDT bid × USDTUSD
bid`, and the ask is `WBTCUSDT ask × USDTUSD ask`; `ref_price` is the midpoint
of that converted book. This explicitly converts the quote currency and does
not treat USDT as being worth exactly one USD. Fresh trades on both pairs gate
the observation and the older of their timestamps is recorded. The row remains
attributed to Binance because both markets trade on Binance; its methodology
is recorded here and versioned with the collector.

Official endpoints and references:

- Public market-data endpoints: `https://data-api.binance.vision/api/v3`
- Market catalog: `GET /exchangeInfo?symbols=["WBTCUSDT","USDTUSD"]`
- Latest trades: `GET /trades?symbol=WBTCUSDT&limit=1` and
  `GET /trades?symbol=USDTUSD&limit=1`
- Best bid/ask: `GET /ticker/bookTicker?symbol=WBTCUSDT` and
  `GET /ticker/bookTicker?symbol=USDTUSD`
- WBTC 24-hour base volume: `GET /ticker/24hr?symbol=WBTCUSDT`
- Hourly backfill: `GET /klines` for both pairs, joined by candle open time
- Official API docs: <https://developers.binance.com/en/docs/products/spot/faqs/market_data_only>

The collector verifies both instruments are `TRADING` spot markets with the
expected base and quote assets. Each latest trade timestamp must be within 15
minutes and at most 60 seconds in the future. A stale trade on either leg,
missing pair, invalid bid/ask, or malformed response fails closed. The row's
source time is the older of the WBTC/USDT and USDT/USD latest trades. Historical
backfill uses only matched, completed hourly candles from both markets and is
admitted only after the same reviewed vendor agreement is registered.

The live public API is documented as keyless on `data-api.binance.vision`. The
standard `api.binance.com` host previously returned HTTP 451 on a GitHub-hosted
runner. The dedicated `data-api.binance.vision` host is separate; a successful
developer-host request does not confirm that the GitHub runner can reach it.
Record a successful hosted collection before relying on Binance in scheduled
production data. API availability does not establish Insight's right to store,
derive, or show data commercially; confirm the applicable Binance terms before
enabling the integration for production collection.

## Historical backfill

The manual backfill collects only venues that are in the source-rights register
as reviewed `vendor-licensed` sources with an agreement reference. This applies
equally to Coinbase, Kraken, Crypto.com, Bitstamp, Bitfinex, and Binance; Gemini
does not currently have a historical-candle backfill path. If no source meets
that standard, the command exits successfully before making a CEX request or
writing a row.

## Enablement sequence

1. Confirm written commercial data permission with each exchange for the
   planned collection, storage, analytics, customer-facing use, and whether
   raw data (rather than only derived analytics) may be delivered.
2. Record the agreement reference and any expiry in
   `src/lib/dataRights/evidenceRights.ts`, changing only the covered venue to
   `vendor-licensed`, and set its delivery policy. This code review is an
   explicit control point, not a substitute for legal review.
3. Apply `supabase/migrations/0090_market_reference_rights_gate.sql` and
   `0093_market_reference_delivery_policy.sql` to the
   target database. This repository change does not apply the migration to a
   remote database.
4. Publish the collector, workflow, and generated cron bundles. Regenerate the
   bundles from TypeScript with `node scripts/build-cron-bundles.mjs`.
5. Inspect collected rows, source timestamps, agreement references, failed-source errors, and hourly
   coverage after the next collection or manual backfill.

## WBTC source coverage

No CEX source presently contributes to a customer-facing WBTC reference until
its reviewed agreement is recorded. Once two covered venues produce successful
same-hour rows, the existing assessment can use their independent-source count.
Binance would add a third venue after its own agreement, deployment, and
collection; its price is a same-exchange cross-market conversion, not a direct
WBTC/USD order book.

## Commercial data-rights outreach status

Last updated: 2026-10-19 Asia/Shanghai. Kraken, Gemini, and Bitstamp initial requests were reported sent at 2026-10-15 23:13 Asia/Shanghai; Coinbase at 23:59; Bitfinex at 2026-10-16 00:23. At 2026-10-16 00:37, the user reported sending Kraken’s requested follow-up and the outstanding Crypto.com Exchange and Binance requests. On 2026-10-18 16:05 GMT-7 (2026-10-19 07:05 Asia/Shanghai), Kraken Support confirmed in writing that Insight may collect, store, display, and analyse Kraken market data without a separate licence for the described use case, while prohibiting delivery of underlying data to third parties and permitting distribution of derived analytics. Kraken is enabled only under that narrower delivery policy. A sent request or a limited permission is not a broad raw-data licence; keep other customer-facing commercial use gated until written terms cover the intended scope.

| Venue               | Outreach status                                                                                                                                                                                                                                                                                                                                                  | Contact / terms                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kraken              | Support reply received 2026-10-18 16:05 GMT-7 (2026-10-19 07:05 Asia/Shanghai): Insight may programmatically collect, store, display, and analyse market data for the stated use case without a separate licence; derived analytics may be distributed. Underlying data must remain for Insight's own benefit and must not be sold, redistributed, sublicensed, published as a data service, or made available to third parties. Enabled only as `derived-analytics-only`. | `marketdata@kraken.com`; [Kraken API Center](https://support.kraken.com/hc/en-us/articles/360000919966-API-Center) |
| Gemini              | Sent; awaiting written reply and applicable agreement                                                                                                                                                                                                                                                                                                            | `bizdev@gemini.com`                                                                                                                                                                                                                                                                                                                                             |
| Bitstamp            | Sent; awaiting written reply and applicable agreement                                                                                                                                                                                                                                                                                                            | `partners@bitstamp.net`                                                                                                                                                                                                                                                                                                                                         |
| Coinbase            | Sent 2026-10-15 23:59 Asia/Shanghai; awaiting written reply and applicable agreement. Request coverage for server-side collection, storage, derived analysis, and customer-facing outputs                                                                                                                                                                        | `marketdata@coinbase.com`; [Market Data Terms](https://www.coinbase.com/legal/market_data)                                                                                                                                                                                                                                                                      |
| Crypto.com Exchange | Sent 2026-10-16 00:37 Asia/Shanghai; awaiting written reply and applicable agreement. Request prior express written permission for commercial use of Exchange spot market data and derived customer-facing assessments; do not use the Predictions data route                                                                                                    | [Exchange API page: Get in Touch](https://crypto.com/exchange-pro/en-US/api); [API docs](https://exchange-developer.crypto.com/exchange/v1/docs/api/rest-single-page/); [US Exchange Terms](https://static2.crypto.com/exchange/assets/documents/us-tnc.pdf)                                                                                                    |
| Bitfinex            | Sent 2026-10-16 00:23 Asia/Shanghai; awaiting written reply and applicable agreement. Request covers commercial use of public spot API data, server-side storage, derived assessment outputs, and customer-facing use                                                                                                                                            | [Official support ticket](https://cs.bitfinex.com); [API Terms](https://www.bitfinex.com/legal/general/api-terms/); [Market Data Terms](https://www.bitfinex.com/legal/general/market-data/)                                                                                                                                                                    |
| Binance             | Sent 2026-10-16 00:37 Asia/Shanghai; awaiting written reply and applicable agreement. Ask Binance to confirm whether commercial rights are required for Insight’s public Spot REST API collection and separately for Binance Vision historical datasets; the official Vision dataset terms require a separate written enterprise data license for commercial use | [Official support chat](https://www.binance.com/en/chat); [VIP & Institutional contact form](https://www.binance.com/en-IN/vip-institutional-services); [Spot REST API docs](https://developers.binance.com/en/docs/products/spot/rest-api); [Binance Vision dataset terms](https://github.com/binance/binance-public-data/blob/master/TERMS_AND_CONDITIONS.md) |
