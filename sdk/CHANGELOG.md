# Changelog

## 0.5.1 — 2026-10-10

- Validate successful PriorSeal bridge responses before using authorization and observation data. Reject mismatched authorization and job IDs, malformed receipts, and unknown observation states instead of continuing a joint workflow with untrusted response fields.

## 0.5.0 — 2026-09-28

- Add a pinned-block risk review for the exact original Uniswap V3 single-pool ERC-20 swap call, checking router code, route simulation, cross-oracle price deviation, signed trade size, minimum output, slippage and freshness.
- Require an acceptable fresh review before optional PriorSeal authorization and bind the unsigned review commitment to the exact call. This does not sign or broadcast a transaction.
- Keep opt-in RWA diagnostics separate from production signing and partner activation.

- Add typed Robinhood Stock Token issuer context with multiplier-normalized
  reference pricing, explicit oracle-quorum exclusion, REST/deployment consistency
  checks and optional ERC-8056 UID/multiplier on-chain verification.

- Add independent RWA v2 signing domain with sequence/predecessor binding, explicit
  admitted Uniswap V3 calldata semantics and receiver eligibility; preserve v1 bytes.
- Add detailed verification axes and a shared exact uint256 bound for SDK/HTTP/schema.
- Pin shared RWA source and frozen signing vectors in CI.

- Add independent RWA v1 instrument/policy/report hashes, fixed-point evaluation,
  action/session/issuer-evidence rules and consumer-pinned EIP-712 verification.
- Add on-chain Chainlink round and decoded v11 mid adapters, strict diagnostic
  HTTP/MCP schemas and an unsigned diagnostic SDK client.
- Preserve all existing guard, Watch, coverage, receipt and partner semantics.

## 0.4.1 — 2026-09-25

- Move installation and API-key guidance to the top of the npm README and identify application-owned transaction submission. Published runtime files are unchanged from 0.4.0.

## 0.4.0 — 2026-09-20

- Add deterministic coverage policy evaluation, canonical report hashing, EIP-712 verification and independently supplied signer/policy trust pins.
- Add authenticated coverage assessment and SLO clients plus an opt-in guard that revalidates coverage immediately before provider entry.
- Add source/destination coverage checks to guarded swaps and preserve signed reports for downstream evidence workflows.
- Keep coverage readiness separate from trade safety, principal authorization and settlement verification; unsigned, stale, untrusted or insufficient reports fail closed only when the caller explicitly opts in.

## 0.3.0 — 2026-09-19

- Add assessment diagnostics that distinguish market findings, missing evidence, unavailable scope, freshness, budget, and service failures while preserving the original verdict and proof.
- Add freshness profiles, typed rechecks, and assessment refresh. Honor both proofs' earliest expiry and recheck immediately before signing and submission.
- Reject known expired or invalid assessment time windows even without a custom profile. An explicitly requested but unevaluated dimension cannot inherit a generic PASS.
- Add durable Watch state, incident deduplication, monitor-unavailable states, consecutive recovery samples, and explicit recovery acknowledgement. Retired Watch instances cannot override the current gate or durable state.
- Add success-response cost metadata and a workflow budget estimator without automatic recharge or fund execution.
- Add transaction-bound evidence checkpoints, missing-artifact recovery, existing-job polling, and original proof attachments for portable review manifests. Terminal observation jobs report missing evidence instead of remaining pending indefinitely.
- Label service-derived verification explicitly; these reports do not claim independent local signature verification.

The API verdicts and signed proof formats remain unchanged. Safety behavior is stricter for known expired evidence and explicitly unavailable scope. Healthy Watch samples no longer clear an incident automatically; review and acknowledge recovery explicitly.
