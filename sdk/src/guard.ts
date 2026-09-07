import { InsightClient } from './client';
import { ReceiptConfigurationError, TradeBlockedError } from './errors';
import {
  buildPriorSealExactCallIntent,
  generatePriorSealAuthorizationNonce,
  PriorSealBridgeError,
} from './priorseal';

import type {
  ExecutionReceiptRequest,
  GuardDecision,
  GuardedSwapRequest,
  GuardedSwapResult,
  GuardOptions,
  OracleWatchResult,
  OracleWatchTarget,
  PreTradeRequest,
  PreTradeResult,
  PriorSealGuardedSwapRequest,
  PriorSealGuardedSwapResult,
  SignedAttestation,
  WatchHandle,
  WatchOptions,
} from './types';

const DEFAULT_WATCH_INTERVAL_MS = 15 * 60 * 1000;
const BLOCKED_BY_DEFAULT = new Set(['DANGER', 'BLOCK']);

/**
 * The agent-facing workflow layer. It deliberately does not contain Insight's
 * risk engine: every decision, attestation and receipt is issued by the API.
 */
export class InsightGuard {
  readonly client: InsightClient;
  private readonly blockedVerdicts: ReadonlySet<string>;
  private readonly blockOnWatchHalt: boolean;
  private readonly haltedTargets = new Set<string>();

  constructor(options: GuardOptions) {
    this.client = new InsightClient(options);
    this.blockedVerdicts = new Set(options.policy?.blockedPreTradeVerdicts ?? BLOCKED_BY_DEFAULT);
    this.blockOnWatchHalt = options.policy?.blockOnWatchHalt ?? true;
  }

  async check(request: PreTradeRequest, signal?: AbortSignal): Promise<GuardDecision> {
    const result = await this.client.preTrade(request, signal);
    return { allowed: !this.blockedVerdicts.has(result.verdict), result };
  }

  /** Exception-style helper for agents whose executor aborts on thrown errors. */
  async assertSafe(request: PreTradeRequest, signal?: AbortSignal): Promise<PreTradeResult> {
    const decision = await this.check(request, signal);
    if (!decision.allowed)
      throw new TradeBlockedError(decision.result.verdict, decision.result.warnings);
    return decision.result;
  }

  /**
   * Full two-sided swap workflow: pre-trade gates, submit only when both pass,
   * then create a VERIFIED execution receipt from the two signed gate proofs.
   */
  async executeSwap(request: GuardedSwapRequest): Promise<GuardedSwapResult> {
    const gated = await this.evaluateSwapGates(request);
    if (!gated.ready) return gated.result;

    const transaction = await request.submitTransaction({
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
    });
    if (!transaction.txHash)
      throw new ReceiptConfigurationError('submitTransaction returned no txHash.');

    const receipt = await this.client.issueExecutionReceipt({
      ...gated.receiptDraft,
      txHash: transaction.txHash,
      taker: transaction.taker,
    });

    return {
      status: 'executed',
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
      transaction,
      receipt,
    };
  }

  /**
   * Joint flow: Insight gates the swap, PriorSeal authorizes the exact calldata
   * before broadcast, then both systems independently issue evidence afterward.
   */
  async executeSwapWithPriorSeal(
    request: PriorSealGuardedSwapRequest
  ): Promise<PriorSealGuardedSwapResult> {
    const gated = await this.evaluateSwapGates(request);
    if (!gated.ready) return gated.result;

    const preparedTransaction = await request.prepareTransaction({
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
    });
    if (preparedTransaction.chainId !== request.receipt.settlementChainId) {
      throw new ReceiptConfigurationError(
        'Prepared transaction and Insight receipt must use the same settlement chain.'
      );
    }

    const issuedAt = request.priorSeal.issuedAt ?? Math.floor(Date.now() / 1000);
    const signedGateValidUntil = number(gated.sourcePreTrade.attestation?.data.validUntil);
    const validUntil = request.priorSeal.validUntil ?? signedGateValidUntil;
    if (!Number.isSafeInteger(validUntil) || validUntil <= issuedAt) {
      throw new ReceiptConfigurationError(
        'PriorSeal validUntil must be after issuedAt; pass it explicitly when the gate does not expose one.'
      );
    }
    if (signedGateValidUntil > 0 && validUntil > signedGateValidUntil) {
      throw new ReceiptConfigurationError(
        'PriorSeal authorization cannot outlive the signed Insight pre-trade gate.'
      );
    }

    const authorizationNonce =
      request.priorSeal.authorizationNonce ?? generatePriorSealAuthorizationNonce();
    const intent = buildPriorSealExactCallIntent({
      transaction: preparedTransaction,
      intentId: request.priorSeal.intentId ?? `insight:${authorizationNonce.slice(2, 34)}`,
      sourceAssetId: gated.receiptDraft.sourceAssetId,
      validUntil,
      minConfirmations: request.priorSeal.confirmations,
    });
    const preparedAuthorization = await request.priorSeal.client.prepareAuthorization(
      {
        intent,
        principal: request.priorSeal.principal,
        authorizer: { type: 'eip712', address: request.priorSeal.principal.account },
        delegate: { agentId: request.priorSeal.agentId, executor: intent.sender },
        issuedAt,
        notBefore: issuedAt,
        expiresAt: validUntil,
        authorizationNonce,
        maxUses: '1',
        audience: request.priorSeal.audience ?? 'priorseal',
      },
      request.priorSeal.signal
    );
    const signature = await request.priorSeal.signAuthorization(preparedAuthorization);
    if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
      throw new ReceiptConfigurationError('PriorSeal signer returned no hex signature.');
    }
    const priorSealAuthorization = await request.priorSeal.client.acceptAuthorization(
      { ...preparedAuthorization.authorization, signature },
      request.priorSeal.signal
    );

    const transaction = await request.submitTransaction({
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
      transaction: preparedTransaction,
      priorSealAuthorization,
    });
    if (!/^0x[0-9a-fA-F]{64}$/.test(transaction.txHash)) {
      throw new ReceiptConfigurationError('submitTransaction returned no valid transaction hash.');
    }

    // Once a transaction has been broadcast, evidence services are independent:
    // preserve either result instead of hiding it when its companion is down.
    const [insightResult, priorSealResult] = await Promise.allSettled([
      this.client.issueExecutionReceipt(
        {
          ...gated.receiptDraft,
          txHash: transaction.txHash,
          taker: transaction.taker,
        },
        request.priorSeal.signal
      ),
      request.priorSeal.client.observeExecution(
        {
          authorizationId: priorSealAuthorization.authorization.authorizationId,
          chainId: preparedTransaction.chainId,
          txHash: transaction.txHash,
          confirmations: request.priorSeal.confirmations,
        },
        request.priorSeal.signal
      ),
    ]);

    const insightReceipt = insightResult.status === 'fulfilled' ? insightResult.value : null;
    const priorSealEvidence = priorSealResult.status === 'fulfilled' ? priorSealResult.value : null;
    const evidenceErrors = {
      ...(insightResult.status === 'rejected'
        ? { insight: evidenceError(insightResult.reason) }
        : {}),
      ...(priorSealResult.status === 'rejected'
        ? { priorSeal: evidenceError(priorSealResult.reason) }
        : {}),
    };
    const evidenceStatus =
      insightReceipt && priorSealEvidence?.receipt
        ? 'COMPLETE'
        : priorSealEvidence && !priorSealEvidence.receipt
          ? 'PRIORSEAL_PENDING'
          : insightReceipt || priorSealEvidence?.receipt
            ? 'PARTIAL'
            : 'UNAVAILABLE';

    return {
      status: 'executed',
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
      transaction,
      preparedTransaction,
      priorSealAuthorization,
      insightReceipt,
      priorSealEvidence,
      evidenceStatus,
      evidenceErrors,
    };
  }

  private async evaluateSwapGates(request: SwapGateRequest): Promise<SwapGateEvaluation> {
    if (this.blockOnWatchHalt && request.watchTarget && this.isHalted(request.watchTarget)) {
      return { ready: false, result: { status: 'blocked', stage: 'watch_halt' } };
    }

    const sourceDecision = await this.check({
      ...request.source,
      schemaVersion: request.source.schemaVersion ?? 3,
    });
    if (!sourceDecision.allowed || !isExecutionAuthorised(sourceDecision.result.verdict)) {
      return {
        ready: false,
        result: {
          status: 'blocked',
          stage: 'source_pre_trade',
          sourcePreTrade: sourceDecision.result,
        },
      };
    }

    const destinationDecision = await this.check({
      ...request.destination,
      schemaVersion: request.destination.schemaVersion ?? 3,
    });
    if (
      !destinationDecision.allowed ||
      !isExecutionAuthorised(destinationDecision.result.verdict)
    ) {
      return {
        ready: false,
        result: {
          status: 'blocked',
          stage: 'destination_pre_trade',
          sourcePreTrade: sourceDecision.result,
          destinationPreTrade: destinationDecision.result,
        },
      };
    }

    return {
      ready: true,
      sourcePreTrade: sourceDecision.result,
      destinationPreTrade: destinationDecision.result,
      // Validate proof material before any external transaction is submitted.
      receiptDraft: buildVerifiedReceiptDraft(
        sourceDecision.result,
        destinationDecision.result,
        request.receipt
      ),
    };
  }

  /** Starts a bounded-cadence Watch loop. Bind `onHalt` to pause your strategy. */
  watch(target: OracleWatchTarget, options: WatchOptions = {}): WatchHandle {
    const key = targetKey(target);
    const intervalMs = options.intervalMs ?? DEFAULT_WATCH_INTERVAL_MS;
    if (intervalMs < DEFAULT_WATCH_INTERVAL_MS && !options.allowFasterPolling) {
      throw new RangeError(
        `Watch intervals below ${DEFAULT_WATCH_INTERVAL_MS}ms require allowFasterPolling: true.`
      );
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
    };

    const refresh = async (): Promise<OracleWatchResult> => {
      const result = await this.client.oracleWatch(target, options.signal);
      await options.onSignal?.(result);
      if (result.recommendation === 'halt') {
        if (this.blockOnWatchHalt) this.haltedTargets.add(key);
        await options.onHalt?.(result);
      } else {
        this.haltedTargets.delete(key);
      }
      return result;
    };

    const done = new Promise<void>((resolve) => {
      const run = async (): Promise<void> => {
        while (active && !options.signal?.aborted) {
          try {
            const result = await refresh();
            if (result.recommendation === 'halt' && (options.stopOnHalt ?? true)) {
              stop();
              break;
            }
          } catch (error) {
            await options.onError?.(error);
          }
          if (!active || options.signal?.aborted) break;
          await new Promise<void>((next) => {
            timer = setTimeout(next, intervalMs);
          });
        }
        resolve();
      };
      void run();
    });

    return { target, done, refresh, stop };
  }

  isHalted(target: OracleWatchTarget): boolean {
    return this.haltedTargets.has(targetKey(target));
  }

  clearHalt(target: OracleWatchTarget): void {
    this.haltedTargets.delete(targetKey(target));
  }
}

type BlockedSwapResult = Extract<GuardedSwapResult, { status: 'blocked' }>;
type SwapGateRequest = Pick<
  GuardedSwapRequest,
  'source' | 'destination' | 'watchTarget' | 'receipt'
>;
type SwapGateEvaluation =
  | { ready: false; result: BlockedSwapResult }
  | {
      ready: true;
      sourcePreTrade: PreTradeResult;
      destinationPreTrade: PreTradeResult;
      receiptDraft: Omit<ExecutionReceiptRequest, 'txHash' | 'taker'>;
    };

function evidenceError(error: unknown): { code?: string; message: string } {
  if (error instanceof PriorSealBridgeError) {
    return { code: error.options.code, message: error.message };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: String(error) };
}

function buildVerifiedReceiptDraft(
  source: PreTradeResult,
  destination: PreTradeResult,
  receipt: GuardedSwapRequest['receipt']
): Omit<ExecutionReceiptRequest, 'txHash' | 'taker'> {
  const sourceAttestation = requireV2Proof(source, 'source');
  const destinationAttestation = requireV2Proof(destination, 'destination');
  const sourceData = sourceAttestation.data;
  const destinationData = destinationAttestation.data;

  const sourceAssetId = text(sourceData.sourceAssetId);
  const destinationAssetId = text(sourceData.destinationAssetId);
  const destinationSourceAssetId = text(destinationData.sourceAssetId);
  const destinationDestinationAssetId = text(destinationData.destinationAssetId);
  if (
    !sourceAssetId ||
    !destinationAssetId ||
    !destinationSourceAssetId ||
    !destinationDestinationAssetId
  ) {
    throw new ReceiptConfigurationError(
      'Pre-trade attestations are missing canonical asset-pair bindings.'
    );
  }

  const sourceChain = number(sourceData.subjectChainId);
  const destinationChain = number(destinationData.subjectChainId);
  if (sourceChain !== destinationChain || sourceChain !== receipt.settlementChainId) {
    throw new ReceiptConfigurationError(
      'Source gate, destination gate and settlement must use the same chain.'
    );
  }
  if (
    text(sourceData.action).toLowerCase() !== text(destinationData.action).toLowerCase() ||
    (receipt.action != null &&
      receipt.action.toLowerCase() !== text(sourceData.action).toLowerCase())
  ) {
    throw new ReceiptConfigurationError(
      'Both gates and the receipt must describe the same action.'
    );
  }
  if (number(sourceData.tradeAmountUsd) !== number(destinationData.tradeAmountUsd)) {
    throw new ReceiptConfigurationError('Both gates must commit to the same trade amount.');
  }
  if (
    sourceAssetId !== destinationDestinationAssetId ||
    destinationAssetId !== destinationSourceAssetId
  ) {
    throw new ReceiptConfigurationError(
      'Source and destination pre-trade proofs must describe the same swap in opposite directions.'
    );
  }

  const sourceConsensusUsd = number(sourceData.consensusPrice) / 1e8;
  const destinationConsensusUsd = number(destinationData.consensusPrice) / 1e8;
  if (!(sourceConsensusUsd > 0) || !(destinationConsensusUsd > 0)) {
    throw new ReceiptConfigurationError('Pre-trade proofs contain no usable consensus prices.');
  }

  const requestHash = text(sourceData.requestHash);
  if (!requestHash)
    throw new ReceiptConfigurationError('Source pre-trade proof is missing requestHash.');

  return {
    preTradeUid: sourceAttestation.uid,
    destinationPreTradeUid: destinationAttestation.uid,
    requestHash,
    sourceAssetId,
    destinationAssetId,
    subjectChainId: number(sourceData.subjectChainId),
    settlementChainId: receipt.settlementChainId,
    participantCount: number(sourceData.participantCount),
    sourceGroupCount: number(sourceData.sourceGroupCount),
    preTradeSignedAt: number(sourceData.checkedAt),
    quotedPrice: sourceConsensusUsd / destinationConsensusUsd,
    maxSlippageBps: receipt.maxSlippageBps,
    action: receipt.action ?? 'SWAP',
    quotedAmountUsd: receipt.quotedAmountUsd,
    executedAmountUsd: receipt.executedAmountUsd,
    actualFeeUsd: receipt.actualFeeUsd,
    mevRiskScore: receipt.mevRiskScore,
    quoteVenueIndependent: receipt.quoteVenueIndependent,
    quoteBasis: receipt.quoteBasis,
    quoteBlockNumber: receipt.quoteBlockNumber,
    priceStateAgeAtExecSeconds: receipt.priceStateAgeAtExecSeconds,
    claimRole: receipt.claimRole,
    preTradeAttestations: { source: sourceAttestation, destination: destinationAttestation },
  };
}

function requireV2Proof(result: PreTradeResult, label: string): SignedAttestation {
  const attestation = result.attestation;
  if (!attestation || attestation.schemaVersion < 2) {
    throw new ReceiptConfigurationError(
      `${label} pre-trade needs a signed v2/v3 attestation for a VERIFIED execution receipt.`
    );
  }
  return attestation;
}

function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isExecutionAuthorised(verdict: string): boolean {
  return verdict === 'PASS' || verdict === 'CAUTION';
}

function targetKey(target: OracleWatchTarget): string {
  return `${target.symbol.trim().toUpperCase()}@${(target.chain ?? '').trim().toLowerCase()}`;
}
