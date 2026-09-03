# verify-insight-receipt

Verify Insight oracle-safety receipts on your own machine.

No network call. No API key. No dependency on Insight being online, reachable,
or still in business. Given a receipt JSON, this library tells you whether it
is genuine using nothing but public-key cryptography.

```bash
npm install verify-insight-receipt
```

**Try it now.** See the whole chain run in one command — fetch a live signed
receipt from Insight's public endpoint, then verify it on your own machine with
no API key and no trust in Insight:

```bash
node node_modules/verify-insight-receipt/examples/quickstart.mjs
# or from this repo, after npm install:
node examples/quickstart.mjs
```

```ts
import { verifyReceipt } from 'verify-insight-receipt';

const result = await verifyReceipt(receipt);

if (result.code !== 'ok') {
  throw new Error(`bad receipt: ${result.code}`);
}
```

---

## What this does and does not do

**Does:** recompute the EIP-712 hash from published schema constants, check it
against the `uid` the receipt claims, recover the signer from the signature and
compare it to `attester`, enforce the recheck binding invariant, and evaluate
the receipt's own validity deadline.

**Does not:** hold a signing key, read an environment variable, or make an
outbound request. This is not a configuration default — it is a property of the
code. There is no signing path in this package at all.

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
| `malformed`                | Missing or wrongly-typed field                                         |

### Two things to know about `valid`

**`valid` and `keyStatus` are separate on purpose.** A signature proves _who_
signed, not that the key was trustworthy at the time. Collapsing them would
make a receipt flip from valid to invalid the moment a key is rotated —
retroactively rewriting a statement that was true when it was made.

**`valid` is not the field to branch on.** For v1 receipts, Insight's production
verifier returns `valid: true` even when the receipt is expired (`expired: true`,
`code: 'expired'`); v2 and v3 return `valid: false`. This library reproduces that
asymmetry rather than silently disagreeing with the API, because an independent
verifier that "fixes" production's semantics stops being a check on production.
Branch on `code` / `expired`.

---

## Supported schemas

| schemaVersion | primaryType           | signed fields                                   |
| ------------- | --------------------- | ----------------------------------------------- |
| 1             | `OracleSafetyCheck`   | 11                                              |
| 2             | `OracleSafetyCheck`   | 26                                              |
| 2             | `OracleSafetyRecheck` | 28 (v2 + `originalUid` + `originalRequestHash`) |
| 3             | `OracleSafetyCheck`   | 27 (v2 + `requiredSourceGroupCount`)            |
| 3             | `OracleSafetyRecheck` | 29 (v3 + `originalUid` + `originalRequestHash`) |

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

Pass the document published at `/.well-known/oracle-keys.json` to have the
signer's trust window evaluated:

```ts
const registry = await fetch('https://www.oracleinsight.xyz/.well-known/oracle-keys.json').then(
  (r) => r.json()
);

const result = await verifyReceipt(receipt, { keyRegistry: registry });
// result.keyStatus: 'valid' | 'unknown_key' | 'revoked' | 'outside_window' | 'not_checked'
```

Omit it and `keyStatus` is `not_checked`. The library never fetches anything on
its own.

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
