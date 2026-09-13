# VERITAS joint-run closure and publication artifacts

This directory closes the two actions created by VERITAS round 6 without changing any signed
receipt layout or the registered 600-second gate window.

- `provider-observation-hash-vector-v1.json` publishes all seven ABI types. `value` is the
  canonical issuer type `uint256`, not `int256`; the negative-value rejection vector is required
  because both types produce identical ABI bytes for every non-negative value in round 6.
- `anchored-settlement-selection-rule-v2.json` replaces the invalid cross-chain timestamp
  comparison with an Ethereum ordering commitment. Its preimage includes the Bitcoin confirming
  block hash, so the Ethereum commitment cannot be constructed before that confirmation is known.
  A candidate must have `blockNumber > E`, where `E` is the Ethereum commitment block. The final
  package records both `E`'s number and hash; a pre-publication reorg aborts the attempt, while a
  later mismatch is reported without silently rewriting the record.
- `ethereum-ordering-commitment-vector-v1.json` pins the RFC 8785 bytes and hash mechanics with
  obvious placeholder Bitcoin values. It is not a live run or a transaction ready for broadcast.
- `joint-run-final-package-requirements-v1.json` keeps the two final-package claims separate:
  ordering is proven by inclusion, while `attestationAgeAtExecSeconds` remains an issuer assertion
  derived from signed `checkedAt`.
- `verify-veritas-round7-closure.mjs` independently recomputes both vectors and checks every
  round-7 invariant.
- `verify-veritas-round8-publication-closure.mjs` adds executable checks for the N17 reorg policy,
  the repinned rule/vector hashes and the N18 public-claim boundary.

Run:

```sh
node scripts/veritas-joint-run/verify-veritas-round8-publication-closure.mjs
```

The Bitcoin anchor remains in the protocol for durable, censorship-resistant evidence. The
Ethereum commitment supplies the short-horizon ordering proof. Neither proves the Insight verdict
correct, extends gate freshness, creates a VERITAS integration, or constitutes endorsement.
