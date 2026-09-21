# `oracle-insight-guard`

Workspace-only, unreleased: [opt-in RWA/tokenized-equity protocol](../docs/rwa-v1.md)
adds instrument-aware assessment and unsigned diagnostics without changing existing
Agent/DeFi flows. These additions are not yet in the published 0.4.0 package.
The [RWA v2 additions](../docs/rwa-v2.md) export `buildRwaReportV2`,
`rwaV2SigningData`, `inspectRwaReportV2`, `decodeRwaCall` and
`assessRwaCallOutcome`; source and frozen signing vectors are pinned in CI.
The optional [Robinhood issuer-context integration](../docs/rwa-robinhood.md) is
available through `InsightClient.robinhoodRwaContext(symbol)`. It verifies
first-party trading, corporate-action and multiplier facts without counting
Robinhood as an independent oracle or authorizing execution.
The versioned [MIC/FIGI instrument registry](../docs/rwa-instrument-registry.md) is available through
`InsightClient.robinhoodRwaInstrument(symbol)` and the portable
`validateRwaInstrumentRegistry`, `evaluateRobinhoodInstrumentAdmission`,
`buildAdmittedRwaReport`, and `buildAdmittedRwaReportV2` helpers. Registry admission is a separate
identity gate and never counts toward price quorum or authorizes execution.

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
npm install oracle-insight-guard@0.4.0
```

This documentation targets **0.4.0**, available from npm. The identical package is also available in the [official GitHub Release](https://github.com/imokokok/Insight/releases/tag/sdk-v0.4.0). The release adds independently verified coverage readiness, execution-time rechecks and PriorSeal coverage binding while retaining the diagnostics, freshness and durable Watch APIs from 0.3.0.

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
} else if (result.status === 'executed_receipt_pending') {
  // The transaction is already on-chain. Retry evidence only; never resubmit.
  const receipt = await guard.retryExecutionReceipt(result.receiptRequest);
  console.log(receipt.executionStatus, receipt.attestation.uid);
} else {
  console.log(result.receipt.executionStatus, result.receipt.attestation.uid);
}
```

## Non-intervening assessment and verification

Use the three-step API when Insight should advise and verify without owning the
agent's execution path. An assessment always returns a recommendation; it never
submits, signs, or prevents a transaction. `NOT_RECOMMENDED` may still be bound
to a PriorSeal authorization and executed by the caller, and the final report
will record that the agent acted against the recommendation.

`assessSwap()` performs exactly two C3 Pre-Trade requests and does not call the
C4 Execution Receipt endpoint. Its `receiptDraft` is an unsigned request
template and its context commitment can be bound into a separate exact-call
authorization. At the current C3 price, assessment-only costs 10 credits. C4 is
requested only when `verifyAssessedSwapExecution()` is called after execution,
or as part of `executeSwap()`. Omitting C4 is an evidence-retention choice; it
must not be treated as permission to bypass principal authorization.

```ts
// Set from the intended deployment's GET /v1/capabilities response and confirm
// it against your deployment configuration. Hosted PriorSeal uses priorseal.xyz.
const priorSealAudience = process.env.PRIORSEAL_AUDIENCE;
if (!priorSealAudience) throw new Error('Configure the PriorSeal deployment audience first.');

const assessment = await guard.assessSwap({
  source,
  destination,
  receipt: { settlementChainId: 8453, maxSlippageBps: 50 },
});

const authorized = await guard.authorizeAssessedSwap({
  assessment,
  transaction: preparedTransaction,
  priorSeal: {
    client: priorSeal,
    audience: priorSealAudience,
    principal: { type: 'organization', id: treasuryId, account: treasurySafe },
    authorizer: { type: 'eip1271', address: treasurySafe },
    agentId: 'treasury:rebalance-agent',
    signAuthorization: ({ typedData }) => wallet.signTypedData(typedData),
  },
});

// The application, wallet, or agent decides whether and how to execute.
const txHash = await wallet.sendTransaction(preparedTransaction);

const verified = await guard.verifyAssessedSwapExecution({
  assessment,
  transaction: preparedTransaction,
  priorSealAuthorization: authorized.priorSealAuthorization,
  txHash,
  priorSeal: { client: priorSeal, confirmations: 12 },
});

console.log(verified.report.conclusion);
```

The deterministic report distinguishes complete evidence, pending observation,
partial evidence, transaction-hash mismatch, authorization mismatch, execution
outside the assessed price constraints, execution against an advisory
recommendation, and execution with no recorded review despite a
`REVIEW_REQUIRED` assessment. It is derived from the two issuer receipts and
is not a third attestation or an execution permission.

## Optional gated execution with PriorSeal

Use `executeSwapWithPriorSeal` when an application explicitly wants Insight to
orchestrate a gated convenience flow. The callback receives PriorSeal's accepted
authorization, so the transaction cannot be submitted through this workflow
before the principal has approved its target, calldata, value, nonce and validity
window. This wrapper is optional and does not make the SDK a wallet-level
enforcement mechanism.

```ts
import { InsightGuard, PriorSealClient } from 'oracle-insight-guard';

const guard = new InsightGuard({ apiKey: process.env.INSIGHT_API_KEY! });
const priorSeal = new PriorSealClient({ baseUrl: process.env.PRIORSEAL_URL! });
// Obtain this from GET /v1/capabilities on PRIORSEAL_URL and confirm the deployment.
const priorSealAudience = process.env.PRIORSEAL_AUDIENCE;
if (!priorSealAudience) throw new Error('Configure the PriorSeal deployment audience first.');

const result = await guard.executeSwapWithPriorSeal({
  source,
  destination,
  receipt: { settlementChainId: 8453, maxSlippageBps: 50 },
  priorSeal: {
    client: priorSeal,
    audience: priorSealAudience,
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

The returned `evidenceStatus` is `COMPLETE` only when Insight binding is
verified, PriorSeal verification is valid, both artifacts refer to the submitted
transaction hash, and no PriorSeal observation job is still active.
`evidenceAvailability` separately reports whether both artifacts are present,
without confusing presence with validity. A post-broadcast outage returns the
surviving evidence as `PARTIAL` or `PRIORSEAL_PENDING`; it does not relabel
one issuer's receipt as the other's. If
`priorSealEvidence.observationJob` is present, resume it with
`PriorSealClient.waitForObservationJob()` or use
`observeExecutionUntilFinal()` in a background worker.

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

When Watch returns `halt`, the Guard remembers the target as halted. Pass the same `watchTarget` to `executeSwap` to prevent a submission while that halt is active. Recovery requires consecutive fresh healthy samples and explicit `watch.acknowledgeRecovery()`; callers can inspect `guard.isHalted(target)` in their own executor policy.

## Billing and trust boundary

This package does not add a second billing model. It uses the current API endpoints:

- Pre-Trade and Oracle Watch are C3 credit-metered calls.
- Execution Receipt issuance is a C4 credit-metered call.

A successful `executeSwap()` makes two Pre-Trade checks and one receipt request, so its minimum API cost is **20 credits** at the current C3/C4 prices (2 × 5 + 10), excluding any optional Oracle Watch polling. A source-side block costs one C3 check; a destination-side block costs two C3 checks. The SDK has no separate fee or wallet: REST API, AI/MCP, and SDK activity all draw from the same API-key credit wallet.

A successful assessment-only `assessSwap()` makes two C3 checks and no C4
request, so its API cost is **10 credits** at the current prices (2 × 5).
Calling `verifyAssessedSwapExecution()` later adds one C4 request (**10
credits**) when execution evidence is needed.

The SDK never embeds signing keys or reimplements the risk rules. A signed receipt proves that Insight issued the signed bytes; it is not a guarantee that a trade or market price was correct.

## Workflow diagnostics and freshness

`assessSwap()` keeps both original verdicts and proofs, and adds `diagnostics`.
Each item distinguishes missing evidence, market findings, freshness, unavailable
assessment scope, budget, and service failures. `reason_codes_hash_bound` means
the displayed reason set matches the hash in the supplied proof; **it does not
mean the signature or the issuer trust root has been independently verified**.
An unsigned diagnostic never upgrades a BLOCK or authorizes execution.

```ts
const guard = new InsightGuard({
  apiKey: process.env.INSIGHT_API_KEY!,
  freshness: {
    maxSourceAgeSeconds: 300,
    maxAssessmentAgeSeconds: 60,
    minimumRemainingValiditySeconds: 15,
  },
  onResponseMeta(meta) {
    // Metadata is available on both successful and failed HTTP responses.
    // creditBalance is a pre-request snapshot, not a real-time ledger.
    console.log(meta.requestId, meta.creditCost, meta.creditBalance);
  },
});

const availability = await guard.client.coverage({
  asset: 'USDC',
  chainId: 1,
  probe: true,
  maxSourceAgeSeconds: 300,
});
// Registry/live-probe diagnostics are unsigned and do not replace preTrade.
const assessment = await guard.assessSwap(swapRequest);
console.log(assessment.diagnostics, assessment.freshness);
const refreshed = await guard.refreshAssessment(assessment, swapRequest);
// signalValidity and proofAvailability are separate. A refreshed commitment
// needs a new authorization; the old authorization is never migrated.
```

The freshness policy uses signed source age plus elapsed time since `checkedAt`.
Unknown source age fails a configured source-age requirement. Source and
destination deadlines are combined using the earlier deadline. The SDK checks
again after transaction preparation, before and after wallet signing, and just
before the submit callback. Your executor must also check at actual dispatch:
the SDK cannot control delays inside your callback. `client.recheck()` provides
the typed same-trade continuity endpoint; missing recheck signatures remain
unavailable proof even if the fresh signal is healthy.

Optional `workflowTag`, `baselineVerdict` (`allow`, `alert`, `block`, `unknown`),
and `baselineVersion` on pre-trade requests attach audit labels to the service's
workflow report. They are not added to the signed request hash.

## Evidence recovery and review handoff

Both `executeSwapWithPriorSeal()` and `verifyAssessedSwapExecution()` return a
JSON-safe `checkpoint` once a transaction hash is known. Save it in storage you
control; it contains evidence and authorization material, not API credentials.

```ts
await saveCheckpoint(JSON.stringify(result.checkpoint));
const recovered = await guard.resumeAssessedSwapExecution(JSON.parse(await loadCheckpoint()), {
  client: priorSealClient,
});
await saveCheckpoint(JSON.stringify(recovered.checkpoint));
const attachments = exportReviewAttachments(recovered.checkpoint);
// attachments can be passed to PriorSeal buildReviewManifest({bundle, attachments}).
```

Recovery has no submit or signing callback. It retains an existing Insight
receipt, queries an existing PriorSeal observation job, and only requests a
missing artifact. Terminal undetermined/failed jobs stay terminal for explicit
operator review. A timeout includes `error.options.jobId` and `lastJob`; it does
not establish that the transaction failed. Historical evidence can be collected
after its decision window expires; that never renews authorization to execute.
A missing response may still require retrying a paid issuance; the checkpoint
cannot determine whether a response lost in transit was charged.

Joint reports declare `verificationOrigin: 'service_response'` and
`independentVerificationPerformed: false`. They correlate the supplied artifacts
and service results. Use native offline verifiers and independently obtained
trust roots for independent verification. Review attachments serialize the
original proof fields without re-signing; if byte-for-byte transport identity
matters, retain the original response bytes separately.

## Durable Watch incidents and budget planning

```ts
const watch = guard.watch(
  { symbol: 'ETH', chain: 'ethereum' },
  {
    stopOnHalt: false,
    recoveryHealthySamples: 2,
    stateAdapter: {
      load: async (key) => readWatchState(key),
      save: async (key, state) => writeWatchState(key, state),
    },
    onIncident: (state) => notifyOperator(state.incidentKind, state.incidentId),
    onRecoveryReady: (state) => notifyOperator('Fresh healthy samples are ready for review', state),
  }
);
// After independent operator review; this never calls a wallet or resumes funds.
await watch.acknowledgeRecovery();
```

State distinguishes `running`, `degraded`, `halted`, `recovering`, and
`monitor_unavailable`. Incidents are deduplicated; saved halts survive restart.
A healthy sample does not clear a halt. Acknowledgement requires consecutive
fresh healthy samples (default 2); only an explicit acknowledgement or the
legacy explicit `clearHalt()` operation clears the execution latch. Use the
handle acknowledgement with a state adapter so the decision is persisted.
Storage failures leave monitoring unavailable and the local gate halted.
Default `stopOnHalt: true` remains compatible: use `refresh()` to collect recovery
samples or set it to false for continued observation. Budget failures are
separate from market signals and respect the server's `Retry-After`.
Replacing a target's Watch retires its previous handle: late loads and responses
cannot change the new execution gate or emit old incidents. Writes already in
progress finish before the replacement restores durable state. Use the current
handle for manual refresh and recovery; replaced handles reject those operations.

`estimateWorkflowBudget({balance, feedCount, intervalMs, reserveCredits})`
returns credits per cycle/day/week, estimated remaining cycles and exhaustion
time. The default Watch feed cost is 5 credits; callers may override their
contract's cost. Successful BLOCK assessments can be charged. Concurrent usage,
response loss, and retries affect estimates. Use `onResponseMeta` to refresh your
budget view and warn before depletion; no recharge or fund execution is automatic.
