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
- `buildRwaSwapRouter02Transaction`: construct the pinned Robinhood Chain call with an
  on-chain deadline and exactly one swap.
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

The legacy simulation profile still admits only the original Uniswap V3 SwapRouter
`exactInputSingle` with deadline. The production-candidate Robinhood profile admits the
official chain-4663 SwapRouter02 only as a deadline-protected multicall containing exactly
one canonical `exactInputSingle`. ERC-20 to ERC-20, buy/sell, native value zero and positive
amountOutMinimum are required. Arbitrary multicall contents, permits, multi-hop routes,
ERC-4626 and issuer mint/redeem calls are rejected.

Consumer pins include chain, target and target code hash, factory and factory code hash,
instrument ID, quote token and quote-token code hash, and the exact pool address/code hash.
The online readiness check authenticates current bytecode and factory-derived pool identity;
the pure decoder intentionally makes no network call.
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

Production reports additionally require a signed instrument-admission commitment and an
independently pinned identical commitment in trust. Legacy simulation vectors remain valid.

The source lock checks three shared modules and frozen v1/v2 vectors in each repository;
`--peer` additionally compares the two checked-out locks. No automatic upstream sync,
publication or production activation is performed.
