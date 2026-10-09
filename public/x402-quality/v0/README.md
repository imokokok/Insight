# x402-quality/v0 — reference implementation

Status: **draft, published as a reference implementation** for the quality-attestation
discussion in [x402-foundation/x402#2833](https://github.com/x402-foundation/x402/issues/2833).
It is **not** a proposal to extend delivery-receipt semantics, and it is **not** an adopted
standard.

Published in response to the draft structure given in
[comment 6041673467](https://github.com/x402-foundation/x402/issues/2833#issuecomment-6041673467)
and the commitment recorded in
[comment 6052028329](https://github.com/x402-foundation/x402/issues/2833#issuecomment-6052028329).

## The predicate split

Two questions get conflated, and they are not the same question:

|     | Question                                                 | Artifact                |
| --- | -------------------------------------------------------- | ----------------------- |
| 1   | Do these response bytes belong to this paid interaction? | delivery receipt        |
| 2   | Which evaluator, running which procedure, measured what? | **quality attestation** |

Two evaluators may reach different conclusions about the **same** bytes without either
invalidating the other. That is why these are two artifacts joined by **binding**, never by
semantic extension. This repository implements artifact 2.

## Shape

```
schema      = "x402-quality/v0"
subject     = { delivery_receipt_digest | response_body_sha256 | bound_receipt }
measurement = { profile, algorithm_version, observed_at, verdict, metrics, inputs?, valid_until? }
attester    = [ { address, signature, covers, bound_receipt_uid?, key_id?, role? } ]
```

Full JSON Schema: [`x402-quality-v0.schema.json`](./x402-quality-v0.schema.json).

## Two deliberate deviations from the draft

Both are meant to be argued with, not accepted.

**1. `attester` is a list, not a single `{address, signature}`.**
This was already raised in our OUT-02 reply. A quorum profile (several attesters co-signing) and
an independence profile (attesters that must not derive from one key group) both need to express
"more than one signer" — and neither should require forking the schema to do it. A single-element
list is the degenerate case.

**2. `subject` gained `bound_receipt`, alongside `delivery_receipt_digest` and
`response_body_sha256`.**
`response_body_sha256` is exactly right when the assessed object **is** the response bytes. It is
the wrong handle when the assessed object is a measurement **derived from a committed set of
inputs** — at that point the bytes are not the thing being measured; the inputs are.

Our assessed object is the second kind. A pre-trade check is not "the quality of one HTTP body";
it is a claim about a set of oracle observations. So we bind the signed receipt and carry the
input commitments in `measurement.inputs`. Those commitments are recomputable, not decorative:
`providerObservationsHash` publishes its ABI, its lexicographic sort order and its full pipeline,
and ships a test vector at
`/.well-known/provider-observations-hash-vector-v1.json`.

The two bindings are not exclusive. When a delivery receipt exists to bind against, an artifact
may carry `delivery_receipt_digest` **and** `bound_receipt` together, and a verifier must require
that all present bindings agree on the same object.

## What this proves — and what it does not

**Proves:**

- The artifact names a receipt, and every number in `measurement` is byte-identical to a field the
  receipt's issuer **signed**. Recomputing the projection is mechanical
  (`node projection.mjs verify …`), and a single altered digit fails closed.
- Which procedure produced the numbers (`profile`), which implementation ran it
  (`algorithm_version`), and when the measurement was taken (`observed_at`).

**Does not prove:**

- **That the measurement is true.** A signature proves _who claimed what_, never that the claim
  holds. When the seller operates both the production system and the attester key, the result is a
  _seller-originated measurement claim_ — well-bound, independently verifiable, and honestly
  labelled. That labelling is the point; it is not a defect to be papered over.
- **That the signing key is trustworthy.** Trust in the key is established by the verifier against
  a registry **it pinned itself**. Taking the registry from the same bundle as the artifact
  authenticates nothing.
- **Anything about the artifact document itself, when `covers` is `bound-receipt`** — see below.

## `covers` is the honest boundary, made machine-readable

In v0 we do **not** mint a new signing domain. The signature in `attester[]` is the _existing_
receipt signature, reused. The consequence is exact and must not be glossed:

> An artifact with `covers: "bound-receipt"` is a **recomputable view** of a signed receipt.
> The document itself is not signed. A verifier MUST rebuild the projection from the receipt and
> compare — never accept the document's numbers on their own authority.

`covers: "this-document"` is specified for implementations that sign the assertion directly
(committing to this artifact's own `subject` + `measurement` under the profile's canonical
serialization). It is reserved, not demonstrated here — see _Known gaps_.

## Independent re-computation

Three steps. No API key, no account, and — after the receipt is fetched — no network.

```bash
# 1. Fetch the receipt the artifact names (any transport you trust).
curl -o receipt.json https://www.oracleinsight.xyz/api/v1/safety/attestation/sample

# 2. Verify the receipt's bytes locally, against a registry you pinned yourself.
npm install verify-insight-receipt
npx verify-insight-offline --registry <your-reviewed-registry.json> \
  --registry-sha256 <YOUR_64_HEX_PIN> --receipt receipt.json

# 3. Confirm the artifact is a faithful projection of that receipt.
node projection.mjs verify fixtures/artifact.oracle-pretrade.v3.json fixtures/receipt.oracle-pretrade.sample.json
```

Step 3 exits `0` and prints `ok` on a faithful projection; on any divergence it prints each
differing path and exits `1`. It is deliberately boring — that is the property being demonstrated.

Note the separation: `verify-insight-receipt` decides _whether the receipt is sound and its key is
trustworthy_; `projection.mjs` decides _whether the artifact matches the receipt_. Neither will do
the other's job, and neither trusts the other's input.

## Fixtures

| Artifact                                                                                   | Bound receipt       | Profile               |
| ------------------------------------------------------------------------------------------ | ------------------- | --------------------- |
| [`fixtures/artifact.oracle-pretrade.v3.json`](./fixtures/artifact.oracle-pretrade.v3.json) | `0x6ff5e1d0…488b72` | `oracle-pretrade/v3`  |
| [`fixtures/artifact.execution.v5.json`](./fixtures/artifact.execution.v5.json)             | `0xdf77bba0…32f47e` | `oracle-execution/v5` |

Both were generated by `projection.mjs build` from the live sample endpoints, and both re-verify.
The raw receipts are kept alongside them under `fixtures/` so the whole chain is reproducible
offline.

> **The signing key in these fixtures is a `sample`-role key.**
> `0xa41d5Ee795d95B87B3AA988150fC2d5e5fE5A534` is published in
> `/.well-known/oracle-keys.json` with `"role": "sample"`. It signs conformance fixtures only and
> **MUST NOT** be treated as a production attester. `projection.mjs` resolves this from the
> registry rather than assuming it, and writes it into `attester[].role` so the distinction
> survives into the artifact. A fixture signed by a sample key demonstrates the format and the
> recomputation path; it does not demonstrate production issuance.

## Known gaps in v0

Stated rather than hidden:

- **No quorum or independence demonstration.** `attester[]` carries one entry in both fixtures.
  The list shape is specified; the multi-attester case is not exercised. Our v3 pre-trade schema
  enforces quorum (`requiredSourceGroupCount`) and independence at the schema layer, verifiable
  from the receipt bytes alone — but that is the _receipt's_ mechanism, and mapping it into a
  multi-attester quality artifact is not done here.
- **`kind` is free-form.** A registry of known `kind` values is expected at v1; until then a
  verifier cannot reject an unknown kind on schema grounds.
- **`covers: "this-document"` is specified but not implemented.** It needs a canonical
  serialization per profile, which is genuinely profile work.
- **`profile` strings are conventional, not registered.** Nothing stops two issuers claiming the
  same profile name with different procedures.

## Files

```
x402-quality-v0.schema.json   the artifact schema (draft 2020-12)
projection.mjs                build a projection / verify a projection — zero dependencies
fixtures/                     live receipts + the artifacts generated from them
```

---

Published by Insight. This is a reference implementation offered to a public standard
discussion. It makes no claim to novelty, seeks no adoption, and asserts nothing about any other
party's implementation.
