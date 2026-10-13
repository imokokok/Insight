# Alpaca Market Data development check

This is a local, read-only integration check for U.S. equity quotes. It defaults
to AAPL on Alpaca's IEX feed and returns the bid, ask, midpoint, quote timestamp,
and age. The command does not write quotes to Supabase, publish them through an
API, or connect Alpaca to the scheduled market-reference collector.

## Configure credentials locally

Add the following to the ignored `.env.local` file. Keep the key and secret out
of source control and browser code:

```dotenv
APCA_API_KEY_ID=your-alpaca-key-id
APCA_API_SECRET_KEY=your-alpaca-secret-key
ALPACA_DEV_TEST_STOCK_SYMBOLS=AAPL
ALPACA_DEV_TEST_STOCK_FEED=iex
```

Then run:

```sh
npm run alpaca:dev-test
```

Use comma-separated U.S. tickers for a small comparison, for example
`AAPL,MSFT`. The default feed is `iex`; change it only to a feed enabled for
your Alpaca account.

## Scope while permission is pending

Keep this integration in local development and internal testing. It is not
wired into database persistence, public API routes, production collection, or
client-side code. Do not expose Alpaca quotes or quote-derived results to users
until Alpaca confirms the intended commercial use in writing and clarifies any
applicable notice or licensing requirements.
