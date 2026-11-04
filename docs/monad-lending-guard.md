# Monad Lending Guard

`monad_lending_guard` is a read-only, pre-signing decision gate for Monad mainnet (`143`) lending actions. It combines separate collateral and debt oracle checks with the caller-declared post-action LTV and live protocol parameters. It never creates, signs, relays, or broadcasts a transaction.

## Supported direct-call scope

- `aave-v3-monad`: direct Pool `supply` and variable-rate `borrow` only. The reviewed direct assets are USDT0, USDC, USDe, WETH, cbBTC, wstETH, weETH, sUSDe, and GHO. The guard reads the live Aave reserve list, status flags, LTV, liquidation threshold, and reserve oracle identity on Monad for each decision.
- `morpho-blue-monad`: direct core `supply` and `borrow` with an exact immutable `marketId`. The guard reads `idToMarketParams`, resolves both underlying symbols on-chain, and uses the market LLTV and oracle address.

Both profiles reject non-zero native value, unknown targets/selectors, batch/proxy dispatch, delegated positions, and Morpho callbacks. Native MON gateway wrapping, Aave eMode, and Morpho bundles are intentionally out of scope: their multi-step semantics require separate reviewed decoders before an attested `ALLOW` is appropriate.

If a live RPC call fails, reserve flags are incompatible, or declared assets differ from immutable market parameters, the result is a complete `BLOCK`; the guard never falls back to static lending-risk values.

## API, x402, and MCP

```text
GET  /api/v1/safety/monad-lending-guard
POST /api/v1/safety/monad-lending-guard
POST /api/v1/safety/monad-lending-guard/verify
```

`GET` provides the risk decision. `POST` accepts `{ guard, transaction }` after the caller builds an unsigned direct call. It commits the canonical assessment, full calldata hash, sender, nonce, zero value, Monad chain id, verdict, and a five-minute expiry into an EIP-712 `MonadLendingGuardDecision` attestation when a trusted Insight attester is configured.

With `X402_ENABLED=true`, unauthenticated requests use the configured x402 settlement path and settle only after a complete 2xx decision. Agents can call the same capability through the C3/5-credit MCP tools `monad_lending_guard` and `monad_lending_guard_exact_call`.

Example:

```text
/api/v1/safety/monad-lending-guard?protocolId=aave-v3-monad&action=borrow&collateralSymbol=WETH&loanSymbol=USDC&collateralValueUsd=10000&debtValueUsd=4000
```

## PriorSeal boundary

An Insight `ALLOW` is risk evidence, not wallet authorization. PriorSeal's `buildMonadLendingGuardBoundIntent()` independently verifies the Insight signature against a pinned key registry, requires `ALLOW`, writes the unique `insight.monad-lending-guard.v1` commitment into a zero-value exact-call authorization, and caps the authorization lifetime at the Insight deadline. `verifyMonadLendingGuardAuthorizationBinding()` and `verifyMonadLendingGuardReceiptBundle()` verify that linkage later.

This keeps responsibilities separate: Insight assesses risk inputs, PriorSeal proves user authorization and observed execution, and x402 pays only for the read-only assessment.
