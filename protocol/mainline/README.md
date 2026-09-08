# Main-only protocol isolation

`main` is the only long-lived development line. Isolation is enforced by
immutable protocol objects and explicit activation, not by partner branches.

## Invariants

1. Adding code to `main` does not activate it for any partner.
2. Every partner resolves one content-addressed policy from the immutable set
   referenced by the small `activations.json` pointer.
3. Existing policy files, profiles and releases are append-only. A change creates
   a new version and content id; it never edits an old object in place. This
   includes activation sets, so old partner mappings stay resolvable.
4. Shared public semantics move only through a standalone promotion record with
   a complete compatibility matrix.
5. Historical receipts use their receipt-adjacent snapshot. v5 and later also
   require the signed semantic profile.
6. Unknown policy, profile, release, key role or schema fails closed.

The repository guard in `scripts/check-mainline-governance.mjs` verifies content
ids and references locally. In CI it also compares against the base revision,
rejects edits/deletions of immutable objects and requires a promotion record for
changes to shared protocol paths or activation pointers.
