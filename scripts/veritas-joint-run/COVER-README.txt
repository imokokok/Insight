Insight / VERITAS round-9 joint-run readiness package
2026-09-16

PURPOSE
  Close F17 and N19 through N22 before the funded joint run. No signed receipt layout,
  registered 600-second window, venue, direction, 0.1 WETH threshold, first-match rule
  or outcome-independent publication rule changed. Nothing in this package broadcasts.

DECISIONS
  1. F17: destinationTokenAddress now uses canonical EIP-55. The complete rule and all
     dependent bytes were repinned. Strict validation rejects the round-8 spelling.
  2. N22: accept the proposed five-field Bitcoin preimage under schema
     insight-veritas-bitcoin-anchor-commitment/v1 and leaf tag
     VRT1/anchored-settlement-commitment. The literal preimage is 409 UTF-8 bytes.
  3. N20: Bitcoin txids and block hashes are lowercase 32-byte hex, without 0x, in
     Bitcoin display order. The ordering vector now uses asymmetric published historical
     facts whose case and byte order are observable.
  4. N19: immediately before final-package publication, re-fetch the Bitcoin anchor by
     txid and require its canonical confirming height/hash to match. A missing,
     unconfirmed or mismatched anchor aborts as BITCOIN_CONFIRMING_BLOCK_REORGED_OUT and
     publishes the original fields, the current location when available and all txids.
  5. N21: accept VERITAS as sender of both commitment legs. Both parties pin deterministic
     builders before the window; VERITAS submits immediately after confirmation without a
     human round trip, and Insight independently recomputes afterwards. A mismatch is a
     published abort.
  6. Select the one-hour window beginning 2026-09-18 12:00 UTC (20:00 in China).

PINNED BYTES
  selectionRuleHash
    0x545ede509529b6d8716be4f74e3e6715d92d821d18493dbc7f32e15156d2fc7a
  Bitcoin anchor leaf
    a9035d310ff0345d2f7e8906544b972eba7438e128407b09f774a227ecc88f21
  fixture orderingCommitmentHash
    0xa9ae993af4ea7733eb3d6f524c9b8eb90cb382e56c886b3361df16b5b7a72c2e

FILES
  README-JOINT-RUN.txt
    Repository-facing documentation, current pins and builder usage.
  anchored-settlement-selection-rule-v2.json
    F17 correction plus N19/N20/N21/N22 protocol text.
  bitcoin-anchor-commitment-vector-v1.json
    Accepted five-field Bitcoin preimage and tagged-hash leaf.
  ethereum-ordering-commitment-vector-v1.json
    Encoding-discriminating Bitcoin fields and repinned Ethereum commitment.
  build-joint-run-commitments.mjs.txt
    Insight deterministic builder. Restore .mjs before running.
  joint-run-final-package-requirements-v1.json
    Symmetric Bitcoin/Ethereum canonicality and N18 claim boundaries.
  joint-run-operational-agreement-v1.json
    Selected date, sender roles, mechanical coordination and pre-broadcast gates.
  provider-observation-hash-vector-v1.json
    N15 regression dependency.
  verify-veritas-round9-run-readiness.mjs.txt
    Standalone readiness verifier. Restore .mjs before running.
  verify-veritas-round8-publication-closure.mjs.txt
  verify-veritas-round7-closure.mjs.txt
    Historical closure verifiers retained as 37/37 and 25/25 regression paths.
  BUILDER-OUTPUT.txt
    Deterministic builder output for the shipped vectors.
  VERIFICATION-OUTPUT.txt
    Shipped round-9 verifier transcript.
  TEST-TRANSCRIPT.txt
    Regression and repository acceptance results.
  SHA256SUMS.txt
    SHA-256 of every other file in this package.

RUN
  npm install canonicalize@4 viem@2
  cp build-joint-run-commitments.mjs.txt build-joint-run-commitments.mjs
  cp verify-veritas-round9-run-readiness.mjs.txt verify-veritas-round9-run-readiness.mjs
  node verify-veritas-round9-run-readiness.mjs
  node build-joint-run-commitments.mjs

STANDING
  Not anchored until a real attempt is broadcast and included. Not a VERITAS
  integration. Not an endorsement in either direction. These artifacts do not prove
  the Insight verdict correct, prove checkedAt accurate or extend gate freshness.
