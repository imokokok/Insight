# x402-quality/v0 — quality attestation artifact

Status: **draft, published as a reference implementation** for the quality-attestation discussion in
[x402-foundation/x402#2833](https://github.com/x402-foundation/x402/issues/2833). It is **not** a
proposal to extend delivery-receipt semantics, and it is **not** an adopted standard.

The artifact answers a different predicate from a delivery receipt. A delivery receipt answers _do
these response bytes belong to this paid interaction_; a quality attestation answers _which
evaluator, running which procedure, measured what_. Two evaluators may reach different conclusions
about the **same** bytes without either invalidating the other — which is why the two are separate
artifacts joined by **binding**, never by semantic extension.

Full narrative, boundary notes and known gaps:
[`public/x402-quality/v0/README.md`](../public/x402-quality/v0/README.md).

## Canonical artifacts

| What                                         | Canonical URL                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| JSON Schema (draft 2020-12)                  | <https://www.oracleinsight.xyz/x402-quality/v0/x402-quality-v0.schema.json> |
| Projection tool (zero dependencies)          | <https://www.oracleinsight.xyz/x402-quality/v0/projection.mjs>              |
| Fixtures (live receipts + derived artifacts) | <https://www.oracleinsight.xyz/x402-quality/v0/fixtures/>                   |

Source of record in this repository: [`public/x402-quality/v0/`](../public/x402-quality/v0/). The
served copy and the repository copy are byte-identical; `npm run test:reliability` fails if a fixture
stops re-verifying against the published schema and tooling.

## Shape

```
schema      = "x402-quality/v0"
subject     = { delivery_receipt_digest | response_body_sha256 | bound_receipt }
measurement = { profile, algorithm_version, observed_at, verdict, metrics?, inputs?, valid_until? }
attester    = [ { address, signature, covers, bound_receipt_uid?, key_id?, role? } ]
```

Two deliberate deviations from the draft structure in
[comment 6041673467](https://github.com/x402-foundation/x402/issues/2833#issuecomment-6041673467):
`attester` is a **list** (so a quorum or independence rule does not fork the schema), and `subject`
gained **`bound_receipt`** (for measurements derived from a committed set of inputs, where the
response bytes are not the thing being measured). Both are open to argument.

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
node projection.mjs verify artifact.json receipt.json
```

Step 3 exits `0` and prints `ok` on a faithful projection; on any divergence it prints each differing
path and exits `1`.

## What it does not establish

- **That the measurement is true.** A signature proves _who claimed what_, never that the claim
  holds. When the seller operates both the production system and the attester key, the result is a
  _seller-originated measurement claim_ — well-bound and honestly labelled, which is the point.
- **That the signing key is trustworthy.** Trust in the key is established by the verifier against a
  registry **it pinned itself**; taking the registry from the same bundle as the artifact
  authenticates nothing.
- **That the document itself is signed.** In v0 no new signing domain is minted: the signature in
  `attester[]` is the _existing_ receipt signature, reused. An artifact with
  `covers: "bound-receipt"` is therefore a **recomputable view** — a verifier MUST rebuild the
  projection from the receipt and compare, never accept the document's numbers on their own
  authority. This boundary is machine-readable rather than a footnote.

## Versioning

`v0` is frozen once published. Corrections that change the shape go to `v1` under a new path
(`/x402-quality/v1/`); the `v0` bytes at the canonical URLs above are not edited in place.

---

Published by Insight. A reference implementation offered to a public standard discussion. It makes
no claim to novelty, seeks no adoption, and asserts nothing about any other party's implementation.
