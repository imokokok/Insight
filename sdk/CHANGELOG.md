# Changelog

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
