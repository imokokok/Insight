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

| Profile                                     | Direct venue call    | Direction   |
| ------------------------------------------- | -------------------- | ----------- |
| `base-aerodrome-slipstream-weth-usdc-cl100` | Aerodrome Slipstream | WETH → USDC |
| `base-pancakeswap-v3-usdc-usdt-100`         | PancakeSwap V3       | USDC → USDT |

Both profiles are Base mainnet (`8453`) only. Each has a fixed pool, factory,
quoter, router, token order, and forward direction. The preparation layer
re-reads the reviewed contract identities at the quote block before producing
calldata.

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

The agent calls the hosted Insight MCP server with a reviewed profile, the
exact token input, a recipient, a short deadline, two declared USD decision
prices, and all policy thresholds.

```json
{
  "name": "prepare_base_agent_swap_guard",
  "arguments": {
    "profileId": "base-aerodrome-slipstream-weth-usdc-cl100",
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

`decisionHash` is an **unsigned integrity commitment**, not an authorization or
an Insight assertion that an account will execute. A wallet, Base MCP plugin,
or policy engine must show the user the exact calls and independently ensure
that the calls it submits are byte-identical. For higher assurance, bind
`decisionHash` and both exact calls to a PriorSeal authorization before asking
the user to confirm.

```text
agent chooses a reviewed direct path
  → Insight Base Agent Swap Guard
  → ALLOW: bind exact calls + decisionHash to user authorization
  → user reviews and confirms in their wallet
  → wallet/executor broadcasts (outside Insight)
  → send tx hash and original pre-trade attestations to execution_receipt
```

An `ALLOW` is still not a prediction of execution price or an authorization to
spend funds. Quote state may change between the observed block and inclusion;
the encoded `amountOutMinimum` and short expiry remain the user-facing last
line of price protection. The guard rechecks that expiry after its destination
and source oracle stages; if either stage consumes the remaining quote window,
the result becomes `BLOCK` and contains no calls.

## Agent rules

1. Call the guard after selecting one supported profile and before any wallet
   prompt.
2. If the verdict is `BLOCK`, do not request a signature, replace the route,
   or retry merely to bypass the result.
3. If the verdict is `CAUTION`, show the reason and create a new assessment
   only after a user changes the proposal, the market conditions materially
   change, or the previous result expires.
4. If the verdict is `ALLOW`, display both the exact approval and swap calls,
   their recipient and minimum output, and the expiry. Require explicit user
   confirmation; Insight never has authority to provide it.
5. Do not label a Base Account UserOperation, an aggregator transaction, or a
   modified multicall as guarded by this v1 endpoint.

The MCP call is an agent-gating operation and is metered at C3 / 5 credits. It
can use the same API-key or x402 MCP payment path as the rest of Insight.

## Development and verification

The implementation lives in
[`src/lib/dex/baseAgentSwapGuard.ts`](../src/lib/dex/baseAgentSwapGuard.ts) and
the MCP entry point in
[`src/mcp/tools/baseAgentSwapGuardTools.ts`](../src/mcp/tools/baseAgentSwapGuardTools.ts).

The focused test suite covers the ALLOW handoff, caution and block call
suppression, policy breach, insufficient decision-input evidence, unavailable
route evidence, MCP discovery, validation, and metering:

```bash
npx jest src/lib/dex/__tests__/baseAgentSwapGuard.test.ts \
  src/mcp/tools/__tests__/baseAgentSwapGuardTools.test.ts --runInBand
```
