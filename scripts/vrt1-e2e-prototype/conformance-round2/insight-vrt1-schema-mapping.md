# OracleSafetyCheck → VRT1 field mapping

**Revised 2026-08-26** after Insight's e2e prototype. Four structural items adopted FROM their
prototype (§2); two encoding items remain ours (§5). Canonical vectors ship alongside this doc.

**Draft for discussion.** Maps Insight's EIP-712 `OracleSafetyCheck` (schema v2 / gates v2.1,
26 fields) onto a VRT1 agent action (VRT1 §8) so the receipt can be batched and anchored to
Bitcoin without changing either side's core.

Written against VRT1 as published in `vrt1-spec` and the Insight attestation sources
(`src/lib/attestations/`). Anything marked CONFIRM is a proposal, not a decision.

---

## 1. The shape

A VRT1 agent action is a small signed JSON object with a fixed outer schema and two free-form
object fields, `params` and `outcome`. The 26-field EIP-712 struct rides inside `params`
contiguously and in its declared order, so it can be lifted back out and re-hashed without
reassembly; `outcome` carries the verdict as the observable result. See §2.

The EIP-712 signature is computed first, then carried inside the VRT1 payload. The VRT1
`action_id` therefore commits to the EIP-712 signature, which is what makes the anchor
meaningful: it proves that *that specific signed verdict* existed at that block height.

```
26-field struct  ──EIP-712/ECDSA──▶  eip712.signature
                                          │
                                          ▼
        VRT1 agent action payload { agent, action_type, target, params, outcome, ts, v }
                                          │
                     action_id = tagged_hash("VRT1/agent-action", canonical_json(payload))
                                          │
                                     BIP-340 Schnorr
                                          │
                            Merkle leaf ──▶ epoch root ──▶ OP_RETURN
```

Two signatures, two independent verification paths. Neither replaces the other. An EIP-712
verifier that knows nothing about Bitcoin still works; a VRT1 verifier that knows nothing about
EIP-712 still proves the record is unaltered and anchored.

---

## 2. Top-level VRT1 fields

**Revised 2026-08-26 to adopt Insight's prototype layout.** My original split put 10 fields in
`params` and 15 in `outcome`. Insight's prototype instead keeps the 26-field struct contiguous
under `params.oracle_safety_check_v2` and gives `outcome` a compact summary. **Their layout is
better and I am adopting it**, for two reasons. It matches the reference `review` vector, which
pairs sparse `params` with a two-field `outcome` summary rather than scattering the result. And
more importantly, splitting the 26 fields across two objects forces any verifier rebuilding the
EIP-712 digest to reassemble them from two places in the original declared order, which is exactly
the canonicalization hazard §5 exists to prevent. Contiguous wins.

| VRT1 field | Value | Notes |
|---|---|---|
| `agent` | Insight attester x-only pubkey, 64 lowercase hex | See §5. Not the EIP-712 address. |
| `action_type` | `"insight.oracle-safety-check"` | Insight's namespaced form, adopted. Vendor-namespacing avoids collision when a second oracle vendor registers a type. §8.4 permits implementation-defined types. |
| `target` | `"<sourceAssetId>-><destinationAssetId>"`, CAIP-19 verbatim | Insight's form, adopted. VRT1 §8 defines `target` as "what the action is about", and the reference vector uses a real-world subject (a URL). The asset pair is that subject, and it makes records queryable by pair. `requestHash` already provides uniqueness from inside `params`, so duplicating it as `target` bought nothing. Class B under §5.2: **never normalised.** |
| `params` | `oracle_safety_check_v2` (all 26 fields, contiguous) + `eip712_attestation` (§3) | MUST be a JSON object. |
| `outcome` | `verdict` + `schema_version` (§4) | MUST be a JSON object. |
| `ts` | `checkedAt` | Unix seconds. Duplicated with `params.oracle_safety_check_v2.checkedAt` **deliberately**: VRT1 requires `ts`, and the signed struct must stay intact for EIP-712 reconstruction. |
| `parent_action` | original `action_id` on a recheck; omitted otherwise | See §6. |
| `v` | `1` | Integer, per spec. |

---

## 3. `params` — what was asked, plus the signed struct

**Revised 2026-08-26.** All 26 EIP-712 fields live contiguously under
`params.oracle_safety_check_v2`, in the schema's declared order, so a verifier can rebuild the
EIP-712 digest from one object without reassembly. Encoding per §5: every `uint256` as a decimal
string (§5.1), Class A hex normalised, Class B CAIP-19 verbatim (§5.2).

| Group | Fields | Encoding |
|---|---|---|
| CAIP-19 ids | `sourceAssetId`, `destinationAssetId` | **verbatim**, `0x` and EIP-55 casing preserved (Class B) |
| uint256 (15) | `subjectChainId`, `tradeAmountUsd`, `consensusPrice`, `maxDeviationBps`, `manipulationRiskBps`, `participantCount`, `requiredParticipantCount`, `sourceGroupCount`, `crossProviderAgreementBps`, `maxStablecoinDepegBps`, `maxDataAgeSeconds`, `recommendedMaxPositionUsd`, `validUntil`, `checkedAt`, `schemaVersion` | decimal strings |
| bytes32 (4) | `reasonCodesHash`, `requestHash`, `evaluatedAssetIdsHash`, `providerObservationsHash` | 64 lowercase hex, `0x` stripped (Class A) |
| strings (5) | `verdict`, `action`, `coverageStatus`, `independenceStatus`, `evaluationScope` | unchanged |

Alongside it, `params.eip712_attestation` carries the envelope so a third party can recompute the
digest without assuming anything:

```json
"eip712_attestation": {
  "attester": "a268676c85b927d64a4e2384636874f76d69e419",
  "signature": "<128 lowercase hex, 0x stripped>",
  "uid": "<64 lowercase hex, 0x stripped>",
  "signedAt": "2026-08-25T18:04:08.841Z",
  "domain": { "name": "Insight Oracle Safety", "version": "2", "chainId": "1" },
  "primary_type": "OracleSafetyCheck"
}
```

**RESOLVED** from `oracle-safety-check-v2.schema.json`, 2026-08-25. The domain carries `name`,
`version` and `chainId` only. No `verifyingContract`, no `salt`, so the separator is computed over
`EIP712Domain(string name,string version,uint256 chainId)`. Confirmed by rebuilding the separator
and recovering the signer from the sample receipt offline. A verifier that assumes a
`verifyingContract` computes a different separator and fails on every record.

⚠️ Insight's prototype currently keeps `attester`, `signature` and `uid` `0x`-prefixed and mixed
case, and encodes uint256 as JSON numbers. Those are the two convergence deltas; see §5.

---

## 4. `outcome` — the observable result

**Revised 2026-08-26**, adopting Insight's compact form.

```json
"outcome": { "verdict": "PASS", "schema_version": 2 }
```

The full evidence stays in `params.oracle_safety_check_v2` rather than being mirrored here. This
matches the reference `review` vector, whose `outcome` is a two-field summary, and it keeps the
signed struct in exactly one place. `verdict` is one of `PASS` / `CAUTION` / `DANGER` / `BLOCK`.

---

## 5. Encoding rules that will bite

These are the four places where a TypeScript implementation and a Python implementation will
silently disagree and produce different digests. 5.1 and 5.2 were both corrected after the
first new record type broke them; each correction is dated in place, and each is pinned by a
literal negative vector rather than by prose alone.

### 5.1 Integer encoding — the boundary is struct ownership, not magnitude

**Corrected 2026-08-28.** The earlier wording said uint256 goes to decimal strings
"uniformly," which was silent about fields the 26-field struct does not declare. It drifted the
first time a second record type existed: my own vectors carried `outcome.schema_version` as a
bare number, and the registry snapshot carried `schema_version` and `ts` the same way. The rule
is now scoped, and the scoping is YuTao's, sharpened from mine:

> **Decimal strings apply to the integer-typed fields of a signed foreign struct carried inside
> `params`. VRT1-native payload integers — `v`, `ts`, `schema_version`, counts — are JSON
> integers, always, regardless of value.**

The test is **struct ownership**, not size. A field is either declared by a foreign struct being
transported, or it is declared by the VRT1 payload. There is no third case.

My draft of this said "small VRT1-native integers stay integers," and that was wrong for the
reason the rest of this section already gives: *small* is a threshold, a threshold has to be
agreed by both sides, and a value that crosses it changes type in the middle of its life. Struct
ownership has no boundary to cross. The enumeration above is illustration, not definition — the
next record type will invent an integer field that is not in that list, and the ownership test
will still answer it.

Two consequences worth writing down:

- **Every integer width, not just uint256.** A `uint64` in a carried struct is a decimal string
  too. The reason for decimal strings is that the declared type permits values the JSON number
  cannot hold and that the struct's integers must be transported rather than re-derived; both
  apply below 256 bits. Making the rule depend on declared width would reintroduce a threshold
  through the back door.
- **Decimal strings are base 10, no leading zeros, no leading `+`, `-` only for a negative
  value.** `"0"`, never `"00"` or `"+0"`. Otherwise "decimal string" itself has more than one
  spelling.

**The scaled integers are the source of truth and must be transported, never recomputed.**
`toUint` rounds in floating point, so the scaled integer is the product of a specific rounding
path. JavaScript's `Math.round` breaks ties upward; Python's `round` breaks ties to even
(`Math.round(2.5)` is 3, Python's `round(2.5)` is 2). Any implementation that re-derives a scaled
integer from the unscaled input will disagree with yours on exact-half cases, produce a different
struct, and produce a different digest. VERITAS canonicalizes and hashes what you signed; it does
not re-derive it from raw prices. Worth writing into the record type at registration, because it
is the sort of thing a third-party implementer gets wrong in a way that only shows up
intermittently.

Conformance: `negatives_oracle_safety_check.json` case 4 pins the foreign-struct half (uint256 as
JSON numbers) and case 5 pins the VRT1-native half (`outcome.schema_version` as a decimal string).
Both halves of the boundary now fail loudly.

### 5.2 Hex is bare and lowercase — but CAIP-19 identifiers are NOT hex

**Corrected 2026-08-26, amended 2026-08-28.** The earliest wording said to strip `0x` and
lowercase every `bytes32`, address and signature. Applied literally that is wrong and would have
broken the asset binding. Two disjoint classes, and the distinction is semantic rather than
syntactic:

**Class A — hex-encoded byte strings. Normalise: strip `0x`, lowercase.**
`reasonCodesHash`, `requestHash`, `evaluatedAssetIdsHash`, `providerObservationsHash`, and inside
the EIP-712 envelope `uid`, `signature`, `attester`. These are byte arrays whose textual casing
carries no information, so VRT1 §1.5 applies and normalising is lossless.

**Class B — CAIP-19 asset identifiers. Leave byte-identical, including `0x` and casing.**
`sourceAssetId`, `destinationAssetId`, and the `target` built from them. Here `0x` is part of the
identifier, not an encoding artifact, and the EIP-55 mixed casing is a checksum that carries
meaning. `eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` lowercased is not the same
identifier normalised, it is a different and weaker identifier. Never touch these.

The test: if lowercasing loses information, it is Class B. Applying Class A rules to a CAIP-19 id
destroys the checksum; applying Class B rules to a `bytes32` leaves a `0x` that VRT1 §1.5 rejects.

**The amendment: the classes apply at every depth of the payload, not to a list of field names.**
The `public_key` slip in the registry snapshot was not carelessness, it was this section's fault.
Written as an enumeration of fields from one struct, the rule says nothing about a field three
levels down in a record type that did not exist when the list was written. Written as a
classifier applied to every string in the payload, it answers `params.snapshot.keys[].public_key`
without being updated: a bare Ethereum address is the same kind of value as `attester`, so it is
Class A, so it loses its `0x` and its casing. A rule that has to be extended per record type will
be, eventually, forgotten.

Conformance: `negatives_oracle_safety_check.json` cases 1-3 pin Class A raw, `destinationAssetId`
lowercased alone, and `target` lowercased alone. The last of those was untested by either
implementation until now, and it is the likelier of the two Class B fields to be got wrong,
because it is constructed rather than copied.

### 5.3 Canonical JSON is stricter than `JSON.stringify`

Keys sorted recursively in UTF-8 codepoint order, no whitespace, `,` and `:` separators, and
non-ASCII **not** escaped. `JSON.stringify` gets the separators right and the other three wrong.
The reference form is Python's
`json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`.

Suggestion: rather than trusting two independent canonicalizers to agree, let's cross-check
against the published `vrt1-spec` test vectors first, then against a hand-built
`OracleSafetyCheck` vector we both sign.

### 5.4 `validUntil` is yours, not VRT1's

VRT1 records are permanent and non-repudiable; they have no expiry concept. Anchoring an
OracleSafetyCheck proves the receipt existed and said what it said. It does **not** extend the
600-second window or make an expired receipt usable. `validUntil` rides along as evidence of
what the freshness bound *was*, which is what matters after the fact when someone asks whether
an agent acted on a stale receipt. Worth stating explicitly in whatever we publish, because it
is an easy thing for a consumer to misread in the direction that favors them.

---

## 6. Key material

EIP-712 signs with ECDSA over secp256k1; VRT1 signs with BIP-340 Schnorr over the same curve,
using an x-only (32-byte) public key. The same private key can technically produce both, but the
x-only pubkey and the Ethereum address are different identifiers regardless, so a binding step
is needed either way.

Recommendation: generate a **dedicated VRT1 attester key** rather than reusing the EIP-712 one,
and bind the two with a one-time statement signed by both keys, published and anchored as its
own VRT1 record. Reasons: reusing one key across two signature schemes is a question nobody
needs to answer under time pressure; a separate key can be rotated without touching the EIP-712
attester; and the binding record gives a verifier something to check rather than something to
assume. Your `scripts/generate-attester-key.ts` already covers the generation side.

CONFIRM: whether you want the binding record to be the first thing we anchor. It is a good
smoke test of the whole path, and it is useful independently of the integration.

---

## 7. The recheck flow

`oracleSafetyRecheck.ts` maps onto VRT1 `parent_action` exactly as intended: the recheck record
sets `parent_action` to the `action_id` of the original check, producing a linked chain a
verifier can walk backward.

Two spec details worth flagging, both marked in VRT1 as round-3 fixes:

- A `null` or empty-string `parent_action` MUST be **omitted** from the canonical payload, not
  serialized as null or `""`. Otherwise two semantically identical no-parent actions produce
  different `action_id`s.
- If records are published over Nostr (kind 1990), a consumer MUST verify the outer event
  signature, the inner action signature, **and** that `event.pubkey == action.agent`. Skipping
  the inner check lets an attacker re-wrap a valid action under an unrelated outer signature.

---

## 8. What a consumer verifies end to end

1. Recompute the EIP-712 digest from the struct and `eip712.domain`, recover the signer, check
   it against `eip712.attester`. → Insight said this.
2. Recompute `action_id = tagged_hash("VRT1/agent-action", canonical_json(payload))`. → the
   payload is the one that was signed, byte for byte.
3. Verify the BIP-340 Schnorr signature over `action_id` against `agent`. → the record is
   unaltered and attributable.
4. Verify the Merkle inclusion proof (`leaf`, `siblings`, `directions`, `root`, `size`, `index`).
   → this record was in that epoch's batch.
5. Fetch the anchor transaction and parse the 49-byte `OP_RETURN`: 4-byte `VRT1` tag, 1-byte
   version `0x01`, 8-byte BE epoch, 4-byte BE leaf count, 32-byte root. Check the root matches
   step 4 and the leaf count matches the batch size. → it existed at that block height, and the
   batch size is committed too, so records cannot be quietly added or dropped after the fact.
6. Optionally verify the binding record from §6. → the x-only key and the EIP-712 attester are
   the same operator.

Steps 2 through 5 need no network access beyond the Bitcoin transaction, and no trust in either
of our servers.

**RESOLVED 2026-08-26.** The VRT1 Merkle leaf for an agent action **is** the `action_id`. This was
a CONFIRM in the previous revision; Insight's prototype answered it independently and correctly
before I checked. The reference implementation (`veritas/merkle.py`) hashes
`_hash_leaf = sha256d(0x00 ‖ leaf)` and `_hash_internal = sha256d(0x01 ‖ L ‖ R)`, with
Bitcoin-style duplication of the last node on odd levels. Note the **double** SHA-256: a single
round is the most likely wrong guess here, and it fails silently by producing a plausible root.
`merkle.json` in the vector set carries a single-leaf tree and a three-leaf batch so odd-leaf
duplication is exercised rather than skipped.

---

## 9. Out of scope

Insight owns the verdict and the enforcement. VERITAS attests that a record is authentic,
unaltered, and anchored at a known block height. It does not attest that the verdict was
correct, that the underlying prices were accurate, or that an agent was right to act on it.
Anchoring is evidence about the record, not endorsement of its content.

---

## 10. Open items

1. ~~`action_type` string~~ - **RESOLVED 2026-08-26: `insight.oracle-safety-check`**, adopting
   Insight's namespaced form. See §2.
2. ~~Full EIP-712 domain values~~ — **RESOLVED 2026-08-25.** Three fields, no `verifyingContract`,
   no `salt`. See §3.
3. ~~Merkle leaf definition for agent actions~~ - **RESOLVED 2026-08-26.** The leaf IS the
   `action_id`; `_hash_leaf = sha256d(0x00||leaf)`, `_hash_internal = sha256d(0x01||L||R)`, with
   Bitcoin-style odd-leaf duplication. Confirmed against the reference implementation
   (`veritas/merkle.py`) and against Insight's independent construction, which agrees.
4. Whether the key-binding record is the first anchored artifact.
5. ~~Which asset to prototype on~~ — **RESOLVED 2026-08-26: ETH/USDC.** One caveat I want on the
   record rather than discovered later. The original wording asked for an asset where the
   independence gate is genuinely exercised rather than trivially satisfied. Your sample carries
   `sourceGroupCount: 7` against a required 2, so ETH/USDC satisfies the gate comfortably and does
   not exercise it. That is the right choice for a first pilot, because a clean path is what we
   are testing. It is the wrong choice for demonstrating that the gate binds. Worth a second asset
   later where it actually does.
6. Batch cadence. Anchoring is batched, so per-receipt marginal cost is effectively zero, but
   epoch length sets how long after a check the Bitcoin proof becomes available. That is a
   product decision on your side more than a protocol one.
7. **Scale declaration** (new, 2026-08-26). `PRICE_SCALE = 1e8` and `USD_SCALE = 1e6` are both
   plain `uint256` in the signed struct, with nothing in the schema or the receipt distinguishing
   them. §5.1 settles the recomputation hazard. This is the separate question of whether a third
   party holding only a receipt can read the numbers at all: `tradeAmountUsd: 10000000000` is
   $10,000 at USD scale and $100 at price scale, and the signature verifies identically either
   way. Proposal: pin the per-field scale in the type registration, so it is public and versioned
   rather than resident in one codebase.
8. ~~Whether the key-binding record is the first anchored artifact~~ — **RESOLVED 2026-08-28.**
   It was not. The safety-check receipt went first, in block 964,367
   (`750937dacd0e381a72901cd6084e47c4aab4b4b98c70834a24f3f2c845bd72b5`), five days ahead of the
   old key's window close, so validity-at-signing-time holds with no re-signing. The registry
   snapshot is the second artifact and the first that will chain.
9. ~~Registry snapshot namespacing~~ — **RESOLVED 2026-08-28: generic.** Registered as
   `key_registry_snapshot` in VRT1 §8.5, un-namespaced, because every attester that publishes a
   key registry has the same self-assertion problem. Type contributed by Insight; credited in the
   section text and in the reference implementation. Snapshots chain through `parent_action`, so
   a silently omitted snapshot breaks the chain rather than passing unnoticed.
10. **Registry timestamps** (new, 2026-08-28). The draft's `valid_from` carries two formats in one
    field across two entries: `2026-08-05` and `2026-08-26T17:35:36.000Z`. Both are legal RFC 3339
    and they are different strings, so one instant has several spellings and therefore several
    `action_id`s — the same defect class as `0x` casing, one level up. §8.5 requires integer Unix
    seconds, matching §8.1 `ts`. Adopting it moves the draft record from 636 to 700 bytes and its
    `action_id` from `29e75d58…` to `39f0508b…`; the byte-exact interop vector for the draft as
    sent is kept either way.
11. **`key_type` and `custody` per key** (new, 2026-08-28). `key_type` is required so that "did a
    registered key sign this receipt" is mechanisable — an Ethereum address is a hash of a public
    key, not a public key, and a verifier cannot check membership without knowing which it holds.
    `custody` is required per key rather than per receipt, which is where the field both sides
    agreed to carry belongs: custody is a property of a key, so it becomes anchored and chained
    for free, and a move from `hot_process` to `hsm` shows up as a snapshot rather than an
    announcement. The vocabulary is unordered — VRT1 makes custody comparable across attesters,
    it does not rank it, and `unknown` is not a failure.
