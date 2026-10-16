# CEX market-reference source integrations

Bitstamp, Bitfinex, and Binance are implemented as optional sources for the
existing `market_reference_snapshots` collector. They remain disabled unless
the GitHub Actions repository variable `MARKET_REFERENCE_LICENSED_EXCHANGES`
names them. Public endpoint availability does not grant commercial
redistribution or third-party data rights; enable a venue only after written
terms cover the intended Insight use.

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
The licensed historical backfill uses the same discovered USD spot market and
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
backfill uses only matched, completed hourly candles from both markets and
applies the same licensed-source switch.

The live public API is documented as keyless on `data-api.binance.vision`. The
standard `api.binance.com` host previously returned HTTP 451 on a GitHub-hosted
runner. The dedicated `data-api.binance.vision` host is separate; a successful
developer-host request does not confirm that the GitHub runner can reach it.
Record a successful hosted collection before relying on Binance in scheduled
production data. API availability does not establish Insight's right to store,
derive, or show data commercially; confirm the applicable Binance terms before
enabling the integration for production collection.

## Historical backfill

The manual backfill collects Coinbase and Kraken hourly data, direct Crypto.com
WBTC/USD candles, Bitstamp and Bitfinex USD spot candles when those sources are
included in `MARKET_REFERENCE_LICENSED_EXCHANGES`, and the matched Binance
WBTC/USDT × USDT/USD composite candles when Binance is included. Gemini does not
currently have a historical-candle backfill path. All three optional sources
are disabled when the variable is empty. Local collector and backfill commands
read the same variable from `.env.local`; the GitHub Actions workflows read the
repository Actions variable.

## Enablement sequence

1. Confirm written commercial data permission with each exchange for the
   planned collection, storage, analytics, and any customer-facing use.
2. Apply `supabase/migrations/0087_market_reference_source_timestamps.sql` to
   the target database before enabling any new venue. This repository change
   does not apply the migration to a remote database.
3. Publish the collector, workflow, and generated cron bundles. Regenerate the
   bundles from TypeScript with `node scripts/build-cron-bundles.mjs`.
4. In GitHub repository **Settings → Secrets and variables → Actions →
   Variables**, set `MARKET_REFERENCE_LICENSED_EXCHANGES` only to venues
   covered by written permission, for example `bitstamp,bitfinex,binance`.
   Leave it unset or empty to keep all optional sources off.
5. Inspect collected rows, source timestamps, failed-source errors, and hourly
   coverage after the next collection or manual backfill.

## WBTC source coverage

Kraken and Crypto.com already provide two direct WBTC/USD CEX sources and meet
the assessment's existing two-venue minimum once successful observations land
in the same hour. Binance adds a third exchange's WBTC observation after it is
licensed, deployed, and its rows are collected. Its price is a same-exchange
cross-market conversion, not a direct WBTC/USD order book, and remains off by
default until commercial use is cleared.

## Commercial data-rights outreach status

Last updated: 2026-10-16 Asia/Shanghai. Kraken, Gemini, and Bitstamp initial requests were reported sent at 2026-10-15 23:13 Asia/Shanghai; Coinbase at 23:59; Bitfinex at 2026-10-16 00:23. At 2026-10-16 00:37, the user reported sending Kraken’s requested follow-up and the outstanding Crypto.com Exchange and Binance requests. Kraken’s follow-up identifies the applicant as an independent developer of Insight operating in China; Business Development response is pending. A sent request is not a data license; keep customer-facing commercial use gated until written terms cover the intended scope.

| Venue               | Outreach status                                                                                                                                                                                                                                                                                                                                                  | Contact / terms                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kraken              | Initial request sent 2026-10-15 23:13; Kraken Support requested the company represented, partnership rationale, and primary country of operations. Follow-up sent 2026-10-16 00:37, identifying the applicant as an independent developer of Insight operating in China; awaiting Business Development response and applicable written agreement                 | `marketdata@kraken.com`; [Kraken API Center](https://support.kraken.com/hc/en-us/articles/360000919966-API-Center)                                                                                                                                                                                                                                              |
| Gemini              | Sent; awaiting written reply and applicable agreement                                                                                                                                                                                                                                                                                                            | `bizdev@gemini.com`                                                                                                                                                                                                                                                                                                                                             |
| Bitstamp            | Sent; awaiting written reply and applicable agreement                                                                                                                                                                                                                                                                                                            | `partners@bitstamp.net`                                                                                                                                                                                                                                                                                                                                         |
| Coinbase            | Sent 2026-10-15 23:59 Asia/Shanghai; awaiting written reply and applicable agreement. Request coverage for server-side collection, storage, derived analysis, and customer-facing outputs                                                                                                                                                                        | `marketdata@coinbase.com`; [Market Data Terms](https://www.coinbase.com/legal/market_data)                                                                                                                                                                                                                                                                      |
| Crypto.com Exchange | Sent 2026-10-16 00:37 Asia/Shanghai; awaiting written reply and applicable agreement. Request prior express written permission for commercial use of Exchange spot market data and derived customer-facing assessments; do not use the Predictions data route                                                                                                    | [Exchange API page: Get in Touch](https://crypto.com/exchange-pro/en-US/api); [API docs](https://exchange-developer.crypto.com/exchange/v1/docs/api/rest-single-page/); [US Exchange Terms](https://static2.crypto.com/exchange/assets/documents/us-tnc.pdf)                                                                                                    |
| Bitfinex            | Sent 2026-10-16 00:23 Asia/Shanghai; awaiting written reply and applicable agreement. Request covers commercial use of public spot API data, server-side storage, derived assessment outputs, and customer-facing use                                                                                                                                            | [Official support ticket](https://cs.bitfinex.com); [API Terms](https://www.bitfinex.com/legal/general/api-terms/); [Market Data Terms](https://www.bitfinex.com/legal/general/market-data/)                                                                                                                                                                    |
| Binance             | Sent 2026-10-16 00:37 Asia/Shanghai; awaiting written reply and applicable agreement. Ask Binance to confirm whether commercial rights are required for Insight’s public Spot REST API collection and separately for Binance Vision historical datasets; the official Vision dataset terms require a separate written enterprise data license for commercial use | [Official support chat](https://www.binance.com/en/chat); [VIP & Institutional contact form](https://www.binance.com/en-IN/vip-institutional-services); [Spot REST API docs](https://developers.binance.com/en/docs/products/spot/rest-api); [Binance Vision dataset terms](https://github.com/binance/binance-public-data/blob/master/TERMS_AND_CONDITIONS.md) |
