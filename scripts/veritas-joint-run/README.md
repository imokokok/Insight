# VERITAS joint-run readiness artifacts

## 2026-10-06 window-six candidate

`prepare-live-gate-pair-window6.mts` is the fail-closed operator for the proposed
2026-10-06 15:30–17:00 UTC window (attempt 7 first). Its matching immutable
VERITAS policy v5 is published as a candidate. This candidate publication does
not change the current activation set v5, which still selects the expired
October 2 policy v4; the partner issuer therefore remains closed. Only a later
separate activation promotion after the bilateral written agreement may select
v5. The dedicated one-time API-key ID and exact UTC date switch, production
read-back, fresh signer and clock, VERITAS preflights and its 15:25–15:30 UTC
READY with a fresh 31/31 host report remain independent gates. The operator
refuses issuance before 15:30 UTC, at or after the 16:20 UTC last-request
cutoff, and signing at or after 16:25 UTC. It requires the sent October 6
`AGREED` message as evidence, the new activation-set ID and the unchanged
runId; it preserves per-attempt locks and never sends mail or broadcasts. The
2026-10-02 operator below is historical and cannot be used for window six.

## 2026-10-02 window-five candidate

`prepare-live-gate-pair-window5.mts` is the fail-closed operator for the proposed
2026-10-02 14:00–15:30 UTC window. Its matching immutable VERITAS policy v4 is
published as a candidate. This candidate publication does not change the current
activation set v4, which still selects the expired September policy v3; the
partner issuer therefore remains closed. Only a later separate activation
promotion after the bilateral written agreement may select v4. The dedicated
one-time API-key ID and exact UTC date switch, production read-back, fresh signer
and clock, VERITAS preflights and its 13:55–14:00 UTC READY with a fresh 31/31
host report remain independent gates. The operator refuses issuance before
14:00 UTC, at or after the 14:50 UTC last-request cutoff, and signing at or
after 14:55 UTC. It requires the sent October 2 `AGREED` message as evidence,
the new activation-set ID and the unchanged runId; it preserves per-attempt
locks and never sends mail or broadcasts. The September 30 operator below is
historical and cannot be used for window five.

## 2026-09-30 one-time 1800-second joint-run path

`anchored-settlement-selection-rule-v3.json` preserves v2 and makes only the five
text changes proposed for a single VERITAS joint run. Its JCS is 7,754 bytes and
its hash is `0xb1071d6929d1dc13812d9aa19bf28a74dca4d90c07d47e9b2052f9f9c3c52465`.
The v2 Bitcoin and Ethereum fixture UIDs with that new rule produce
`bitcoin-anchor-commitment-vector-v2.json` and
`ethereum-ordering-commitment-vector-v2.json`; the preimage schemas stay v1.
Run `node --import tsx scripts/veritas-joint-run/verify-v3-candidate.mts` to
check the exact change, byte lengths, hashes and negative mutations.

`joint-run-1800-candidate-2026-09-30.json` records the September 29 review
window and conditional September 30 live cutoffs. The separate promotion in
`protocol/mainline/promotions/2026-09-29-veritas-one-time-1800-activation.json`
selects VERITAS policy v3 through activation set v4; production must still be
deployed and read back before it counts as active there. The
`/api/v1/partners/veritas/safety/pre-trade` path requires that exact active
policy, a dedicated API-key ID and an explicitly selected one-time UTC window.
The generic pre-trade path and registered v2 rule remain at 600 seconds. The
historical 2026-09-26 operator below must not be used for this window.

`prepare-live-gate-pair-1800.mts` and `render-insight-gate-pair-1800.mts` are
the September 30 window operator and plain-text handoff renderer. The operator
requires the exact 02:00–03:30 UTC window, a local copy of the bilateral written
agreement, the fresh 01:55–02:00 UTC READY and 31/31 host report, an exact
production activation-set ID, production policy and signer read-back, and a
dedicated `INSIGHT_API_KEY` whose ID matches the production one-time admission
configuration. It refuses early or late signing, a missing control file, an
invalid signed gate, a non-PASS verdict, a stale pair, a wrong route or rule, and
a reused attempt lock. Attempt 7 or 8 additionally requires the preceding
`ATTEMPT_ABORT` and a fresh `VERITAS_RETRY_REQUEST`. The lock remains after a
network timeout because an uncertain signing outcome is not permission to
sign again. The operator emits the complete two-envelope plain-text message,
v3 Bitcoin commitment input and an audit record in a private output directory;
it does not send email or broadcast transactions.

Run `node --import tsx scripts/veritas-joint-run/prepare-live-gate-pair-1800.mts`
with `--attempt`, `--authorization`, `--authorization-received-at`,
`--ready-received-at`, `--ready-message-path`, `--host-report-path`,
`--agreement-message-id`, `--agreement-evidence-path`,
`--expected-activation-set-id`, and
`--confirm-run-id insight-veritas-2026-09-18`. Retries also require
`--previous-abort-path` and `--retry-request-path`. The separate promotion
must pass CI and production read-back, followed by issuer/key/clock preflight,
before READY. Policy activation alone grants no permission to sign or broadcast.

`v5-additional-negative-vector-2026-09-28.json` records a synthetic RPC
inconsistency found during independent review of the counterparty v5 guard;
it is not an observation from a real Ethereum endpoint.

2026-09-26 window A preparation is in `joint-run-window-a-2026-09-26-plan.json`
and `RUNBOOK-2026-09-26-WINDOW-A.md`. The production-role, no-broadcast
WETH/USDC gate-to-selected-event-receipt check is
`preflight-v5-selected-event.mts`. `prepare-live-gate-pair.mts` is now pinned to
the bilaterally confirmed 02:00–03:00 UTC window and the explicitly activated v5 issuer.
It still requires a fresh window-specific READY and does not pre-sign gates.
The live operator can create and revoke a temporary production API key from
`.env.local` if no existing `INSIGHT_API_KEY` is supplied, and refuses any
gate whose verdict is not `PASS`.
The older window-2 plan and operator card remain historical records.

This directory closes F17 and N19 through N22 and pins the confirmed run-day procedure before the
funded joint run without changing any signed receipt layout, the registered 600-second gate
window, venue, direction, threshold, first-match rule or outcome-independent publication rule.

- `anchored-settlement-selection-rule-v2.json` fixes the USDC EIP-55 spelling, defines the
  five-field Bitcoin preimage and its distinct tagged-hash leaf, pins Bitcoin hash display
  encoding, removes in-window human round trips, and applies symmetric Bitcoin/Ethereum
  canonicality checks before final-package publication.
- `bitcoin-anchor-commitment-vector-v1.json` is the accepted N22 byte-exact fixture: a 409-byte
  RFC 8785 preimage and `VRT1/anchored-settlement-commitment` tagged SHA-256 leaf.
- `ethereum-ordering-commitment-vector-v1.json` uses asymmetric published historical Bitcoin
  facts so case and byte order are observable. It is a fixture, not a live attempt.
- `build-joint-run-commitments.mjs` is Insight's pinned deterministic builder. It recomputes the
  rule hash, rejects invalid address/hash representations, builds the Bitcoin commitment before
  confirmation, and extends it with public confirmation facts afterwards. It reads no key,
  contacts no network and broadcasts nothing.
- `joint-run-final-package-requirements-v1.json` applies pre-publication canonicality checks to
  both chains and keeps inclusion-proven ordering separate from issuer-asserted age.
- `joint-run-operational-agreement-v1.json` records the selected one-hour window beginning
  2026-09-18 12:00 UTC, VERITAS as sender of both commitment legs, post-submission independent
  verification by Insight, every pre-broadcast gate, the five-step attempt order, and the rule
  that each retry starts with a newly signed gate pair rather than a pre-signed or reused gate.
- `joint-run-window-2-plan-v1.json` preserves that first-window agreement as history while recording
  Insight's selection of 2026-09-23 12:00–13:00 UTC for the second window, capacity for up to five
  fresh gate pairs, the minute 44/47/55/60 cutoffs, and the new READY and fresh-check gates.
- `render-insight-gate-pair.mjs` turns a freshly signed pair JSON into the agreed plain-text email
  body after validating both envelope UIDs, the ordered UID hash, v3/600-second fields and the
  absence of any need for duplicate outer `validUntil` fields. It contacts no network and signs
  nothing, so the signature remains the final manual action before automated rendering and send.
- `provider-observation-hash-vector-v1.json` retains the N15 `uint256` positive/negative
  regression.
- `verify-veritas-round9-run-readiness.mjs` independently checks F17, N19, N20, N21, N22, both
  commitment vectors, the deterministic builder, N17/N18, N15 and the operating agreement.
- `verify-veritas-round8-publication-closure.mjs` and
  `verify-veritas-round7-closure.mjs` remain as regression paths.

Current pinned values:

| Value                                     | Pin                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------- |
| selection rule canonical bytes            | 7,737                                                                |
| `selectionRuleHash`                       | `0x545ede509529b6d8716be4f74e3e6715d92d821d18493dbc7f32e15156d2fc7a` |
| Bitcoin preimage canonical bytes          | 409                                                                  |
| Bitcoin anchor leaf                       | `a9035d310ff0345d2f7e8906544b972eba7438e128407b09f774a227ecc88f21`   |
| Ethereum fixture preimage canonical bytes | 633                                                                  |
| fixture `orderingCommitmentHash`          | `0xa9ae993af4ea7733eb3d6f524c9b8eb90cb382e56c886b3361df16b5b7a72c2e` |

Run:

```sh
node scripts/veritas-joint-run/verify-veritas-round9-run-readiness.mjs
node scripts/veritas-joint-run/verify-veritas-round8-publication-closure.mjs
node scripts/veritas-joint-run/verify-veritas-round7-closure.mjs
node scripts/veritas-joint-run/verify-veritas-window-2-plan.mjs
node scripts/veritas-joint-run/build-joint-run-commitments.mjs
```

For a real attempt, pass a JSON object to the builder with `--input`. Before Bitcoin
confirmation it contains only `sourceGateUid`, `destinationGateUid` and `preTradeUidsHash`
(optionally the exact recomputed `selectionRuleHash`). After confirmation, add all three public
facts together: `bitcoinAnchorTxid`, `bitcoinConfirmingBlockHeight` and
`bitcoinConfirmingBlockHash`. The two Bitcoin hashes are lowercase, have no `0x` prefix and use
Bitcoin display order.

Gate signing starts the registered 600-second clock. Do not pre-sign gates. Each attempt, including
each retry, begins with a fresh source and destination gate pair. The first-window agreement remains
the historical record of its two-to-three-attempt plan. For the selected second window, Insight
remains available for the full hour and plans capacity for up to five fresh pairs on an approximately
eleven-minute cycle. The unsigned message scaffold is prepared first; after a fresh pair is signed,
the renderer validates and formats it immediately. The only live values substituted into the pinned
commitment flow are `sourceGateUid`, `destinationGateUid` and `preTradeUidsHash`; the builder
recomputes `selectionRuleHash` from the rule file and refuses a stale configured value.

The Bitcoin anchor remains the durable, censorship-resistant evidence layer. The Ethereum
commitment supplies the short-horizon ordering proof. Neither proves the Insight verdict correct,
proves `checkedAt` accurate, extends gate freshness, creates a VERITAS integration or constitutes
endorsement.
