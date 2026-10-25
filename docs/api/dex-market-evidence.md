# DEX market evidence

Insight exposes reviewed market evidence separately from its oracle consensus.
These endpoints provide execution context for an agent; they are never a claim
that one venue is a venue-independent fair-price oracle.

## Base: one Uniswap V3 pool

`GET /api/v1/markets/dex/base` reads the reviewed Base WETH/USDC Uniswap V3
0.3% pool at one EVM block. The response proves the factory/pool/token/fee
relationship at that block and includes spot, a 30-minute TWAP, active
in-range liquidity, pool balances, and a 1/10/100 WETH exact-input quote
ladder. It does not represent every Base route or a reserve-TV L calculation.

## Solana: one Jupiter route market

`GET /api/v1/markets/dex/solana` obtains exact-input SOL/USDC quote ladders
from Jupiter, verifies the configured Solana RPC is mainnet-beta, and returns
the current finalized RPC slot beside every Jupiter quote context slot and AMM
route plan. The endpoint requires the server-only `JUPITER_API_KEY` setting and
returns `503 DEX_ROUTE_UNAVAILABLE` while it is absent or an upstream witness
fails.

This is an aggregator route quote, not a direct, block-pinned read of a single
Solana pool. It is also not a simulation, authorization, or execution promise.
For an authorization that must bind an exact Solana transaction, use the signed
`POST /api/v1/execution/solana/simulate` receipt as a separate evidence item.

## Hyperliquid: reviewed perpetual CLOB markets

`GET /api/v1/markets/dex/hyperliquid?market=BTC` reads a reviewed Hyperliquid
mainnet perpetual market. `BTC` is the default; `ETH` and `HYPE` are also
available. Each response includes the exchange-reported mark, mid, oracle,
funding, open interest, 24-hour notional volume, plus a fresh L2-book witness
with spread and displayed bid/ask depth. Insight derives buy and sell impact
estimates for a fixed, market-specific USD-notional ladder from that displayed
book only.

This is CLOB context rather than an AMM pool analysis: Insight does not invent
a V3-style TWAP or liquidity metric for Hyperliquid. The endpoint rejects an
invalid, crossed, future, or stale L2 snapshot. Estimates are incomplete when
the published book cannot fill the target and exclude fees, funding, margin,
matching priority, and subsequent book changes. No endpoint signs, simulates,
or submits an order.

## Agent tools

- `get_base_dex_market` exposes the Base pool evidence.
- `get_solana_dex_route` exposes the Solana route evidence.
- `get_hyperliquid_perp_market` exposes the reviewed Hyperliquid perpetual
  evidence; it accepts `market: BTC | ETH | HYPE` and defaults to `BTC`.

All three tools have foundational C1 pricing. The existing
`get_monad_dex_market` continues to provide Monad WMON/USDC evidence and its
finalized rolling-volume index.

## C3 pre-trade integration

Paid `GET /api/v1/safety/pre-trade` and `GET /api/v1/safety/preflight` can
now opt into `reviewedUniswapV3` evidence inside their decision-input check.
The caller supplies the exact source amount plus explicit maximum quote and
spot/TWAP divergence limits. Insight then admits only these source-to-USDC
profiles:

- Monad `MON`/`WMON` → `USDC` (reviewed WMON/USDC V3 pool)
- Base `ETH`/`WETH` → `USDC` (reviewed WETH/USDC V3 pool)

For an admitted route, Insight obtains a Quoter V2 exact-input simulation at
one pinned block and binds the pool, quoter, fee tier, block witness, raw
amounts, price impact, and the two deviation checks into the signed
decision-input assessment. Unsupported direction/pair, stale or unreadable
evidence, and a failed limit produce `INSUFFICIENT_EVIDENCE` or `BLOCK`; they
never fall back to an inferred route. This is not a signed-transaction
simulation or a guarantee that a later transaction will land at that quote.
