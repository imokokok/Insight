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

## Agent tools

- `get_base_dex_market` exposes the Base pool evidence.
- `get_solana_dex_route` exposes the Solana route evidence.

Both tools have foundational C1 pricing. The existing `get_monad_dex_market`
continues to provide Monad WMON/USDC evidence and its finalized rolling-volume
index.
