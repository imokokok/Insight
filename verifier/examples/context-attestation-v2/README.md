# Context-attestation V2 offline fixtures

These are **synthetic fixtures**, not GoPlus responses or production receipts. The clean and risk examples use fabricated source bodies and a well-known throwaway test key. The bundled registry marks that signer `role: sample` intentionally.

The CLI should report `valid: true`, `resultLinked: true`, `keyStatus: valid`, and `code: ok`, while `accepted` is `false` and the process exits 1 because a sample key is not a production attester. Do not change the sample key's role to make the example exit successfully.

The source-body files are included only to let a reader manually check the example's `rawResponseSha256`. Production responses contain a signed digest, not the raw body; the independent verifier reports `sourceBodyRecomputed: false`.

From this directory, hash the exact registry bytes and verify the clean example:

```bash
shasum -a 256 sample-registry.json
node ../../dist/offline.mjs \
  --registry sample-registry.json \
  --registry-sha256 418945976d13b838c0bf0bfcda8c3d1dc95f78bdc6302247996efdd0ba0d0d80 \
  --context-attestation clean-context-attestation.json \
  --token-security-view clean-token-security-view.json
```

Repeat with `risk-context-attestation.json` and `risk-token-security-view.json` to verify the risk fixture. Both cases have the same expected `accepted: false` outcome because the registry key is a sample key. These examples test signature and view-digest verification; they do not validate GoPlus, market truth, agent consumption, or authorization.
