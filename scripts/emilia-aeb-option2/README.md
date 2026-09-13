# EMILIA AEB option 2 — pinned bridge revision 2

This is a standalone, synthetic, nonproduction review implementation. It folds in Iman's two 2026-09-08 reviews and runs the typed bridge directly against EMILIA pin `b03dcde235d19c898d06b02c2544cf4db891765d`.

## Implemented

- Reusable source/destination `OracleSafetyCheck` receipts remain inputs to a separate one-use action authorization.
- Authorization v2 binds the spending wallet, execution domain, chain, router, calldata hash, native value, assets, amounts, recipient, deadline, nonce, exact check UIDs and mapping-profile digest.
- The supported `exactInputSingle` router call is decoded. Its token addresses, recipient, input amount, minimum output and deadline must agree with the named action fields.
- The default adapter implements the pinned single-input `AebAdapter` interface. Its native result uses `VERIFIED/FAILED`, `subject: {id, kind}`, and digests the actual artifact plus normalized supplied status. Its mapper uses `MATCH/MISMATCH/INDETERMINATE`.
- CAID uses the dot-versioned Action Object `evm-swap-exact-input-single.1`, RFC 8785 JCS, SHA-256 and unpadded base64url. Its companion action digest is exactly the pinned evaluator's digest of `expected_action`. All uint256 values in that object are validated decimal strings.
- Caller-supplied native summaries cannot be mapped: mapping accepts only the result object produced by the same adapter invocation over the actual artifact/status.
- Replay derivation is domain-separated, SHA-256-prefixed and based on the stable native authorization UID rather than wrapper metadata.
- The relying party independently pins the profile digest, AEB source commit, wallet, execution domain, freshness settings, provider/operator grouping and minimum participant/group counts.
- A single supplied verifier clock enforces an ordered check window, zero future skew and the pinned 300-second maximum age. The adapter does not call the package verifier whose internal `Date.now()` would introduce another clock.
- The crossing path takes detached, deeply frozen snapshots before verification and submits that exact snapshot.
- Native consumption state names are `RESERVED`, `CONSUMED` and `RELEASED_NOT_ENTERED`. Provider-entry is separate bookkeeping.
- Expiry after reservation uses terminal release and retains the replay fence. Ambiguous results and post-entry exceptions keep the state `RESERVED`, return `RECONCILIATION_REQUIRED` and block blind retry.
- A bare JSON `COMMITTED`/`authenticated` field is insufficient; only a result accepted by the relying-party `authenticateProviderResult` callback reaches `CONSUMED`.
- Provider observation preimages, participant quorum and relying-party-pinned operator independence are independently recomputed.
- Registry `validFrom`/`validUntil` values require strict RFC 3339 UTC syntax, real calendar dates and an ordered window. Malformed, impossible, missing and reversed dates fail closed.

## Verification

Run from the Insight repository root:

```text
node scripts/emilia-aeb-option2/generate-fixture.mjs
node scripts/emilia-aeb-option2/crossing-lab-tests.mjs
EMILIA_PINNED_ROOT=/path/to/emilia-protocol-at-b03dcde \
  ./node_modules/.bin/tsx scripts/emilia-aeb-option2/pinned-aeb-acceptance.test.mts
```

The standalone suite reports `15/15 PASS`: the previous 14 behaviors plus malformed registry validity-date refusal. The pinned suite reports `7/7 PASS` and imports `evaluateAebEvidence()`, `verifyAebEvaluation()` and `caid/impl/js/caid.mjs` from the exact commit above.

`emilia-review-probes-original.mjs` preserves the received diagnostic assertions for the pre-fix baseline. It passed `4/4` before this revision; it is not a post-fix acceptance suite.

## Claim boundary

This passes the pinned evaluator and CAID implementation locally; it is still self-attested reproduction, not counterparty acceptance, an upstream merge, certification or production implementation. All keys, receipts, calls and provider results are synthetic; there is no wallet funding, RPC call, transaction inclusion or finality claim.
