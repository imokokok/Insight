# Design-partner trial — Insight Guarded Action

## Scope

One partner integrates one user-initiated Base mainnet Aave V3 direct EOA
`supply` or variable-rate `borrow` path. Insight assesses the exact unsigned
call. PriorSeal records a separate bounded authorization and later observed
execution evidence. The partner retains its own wallet, executor, credentials,
support channel, and transaction-submission policy.

## Success criteria

- every production-path action has a fresh, attested Insight decision;
- `BLOCK` prevents the authorization request in the partner UI;
- the authorization binds the identical Base direct-call bytes and expires no
  later than the Insight decision;
- the executor records one canonical transaction hash or an explicit unknown
  delivery result—never an automatic replacement;
- the partner can independently verify a sampled receipt; and
- aggregate funnel events show discovery, assessment, guarded-action handoff,
  and verification without raw wallets or signatures.

## Required partner decisions

The partner must choose the user surface, executor identity, evidence consumer,
support owner, initial user cohort, data-retention period, and pilot commercial
terms. A production payment rail, wallet allowlist, sponsored transaction, or
broader protocol scope is not implied by this trial document.

## Deliverables

1. connection and capabilities check;
2. exact call/profile allowlist and test vectors;
3. principal-review screen with the Guarded Action state card;
4. testnet rehearsal evidence; and
5. a de-identified post-trial case study using the companion template.
