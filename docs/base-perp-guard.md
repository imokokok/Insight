# Base Perp Guard

`base_perp_guard` is a read-only, pre-trade decision-input integrity gate for opening a Synthetix Perps V3 position on Base. It evaluates the two price inputs the position relies on — the underlying market price and the USDC margin price — plus the caller-declared post-action leverage. It never creates, signs, relays, or broadcasts an order.

v2 adds an exact-call mode: `POST` accepts one unsigned direct `commitOrder` call and binds it into a portable, short-lived EIP-712 decision (`base_perp_guard_exact_call` on MCP), matching the Base Lending Guard's decision-evidence shape.

## Supported scope

- Chain: Base mainnet (`8453`) only.
- Protocol: `synthetix-perps-v3-base` only.
- Actions: `open_long`, `open_short`.
- Reviewed markets: BTC (25x), ETH (25x), SOL (20x), XRP (20x), DOGE (15x), PEPE (10x) — conservative static reviewed caps. Markets outside this set fail closed with an error.
- Margin: USDC only.
- Inputs: notional `sizeUsd` and `marginValueUsd` **after the intended action**, in USD. These values are declared by the caller; effective leverage is derived as `sizeUsd / marginValueUsd`, not accepted as a separate claim.

## What it checks and what it does not

- **Underlying oracle integrity**: cross-source comparison, deviation, freshness, and manipulation risk for the market underlying. Synthetix Perps V3 consumes Pyth as its primary oracle; Pyth is one of Insight's integrated providers, so the cross-source comparison evaluates the feed family the venue consumes.
- **Margin peg integrity**: the same check for USDC.
- **Leverage band**: `BLOCK` at or above the reviewed market cap, `CAUTION` at or above 90% of it, with a conservative maximum size suggestion (90% of the cap).

It does **not** evaluate Synthetix's mark-price aggregation, funding, or liquidation engine. Venue market parameters are governance-controlled and can change; the guard surfaces `parameterSource: 'reviewed-profile'` and every result includes a reason asking the caller to verify live venue configuration before execution. See the scenario research in [the Base Perp Guard research document](research/2026-11-02-base-perp-guard-research.md) for the incident evidence and the v2+ roadmap (exact-call binding and attestation, liquidity evidence layer).

## Decision contract

The response contains:

- an `ALLOW`, `CAUTION`, or `BLOCK` decision;
- separate underlying and margin oracle decisions, including attestation references when signing is configured;
- the reviewed max leverage, derived effective leverage, liquidation buffer, and a conservative maximum size suggestion (90% of the reviewed cap);
- explicit scope stating that transaction authority is `none`.

`BLOCK` is a complete paid risk decision. It is not an API error and must not be retried as a way to bypass payment.

## API and x402

The direct endpoint is:

```text
GET /api/v1/safety/base-perp-guard
```

Example request:

```text
/api/v1/safety/base-perp-guard?protocolId=synthetix-perps-v3-base&action=open_long&assetSymbol=ETH&marginAssetSymbol=USDC&sizeUsd=25000&marginValueUsd=5000
```

With `X402_ENABLED=true`, unauthenticated requests receive a standard x402 v2 challenge and settle only after a complete 2xx decision. Existing API-key callers continue to use the normal v1 middleware. The same functionality is available to agents as the x402-metered MCP tools `base_perp_guard` (assessment) and `base_perp_guard_exact_call` (exact-call decision).

## Exact-call decision (v2)

```text
POST /api/v1/safety/base-perp-guard
```

The body is `{ "guard": <same fields as the GET query>, "transaction": { chainId, from, to, data, nonce, value } }` where `transaction` is one unsigned direct call. The decoder fails closed unless the call is exactly:

- `to` the canonical Synthetix Perps V3 Base `PerpsMarketProxy` (`0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce`, from the official `@synthetixio/v3-contracts` 8453-andromeda deployment and verified against live `getMarkets()` reads);
- `commitOrder` with the `AsyncOrder.OrderCommitmentRequest` struct, canonically ABI-encoded, zero call value;
- a reviewed market id matching the declared asset symbol (ETH `100`, BTC `200`, SOL `400`, XRP `7100`, DOGE `800`, PEPE `1200`);
- the reviewed Pyth settlement strategy id `0`;
- a `sizeDelta` whose sign matches the declared `open_long`/`open_short` action;
- no third-party `trackingCode` or `referrer`;
- a positive `accountId` and positive `acceptablePrice`.

The response is a portable decision: the guard result, the exact transaction, a small decoded action binding (market id, account, size delta, acceptable price, calldata hash), a `decisionHash` (keccak over the canonical unsigned decision), and — when Insight signing is configured and published — a short-lived (300 s) EIP-712 `BasePerpGuardDecision` attestation. Verify any decision at:

```text
GET  /api/v1/safety/base-perp-guard/verify   (descriptor: domain, types, attester status)
POST /api/v1/safety/base-perp-guard/verify   ({ decision } → valid / reason)
```

Margin is out of scope for the exact call: USDC must already be deposited into the Synthetix account (and delegated to the market) before `commitOrder` is executed. The decision still is not an execution authorization.

## Claim boundaries

- This is an assessment of declared decision inputs at a point in time. It is not principal authorization, not an execution guarantee, and not a claim that the position is safe under every market move.
- Insight never receives a key, allocates a nonce, signs, or submits an order. Bind a successful result to an exact, user-authorized order separately (for example with PriorSeal).
- The leverage caps are static reviewed values, not live venue reads. Treat them as guard bands, not as a mirror of current Synthetix governance parameters.
