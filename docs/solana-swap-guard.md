# Solana Swap Guard

`solana_swap_guard` is Insight's Solana pre-signing gate for one exact Orca
Whirlpool swap. It mirrors the BNB/Base exact-call swap guards on a chain with
no approvals and no calldata: the caller brings one fully-resolved **unsigned**
Solana transaction, and the guard answers whether that exact message is safe to
present for human confirmation. It is not a router, wallet, relayer, Jupiter
aggregator, or a general transaction scanner.

The guard composes the parts that matter for an autonomous Solana swap:

1. strict canonical decoding of exactly one legacy Whirlpool `swap`
   instruction (sha256 discriminator `[248,198,158,145,225,117,135,200]`,
   42-byte data, 9–11 accounts);
2. live mainnet re-derivation of every reviewed identity — program
   executability, pool state, vault ownership and mints, tick array, oracle,
   and user token accounts — from the pinned Whirlpool program;
3. pool pricing from the pool's own `sqrtPriceX64` (not from any quote API),
   checked against the oracle consensus ratio and the caller's declared
   decision prices;
4. both source and destination oracle assessments through Insight's
   pre-trade safety pipeline with the exact trade size in USD; and
5. a live mainnet simulation of the exact unsigned message, bound by message
   hash, before any ALLOW.

## Research basis (2026-11-03)

The reviewed lane was chosen after surveying live Solana venues for a
stable-to-stable pool with honest pricing:

- **Orca Whirlpool `4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4`** is the
  reviewed pool. At review time the pool's `sqrtPrice` implied
  **1.001358 USDT per USDC**, within 0.01% of the Jupiter lite-api market
  reference (1.001299 USDC→USDT / 0.998711 USDT→USDC). Pool facts pinned in the
  profile: `whirlpoolsConfig = 2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ`,
  `tickSpacing = 1`, `feeRate = 100` (1%), `protocolFeeRate = 1300`,
  mintA = USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` with vault
  `4oY1eVHJrt7ywuFoQnAZwto4qcQip1QhYMAhD11PU4QL`, mintB = USDT
  `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` with vault
  `4dSG9tKHZR4CAictyEnH9XuGZyKapodWXq5xyg7uFwE9`.
- **Raydium CPMM `BZtgQEyS6eXUXicYPHecYQ7PybqodXQMvkjUbP4R8mUU` was rejected**:
  its implied price (≈18 USDT/USDC) is far from any market reference — a wash
  pool. This is exactly the class of lane the guard's live pool-price
  deviation check is designed to catch even if a profile were ever added.
- The instruction layout was confirmed against the official
  `@orca-so/whirlpools-sdk` generated IDL: legacy `swap` carries
  `amount` (u64), `otherAmountThreshold` (u64), `sqrtPriceLimitX64` (u128),
  `amountSpecifiedIsInput` (bool), `aToB` (bool) after the 8-byte Anchor
  discriminator. `swapV2`/two-hop shapes are not admitted.

## Supported scope

| Profile                             | Chain                                                                                | Direct venue call            | Admitted directions   |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- | --------------------- |
| `solana-orca-whirlpool-usdc-usdt-1` | Solana mainnet-beta (`chainId: 0`, CAIP-2 `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`) | Orca Whirlpool legacy `swap` | USDC ↔ USDT (two-way) |

Both reviewed mints use 6 decimals, so raw amounts are directly comparable
across legs. Every call is one pool, one hop, one legacy instruction. The
following fail closed:

- `swapV2` / `twoHopSwap` instructions, aggregator bundles, versioned `v0`
  message shapes with multiple instructions, and any second signer;
- a non-zero `sqrtPriceLimitX64`, exact-output mode
  (`amountSpecifiedIsInput = false`), zero amount, or zero
  `otherAmountThreshold`;
- any account substitution: a different pool, vault, tick array, oracle,
  token program, or a token authority that is not the fee payer; and
- token-account owner/mint mismatches for the user's input and output
  accounts.

## MCP input

The agent resolves its own route into one unsigned legacy transaction, then
calls:

```json
{
  "name": "solana_swap_guard",
  "arguments": {
    "guard": {
      "profileId": "solana-orca-whirlpool-usdc-usdt-1",
      "direction": "usdc-to-usdt",
      "sourceDecisionPriceUsd": 1,
      "destinationDecisionPriceUsd": 0.9987,
      "policy": { "maxSlippageBps": 50, "maxReferenceDeviationBps": 100 }
    },
    "transaction": { "...unsigned legacy Solana message...": "see SolanaLendingTransactionSchema" }
  }
}
```

`sourceDecisionPriceUsd` / `destinationDecisionPriceUsd` are the prices the
agent actually used when deciding to trade. The guard checks the caller's own
internal consistency first — `otherAmountThreshold / amount`, valued with the
declared destination price, must sit within `maxSlippageBps` of the declared
source price (`MIN_OUT_INCONSISTENT_WITH_DECLARED_PRICES` otherwise) — and then
compares each declared price to independent Insight oracle consensus within
`maxReferenceDeviationBps`. Policy caps are 1,000 bps for both thresholds; an
integration can be stricter, never looser.

## Result and decision attestation

The result is `ALLOW`, `CAUTION`, or `BLOCK` with `chainId: 0`. Reasons are
explicit codes (`MIN_OUT_BELOW_POOL_PRICE_TOLERANCE`,
`POOL_PRICE_DEVIATION_EXCEEDED`, `SOURCE_DECISION_PRICE_DEVIATION_EXCEEDED`,
`DESTINATION_DECISION_PRICE_DEVIATION_EXCEEDED`, …). Live account reads,
oracle checks, and simulation all fail closed: a transport or protocol-read
failure is a `BLOCK`, never a pass-through.

On an `ALLOW`, the MCP response adds a nested `decision` object containing a
short-lived (`300 s`) `insight.solana-swap-guard-decision.v1` **Ed25519**
attestation signed by Insight's dedicated Solana evidence key
(`INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED`). The signed payload binds
`decisionHash`, the exact message hash, the fee payer, the profile, the
direction, and the verdict, with `validUntil`. If `decision.attestation` is
`null`, the result must not be used as a portable authorization input. A
public verifier and attester discovery live at
`GET|POST /api/v1/safety/solana-swap-guard/verify`.

Because Solana has no approvals, the closed path is one signature:

```text
signed Insight ALLOW (decisionHash + messageHash)
  → user reviews and signs the exact unsigned transaction in their wallet
  → wallet/executor broadcasts (outside Insight)
  → settlement reconciles the observed balance deltas against the guarded amounts
```

## Post-settlement closure

After the transaction is included, `settle_solana_swap_guard` takes the signed
decision plus the on-chain transaction signature. Insight:

1. re-verifies the decision (integrity hash, exact action binding, Ed25519
   attester, expiry) — a decision that does not verify produces **no
   settlement**;
2. cryptographically binds the executed transaction to the attested message:
   the presented on-chain signature must Ed25519-verify over the attested
   unsigned message bytes (Solana only includes transactions under a fee-payer
   signature over the exact compiled message) — a mismatch produces **no
   settlement** (`EXECUTED_MESSAGE_MISMATCH`);
3. collects execution facts from Solana JSON-RPC
   (`collectSolanaExecutionFacts`: net wallet-owned SPL balance deltas for the
   two reviewed mints, slot, status, fees); and
4. reconciles the observed deltas against the guarded commitment —
   `SOURCE_AMOUNT_MISMATCH`, `MIN_OUT_VIOLATED`, `EXECUTION_REVERTED`, or an
   explicit `unavailableReason` — and signs a portable
   `insight.solana-swap-guard-settlement.v1` receipt bound to the
   `decisionHash` and the on-chain signature. Reconciliation failures still
   produce signed evidence with a non-`SETTLED` status; amounts that cannot be
   attributed are signed as `null` with a reason, never as zeros.

The receipt certifies that the observed fill met the guarded minimum output
and the executed message was the attested message; it is not a claim the
price was correct, the trade was well-timed, or that anyone authorized the
broadcast. `verify_solana_swap_guard_settlement` and the REST route
`POST /api/v1/safety/solana-swap-guard/settlement` (with `verifyOnly: true`)
verify the Ed25519 signature against the pinned attester.

## Agent rules

1. Call the guard after resolving one direct Whirlpool route and before any
   wallet prompt.
2. If the verdict is `BLOCK`, do not request a signature, swap the route, or
   retry merely to bypass the result.
3. If the verdict is `CAUTION`, show the reason and re-assess after conditions
   change or the result expires.
4. If the verdict is `ALLOW`, require the non-null, currently valid decision
   attestation before presenting the transaction; display the exact input
   amount, minimum output, pool, and expiry. Insight never has signing
   authority.
5. Do not label an aggregator bundle, a `swapV2` call, or a modified message
   as guarded by this endpoint.

Metering follows the shared ladder: `solana_swap_guard` is C3 / 5 credits;
`settle_solana_swap_guard` and `verify_solana_swap_guard_settlement` are C4 /
10 credits. The REST guard route
`POST /api/v1/safety/solana-swap-guard` is x402-payable on the native Solana
rail (`X402_SOLANA_*` configuration) like the MCP tools.

## Honest boundaries

- The guard re-reads pool and account state at assessment time; the chain can
  move between the check and the user's signature. The signed
  `otherAmountThreshold` and the short attestation validity remain the
  user-facing last line of price protection.
- Settlement fill scope is net wallet-owned SPL balance delta: concurrent
  transfers to the same wallet in the same assets would distort the observed
  deltas (detectable via `SOURCE_AMOUNT_MISMATCH`, not prevented).
- The attester key is whatever the deployment configures in
  `INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED`; a deployment without it produces no
  attestations and no settlements (fail closed), and third parties should pin
  the attester public key out of band.
- No MEV, profitability, spam-risk, or fill-guarantee analysis is performed.

## Development and verification

Implementation lives in
[`src/lib/dex/solanaOrcaWhirlpool.ts`](../src/lib/dex/solanaOrcaWhirlpool.ts)
(reviewed profile pins), [`src/lib/dex/solanaSwapAction.ts`](../src/lib/dex/solanaSwapAction.ts)
(exact-instruction decoder), [`src/lib/dex/solanaSwapGuard.ts`](../src/lib/dex/solanaSwapGuard.ts)
(assessment), [`src/lib/dex/solanaSwapGuardAttestation.ts`](../src/lib/dex/solanaSwapGuardAttestation.ts)
(signed decision), [`src/lib/dex/solanaSwapGuardSettlement.ts`](../src/lib/dex/solanaSwapGuardSettlement.ts)
(closure), and [`src/mcp/tools/solanaSwapGuardTools.ts`](../src/mcp/tools/solanaSwapGuardTools.ts)
(MCP entry points).

```bash
npx jest src/lib/dex/__tests__/solanaSwapAction.test.ts \
  src/lib/dex/__tests__/solanaSwapGuard.test.ts \
  src/lib/dex/__tests__/solanaSwapGuardAttestation.test.ts \
  src/lib/dex/__tests__/solanaSwapGuardSettlement.test.ts \
  src/mcp/tools/__tests__/solanaSwapGuardTools.test.ts --runInBand
```
