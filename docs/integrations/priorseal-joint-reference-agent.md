# PriorSeal joint reference agent

This is the canonical end-to-end composition of Insight and PriorSeal: an
agent assesses one exact Base swap with Insight, binds two PriorSeal
exact-call authorizations to the signed Insight decision, executes outside
Insight, and closes with PriorSeal receipts plus Insight's settlement
attestation. Each product remains independently sellable; the joint flow is
the decision → authorization → execution → verification evidence workflow.
No service ever holds wallet authority.

Roles in one run:

| Component | Role                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| Agent     | Selects a reviewed path, calls Insight, presents calls for confirmation, files evidence                               |
| Insight   | Signed advisory risk decision (`ALLOW` + short-lived attestation); post-settlement closure; never signs or broadcasts |
| Principal | The only signer of execution authority: two EIP-712 exact-call authorizations                                         |
| Executor  | Broadcasts exactly what the principal authorized; no policy voice                                                     |
| PriorSeal | Verifies each authorization, observes each call, issues one receipt per call                                          |
| Reviewer  | Verifies both receipts plus the original signed Insight decision, offline                                             |

## Commercial sequence

1. **Assess.** The agent calls `prepare_base_agent_swap_guard` (MCP or REST,
   C3 / 5 credits) for one reviewed profile and direction. An `ALLOW` response
   carries the two unsigned calls, their calldata hashes, and — on a configured
   deployment — a nested signed decision
   (`insight.base-agent-swap-guard-decision.v1`, ≤120 s validity) whose
   attestation binds the integrity hash, both calldata hashes, chain, recipient
   and shared expiry. `attestation: null` is not a portable authorization
   input.
2. **Bind.** The agent derives exactly two PriorSeal exact-call intents from
   the signed decision: the ERC-20 approval at nonce `N` and the direct-router
   swap at nonce `N + 1`, same source-token amount, same recipient wallet, same
   expiry, and the `insight.base-agent-swap-guard.v1` context commitment
   carrying the decision hash. Different intent IDs; never a multicall or a
   blanket allowance. The approval targets the input token contract and the
   swap targets the router — reversing either is rejected.
3. **Authorize.** The principal reviews and signs each exact-call
   authorization separately (EIP-712, one signature per call, adjacent
   nonces). Insight has no signature role here.
4. **Execute and observe.** The executor submits the approval; PriorSeal
   observes its receipt before the swap authorization is used; then the swap.
   Each observed call yields one PriorSeal receipt signed by the PriorSeal
   issuer. PriorSeal's base agent swap guard SDK adapter (shipped with
   `priorseal-sdk`) re-verifies the ordered binding —
   `buildBaseAgentSwapGuardBoundIntents`,
   `verifyBaseAgentSwapGuardAuthorizationBundle`,
   `verifyBaseAgentSwapGuardReceiptBundle` — so a reviewer can check both
   receipts and the original signed Insight decision offline.
5. **Close.** The agent calls `settle_base_agent_swap_guard` (C4) with the
   signed decision and the transaction hashes. Insight re-verifies the
   decision byte-for-byte against the on-chain calls, reconciles the observed
   token movements against the guarded quote, and returns a signed
   `insight.base-agent-swap-guard-settlement.v1` closure (`verifyOnly` REST
   route available for independent verifiers).

Fail-closed invariants the composition is built on:

- a `CAUTION` or `BLOCK` verdict returns no calldata at all;
- every executable path requires a valid principal-signed exact-call
  authorization; no Insight or agent verdict authorizes signing by itself;
- an authorization never outlives the signed Insight decision it binds to;
- any mismatch — tampered calldata, non-adjacent nonces, split expiry,
  untrusted attester, reversed order — rejects before a user authorization can
  be prepared or a receipt verified.

## Recorded runs

The binding contract is already exercised end-to-end by committed fixtures on
the PriorSeal side: `examples/web3-agent-kit-base-swap-v2/` pins the Insight
signed advisory evidence → governor → principal exact-call authorization →
PriorSeal receipt chain for a Base swap with fail-closed mutations, and
`examples/exact-call-partner-reference-v1/` verifies the exact-call receipt
matrix offline. The dedicated reference-agent example ships with
priorseal-sdk v0.14.0:
[PriorSeal `examples/insight-base-agent-swap-guard-reference-v1/`](https://github.com/imokokok/PriorSeal/tree/main/examples/insight-base-agent-swap-guard-reference-v1)
drives assess → bind → authorize → observe → review with deterministic public
demo keys, verifies both receipts plus the original signed Insight decision
offline through the base-agent-swap-guard adapter, and emits a
machine-readable `report.json` (wired into PriorSeal CI).

A live Base mainnet recorded run (real Insight attestation, real principal
funds, real broadcast, real receipts, real settlement closure) follows the
partner joint-run playbook: it requires a named maximum-spend route and an
explicit per-bundle GO before anything is broadcast. That run — and the
receipts it produces — will be appended here when executed.

## Billing boundary

Insight meters the assessment (C3) and both evidence closures (C4) through the
existing API-key plans, credits, or x402 per-call payment. PriorSeal meters
its authorization, observation, and receipt services separately. Neither
payment grants any party signing, broadcasting, or custody authority; the
principal remains the only source of execution authority, and the executor
remains outside both products.
