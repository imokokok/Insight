# Chainlink market-reference development check

Insight already reads Chainlink feeds for its oracle product. This adds a
separate, read-only check that compares one catalogued Chainlink USD feed with
the existing Coinbase, Kraken, and Gemini spot observations; Crypto.com supplies
the second direct USD spot market for WBTC. Bitstamp and Bitfinex can add direct
USD spot observations, while Binance currently supports a WBTC/USDT × USDT/USD
composite. Set `MARKET_REFERENCE_LICENSED_EXCHANGES` only after the relevant
written commercial data permissions are in place. Chainlink is reported as an
oracle reference, not counted as an exchange, and this check does not persist or
publish prices or affect production decisions.

## Run locally

The default check uses ETH/USD on Base (chain ID `8453`). It uses Insight's
existing Chainlink RPC fallback configuration and needs no Chainlink API key.
Public RPC endpoints may have their own availability or rate limits.

```sh
npm run chainlink:market-reference:dev-test
```

Optional local settings:

```dotenv
CHAINLINK_DEV_TEST_SYMBOL=ETH
CHAINLINK_DEV_TEST_CHAIN_ID=8453
# Optional; requires written commercial data permissions and migration 0087.
MARKET_REFERENCE_LICENSED_EXCHANGES=bitstamp,bitfinex,binance
```

The Binance adapter uses `data-api.binance.vision`, the dedicated public-market
data host. The ordinary `api.binance.com` host returned HTTP 451 on a previous
GitHub-hosted runner check. The dedicated host is a distinct endpoint; its
availability on the scheduled GitHub runner still needs to be confirmed by a
hosted collection run.

The JSON output includes the selected feed address/path, price, update age,
catalog heartbeat, freshness status, CEX quotes, CEX median, and their relative
deviation. A stale Chainlink observation is still shown for diagnosis, but is
excluded from the deviation and makes the command exit unsuccessfully. The
feed's catalogued heartbeat is used as the freshness threshold.

## Scope

The command remains a local development and validation path: it does not
persist or publish prices. The same catalog-backed Chainlink adapter can also
be requested through the optional `decisionInputCheck=1` assessment on the
pre-trade API. That response compares the caller's price and venue quote with
Chainlink, the stored CEX reference, and supported Ethereum DEX depth evidence.
It is a separate advisory result and does not alter the production oracle
verdict. See [decision-input assessment](./decision-input-assessment.md) for
the request fields and limits.

Chainlink reports an aggregated oracle reference, not an exchange's latest
executable quote; interpret the deviation as a comparison signal.

Chainlink's documentation directs developers to follow its Terms of Service
and to assess data freshness and feed-specific risk before use. Review those
terms for the intended customer-facing use before making this feed part of a
commercial product.
