Insight / VERITAS round-7 closure package
2026-09-09

PURPOSE
  Close N15 and replace the invalid Bitcoin-header-time comparison before the joint run.
  No signed receipt layout and no registered 600-second gate window changed.

DECISIONS
  1. provider observation value remains uint256, as it has been in the canonical issuer
     implementation and Insight's round-6 verifier. VERITAS's int256 verifier reproduced the
     positive round-6 entries because non-negative int256 and uint256 ABI encodings are identical.
     The full seven-field ABI is now public, and the negative-value rejection vector makes the
     distinction testable.
  2. Use the preferred on-Ethereum ordering commitment, not the no-gas fallback. After the Bitcoin
     anchor confirms, the Ethereum commitment preimage binds the confirming Bitcoin block hash,
     both gate UIDs, preTradeUidsHash and selectionRuleHash. Its hash is posted in a successful
     zero-value Ethereum self-transaction at block E. The selected candidate must have
     blockNumber > E. No cross-chain timestamp comparison remains.
  3. Keep the 0.1 WETH threshold and plan for two to three attempts.

FILES
  anchored-settlement-selection-rule-v2.json
    Complete replacement selection rule.
  ethereum-ordering-commitment-vector-v1.json
    RFC 8785 byte-exact example with obvious placeholder Bitcoin fields; not for broadcast.
  provider-observation-hash-vector-v1.json
    Complete ABI, literal positive encoding/hash and negative uint256 rejection vector.
  verify-veritas-round7-closure.mjs.txt
    Independent verifier; restore the final extension to .mjs before running.
  VERIFICATION-OUTPUT.txt
    Shipped verifier transcript, 25/25.
  TEST-TRANSCRIPT.txt
    Focused and full repository acceptance results.
  SOURCE-CHANGES.patch.txt
    Tracked implementation and public-descriptor changes.
  PUBLIC-VECTOR-ROUTE.patch.txt
    New public vector route and route test.
  ROUND6-REVIEW-NOTES.txt
    The two record-level discrepancies found while independently reviewing the received r6 zip.
  SHA256SUMS.txt
    Hash of every other file in this package.

RUN
  npm install canonicalize@4 viem@2
  cp verify-veritas-round7-closure.mjs.txt verify-veritas-round7-closure.mjs
  node verify-veritas-round7-closure.mjs

STANDING
  This package is not anchored, is not a VERITAS integration and is not an endorsement in either
  direction. Bitcoin supplies durable existence evidence; the Ethereum commitment supplies the
  short-horizon ordering proof. Neither proves the Insight verdict correct or extends freshness.
