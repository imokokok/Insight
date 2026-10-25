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

## Base: one Aerodrome Slipstream pool

`GET /api/v1/markets/dex/aerodrome` reads the reviewed Aerodrome Slipstream
WETH/USDC CL100 pool at one Base block. It proves both directions of pool
provenance (the configured factory resolves the pool and the pool reports that
factory), then verifies the sorted token pair and tick spacing before returning
spot, a 30-minute TWAP, active in-range liquidity, token balances, the pool's
live fee in pips, and a 1/10/100 WETH exact-input QuoterV2 ladder.

Slipstream is derived from Uniswap V3 but uses `tickSpacing` to identify pools
and its six-field `slot0`; Insight therefore has a distinct adapter rather than
reusing the Uniswap ABI. The fee is block-pinned venue context and may change
with Aerodrome fee configuration. This remains a single reviewed pool rather
than an Aerodrome-wide route, reserve-TVL measurement, execution promise, or
oracle-consensus input.

## Aerodrome user-signed Base execution loop

The Aerodrome path has three separate stages:

1. The C3 pre-trade decision-input policy accepts `reviewedAerodromeSlipstream`
   only for Base `WETH → USDC` through this exact CL100 pool. It binds the
   exact-notional QuoterV2 result, factory, pool, quoter, tick spacing, live
   fee, raw amounts, impact, and spot/TWAP checks into the assessment.
2. `prepare_aerodrome_slipstream_swap` returns unsigned, single-hop router
   calldata plus an **exact-amount** WETH approval template. Before returning
   either, Insight verifies the pinned router bytecode hash and immutable
   factory/WETH bindings at the quote block, then encodes `amountOutMinimum`
   from the caller's slippage bound.
3. The wallet owner signs and submits calls directly on Base. Afterwards,
   `execution_receipt` can accept the Base transaction hash and signed
   pre-trade originals to collect ERC-20 settlement evidence and issue a
   paired, verifiable receipt.

Insight never holds a key, creates a signature, sends an approval, relays a
swap, or claims that unsigned calldata will execute. The preparation path
never substitutes native ETH wrapping, a reverse direction, arbitrary pool or
router, multi-hop path, or aggregator route. The receipt observes settlement;
it does not authorize a transaction or prove strategy, MEV outcome, or fill
quality.

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
matching priority, and subsequent book changes. The market-evidence endpoint
never signs, simulates, or submits an order.

## Agent tools

- `get_base_dex_market` exposes the Base pool evidence.
- `get_aerodrome_slipstream_market` exposes the reviewed Aerodrome Slipstream
  Base WETH/USDC CL100 evidence.
- `prepare_aerodrome_slipstream_swap` prepares bounded, unsigned Base calldata
  for that same reviewed Aerodrome pool. It is C3; the existing
  `execution_receipt` tool is the post-settlement verification handoff.
- `get_solana_dex_route` exposes the Solana route evidence.
- `get_hyperliquid_perp_market` exposes the reviewed Hyperliquid perpetual
  evidence; it accepts `market: BTC | ETH | HYPE` and defaults to `BTC`.
- `prepare_hyperliquid_perp_order` performs the user-side execution preflight
  below and returns an unsigned IOC action only if it passes.
- `verify_hyperliquid_perp_execution` reads a single known order and a bounded
  window of its fills after the user has signed and submitted it.

The three market-evidence tools have foundational C1 pricing. The existing
`get_monad_dex_market` continues to provide Monad WMON/USDC evidence and its
finalized rolling-volume index.

## Hyperliquid user-signed execution loop

The reviewed Hyperliquid integration is deliberately equivalent in security
shape to Insight's Uniswap execution support: Insight evaluates the exact
intent and later observes execution, while the account owner or its approved
Hyperliquid API wallet performs the only signing and submission.

1. Call `prepare_hyperliquid_perp_order` with one reviewed `BTC`, `ETH`, or
   `HYPE` perpetual, a `buy` or `sell` base size, IOC limit price,
   `reduceOnly` setting, caller-created 16-byte `clientOrderId`, notional cap,
   and explicit book-impact / mark-oracle limits.
2. Insight reads fresh `metaAndAssetCtxs` and the unaggregated 20-level L2
   book. It checks the live asset index, `szDecimals`, perpetual price tick,
   caller limit notional, full-fill requirement, displayed-book impact, and
   mark/oracle divergence. A failed gate returns `BLOCK` and no action to
   sign.
3. A `READY_TO_SIGN` response contains a short-expiry, single-order,
   `grouping: "na"`, `Ioc` action. The user process chooses a fresh nonce,
   signs it with the official Hyperliquid signing flow, and sends it directly
   to Hyperliquid's exchange endpoint. Insight never receives a private key,
   approved API-wallet key, nonce, or signature.
4. Call `verify_hyperliquid_perp_execution` using the account/subaccount/vault
   address, the `oid` or original `clientOrderId`, the submission timestamp,
   and the expected order fields. It compares `orderStatus` with that intent
   and aggregates only matching `userFillsByTime` rows inside a 24-hour bounded
   window.

The preparation tool is C3 ($0.02 through x402 MCP); the execution observer is
C4 ($0.04). The normal MCP x402 `tools/call` bridge applies these prices on all
advertised payment networks; no separate trading payment or exchange
credential is involved.

This is not a custodial broker. IOC is intentionally the only admitted order
type because it lets Insight apply a finite displayed-book bound. It cannot
prove future matching priority, exchange margin and open-interest rules,
fees, funding, liquidation risk, later order-book state, or the correctness of
the exchange's public API. The returned execution record is labelled
`verificationLevel: "observed"`, not an Insight signature.

See Hyperliquid's official [tick and lot size](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/tick-and-lot-size), [exchange action](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint), [API-wallet/nonce](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets), and [order-status/fills](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint) documentation for the user-side final step.

## C3 pre-trade integration

Paid `GET /api/v1/safety/pre-trade` and `GET /api/v1/safety/preflight` can
opt into `reviewedUniswapV3` or `reviewedAerodromeSlipstream` evidence inside
their decision-input check. Only one reviewed DEX lane is admitted per
assessment.
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

`reviewedAerodromeSlipstream` applies the same exact-notional, fail-closed
model to Base `WETH → USDC`, while retaining Slipstream's own identity rules:
CL `tickSpacing` plus the pool's live fee rather than a Uniswap V3 fee tier.
