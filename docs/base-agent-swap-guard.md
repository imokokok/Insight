# Base Agent Swap Guard

`prepare_base_agent_swap_guard` is Insight's narrowly scoped Base pre-signing
workflow for an agent that has already selected a direct swap path. It answers
whether the exact reviewed proposal is sufficiently complete to be presented
for **human confirmation**. It is not a DEX router, wallet, relayer, trade
executor, or a general transaction-security scanner.

The guard deliberately composes the parts that matter for an autonomous swap:

1. fresh, block-pinned exact-input quote and deployment-identity checks;
2. explicit price-impact, TWAP-divergence, reference-deviation, slippage, and
   quote-age policy limits;
3. canonical ABI decoding of the returned ERC-20 `approve` and
   `exactInputSingle` bytes, binding token, spender, amount, router,
   recipient, deadline, minimum output, and the venue-specific tick spacing or
   fee tier; and
4. independent destination-price validation before it converts the exact route
   quote to USD, followed by Insight's source-asset decision-input assessment
   and separate source/destination oracle-health checks.

The result is `ALLOW`, `CAUTION`, or `BLOCK`. A `CAUTION` or `BLOCK` result
returns **no calldata to sign**. This is intentional: an agent cannot convert a
risk warning into an unreviewed wallet prompt by simply forwarding an earlier
prepared call.

## Supported scope

| Profile                                     | Direct venue call    | Admitted directions   |
| ------------------------------------------- | -------------------- | --------------------- |
| `base-aerodrome-slipstream-weth-usdc-cl100` | Aerodrome Slipstream | WETH ↔ USDC (two-way) |
| `base-aerodrome-slipstream-usdc-usdt-cl1`   | Aerodrome Slipstream | USDC ↔ USDT (two-way) |
| `base-pancakeswap-v3-usdc-usdt-100`         | PancakeSwap V3       | USDC ↔ USDT (two-way) |

All profiles are Base mainnet (`8453`) only. Each has a fixed pool, factory,
quoter, router, and token order. Every lane is a single-pool, single-hop
direction of one reviewed pool: the caller names the profile and a
`direction` (`token0-to-token1`, the default, or `token1-to-token0`), and the
preparation layer re-reads the reviewed contract identities at the quote block
before producing calldata. There are no multi-hop or aggregator paths in either
direction.

The following are intentionally out of scope in v1 and fail closed rather than
being treated as equivalent swaps:

- aggregator calldata from 0x, 1inch, Kyber, or another route provider;
- arbitrary multicalls, multi-hop paths, permits, native-value swaps, or a
  caller-provided router/pool;
- Base Account or another smart-account UserOperation;
- transaction simulation as a replacement for the bound quote and oracle
  evidence; and
- token-contract scam, allowance-history, MEV, profitability, or fill
  guarantees.

These are distinct adapters and/or partner integrations, not configuration
flags. A future aggregator adapter must decode a fixed call shape, bind its
final calldata, re-verify each admitted target, and have its own test profile.

## MCP input

The agent calls the hosted Insight MCP server with a reviewed profile, a
direction, the exact token input, a recipient, a short deadline, two declared
USD decision prices, and all policy thresholds.

```json
{
  "name": "prepare_base_agent_swap_guard",
  "arguments": {
    "profileId": "base-aerodrome-slipstream-weth-usdc-cl100",
    "direction": "token0-to-token1",
    "amountIn": "0.25",
    "recipient": "0x1111111111111111111111111111111111111111",
    "deadlineUnixSeconds": 1893456300,
    "sourceDecisionPriceUsd": 3500,
    "destinationDecisionPriceUsd": 1,
    "policy": {
      "maxSlippageBps": 50,
      "maxPriceImpactBps": 30,
      "maxTwapDeviationBps": 50,
      "maxReferenceDeviationBps": 100,
      "maxQuoteAgeSeconds": 60
    }
  }
}
```

`direction` selects which side of the reviewed pool is the input token
(`token0-to-token1` by default; `token1-to-token0` for the reverse lane). The
declared USD prices and the oracle gates follow that direction: the source
decision price is per input token and the destination decision price is per
output token.

`sourceDecisionPriceUsd` and `destinationDecisionPriceUsd` are the prices the
agent actually used when deciding to trade. They are not optional convenience
values: the guard compares each to an independent Insight consensus price. It
first obtains the destination consensus, then converts the exact venue output
with that consensus price—not the agent's declared destination price—before
checking the source decision against the route quote and independent
references. A destination price mismatch above `maxReferenceDeviationBps`
blocks the proposal before the source-side call is even made. The example
deadline is illustrative only; callers must supply a current, short deadline.

All thresholds are part of the result and `decisionHash`; v1 caps slippage,
price impact, TWAP deviation, and reference deviation at 1,000 bps and quote
age at 120 seconds. An integration can choose a stricter limit but cannot use
this endpoint to create a high-slippage automatic-execution lane.

## Result and handoff

An `ALLOW` returns:

- an exact-amount ERC-20 approval call and one direct swap call, both unsigned;
- hashes that bind their calldata, target, amount, recipient, and Base value;
  the guard itself has also canonical-decode-verified those bytes against the
  reviewed profile before exposing them;
- quote block, pool, quoter, router code identity, policy, expiry, and oracle
  summaries; and
- a `decisionHash`, which is `keccak256` over the canonical result payload.

The guard payload's `decisionHash` is an **unsigned integrity commitment**, not
an authorization or an Insight assertion that an account will execute. On a
configured production deployment, the MCP response preserves the guard result
and adds a nested `decision` object with a short-lived
`insight.base-agent-swap-guard-decision.v1` EIP-712 attestation. Its signature
binds the integrity hash, both calldata hashes, Base chain ID, the recipient,
and the shared expiry. If `decision.attestation` is `null`, an agent must not
use the result as a portable authorization input: it must obtain a fresh
assessment after the Insight attester is configured and published in the key
registry.

The exact ERC-20 approval transaction always targets the **input token
contract**; its `approve(spender, amount)` argument names the router. The swap
transaction separately targets the router. Treating the router as the approval
transaction target is invalid and rejected by the closure verifier.

The closed Base path is intentionally two-step:

```text
signed Insight ALLOW
  → PriorSeal authorization #1: exact token approval, nonce N
  → user confirms; PriorSeal observes approval receipt
  → PriorSeal authorization #2: exact direct-router swap, nonce N + 1
  → user confirms; PriorSeal observes swap receipt
  → independent verifier checks both receipts + signed Insight decision
```

Both PriorSeal intents must use the same source-token amount, wallet/recipient,
expiry, and `insight.base-agent-swap-guard.v1` commitment. They must have
different intent IDs and adjacent nonces. They are never a multicall or a
single blanket allowance. See PriorSeal's
[`Base Agent Swap Guard binding`](https://github.com/imokokok/PriorSeal/blob/main/docs/insight-base-agent-swap-guard.md)
for the SDK verifier contract. A public attestation verifier is available at
`/api/v1/safety/base-agent-swap-guard/verify`.

```text
agent chooses a reviewed direct path
  → Insight Base Agent Swap Guard + signed ALLOW
  → bind exact approval (N) and swap (N+1) to two user authorizations
  → user reviews each call; observe approval before submitting swap
  → wallet/executor broadcasts (outside Insight)
  → preserve both PriorSeal receipts and original pre-trade attestations
```

An `ALLOW` is still not a prediction of execution price or an authorization to
spend funds. Quote state may change between the observed block and inclusion;
the encoded `amountOutMinimum` and short expiry remain the user-facing last
line of price protection. The guard rechecks that expiry after its destination
and source oracle stages; if either stage consumes the remaining quote window,
the result becomes `BLOCK` and contains no calls.

## Post-settlement closure

The pre-signing workflow above ends at broadcast; until now nothing joined the
signed decision back to what actually settled. `settle_base_agent_swap_guard`
closes that loop. After the swap transaction is included, the agent presents the
signed decision plus the swap transaction hash (and the approval transaction
hash when it holds one), and Insight returns a signed
`insight.base-agent-swap-guard-settlement.v1` closure bound to the
`decisionHash` and both transaction hashes.

The closure is evidence, not ceremony. Before signing it, Insight:

1. re-verifies the decision itself — integrity hash, exact two-call binding,
   attester signature, trust registry, and expiry. A decision that does not
   verify produces **no settlement**; an expired-but-genuine one still closes
   and carries `DECISION_EXPIRED_AT_CLOSURE`;
2. requires the on-chain swap transaction to match the guarded call
   byte-for-byte — same `to`, zero `value`, and `keccak256(calldata)` equal to
   the guarded `swapCalldataHash`. A presented approval transaction must match
   the guarded approval the same way; a presented-but-different approval is a
   hard rejection, and an absent one is reported as
   `APPROVAL_TX_NOT_PRESENTED`;
3. reconciles the observed ERC-20 movements against the guarded commitment —
   the input amount against `amountInRaw` (`SOURCE_AMOUNT_MISMATCH` on
   divergence), the output amount against `amountOutMinimumRaw`
   (`RECEIVED_BELOW_GUARANTEED_MINIMUM`) and the quoted output
   (`REALIZED_SLIPPAGE_EXCEEDED` when the realized output-leg slippage exceeds
   the agent's own `maxSlippageBps`); and
4. reports a reverted swap as a real, signable outcome (`SWAP_TX_REVERTED`),
   never as a collection failure.

Amounts that cannot be attributed are signed as empty strings with an explicit
reason code, never as zeros. The settlement certifies that the executed bytes
were the guarded bytes and states the fill against the guarded quote; it is not
a claim the price was correct, the trade was well-timed, or that anyone
authorized the execution. A REST verifier is available at
`POST /api/v1/safety/base-agent-swap-guard/settlement` with `verifyOnly: true`.

### One decision, one swap transaction

Settlement is stateless: Insight does not record which decisions have already
been closed, so nothing technically prevents the same signed decision from
being closed against two different transactions whose calldata is
byte-identical. Honest usage can never produce this — one `decisionHash`
corresponds to exactly one swap transaction — and the closure is designed so
that any violation is detectable offline:

- the EIP-712 struct signs `decisionHash`, `swapTxHash`, and `approvalTxHash`
  together, so the binding is inside the signature and cannot be stripped;
- both independent verifiers (`verify_base_agent_swap_guard_settlement` and
  the REST `verifyOnly` route) return the signed `decisionHash`, `swapTxHash`,
  and `attester` alongside the verdict; and
- therefore two closures that both verify, share a `decisionHash`, and name
  different `swapTxHash` values are a contradiction: evidence that the
  decision was double-settled (or that the attester infrastructure is
  misbehaving), attributable via the signed `attester`.

This is a detective control, not a preventive one: Insight guarantees that a
double settlement cannot hide, not that only one settlement can be requested.

### Trust root and key rotation

The attester address is the public key (`EIP-712/secp256k1`); trust is not
hard-coded into SDKs. It is published in the unauthenticated registry at
`GET /.well-known/oracle-keys.json`, where every entry carries `key_id`,
`public_key`, `validFrom`, `validUntil` (null = no scheduled expiry),
`revoked`, and a `role`:

- `role: "attester"` — production keys. Only these may sign real settlements
  (the settlement verifier rejects every other role).
- `role: "sample"` — the synthetic demo signer. Anything it signs verifies
  cryptographically but is never evidence of a real trade.

Verification semantics are anchored to the signing time, not the checking
time: a closure is trusted when its `checkedAt` falls inside the attester
key's validity window and the key is neither revoked nor listed in the
registry's `revoked` list. Rotation therefore never invalidates history —
publish the new key with a future `validFrom`, switch signing, then expire or
revoke the old key. A compromise is handled by setting `revoked: true`; that
only affects closures whose `checkedAt` falls after the trust boundary, which
is exactly the horizon a third party can hold the attester to.

Offline verifiers should fetch `oracle-keys.json` themselves and apply the
same rule: signature valid **and** `checkedAt` inside the window for a
non-revoked `role: "attester"` key.

## Agent rules

1. Call the guard after selecting one supported profile and before any wallet
   prompt.
2. If the verdict is `BLOCK`, do not request a signature, replace the route,
   or retry merely to bypass the result.
3. If the verdict is `CAUTION`, show the reason and create a new assessment
   only after a user changes the proposal, the market conditions materially
   change, or the previous result expires.
4. If the verdict is `ALLOW`, require a non-null, currently valid Insight
   attestation before creating a reusable PriorSeal binding. Display both exact
   calls, their target, recipient, minimum output, and expiry. Require explicit
   user confirmation for each transaction; Insight never has authority to
   provide it.
5. Do not label a Base Account UserOperation, an aggregator transaction, or a
   modified multicall as guarded by this v1 endpoint.

The MCP call is an agent-gating operation and is metered at C3 / 5 credits. It
can use the same API-key or x402 MCP payment path as the rest of Insight.

## Development and verification

The implementation lives in
[`src/lib/dex/baseAgentSwapGuard.ts`](../src/lib/dex/baseAgentSwapGuard.ts),
the signed decision builder in
[`src/lib/dex/baseAgentSwapGuardAttestation.ts`](../src/lib/dex/baseAgentSwapGuardAttestation.ts),
the post-settlement closure in
[`src/lib/dex/baseAgentSwapGuardSettlement.ts`](../src/lib/dex/baseAgentSwapGuardSettlement.ts),
and the MCP entry point in
[`src/mcp/tools/baseAgentSwapGuardTools.ts`](../src/mcp/tools/baseAgentSwapGuardTools.ts).

The focused test suite covers the ALLOW handoff, caution and block call
suppression, policy breach, insufficient decision-input evidence, unavailable
route evidence, MCP discovery, validation, and metering, plus the settlement
closure (faithful fills, byte mismatches, reverted swaps, realized slippage,
tampered closures):

```bash
npx jest src/lib/dex/__tests__/baseAgentSwapGuard.test.ts \
  src/lib/dex/__tests__/baseAgentSwapGuardAttestation.test.ts \
  src/lib/dex/__tests__/baseAgentSwapGuardSettlement.test.ts \
  src/mcp/tools/__tests__/baseAgentSwapGuardTools.test.ts --runInBand
```

Metering: `prepare_base_agent_swap_guard` is C3 / 5 credits;
`settle_base_agent_swap_guard` and `verify_base_agent_swap_guard_settlement`
are C4 evidence artifacts.
