import { InsightClient } from './client';
import { ReceiptConfigurationError, TradeBlockedError } from './errors';

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
    if (this.blockOnWatchHalt && request.watchTarget && this.isHalted(request.watchTarget)) {
      return { status: 'blocked', stage: 'watch_halt' };
    }

    const sourceDecision = await this.check({
      ...request.source,
      schemaVersion: request.source.schemaVersion ?? 3,
    });
    if (!sourceDecision.allowed) {
      return {
        status: 'blocked',
        stage: 'source_pre_trade',
        sourcePreTrade: sourceDecision.result,
      };
    }

    const destinationDecision = await this.check({
      ...request.destination,
      schemaVersion: request.destination.schemaVersion ?? 3,
    });
    if (!destinationDecision.allowed) {
      return {
        status: 'blocked',
        stage: 'destination_pre_trade',
        sourcePreTrade: sourceDecision.result,
        destinationPreTrade: destinationDecision.result,
      };
    }

    // Validate proof material BEFORE the external transaction is submitted.
    const receiptDraft = buildVerifiedReceiptDraft(
      sourceDecision.result,
      destinationDecision.result,
      request.receipt
    );

    const transaction = await request.submitTransaction({
      sourcePreTrade: sourceDecision.result,
      destinationPreTrade: destinationDecision.result,
    });
    if (!transaction.txHash)
      throw new ReceiptConfigurationError('submitTransaction returned no txHash.');

    const receipt = await this.client.issueExecutionReceipt({
      ...receiptDraft,
      txHash: transaction.txHash,
      taker: transaction.taker,
    });

    return {
      status: 'executed',
      sourcePreTrade: sourceDecision.result,
      destinationPreTrade: destinationDecision.result,
      transaction,
      receipt,
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
    preTradeSignedAt: signedAtSeconds(sourceAttestation) || number(sourceData.checkedAt),
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

function signedAtSeconds(attestation: SignedAttestation): number {
  if (typeof attestation.signedAt === 'number') {
    return attestation.signedAt > 1e12
      ? Math.floor(attestation.signedAt / 1000)
      : Math.floor(attestation.signedAt);
  }
  if (typeof attestation.signedAt === 'string') {
    const millis = Date.parse(attestation.signedAt);
    if (Number.isFinite(millis)) return Math.floor(millis / 1000);
  }
  return 0;
}

function targetKey(target: OracleWatchTarget): string {
  return `${target.symbol.trim().toUpperCase()}@${(target.chain ?? '').trim().toLowerCase()}`;
}
