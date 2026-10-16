# Chainlink market-reference development check

Insight already reads Chainlink feeds for its oracle product. This local command
now checks that catalogued Chainlink USD feed only: it intentionally does not
call a CEX without a reviewed vendor agreement. Chainlink is reported as an
oracle reference, not an exchange, and this check does not persist, publish, or
affect production decisions.

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
```

The JSON output includes the selected feed address/path, price, update age,
and catalog heartbeat. It reports CEX comparison as disabled until a separately
reviewed vendor agreement is registered. A stale Chainlink observation is still
shown for diagnosis and makes the command exit unsuccessfully. The feed's
catalogued heartbeat is used as the freshness threshold.

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
