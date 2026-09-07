# `oracle-insight-guard`

The execution workflow SDK for Insight. It connects the existing paid API surfaces into one agent-safe flow:

```text
two-sided Pre-Trade gates → submit transaction → verified Execution Receipt
                  ↑
          Oracle Watch can halt the agent between trades
```

An optional PriorSeal bridge adds principal authorization of the exact EVM call without replacing Insight's price and fill verification:

```text
Insight gates → construct exact call → PriorSeal authorization → broadcast
                                                        ├→ Insight fill receipt
                                                        └→ PriorSeal execution receipt
```

The SDK is a client-side orchestration layer, not a local risk engine. It sends every risk decision and signing operation to Insight with the supplied API key, so normal API authentication, credit metering, audit rows, and EIP-712 attestations remain intact.

## Install

```bash
npm install oracle-insight-guard
```

Use it from a trusted server or agent runtime only. Do not expose an Insight API key in a browser bundle.

## Guard and execute a swap

`executeSwap` never invokes `submitTransaction` when either pre-trade check returns `DANGER` or `BLOCK`. It defaults both checks to attestation schema v3 and then sends the two signed proofs to the receipt issuer, producing a `VERIFIED` rather than self-reported receipt.

```ts
import { InsightGuard } from 'oracle-insight-guard';

const guard = new InsightGuard({ apiKey: process.env.INSIGHT_API_KEY! });

const result = await guard.executeSwap({
  source: {
    asset: 'ETH',
    destinationAsset: 'USDC',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 100_000,
  },
  destination: {
    asset: 'USDC',
    destinationAsset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 100_000,
  },
  // If a running Watch recorded `halt` for this target, do not submit.
  watchTarget: { symbol: 'ETH', chain: 'ethereum' },
  receipt: {
    settlementChainId: 1,
    maxSlippageBps: 50,
    claimRole: 'FIRST_PARTY_EXECUTION',
  },
  async submitTransaction({ sourcePreTrade, destinationPreTrade }) {
    // Build and submit the transaction with your wallet / router here.
    // The signed proofs are available if you also want to place them in calldata or logs.
    return { txHash: await submitSwap(sourcePreTrade, destinationPreTrade) };
  },
});

if (result.status === 'blocked') {
  // No transaction was submitted.
  console.log(result.stage, result.sourcePreTrade?.verdict);
} else {
  console.log(result.receipt.executionStatus, result.receipt.attestation.uid);
}
```

## Exact-call authorization with PriorSeal

Use `executeSwapWithPriorSeal` when the executor can construct the transaction before broadcasting it. The callback receives PriorSeal's accepted authorization, so the transaction cannot be submitted through this workflow before the principal has approved its target, calldata, value, nonce and validity window.

```ts
import { InsightGuard, PriorSealClient } from 'oracle-insight-guard';

const guard = new InsightGuard({ apiKey: process.env.INSIGHT_API_KEY! });
const priorSeal = new PriorSealClient({ baseUrl: process.env.PRIORSEAL_URL! });

const result = await guard.executeSwapWithPriorSeal({
  source,
  destination,
  receipt: { settlementChainId: 8453, maxSlippageBps: 50 },
  priorSeal: {
    client: priorSeal,
    principal: { type: 'user', id: userId, account: authorizer },
    agentId: 'insight:swap-agent',
    validUntil: transactionDeadline,
    confirmations: 12,
    signAuthorization: ({ typedData }) => wallet.signTypedData(typedData),
  },
  prepareTransaction: async () => ({
    chainId: 8453,
    from: executor,
    to: router,
    data: swapCalldata,
    value: 0n,
    nonce: await wallet.getNonce(),
    sourceAmount: amountIn,
  }),
  submitTransaction: async ({ transaction, priorSealAuthorization }) => {
    audit.info({ authorizationId: priorSealAuthorization.authorization.authorizationId });
    return { txHash: await wallet.sendTransaction(transaction), taker: executor };
  },
});
```

The returned `evidenceStatus` is `COMPLETE` only when both independent receipts are present. A post-broadcast outage returns the surviving evidence as `PARTIAL` or `PRIORSEAL_PENDING`; it does not relabel one issuer's receipt as the other's. PriorSeal treats source asset and amount as signed descriptive context for exact calls. The calldata commitment is authoritative, while Insight remains authoritative for quote quality, fill attribution and slippage.

## Watch a running strategy

The default cadence is 15 minutes. Faster polling requires an explicit opt-in because it consumes more C3 calls and generally cannot provide fresher source data. Bind `onHalt` to the operation that pauses the strategy.

```ts
const watch = guard.watch(
  { symbol: 'ETH', chain: 'ethereum' },
  {
    onHalt: async (signal) => {
      await strategy.pause(`Oracle Watch: ${signal.reason}`);
    },
    onError: (error) => logger.error(error),
  }
);

// Later, on shutdown:
watch.stop();
await watch.done;
```

When Watch returns `halt`, the Guard remembers the target as halted. Pass the same `watchTarget` to `executeSwap` to prevent a submission while that halt is active. A later normal/caution Watch response clears that state; callers can also use `guard.isHalted(target)` and `guard.clearHalt(target)` in their own executor policy.

## Billing and trust boundary

This package does not add a second billing model. It uses the current API endpoints:

- Pre-Trade and Oracle Watch are C3 credit-metered calls.
- Execution Receipt issuance is a C4 credit-metered call.

A successful `executeSwap()` makes two Pre-Trade checks and one receipt request, so its minimum API cost is **20 credits** at the current C3/C4 prices (2 × 5 + 10), excluding any optional Oracle Watch polling. A source-side block costs one C3 check; a destination-side block costs two C3 checks. The SDK has no separate fee or wallet: REST API, AI/MCP, and SDK activity all draw from the same API-key credit wallet.

The SDK never embeds signing keys or reimplements the risk rules. A signed receipt proves that Insight issued the signed bytes; it is not a guarantee that a trade or market price was correct.
