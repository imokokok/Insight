# Swap channel adapter boundary

The channel adapter is a distribution wrapper, not a second risk engine.

## Direct reviewed routes

Use `prepare_agent_swap_guard` when the route is one of the reviewed direct
profiles. The returned approval and swap calldata are the only bytes that may
be shown for signing. Use the exact same bytes in PriorSeal.

## Uniswap and 1inch

Uniswap API, 1inch Classic, 1inch Intent, and 1inch cross-chain outputs are
route proposals. They may contain a router call, a Permit2 step, a batch, an
intent, or resolver-controlled execution. They are not accepted by the direct
Agent Swap Guard merely because the venue name is familiar.

If an integration needs a pre-trade data check:

1. Obtain the route and quote from the provider.
2. Pass the source/destination decision prices, route quote, quote timestamp,
   and explicit policy to `execution_preflight`.
3. Treat `ALLOW` as data sufficiency only; it is not route safety or execution
   authority.
4. Bind the exact unsigned transaction or provider order through the wallet's
   authorization layer and retain the provider response for review.

Do not claim that this flow verifies a provider's arbitrary calldata. A full
Uniswap or 1inch route guard requires a separately reviewed route schema,
target allowlist, Permit2/batch semantics, and settlement collector.

## MetaMask

MetaMask transaction or signature insights should display an already-issued
Insight decision, its expiry, exact-call hash, and PriorSeal authorization
status. The wallet surface is a presentation and confirmation layer; it must
not create a second verdict or silently replace the guarded bytes.

## CoW Protocol

CoW orders and hooks are intent/order objects rather than the same direct EVM
calldata shape. Use an order-specific typed-data binding only after CoW order,
hook, solver, and settlement semantics have been reviewed. Do not pass a CoW
order to `prepare_agent_swap_guard`.

## Jupiter

Jupiter is already wired through the Solana `trade_guard` / `prepare_swap`
surface with `venue: "solana_jupiter"`. Its route coverage remains explicitly
reviewed-pool based. Unreviewed pools return an unavailable coverage result;
they must not be treated as a negative safety verdict or substituted with an
Orca direct route.
