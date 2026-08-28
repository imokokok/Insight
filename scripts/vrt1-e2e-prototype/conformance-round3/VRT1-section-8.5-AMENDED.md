# VRT1 Section 8.5, amended 2026-08-28 (signer authorization, genesis trust root, ts ordering)

### 8.5 Key registry snapshots

An attester that publishes a signing-key registry has a circularity
problem: the registry lives on the attester's own server, and its
`valid_from` / `valid_until` windows are self-asserted with no external
timestamp. A consumer asking "was this key inside its published window
when it signed?" is trusting the same party whose signature is in
question.

A `key_registry_snapshot` is an agent action whose payload is the
registry itself. Anchored under Section 5, it moves the registry's
trust from the operator's web server to Bitcoin. Chained through
`parent_action`, it additionally proves **completeness**: without a
chain, publishing snapshot A and snapshot C while silently omitting B
is undetectable, and that omission is exactly how a briefly-active key
would be hidden. Existence and completeness are different claims, and
key lifecycle rests on the second.

| Field                            | Type    | Required | Description                          |
|----------------------------------|---------|----------|--------------------------------------|
| `action_type`                    | string  | Yes      | MUST be `"key_registry_snapshot"`.   |
| `target`                         | string  | Yes      | Operator-chosen registry identifier. MUST be stable across the chain. |
| `params.snapshot.keys`           | array   | Yes      | Key entries. Order is significant.   |
| `params.snapshot.schema_version` | integer | Yes      | Snapshot schema version.             |
| `params.snapshot.ts`             | integer | Yes      | Unix seconds at snapshot construction. |
| `outcome.active_count`           | integer | Yes      | Entries with `revoked == false`.     |
| `outcome.revoked_count`          | integer | Yes      | Entries with `revoked == true`.      |
| `parent_action`                  | string  | No       | Previous snapshot's `action_id`. Omitted for the genesis snapshot. |

Each entry of `params.snapshot.keys`:

| Field         | Type            | Required | Description                                    |
|---------------|-----------------|----------|------------------------------------------------|
| `key_id`      | string          | Yes      | Operator-scoped stable identifier.              |
| `key_type`    | string          | Yes      | What `public_key` holds: `eth_address`, `secp256k1_xonly`, `secp256k1_compressed`, `ed25519`. Extensible. |
| `public_key`  | string          | Yes      | Hex, `0x` stripped and lowercased per Section 1.5. |
| `custody`     | string          | Yes      | Declared custody of the private key.            |
| `revoked`     | boolean         | Yes      | Whether the key is revoked.                     |
| `valid_from`  | integer         | Yes      | Unix seconds.                                   |
| `valid_until` | integer or null | Yes      | Unix seconds, or `null` for open-ended.         |

Rules:

- `keys` order **MUST** be preserved. Canonical JSON (Section 1.4)
  sorts object keys; it does not sort arrays. An implementation that
  sorts `keys` "for determinism" produces a different `action_id`.
- A `null` `valid_until` **MUST** be serialized as `null`, **not**
  omitted. This is the opposite of the `parent_action` rule in Section
  8.1, and deliberately so: an omitted `parent_action` and a `null` one
  mean the same thing, whereas an omitted `valid_until` and a `null`
  one do not. Two spellings of "no expiry" would otherwise produce two
  `action_id`s for one registry.
- `valid_from`, `valid_until` and `ts` **MUST** be integer Unix
  seconds. Date-time strings are rejected because one instant has many
  legal RFC 3339 spellings (`2026-08-05`, `2026-08-05T00:00:00Z`,
  `2026-08-05T00:00:00.000+00:00`), and a canonical record cannot
  admit more than one spelling of the same value.
- `key_type` is required so that "did a registered key sign this
  receipt?" is mechanizable. An Ethereum address is a hash of a public
  key, not a public key; a verifier cannot check membership without
  knowing which it holds.
- `active_count` and `revoked_count` **MUST** equal the partition of
  `keys` on `revoked`. A verifier **MUST** reject a snapshot whose
  counts disagree with its own `keys` array. "Active" here means "not
  revoked" — not "currently inside its window," since window
  membership is evaluated against a signing time, not summarized in
  the record.

The key that signs a snapshot (`agent`) **SHOULD** itself appear in
`params.snapshot.keys` with `key_type: "secp256k1_xonly"`. Without it
the registry authenticates every key except the one that authenticated
the registry, and the circularity the type exists to remove simply
moves up one level.

Given that, a chain of snapshots is also a **key rotation
authorization** chain, and not merely a history:

- A non-genesis snapshot **MUST** be signed by a key that its
  `parent_action` snapshot lists with `revoked: false` and whose
  validity window contains the successor's `ts`. An outgoing signing
  key authorizes its replacement; a key that no ancestor vouches for
  cannot introduce itself.
- A successor that fails this check **MUST** be rejected even though
  its own signature verifies. This is the one failure mode in this
  specification that is invisible in isolation: the record is
  internally valid and is refused by its context.
- `params.snapshot.ts` **MUST NOT** be later than the action's `ts`. A
  registry may be read at one moment and published at a later one; it
  cannot be read from the future.

The genesis snapshot has no parent and therefore cannot be authorized
by one. Its trust root is explicitly **not** cryptographic and
implementations **MUST NOT** present it as though it were. It rests on
two things: the Bitcoin anchor, which fixes the genesis in time so that
a later-manufactured "original" is detectable, and an out-of-band
binding of the agent pubkey to the operator, published on a channel the
operator controls. Every rotation after genesis is chained and checkable;
that first hop is a human trust decision, and saying so is the honest
description of what the anchor does and does not buy.

`custody` values: `hot_process`, `kms`, `hsm`, `offline`,
`air_gapped`, `unknown`. **The enumeration is unordered.** VRT1 supplies
the vocabulary so that custody is comparable across attesters; it does
not rank the values, does not endorse any of them, and does not treat
`unknown` as a failure. Consistent with Section 12.2: VRT1 attests that
a record is authentic and unaltered, never that the arrangements it
describes are adequate.

Validity is evaluated **at signing time**. A receipt signed while its
key was inside its published window remains verifiable after that
window closes; revocation stops forward trust and does not reach
backward into an anchored set.

*Type contributed by Insight (`oracleinsight.xyz`), who built the first
implementation as a vendor-namespaced record. It is registered
un-namespaced because every attester that publishes a key registry has
the same problem, and two records that mean the same thing should not
fail to interoperate over a prefix.*
