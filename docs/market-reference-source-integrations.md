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
- `data_age_seconds` remains client-measured collector latency. Bitstamp ticker
  time and Bitfinex/Binance latest-public-trade times are recorded separately
  in `source_observed_at`. For Binance, that field is the older of the two
  conversion-leg trade timestamps.
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
- API reference: <https://www.bitstamp.net/api/>

The collector discovers the market catalog and retains entries where
`base_currency` is present, `counter_currency` is `USD`, `market_type` is
`SPOT`, and `trading` is `Enabled`. It rejects ambiguous USD spot entries for
the same base. The selected ticker supplies `last`, `bid`, `ask`, 24-hour
`volume`, and Unix-second `timestamp`; that timestamp is freshness-checked.

## Bitfinex

Official public endpoints:

- Exchange-pair catalog: `GET https://api-pub.bitfinex.com/v2/conf/pub:list:pair:exchange`
- Multiple tickers: `GET https://api-pub.bitfinex.com/v2/tickers?symbols=...`
- Latest public trade: `GET https://api-pub.bitfinex.com/v2/trades/{symbol}/hist?limit=1&sort=-1`
- API references: <https://docs.bitfinex.com/reference/rest-public-conf>,
  <https://docs.bitfinex.com/reference/rest-public-tickers>, and
  <https://docs.bitfinex.com/reference/rest-public-trades>

The adapter matches catalog entries exactly equal to `BASEUSD` or `BASE:USD`.
The ticker provides best bid, best ask, and 24-hour base volume. The latest
public trade supplies price and millisecond epoch timestamp. Margin, futures,
securities, and stablecoin-converted pairs are excluded.

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

The live public API is documented as keyless on `data-api.binance.vision`. Its
availability does not itself establish Insight's right to store, derive, or
show data commercially; confirm the applicable Binance terms before enabling
the integration for production collection.

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
