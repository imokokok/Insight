# VERITAS joint-run readiness artifacts

This directory closes F17 and N19 through N22 before the funded joint run without changing any
signed receipt layout, the registered 600-second gate window, venue, direction, threshold,
first-match rule or outcome-independent publication rule.

- `anchored-settlement-selection-rule-v2.json` fixes the USDC EIP-55 spelling, defines the
  five-field Bitcoin preimage and its distinct tagged-hash leaf, pins Bitcoin hash display
  encoding, removes in-window human round trips, and applies symmetric Bitcoin/Ethereum
  canonicality checks before final-package publication.
- `bitcoin-anchor-commitment-vector-v1.json` is the accepted N22 byte-exact fixture: a 409-byte
  RFC 8785 preimage and `VRT1/anchored-settlement-commitment` tagged SHA-256 leaf.
- `ethereum-ordering-commitment-vector-v1.json` uses asymmetric published historical Bitcoin
  facts so case and byte order are observable. It is a fixture, not a live attempt.
- `build-joint-run-commitments.mjs` is Insight's pinned deterministic builder. It recomputes the
  rule hash, rejects invalid address/hash representations, builds the Bitcoin commitment before
  confirmation, and extends it with public confirmation facts afterwards. It reads no key,
  contacts no network and broadcasts nothing.
- `joint-run-final-package-requirements-v1.json` applies pre-publication canonicality checks to
  both chains and keeps inclusion-proven ordering separate from issuer-asserted age.
- `joint-run-operational-agreement-v1.json` records the selected one-hour window beginning
  2026-09-18 12:00 UTC, VERITAS as sender of both commitment legs, post-submission independent
  verification by Insight, and every pre-broadcast gate.
- `provider-observation-hash-vector-v1.json` retains the N15 `uint256` positive/negative
  regression.
- `verify-veritas-round9-run-readiness.mjs` independently checks F17, N19, N20, N21, N22, both
  commitment vectors, the deterministic builder, N17/N18, N15 and the operating agreement.
- `verify-veritas-round8-publication-closure.mjs` and
  `verify-veritas-round7-closure.mjs` remain as regression paths.

Current pinned values:

| Value                                     | Pin                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------- |
| selection rule canonical bytes            | 7,737                                                                |
| `selectionRuleHash`                       | `0x545ede509529b6d8716be4f74e3e6715d92d821d18493dbc7f32e15156d2fc7a` |
| Bitcoin preimage canonical bytes          | 409                                                                  |
| Bitcoin anchor leaf                       | `a9035d310ff0345d2f7e8906544b972eba7438e128407b09f774a227ecc88f21`   |
| Ethereum fixture preimage canonical bytes | 633                                                                  |
| fixture `orderingCommitmentHash`          | `0xa9ae993af4ea7733eb3d6f524c9b8eb90cb382e56c886b3361df16b5b7a72c2e` |

Run:

```sh
node scripts/veritas-joint-run/verify-veritas-round9-run-readiness.mjs
node scripts/veritas-joint-run/verify-veritas-round8-publication-closure.mjs
node scripts/veritas-joint-run/verify-veritas-round7-closure.mjs
node scripts/veritas-joint-run/build-joint-run-commitments.mjs
```

For a real attempt, pass a JSON object to the builder with `--input`. Before Bitcoin
confirmation it contains only `sourceGateUid`, `destinationGateUid` and `preTradeUidsHash`
(optionally the exact recomputed `selectionRuleHash`). After confirmation, add all three public
facts together: `bitcoinAnchorTxid`, `bitcoinConfirmingBlockHeight` and
`bitcoinConfirmingBlockHash`. The two Bitcoin hashes are lowercase, have no `0x` prefix and use
Bitcoin display order.

The Bitcoin anchor remains the durable, censorship-resistant evidence layer. The Ethereum
commitment supplies the short-horizon ordering proof. Neither proves the Insight verdict correct,
proves `checkedAt` accurate, extends gate freshness, creates a VERITAS integration or constitutes
endorsement.
