# VRT1 Section 2.2, amended 2026-08-28 (epoch is a batch label, not a clock)

### 2.2 Epoch

A contiguous time window during which an oracle's attestations are
accumulated. At epoch close, all attestations in that epoch are
arranged into a Merkle tree (Section 4) and the root is committed to
Bitcoin (Section 5). Epochs are identified by a monotonically
increasing unsigned 64-bit integer per oracle (0 through 2^64 − 1).

An oracle MUST NOT close an epoch with zero attestations. An epoch
with no attestations has no Merkle tree, no checkpoint, and no anchor
transaction. Consumers that encounter a checkpoint with `count: 0`
MUST reject it.

An epoch number is a **batch label scoped to one oracle**, and consumers
**MUST NOT** read it as a timestamp. The reference implementation
derives it as `floor(ts / 600)`, which is a convention of that
implementation rather than a requirement of this specification; what
the specification requires is that the number increase monotonically
per oracle. Epoch numbers from different oracles are unrelated and
**MUST NOT** be compared. Where a record is anchored by an oracle other
than its author, the epoch in the OP_RETURN payload is the *anchoring*
oracle's, not the author's.

Time evidence comes from the Bitcoin block that contains the anchor,
not from the epoch, and it is an **upper bound**: the anchor proves the
record existed *before* that block. It says nothing about when the
record was created, and a record's own `ts` remains a self-assertion no
matter how many epochs enclose it.


