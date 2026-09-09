# VERITAS joint-run closure artifacts

This directory closes the two actions created by VERITAS round 6 without changing any signed
receipt layout or the registered 600-second gate window.

- `provider-observation-hash-vector-v1.json` publishes all seven ABI types. `value` is the
  canonical issuer type `uint256`, not `int256`; the negative-value rejection vector is required
  because both types produce identical ABI bytes for every non-negative value in round 6.
- `anchored-settlement-selection-rule-v2.json` replaces the invalid cross-chain timestamp
  comparison with an Ethereum ordering commitment. Its preimage includes the Bitcoin confirming
  block hash, so the Ethereum commitment cannot be constructed before that confirmation is known.
  A candidate must have `blockNumber > E`, where `E` is the Ethereum commitment block.
- `ethereum-ordering-commitment-vector-v1.json` pins the RFC 8785 bytes and hash mechanics with
  obvious placeholder Bitcoin values. It is not a live run or a transaction ready for broadcast.
- `verify-veritas-round7-closure.mjs` independently recomputes both vectors and checks every
  load-bearing selection-rule invariant.

Run:

```sh
node scripts/veritas-joint-run/verify-veritas-round7-closure.mjs
```

The Bitcoin anchor remains in the protocol for durable, censorship-resistant evidence. The
Ethereum commitment supplies the short-horizon ordering proof. Neither proves the Insight verdict
correct, extends gate freshness, creates a VERITAS integration, or constitutes endorsement.
