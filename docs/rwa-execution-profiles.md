# Robinhood RWA execution profiles

The committed [execution profile registry](../protocol/rwa-execution-profiles.v1.json) binds the
current Robinhood Chain production deployments used for pre-production assessment:

- chain ID `4663`;
- Robinhood's canonical USDG quote token;
- Uniswap SwapRouter02 and V3 Factory addresses plus runtime code hashes;
- one reviewed USDG 0.05% V3 pool for each of AAPL, NVDA and SPY;
- each pool address and runtime code hash.

All profiles remain `SHADOW`. A passing verification proves the configured contracts and pools
exist and currently have non-zero in-range liquidity. It does not promote an instrument, guarantee
future liquidity, authorize a wallet, or broadcast a transaction.

## Safe calldata boundary

SwapRouter02's `exactInputSingle` tuple has no deadline. The adapter therefore never admits a bare
swap call. It constructs and decodes only:

```text
multicall(deadline, [exactInputSingle(params)])
```

The list must contain exactly one canonical call. Arbitrary multicalls, permits, native value,
multi-hop routes, unknown fee tiers, zero minimum output and expired deadlines fail closed. The
profile pins deployment and pool identity; the report signs the resulting profile ID and decoded
semantics.

## Verification

Offline structure, profile and cross-registry checks:

```bash
npm run rwa:execution:check
```

Live read-only checks against Robinhood Chain:

```bash
npm run rwa:execution:check:online
```

The online check verifies chain identity, current bytecode hashes, factory-derived pool addresses,
pool tokens, fee tiers and non-zero liquidity. Run it during every shadow checkpoint and immediately
before any ACTIVE review. Runtime submission still needs an independently pinned profile, current
quote/slippage calculation, eligibility evidence, allowance management and signer-controlled nonce.
