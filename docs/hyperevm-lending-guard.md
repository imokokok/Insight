# HyperEVM Lending Guard

`hyperevm_lending_guard` is a read-only, pre-signing decision gate for HyperEVM mainnet (`999`) lending actions on HyperLend Core, an Aave V3 fork. It combines separate collateral and debt oracle checks with the caller-declared post-action LTV and live protocol parameters. It never creates, signs, relays, or broadcasts a transaction.

## Supported direct-call scope

- `hyperlend-core-hyperevm`: direct Pool `supply` and variable-rate `borrow` only (interest rate mode 2). The reviewed direct assets are WHYPE, WSTHYPE, UBTC, UETH, USDe, sUSDe, USDT0, KHYPE, and USDC. The guard reads the live HyperLend reserve list, status flags, LTV, liquidation threshold, and reserve oracle identity on HyperEVM for each decision.

The guard targets the HyperLend Core pool (`0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b`) via its deployed UiPoolDataProvider (`0xfc05a3fbf47094f53a8f98fda5dd8abdd336b9d4`), read with a local ABI truncated to the fields the deployment still shares with the upstream Aave interface (the deployed contract's return tail has diverged from the SDK ABI, so the guard decodes only the verified head).

The deployment has no stable-rate debt, and `onBehalfOf` is always bound to the transaction sender. Non-zero native value, unknown targets/selectors, batch/proxy dispatch, and delegated positions are rejected. Assets without a canonical USD oracle feed (USOL, PT tokens, wstHYPE-derivatives, beHYPE) are intentionally outside the reviewed set: their multi-oracle semantics require separate reviewed decoders before an attested `ALLOW` is appropriate.

Oracle evidence uses the canonical 8-decimals Chainlink feeds deployed on HyperEVM 999 (HYPE, ETH, BTC, USDT, USDC, SOL; live-verified 2026-11-10). If a live RPC call fails, reserve flags are incompatible, or declared assets differ from the live reserve list, the result is a complete `BLOCK`; the guard never falls back to static lending-risk values.

## API, x402, and MCP

```text
GET  /api/v1/safety/hyperevm-lending-guard
POST /api/v1/safety/hyperevm-lending-guard
POST /api/v1/safety/hyperevm-lending-guard/verify
```

`GET` provides the risk decision. `POST` accepts `{ guard, transaction }` after the caller builds an unsigned direct call. It commits the canonical assessment, full calldata hash, sender, nonce, zero value, chain id 999, verdict, and a five-minute expiry into an EIP-712 `HyperEvmLendingGuardDecision` attestation when a trusted Insight attester is configured.

With `X402_ENABLED=true`, unauthenticated requests use the configured x402 settlement path and settle only after a complete 2xx decision. Agents can call the same capability through the C3-priced MCP tools `hyperevm_lending_guard` and `hyperevm_lending_guard_exact_call`.

Example:

```text
/api/v1/safety/hyperevm-lending-guard?protocolId=hyperlend-core-hyperevm&action=supply&collateralSymbol=WHYPE&loanSymbol=USDC&collateralValueUsd=10000&debtValueUsd=0
```

## Boundary

An Insight `ALLOW` is risk evidence, not wallet authorization. Unlike Base and Monad, no PriorSeal bound-intent adapter exists for HyperEVM yet; the decision attestation is verifiable standalone through the `/verify` route. HyperEVM swap venues (HyperSwap V3 and others) are not reviewed on this surface — swap, vault-deposit, and repay actions on chain 999 are refused as `not_integrated` rather than substituted with another chain's protocol model.

This keeps responsibilities separate: Insight assesses risk inputs, callers retain full authorization over any execution, and x402 pays only for the read-only assessment.
