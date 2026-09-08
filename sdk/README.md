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

## InterAI external evidence v0

Use the frozen rev6 inline profile to carry a signed Insight
`OracleSafetyCheck` v2 attestation into InterAI. Inline mode is the default
integration path because it does not require a new InterAI credential or a
remote reference resolver.

```ts
import { buildInterAIExternalEvidenceRequestV0, InsightClient } from 'oracle-insight-guard';

const insight = new InsightClient({ apiKey: process.env.INSIGHT_API_KEY! });
const preTrade = await insight.preTrade({
  asset: 'ETH',
  destinationAsset: 'USDC',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 10_000,
  schemaVersion: 2,
});

if (!preTrade.attestation) throw new Error('Insight attestation unavailable');

const interAIRequest = await buildInterAIExternalEvidenceRequestV0(preTrade.attestation);
// Merge interAIRequest.external_evidence into the authenticated InterAI
// verify, batch, MCP or A2A request you already use.
```

The builder verifies the attestation UID and EIP-712 signature locally, pins
the v2 schema and `SOURCE_ASSET_ONLY` scope, and copies only the frozen 26-field
signed payload. It emits no authority, contribution, policy, score or decision
fields. Expiry remains InterAI's verification-time result: an expired but
authentic assertion can still be carried and recorded as `NOT_ALLOWED`.

The helper deliberately does not fetch a URL and does not implement reference
resolution. If a future deployment genuinely needs live reference mode, define
its allowlisted origin, credential and trust scope explicitly before using it.

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

The returned `evidenceStatus` is `COMPLETE` only when both independent receipts are present and no PriorSeal observation job is still active. A post-broadcast outage returns the surviving evidence as `PARTIAL` or `PRIORSEAL_PENDING`; it does not relabel one issuer's receipt as the other's. If `priorSealEvidence.observationJob` is present, resume it with `PriorSealClient.waitForObservationJob()` or use `observeExecutionUntilFinal()` in a background worker.

Insight adds a namespaced context commitment to the signed PriorSeal intent. Its digest covers the source and destination pre-trade attestation UIDs, their request hashes and the signed slippage ceiling. PriorSeal treats source asset and amount as descriptive context and does not reinterpret Insight's economics: calldata remains authoritative for exact-call execution, while Insight remains authoritative for quote quality, fill attribution and slippage.

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
