# verify-insight-receipt

Verify Insight oracle-safety receipts on your own machine. The verification functions make no network call and need no API key. They check signed bytes and report key status only relative to a registry you supply; you must establish the issuer key and any semantic policy trust independently.

This checkout contains **0.3.0 source**. The latest npm release is **0.2.1**, a documentation-and-example patch with the same runtime files as 0.2.0. It does not include the v5 execution profile support described below. Check the version you install before integrating v5 receipts.

```bash
npm install verify-insight-receipt
```

**Offline smoke test.** This command creates a synthetic v1 receipt with a throwaway key and verifies its signature without network access, a wallet, or an API key. It proves the verifier runs; it does not prove that a production Insight key is trusted:

```bash
npm install verify-insight-receipt@0.2.1
node node_modules/verify-insight-receipt/examples/quickstart.mjs --offline
```

From this repository's source checkout:

```bash
git clone https://github.com/imokokok/Insight.git
cd Insight
npm install --prefix verifier
npm run build --prefix verifier
node verifier/examples/quickstart.mjs --offline
```

The `--offline` option is available in the published 0.2.1 example and in this checkout's 0.3.0 source example.

**Live demo.** With network access, the default command fetches a signed sample receipt and the registry from Insight, then verifies the bytes locally. The sample key is distinct from the production attester. Fetching both inputs from Insight does not independently authenticate the registry:

```bash
node node_modules/verify-insight-receipt/examples/quickstart.mjs
# or from this repo, after npm install:
node verifier/examples/quickstart.mjs
```

```ts
import { verifyReceipt, verifyExecutionReceipt, verifyExecutionPair } from 'verify-insight-receipt';

const result = await verifyReceipt(receipt);

if (result.code !== 'ok') {
  throw new Error(`bad receipt: ${result.code}`);
}

const execution = await verifyExecutionReceipt(executionReceipt, { keyRegistry });
if (!execution.valid) throw new Error(execution.reason);

const loop = await verifyExecutionPair(sourcePreTrade, executionReceipt, destinationPreTrade, {
  keyRegistry,
});
if (!loop.pairedValid) throw new Error(loop.reason);
```

The TypeScript snippet assumes that your application has already obtained `receipt`, `executionReceipt`, `sourcePreTrade`, `destinationPreTrade`, and an independently confirmed `keyRegistry`. It is an integration outline, not a standalone program.

---

## What this does and does not do

**Does:** recompute the EIP-712 hash from published schema constants, check it
against the `uid` the receipt claims, recover the signer from the signature and
compare it to `attester`, enforce the recheck binding invariant, and evaluate
the receipt's own validity deadline. For execution pairs it additionally checks
production-key roles, PASS/CAUTION authorisation, exact gate/asset/action/chain
bindings, and whether settlement happened inside both signed gate windows.

**Verification functions do not:** hold a signing key, read an environment variable, or make an outbound request. The optional live example fetches inputs, and the explicit `reportVerification()` function sends a report if called. The offline example signs a synthetic receipt with a throwaway test key.

**Does not mean:** that Insight endorsed the trade. A receipt attests to what
Insight's oracle checks observed at a moment in time. It is evidence, not
approval. Verification is not endorsement.

---

## Checking the result

```ts
const result = await verifyReceipt(receipt, { keyRegistry });

// Branch on `code`, not on `valid`.
if (result.code !== 'ok') throw new Error(`bad receipt: ${result.code}`);

// Then decide whether the key that signed it is still trustworthy.
if (result.keyStatus === 'revoked') throw new Error('signer key is revoked');
```

`result.code` is a stable enum:

| code                       | meaning                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `ok`                       | Signature recovered, UID matched, binding invariants held, not expired |
| `uid_mismatch`             | Payload was modified after signing                                     |
| `signature_invalid`        | Signature does not recover to `attester`                               |
| `signature_missing`        | No signature on the receipt                                            |
| `expired`                  | Past the receipt's own validity deadline                               |
| `recheck_binding_mismatch` | A recheck's `requestHash` ≠ its `originalRequestHash`                  |
| `unsupported_schema`       | `schemaVersion` is not one this library knows                          |
| `unsupported_profile`      | Signature is sound, but the signed semantic profile is unknown         |
| `malformed`                | Missing or wrongly-typed field                                         |

### Two things to know about `valid`

**`valid` and `keyStatus` are separate on purpose.** A signature proves _who_
signed, not that the key was trustworthy at the time. Collapsing them would
make a receipt flip from valid to invalid the moment a key is rotated —
retroactively rewriting a statement that was true when it was made.

**Branch on `code` as the stable machine outcome.** Expired receipts return
`valid: false`, `expired: true`, and `code: 'expired'` for every schema version.
For legacy v1 receipts, the verifier enforces the schema's fixed 600-second
window because the envelope's `validForSeconds` metadata was not signed.

---

## Supported schemas

| schemaVersion | primaryType           | signed fields                                   |
| ------------- | --------------------- | ----------------------------------------------- |
| 1             | `OracleSafetyCheck`   | 11                                              |
| 2             | `OracleSafetyCheck`   | 26                                              |
| 2             | `OracleSafetyRecheck` | 28 (v2 + `originalUid` + `originalRequestHash`) |
| 3             | `OracleSafetyCheck`   | 27 (v2 + `requiredSourceGroupCount`)            |
| 3             | `OracleSafetyRecheck` | 29 (v3 + `originalUid` + `originalRequestHash`) |
| 1             | `ExecutionReceipt`    | 30                                              |
| 2             | `ExecutionReceipt`    | 32                                              |
| 3             | `ExecutionReceipt`    | 43                                              |
| 4             | `ExecutionReceipt`    | 44 (v3 + signed `environment`)                  |
| 5             | `ExecutionReceipt`    | 45 (v4 + signed semantic `profileId`)           |

For v5, the verifier accepts only a known immutable `profileId`. Pin the profile
and registry release URLs published by `/.well-known/oracle-keys.json`; do not
infer commitment rules from mutable prose. A valid signature under an unknown
profile returns `unsupported_profile` and fails closed.

ExecutionReceipt v1-v4 are legacy layouts. Their cryptographic bytes remain
verifiable, but a semantic verdict is valid only relative to the exact registry
snapshot used by the verifier. Preserve and report that snapshot's UTF-8 bytes,
full SHA-256 and byte length. If the snapshot is absent or mismatched, fail
closed; never substitute the current registry, and never present a legacy
verdict as globally canonical. Insight production issuance and the active
Headless production policy accept v5 only; sample-role conformance endpoints
may still emit retired layouts so historical parsers can be tested.

`originalUid` is typed `string` in the v2 recheck and `bytes32` in the v3
recheck. That asymmetry is deliberate and preserved: a UID is a 32-byte hash, so
`bytes32` is its honest type, but v2 already committed to `keccak256(ascii)` and
changing it there would invalidate every v2 recheck ever issued.

A recheck carries `schemaVersion: 2` (or 3) but a distinct `primaryType`, so it
is routed before the plain-check branch. Routing it after would hash it against
the 26-field layout, silently ignoring the two reference fields, and every
recheck would fail UID recovery.

---

## Key registry

Pass a registry whose origin and contents you have independently confirmed to have the signer's trust window evaluated. The following fetch is useful for discovery, but on its own does not establish issuer trust:

```ts
const registry = await fetch('https://www.oracleinsight.xyz/.well-known/oracle-keys.json').then(
  (r) => r.json()
);

const result = await verifyReceipt(receipt, { keyRegistry: registry });
// result.keyStatus: 'valid' | 'unknown_key' | 'revoked' | 'outside_window' | 'not_checked'
```

Omit it and `keyStatus` is `not_checked`. Verification functions never fetch it for you. `keyStatus: 'valid'` is relative to the registry you supplied; it is not proof that the registry itself is authentic.

---

## Telling Insight you verified something

You do not have to, and by default nothing is sent. If you want the long tail of
verifications to be visible, call this — separately, explicitly:

```ts
const result = await verifyReceipt(receipt, { keyRegistry });

await reportVerification(result, {
  endpoint: 'https://your-collector.example/verifications',
});
```

`reportVerification` is a separate export rather than a flag on `verifyReceipt`
so that "this library makes no network call" stays a property of the code rather
than a matter of configuration.

Sent: schema version, outcome code, key standing, and `kind`. That is all.

Not sent by default: the UID. A UID was issued by Insight, so it can be joined
back to the requesting account. Pass `includeUid: true` only if that linkage is
something you want.

Never throws. A failed report says nothing about the receipt.

> **Caveat.** An unauthenticated public counter is trivially gameable by anyone
> who can send HTTP. Treat numbers collected this way as a directional signal,
> never as a billing or SLA input. For a number you can stand behind, measure
> evidence utilization server-side — see `scripts/evidence-utilization.mjs`.

---

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run build       # tsc -> dist/
```

The EIP-712 layouts in `src/schemas.ts` are duplicated from
`src/lib/attestations/` in the Insight app. That duplication is the point — this
package must build with no access to the app — but divergence is the failure
mode.

`src/lib/attestations/__tests__/verifierParity.test.ts` guards it at two layers:

1. **layout parity** — the five type descriptors, domains and primary types must
   serialize identically;
2. **verdict parity** — a receipt signed with a throwaway key must get the same
   answer from both verifiers across valid / tampered / wrong-key / expired /
   binding-mismatch / unsupported-schema cases.

**If you change a layout here, change it in the app in the same commit.** The
test is the only thing keeping the two copies honest.

### Hard rule

`src/` in this directory must not import from the Insight app. The package ships
with `viem` as its only dependency, and the point of that is that a third party
can audit the whole verification path without reading the rest of the codebase.
