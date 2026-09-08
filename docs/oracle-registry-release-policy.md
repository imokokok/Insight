# Oracle registry release policy

This policy separates partner development from public protocol publication.
Normal work may deploy application code; it must not silently change how an
already-issued receipt is interpreted.

## The three version markers

- `schemaVersion` identifies the EIP-712 field names, types and order.
- Signed `profileId` identifies commitment, sentinel, scale and verdict
  semantics. The id is the keccak256 content address of an RFC 8785-canonical
  profile.
- `registryRevision` identifies a public registry publication. Its immutable
  release has a content-addressed `releaseId` and an `effectiveFrom` date.

Changing one marker does not imply changing the others. A semantic change that
does not alter the EIP-712 layout creates a new profile but can keep the same
schema version. A field-layout change requires a new schema version. Any public
promotion creates a new registry revision and release id.

## Partner isolation

Each collaboration develops and tests its proposal in its own branch/worktree
and owns its own evidence fixtures. Partner work may add a candidate profile or
schema, but it must not edit an already-published profile/release or move the
current release pointer as an incidental part of that work.

Reusable protocol code is shared by version, never by mutable partner state.
Integrators pin the signed profile id and immutable release URL, not whichever
prose happens to be at the mutable `/.well-known/oracle-keys.json` URL today.

## Explicit promotion

A protocol release is a deliberate reviewable change with all of the following:

1. Append the new profile; retain every old profile and its route.
2. If the EIP-712 layout changed, append a new schema version and keep all old
   layouts in both the service and offline verifier.
3. Add a new immutable registry release containing the complete schema catalog,
   profile id, change list, predecessor and effective date.
4. Pin the release digest literal. In-place edits fail module initialization and
   CI because the computed content address no longer matches.
5. Move `CURRENT_ORACLE_REGISTRY_RELEASE_ID` only in the promotion change.
6. Update the server verifier, offline verifier, sample endpoint, public
   registry and parity tests in the same change.
7. Run type checks, the full Jest suite and the standalone verifier build.
8. After deployment, fetch and archive all three public artifacts: the mutable
   key registry, current pointer and immutable release/profile documents.

## Compatibility rule

ExecutionReceipt v1-v4 remain cryptographically verifiable. They predate signed
profiles, so a verifier must use the registry snapshot it pinned with the
receipt. ExecutionReceipt v5 and later fail closed when `profileId` is absent or
unknown, even if the UID and signature are otherwise genuine.

## Public endpoints

- `/.well-known/oracle-keys.json` — compatibility registry plus current release
  metadata and live key validity windows.
- `/.well-known/oracle-registry/current.json` — small mutable pointer.
- `/.well-known/oracle-registry/releases/{releaseId}` — immutable protocol
  release, cached for one year with `immutable`.
- `/.well-known/oracle-registry/profiles/{profileId}` — immutable semantic
  profile, cached for one year with `immutable`.

The current pointer may advance. Content-addressed release and profile URLs must
never change content or disappear.
