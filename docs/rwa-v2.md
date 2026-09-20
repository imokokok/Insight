# RWA v2: additive semantic assessments

Unreleased workspace API. Existing v1 signatures, Agent guards, Watch, coverage,
partner activation and core receipt formats remain unchanged.

## New exports

- `buildRwaReportV2(input, policy, now, context)`: wraps the deterministic v1
  assessment with signed sequence, previousDigest, actual transaction, decoded
  semantics, receiver eligibility and their minimum validity deadline.
- `rwaV2SigningData` / `rwaV2ReportDigest`: independent EIP-712 version 2 domain.
- `inspectRwaReportV2` / `inspectRwaReport`: separate integrity, pinned trust,
  time and policy decision. An authentic BLOCK is not a forged signature.
- `verifyRwaReportV2`: strict ALLOW gate.
- `decodeRwaCall`: admit only a consumer-pinned semantic profile and canonical ABI.
- `assessRwaCallOutcome`: grade independently authenticated observation transfers.
- `rwaIsUint256` / `RWA_UINT256_PATTERN`: one exact decimal uint256 bound,
  also used by HTTP Zod validation and the public JSON Schema.

Use the same policy/request/environment/key pins independently of the supplied proof.
The receiver evidence must name the actual decoded receiver and an admitted eligibility
source. The sender's action must also require eligibility.

The execution assessment must have authority.sequence + 1, previousDigest equal to
the authority report digest, and a nondecreasing evaluatedAt. This supports two distinct
reports within one second without claiming a finer wall-clock timestamp. It depends on
the trusted signer; it is not a replacement for timestamp/witness infrastructure.

## Precisely bounded adapter

Only original Uniswap V3 SwapRouter `exactInputSingle` **with deadline**, ERC-20 to
ERC-20, buy/sell, native value zero, and positive amountOutMinimum is admitted.
The request amount is the input token's base-unit amount, not necessarily the number
of shares received. SwapRouter02, multicall, permits, ERC-4626 and arbitrary issuer
mint/redeem calls are unsupported and rejected.

Consumer pins include chain, target, instrument ID, quote token and admitted fees.
Deployment identity, upgrades, data licensing and truth of issuer eligibility remain
out-of-band responsibilities. A decoder does not authenticate contract bytecode.
The ABI follows the [original ISwapRouter interface](https://docs.uniswap.org/contracts/v3/reference/periphery/interfaces/ISwapRouter).

A strict receipt fill requires exact net input spent and minimum net output received
by the pinned receiver, using signed observed Transfer events, not estimates.
Nonstandard fee/rebase/partial-fill semantics are not silently admitted.

## Integration and regression checks

PriorSeal's matching v2 helpers bind the authority digest into the principal's intent.
Its Node application adds `executeRwaAuthorized` with principal verification, durable
single-use authorization/nonce claims and observation-only recovery. Low-level SDK
callback wrappers remain available for explicit composition and are not replay stores.

The HTTP and MCP assessment tools remain **unsigned diagnostics**, never production
attestations of caller-supplied information. This release does not add a public signing
service or turn ordinary price feeds into issuer, reserve, halt or legal-rights evidence.

```sh
npm run sdk:test
npm run test:reliability
npm run rwa:parity -- --peer ../PriorSeal
```

Build both SDKs, then from PriorSeal run:
`node examples/rwa-v2/verify.mjs ../insight`.
The fixture and `golden.json` use only public simulation keys and synthetic data.

The source lock checks three shared modules and frozen v1/v2 vectors in each repository;
`--peer` additionally compares the two checked-out locks. No automatic upstream sync,
publication or production activation is performed.
