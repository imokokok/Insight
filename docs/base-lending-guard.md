# Base Lending Guard

`base_lending_guard` is a read-only, pre-signing decision gate for Base lending actions. It evaluates the two price inputs an action relies on and the caller-declared post-action LTV. It never creates, signs, relays, or broadcasts a transaction.

The exact-call mode adds portable, signed decision evidence. It is deliberately separate from authorization: an Insight signature means “this exact direct call was assessed at this time,” not “Insight can execute it” or “the user approved it.”

## Supported scope

- Chain: Base mainnet (`8453`) only.
- Protocols:
  - `aave-v3-base`: direct Pool `supply` and variable-rate `borrow`.
  - `morpho-blue-base`: direct `supply` and `borrow` with an exact immutable Morpho `marketId`.
  - `compound-v3-base`: direct USDC Comet `supply`, and `withdraw(USDC, amount)` as the protocol's direct borrow form.
  - `moonwell-base`: direct `mint` and `borrow` on the reviewed Base USDC, WETH, cbBTC, cbETH, wstETH, weETH, and EURC markets.
- Actions: `supply`, `borrow`.
- Inputs: collateral and debt **values after the intended action**, in USD. These values are declared by the caller; Insight does not infer them from an unsigned transaction in v1.
- Exact-call profile: a zero-value direct call to the canonical Aave V3 Base Pool, Morpho Blue Base contract, Compound Base USDC Comet, or a source-controlled Moonwell market. The admitted selectors are only the direct lending operations described above; proxy/batch calls, Morpho callbacks, delegated positions, non-zero ETH value, and unknown selectors are rejected.

Morpho is market-specific. The guard reads `idToMarketParams(marketId)` and rejects a request if the returned loan/collateral symbols differ from the caller declaration. Compound reads the Comet's current collateral and liquidation factors and its price-feed address; unlevered USDC-base-asset supply is also admitted. Moonwell reads the reviewed market's live Comptroller collateral factor and Oracle identity, refusing an unlisted or zero-factor market. Aave reads current risk parameters; if this chain read fails and only registry defaults are available, the guard returns `BLOCK` rather than issuing an `ALLOW` based on stale configuration.

Fluid and Euler are intentionally not exposed by this v1 exact-call surface yet. Fluid positions can require vault/NFT-aware `operate` semantics, while Euler V2 borrowing commonly needs EVC authorization and batched controller/collateral operations. They need a reviewed per-vault/per-market registry, live parameter reads, and a dedicated exact-call decoder before they can receive the same attested `ALLOW` guarantee.

## Decision contract

The response contains:

- an `ALLOW`, `CAUTION`, or `BLOCK` decision;
- separate collateral and loan oracle decisions;
- maximum and liquidation LTV, projected LTV, and a conservative maximum debt suggestion (90% of max LTV);
- a parameter-source label and, for Morpho, the immutable market oracle address;
- explicit scope stating that transaction authority is `none`.

`BLOCK` is a complete paid risk decision. It is not an API error and must not be retried as a way to bypass payment.

## API and x402

The direct endpoint is:

```text
GET /api/v1/safety/base-lending-guard
```

With `X402_ENABLED=true`, unauthenticated requests receive a standard x402 v2 challenge and settle only after a complete 2xx decision. Existing API-key callers continue to use the normal v1 middleware. The same functionality is also available to agents as the x402-metered MCP tool `base_lending_guard` (C3 / 5 credits).

Example Aave request:

```text
/api/v1/safety/base-lending-guard?protocolId=aave-v3-base&action=borrow&collateralSymbol=WETH&loanSymbol=USDC&collateralValueUsd=10000&debtValueUsd=4000
```

Example Morpho request (the market id must be the exact 32-byte identifier):

```text
/api/v1/safety/base-lending-guard?protocolId=morpho-blue-base&action=borrow&collateralSymbol=WETH&loanSymbol=USDC&collateralValueUsd=10000&debtValueUsd=4000&marketId=0x…
```

## Exact-call signed decision

Use `POST /api/v1/safety/base-lending-guard` with this JSON body when a caller has already built, but not signed or submitted, a direct lending transaction:

```json
{
  "guard": {
    "protocolId": "aave-v3-base",
    "action": "borrow",
    "collateralSymbol": "WETH",
    "loanSymbol": "USDC",
    "collateralValueUsd": 10000,
    "debtValueUsd": 4000
  },
  "transaction": {
    "chainId": 8453,
    "from": "0x…",
    "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    "data": "0x…",
    "nonce": "7",
    "value": "0"
  }
}
```

The response includes `insight.base-lending-guard-decision.v1`, its `decisionHash`, decoded direct-call facts, and an EIP-712 `BaseLendingGuardDecision` attestation when a trusted production attester is configured. The signed bytes commit to the complete canonical decision, exact calldata hash, account, Base chain ID, verdict, and a five-minute validity window. They also commit to references to the two underlying Oracle Safety attestations when those are available.

An un-attested response is useful as a preview only and must not be treated as reusable execution evidence. Third parties can validate an attested decision without credentials at:

```text
POST /api/v1/safety/base-lending-guard/verify
{ "decision": { "…": "full response decision object" } }
```

## PriorSeal handoff

An `ALLOW` is not authorization. The PriorSeal SDK’s `buildBaseLendingGuardBoundIntent()` independently verifies the Insight EIP-712 signature against a caller-pinned Insight key registry, requires an `ALLOW`, rejects namespace substitution, and writes `insight.base-lending-guard.v1` plus the identical exact-call fields into the user authorization. It caps the authorization at the Insight validity deadline. `verifyBaseLendingGuardAuthorizationBinding()` and `verifyBaseLendingGuardReceiptBundle()` later verify that linkage alongside the PriorSeal receipt.

This preserves the boundary: Insight assesses decision inputs; PriorSeal proves user authorization and observed execution; x402 pays only for the read-only assessment service. Neither service has custody or independent transaction power.
