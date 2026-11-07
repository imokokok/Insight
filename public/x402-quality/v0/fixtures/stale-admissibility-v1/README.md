# Pinned stale-admissibility controls

This is a **synthetic, non-production** fixture bundle for the temporal-boundary
discussion in [x402-foundation/x402#2833](https://github.com/x402-foundation/x402/issues/2833).
It is not an x402 extension, a delivery receipt, a settlement record, an authorization, or a
claim about a live counterparty.

Each case pins its signed input claim, status evidence, evaluator version and expected output in
[`manifest.json`](./manifest.json). The evaluator reports these distinct predicates:

1. `signatureValidity` — whether the fixture claim's EIP-712 signature recovers to its declared
   **test-only** signer;
2. `age` — whether a trusted evaluator clock and caller-supplied age/future-skew policy permit
   the signed timestamp;
3. `currentAdmissibility` — the combined decision under this fixture's narrow age/status rule;
4. `observedSettlement` — a separate observation, never an acceptance result or an override.

## Controls

| Case             | Signature | Age                                      | Current status / admission                  | Settlement observation        |
| ---------------- | --------- | ---------------------------------------- | ------------------------------------------- | ----------------------------- |
| `fresh-unsafe`   | valid     | fresh                                    | `UNSAFE` / rejected                         | synthetic observation present |
| `older-accurate` | valid     | stale for the caller's new-action policy | `SAFE` historical status / rejected for age | not observed                  |

The first control makes the key point that a fresh, valid signature and an observed settlement do
not override current unsafe status. The second keeps historical accuracy separate from permission
to perform a new action: its synthetic status remains `SAFE`, but its caller policy has expired.

## Reproduce

The evaluator is a frozen portable example with one explicitly pinned dependency. From this
directory (or with equivalent absolute paths):

```bash
npm install --no-save viem@2.57.13
node evaluate.mjs --manifest manifest.json --case fresh-unsafe --check
node evaluate.mjs --manifest manifest.json --case older-accurate --check
```

`--check` verifies the SHA-256 pins for the claim, status evidence and expected result before it
compares the computed result with the pinned output. It fails closed on a claim or status timestamp
that exceeds the stated future-skew allowance.

## Boundaries

- A signed timestamp establishes only what time the signer asserted. The evaluator additionally
  needs a trusted clock and a future-timestamp rule; neither establishes when an underlying event
  actually occurred.
- The status authority and both settlement observations are deliberately synthetic fixture data.
  They are integrity-pinned, not an independent real-world authority.
- No number of matching RPC answers establishes source independence merely because the URLs are
  distinct. This fixture deliberately reports `sourceIndependenceEstablished: false`.
- A signature, a current-status check, an RPC agreement or a settlement observation does not prove
  that work met acceptance criteria. That requires separately specified evidence and policy.
