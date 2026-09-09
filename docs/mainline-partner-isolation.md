# Main-only partner isolation

All long-lived development happens on `main`. Isolation is a runtime and
publication property, not a Git branch convention.

## State model

There are four append-only objects:

1. A **partner policy** names the exact schemas, semantic profiles, registry
   releases, external contracts and production reachability admitted for one
   collaboration.
2. An **activation set** maps every partner to one policy id. Each map entry is
   independent.
3. A **protocol release** publishes the complete shared verification surface.
4. A **promotion record** binds a release and activation set to a compatibility
   outcome for every partner.

Every id is `keccak256` over canonical JSON excluding the id field. Objects are
never edited in place. The only mutable files are small discovery pointers.

```text
code merged/deployed on main
          |
          | no implicit effect
          v
new immutable partner policy --explicit promotion--> new activation set
                                                       |
                                                       v
                                              one partner path advances
```

## Changing one collaboration

1. Add the implementation and tests on `main`. Keep new behavior unreachable
   from existing policy ids.
2. Append a policy version for the intended partner. Pin every schema, profile,
   release and external contract it consumes.
3. Append an activation set that changes only that partner's mapping.
4. Append one promotion record. Its compatibility matrix must name all partners
   and explain why each is compatible, unchanged, or deliberately migrated.
5. Move the activation and promotion pointers in the same reviewed change.
6. Run `npm run protocol:check` and the normal validation suite.

Changing one activation entry cannot alter any other entry. A partner that has
not approved a new schema remains on its old policy even when the implementation
and public schema exist on `main`.

## Shared protocol changes

Shared EIP-712 layouts, commitment rules, key admission logic, public registry
routes, SDK/verifier behavior and current protocol pointers require a promotion.
CI compares the change against its base revision and rejects it unless there is
exactly one new promotion with a complete partner matrix.

Historical v1-v4 receipts retain their receipt-adjacent registry snapshot. v5+
receipts sign a semantic `profileId`. A relying party may also supply its
immutable `policyId` to the execution verify endpoints; unknown or unadmitted
schema/profile combinations fail closed.

Partner production verification is stricter than public verification. It must
use `/api/v1/partners/{partnerId}/execution/attestation/verify` (or
`verify-pair`) and include `policyId` in the JSON body. Runtime admission checks
that the id is the exact policy selected for that partner by the current
activation set, that `productionReachability` is enabled, and that the policy
admits the receipt schema/profile. Missing, stale, cross-partner, disabled or
unadmitted policy input fails closed. The generic `/api/v1/execution/...`
routes remain available only for open cryptographic and historical verification
and must not be recorded as a partner production path.

## Production deployment gate

Vercel Git auto-deployment is disabled in `vercel.json`. A push to `main` first
runs the full `validate` job and the browser `smoke` job. Only the
`deploy-production` job, which depends on both, may invoke the protected Vercel
deploy hook. A failure or cancellation in either gate leaves production on its
previous deployment.

## Public discovery

- `/.well-known/oracle-registry/integrations/current.json` points to the current
  activation set.
- `/.well-known/oracle-registry/integration-sets/{activationSetId}` returns an
  immutable partner-to-policy map.
- `/.well-known/oracle-registry/integrations/{policyId}` returns one immutable
  partner policy.
- `/api/v1/partners/{partnerId}/execution/attestation/verify` and
  `/verify-pair` are the policy-mandatory partner runtime paths.

The mutable pointers are for discovery only. Verification and coordination
records must store the immutable ids they actually used.
