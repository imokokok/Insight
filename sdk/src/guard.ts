import { InsightClient } from './client';
import { ReceiptConfigurationError, TradeBlockedError } from './errors';
import {
  buildInsightPriorSealContextCommitment,
  buildPriorSealExactCallIntent,
  generatePriorSealAuthorizationNonce,
  PriorSealBridgeError,
} from './priorseal';

import type {
  AssessedSwapAuthorizationRequest,
  AssessedSwapAuthorizationResult,
  AssessedSwapExecutionVerificationRequest,
  AssessedSwapExecutionVerificationResult,
  ExecutionReceiptRequest,
  ExecutionReceiptResult,
  GuardDecision,
  GuardedSwapRequest,
  GuardedSwapResult,
  GuardOptions,
  OracleWatchResult,
  OracleWatchTarget,
  PreTradeRequest,
  PreTradeResult,
  PreparedExactCallTransaction,
  PriorSealAcceptedAuthorization,
  PriorSealGuardedSwapRequest,
  PriorSealGuardedSwapResult,
  PriorSealObservationResult,
  SignedAttestation,
  SwapAssessment,
  SwapAssessmentRequest,
  TransactionRecommendation,
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
   * Evaluate both sides of a swap without submitting, signing, or preventing a transaction.
   * Operational and evidence failures are represented as UNASSESSABLE rather than thrown.
   */
  async assessSwap(request: SwapAssessmentRequest, signal?: AbortSignal): Promise<SwapAssessment> {
    const [sourceResult, destinationResult] = await Promise.allSettled([
      this.client.preTrade(
        { ...request.source, schemaVersion: request.source.schemaVersion ?? 3 },
        signal
      ),
      this.client.preTrade(
        { ...request.destination, schemaVersion: request.destination.schemaVersion ?? 3 },
        signal
      ),
    ]);
    const sourcePreTrade = sourceResult.status === 'fulfilled' ? sourceResult.value : null;
    const destinationPreTrade =
      destinationResult.status === 'fulfilled' ? destinationResult.value : null;
    const watchHalted = Boolean(request.watchTarget && this.isHalted(request.watchTarget));
    const errors = {
      ...(sourceResult.status === 'rejected' ? { source: evidenceError(sourceResult.reason) } : {}),
      ...(destinationResult.status === 'rejected'
        ? { destination: evidenceError(destinationResult.reason) }
        : {}),
    };

    let receiptDraft: Omit<ExecutionReceiptRequest, 'txHash' | 'taker'> | null = null;
    let bindingError: { message: string } | undefined;
    if (sourcePreTrade && destinationPreTrade) {
      try {
        receiptDraft = buildVerifiedReceiptDraft(
          sourcePreTrade,
          destinationPreTrade,
          request.receipt
        );
      } catch (error) {
        bindingError = evidenceError(error);
      }
    }

    const recommendation = recommendationFor(
      sourcePreTrade,
      destinationPreTrade,
      watchHalted,
      Boolean(bindingError)
    );
    const reasonCodes = assessmentReasonCodes(
      sourcePreTrade,
      destinationPreTrade,
      watchHalted,
      errors,
      bindingError
    );
    const validUntil = minimumPositive([
      number(sourcePreTrade?.attestation?.data.validUntil),
      number(destinationPreTrade?.attestation?.data.validUntil),
    ]);
    const contextCommitment = receiptDraft?.preTradeAttestations
      ? buildInsightPriorSealContextCommitment({
          sourceAttestation: receiptDraft.preTradeAttestations.source,
          destinationAttestation: receiptDraft.preTradeAttestations.destination,
          maxSlippageBps: receiptDraft.maxSlippageBps,
        })
      : null;

    return {
      schema: 'insight.swap-assessment.v1',
      recommendation,
      reasonCodes,
      sourcePreTrade,
      destinationPreTrade,
      watchHalted,
      constraints: {
        maxSlippageBps: request.receipt.maxSlippageBps ?? 50,
        recommendedMaxPositionUsd: minimumPositive([
          sourcePreTrade?.recommendedMaxPositionUsd ?? 0,
          destinationPreTrade?.recommendedMaxPositionUsd ?? 0,
        ]),
        validUntil,
      },
      contextCommitment,
      receiptDraft,
      errors: { ...errors, ...(bindingError ? { binding: bindingError } : {}) },
    };
  }

  /** Bind an advisory assessment to an exact call. This method never broadcasts a transaction. */
  async authorizeAssessedSwap(
    request: AssessedSwapAuthorizationRequest
  ): Promise<AssessedSwapAuthorizationResult> {
    const { assessment, transaction, priorSeal } = request;
    const evidence = requireAssessmentEvidence(assessment);
    if (transaction.chainId !== evidence.settlementChainId) {
      throw new ReceiptConfigurationError(
        'Prepared transaction and Insight assessment must use the same settlement chain.'
      );
    }

    const issuedAt = priorSeal.issuedAt ?? Math.floor(Date.now() / 1000);
    const validUntil = priorSeal.validUntil ?? assessment.constraints.validUntil;
    if (!Number.isSafeInteger(validUntil) || (validUntil ?? 0) <= issuedAt) {
      throw new ReceiptConfigurationError(
        'PriorSeal validUntil must be after issuedAt and covered by the Insight assessment.'
      );
    }
    if (
      assessment.constraints.validUntil != null &&
      validUntil! > assessment.constraints.validUntil
    ) {
      throw new ReceiptConfigurationError(
        'PriorSeal authorization cannot outlive the signed Insight assessment.'
      );
    }

    const authorizationNonce =
      priorSeal.authorizationNonce ?? generatePriorSealAuthorizationNonce();
    const intent = buildPriorSealExactCallIntent({
      transaction,
      intentId: priorSeal.intentId ?? `insight:${authorizationNonce.slice(2, 34)}`,
      sourceAssetId: evidence.sourceAssetId,
      validUntil: validUntil!,
      minConfirmations: priorSeal.confirmations,
      contextCommitments: [assessment.contextCommitment!],
    });
    const preparedAuthorization = await priorSeal.client.prepareAuthorization(
      {
        intent,
        principal: priorSeal.principal,
        authorizer: { type: 'eip712', address: priorSeal.principal.account },
        delegate: { agentId: priorSeal.agentId, executor: intent.sender },
        issuedAt,
        notBefore: issuedAt,
        expiresAt: validUntil!,
        authorizationNonce,
        maxUses: '1',
        audience: priorSeal.audience ?? 'priorseal',
      },
      priorSeal.signal
    );
    const signature = await priorSeal.signAuthorization(preparedAuthorization);
    if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
      throw new ReceiptConfigurationError('PriorSeal signer returned no hex signature.');
    }
    const priorSealAuthorization = await priorSeal.client.acceptAuthorization(
      { ...preparedAuthorization.authorization, signature },
      priorSeal.signal
    );
    assertAuthorizationMatchesAssessment(priorSealAuthorization, assessment, transaction);
    return { assessment, transaction, priorSealAuthorization };
  }

  /** Observe an externally submitted transaction and derive a joint, non-authoritative report. */
  async verifyAssessedSwapExecution(
    request: AssessedSwapExecutionVerificationRequest
  ): Promise<AssessedSwapExecutionVerificationResult> {
    const evidence = requireAssessmentEvidence(request.assessment);
    if (!/^0x[0-9a-fA-F]{64}$/.test(request.txHash)) {
      throw new ReceiptConfigurationError('txHash must be 32-byte hex.');
    }
    assertAuthorizationMatchesAssessment(
      request.priorSealAuthorization,
      request.assessment,
      request.transaction
    );

    const [insightResult, priorSealResult] = await Promise.allSettled([
      this.client.issueExecutionReceipt(
        { ...evidence, txHash: request.txHash, taker: request.taker },
        request.priorSeal.signal
      ),
      request.priorSeal.client.observeExecution(
        {
          authorizationId: request.priorSealAuthorization.authorization.authorizationId,
          chainId: request.transaction.chainId,
          txHash: request.txHash,
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
    return {
      insightReceipt,
      priorSealEvidence,
      evidenceErrors,
      report: buildJointAssuranceReport(request.assessment, insightReceipt, priorSealEvidence),
    };
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
    const insightContextCommitment = buildInsightPriorSealContextCommitment({
      sourceAttestation: gated.receiptDraft.preTradeAttestations!.source,
      destinationAttestation: gated.receiptDraft.preTradeAttestations!.destination,
      maxSlippageBps: gated.receiptDraft.maxSlippageBps,
    });
    const intent = buildPriorSealExactCallIntent({
      transaction: preparedTransaction,
      intentId: request.priorSeal.intentId ?? `insight:${authorizationNonce.slice(2, 34)}`,
      sourceAssetId: gated.receiptDraft.sourceAssetId,
      validUntil,
      minConfirmations: request.priorSeal.confirmations,
      contextCommitments: [insightContextCommitment],
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
    const priorSealPending = Boolean(
      priorSealEvidence &&
      (['PENDING', 'NOT_FOUND', 'RPC_ERROR', 'RPC_TIMEOUT'].includes(
        priorSealEvidence.observation.status
      ) ||
        (priorSealEvidence.observationJob &&
          !['COMPLETED', 'UNDETERMINED', 'FAILED'].includes(
            priorSealEvidence.observationJob.state
          )))
    );
    const evidenceStatus =
      insightReceipt && priorSealEvidence?.receipt && !priorSealPending
        ? 'COMPLETE'
        : priorSealPending
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
        this.haltedTargets.add(key);
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

function recommendationFor(
  source: PreTradeResult | null,
  destination: PreTradeResult | null,
  watchHalted: boolean,
  bindingInvalid: boolean
): TransactionRecommendation {
  if (!source || !destination || bindingInvalid) return 'UNASSESSABLE';
  if (watchHalted || source.verdict === 'BLOCK' || destination.verdict === 'BLOCK') {
    return 'NOT_RECOMMENDED';
  }
  if (source.verdict === 'DANGER' || destination.verdict === 'DANGER') {
    return 'REVIEW_REQUIRED';
  }
  if (source.verdict === 'CAUTION' || destination.verdict === 'CAUTION') {
    return 'CONDITIONALLY_RECOMMENDED';
  }
  return source.verdict === 'PASS' && destination.verdict === 'PASS'
    ? 'RECOMMENDED'
    : 'UNASSESSABLE';
}

function assessmentReasonCodes(
  source: PreTradeResult | null,
  destination: PreTradeResult | null,
  watchHalted: boolean,
  errors: { source?: unknown; destination?: unknown },
  bindingError?: unknown
): string[] {
  const codes: string[] = [];
  if (watchHalted) codes.push('WATCH_HALT');
  if (source && source.verdict !== 'PASS') codes.push(`SOURCE_${source.verdict}`);
  if (destination && destination.verdict !== 'PASS') {
    codes.push(`DESTINATION_${destination.verdict}`);
  }
  if (errors.source) codes.push('SOURCE_ASSESSMENT_UNAVAILABLE');
  if (errors.destination) codes.push('DESTINATION_ASSESSMENT_UNAVAILABLE');
  if (bindingError) codes.push('EVIDENCE_BINDING_INVALID');
  return [...new Set(codes)];
}

function minimumPositive(values: number[]): number | null {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0);
  return positive.length ? Math.min(...positive) : null;
}

function requireAssessmentEvidence(
  assessment: SwapAssessment
): Omit<ExecutionReceiptRequest, 'txHash' | 'taker'> {
  if (
    assessment.schema !== 'insight.swap-assessment.v1' ||
    !assessment.receiptDraft ||
    !assessment.contextCommitment
  ) {
    throw new ReceiptConfigurationError(
      'The assessment has no complete signed evidence to bind or verify.'
    );
  }
  if (!assessment.sourcePreTrade || !assessment.destinationPreTrade) {
    throw new ReceiptConfigurationError(
      'The assessment is missing its source or destination result.'
    );
  }
  const sourceAttestation = requireV2Proof(assessment.sourcePreTrade, 'source');
  const destinationAttestation = requireV2Proof(assessment.destinationPreTrade, 'destination');
  const expectedValidUntil = minimumPositive([
    number(sourceAttestation.data.validUntil),
    number(destinationAttestation.data.validUntil),
  ]);
  if (assessment.constraints.validUntil !== expectedValidUntil) {
    throw new ReceiptConfigurationError(
      'The assessment validity is inconsistent with its signed evidence.'
    );
  }
  if (
    assessment.receiptDraft.preTradeUid !== sourceAttestation.uid ||
    assessment.receiptDraft.destinationPreTradeUid !== destinationAttestation.uid ||
    assessment.receiptDraft.requestHash !== text(sourceAttestation.data.requestHash) ||
    assessment.receiptDraft.sourceAssetId !== text(sourceAttestation.data.sourceAssetId) ||
    assessment.receiptDraft.destinationAssetId !== text(sourceAttestation.data.destinationAssetId)
  ) {
    throw new ReceiptConfigurationError(
      'The assessment receipt draft is inconsistent with its signed evidence.'
    );
  }
  const expectedRecommendation = recommendationFor(
    assessment.sourcePreTrade,
    assessment.destinationPreTrade,
    assessment.watchHalted,
    false
  );
  if (assessment.recommendation !== expectedRecommendation) {
    throw new ReceiptConfigurationError(
      'The assessment recommendation is inconsistent with its underlying evidence.'
    );
  }
  const expectedCommitment = buildInsightPriorSealContextCommitment({
    sourceAttestation,
    destinationAttestation,
    maxSlippageBps: assessment.receiptDraft.maxSlippageBps,
  });
  if (
    expectedCommitment.namespace !== assessment.contextCommitment.namespace ||
    expectedCommitment.algorithm !== assessment.contextCommitment.algorithm ||
    expectedCommitment.digest.toLowerCase() !== assessment.contextCommitment.digest.toLowerCase()
  ) {
    throw new ReceiptConfigurationError(
      'The assessment context commitment is inconsistent with its signed evidence.'
    );
  }
  return assessment.receiptDraft;
}

function assertAuthorizationMatchesAssessment(
  accepted: PriorSealAcceptedAuthorization,
  assessment: SwapAssessment,
  transaction: PreparedExactCallTransaction
): void {
  const evidence = requireAssessmentEvidence(assessment);
  const actual = accepted.authorization?.intent;
  if (!actual) throw new ReceiptConfigurationError('PriorSeal returned no authorized intent.');
  const expected = buildPriorSealExactCallIntent({
    transaction,
    intentId: actual.intentId,
    sourceAssetId: evidence.sourceAssetId,
    validUntil: actual.validUntil,
    minConfirmations: actual.constraints?.minConfirmations,
    contextCommitments: [assessment.contextCommitment!],
  });
  const fields: Array<keyof typeof expected> = [
    'schema',
    'executionProfile',
    'intentId',
    'chainId',
    'action',
    'asset',
    'amount',
    'sender',
    'recipient',
    'validUntil',
    'nonce',
    'callTarget',
    'calldataHash',
    'transactionValue',
  ];
  const mismatch = fields.find((field) =>
    typeof expected[field] === 'string'
      ? String(expected[field]).toLowerCase() !== String(actual[field]).toLowerCase()
      : expected[field] !== actual[field]
  );
  const commitmentMatched = actual.contextCommitments?.some(
    (entry) =>
      entry.namespace === assessment.contextCommitment!.namespace &&
      entry.algorithm === assessment.contextCommitment!.algorithm &&
      entry.digest.toLowerCase() === assessment.contextCommitment!.digest.toLowerCase()
  );
  if (mismatch || !commitmentMatched) {
    throw new ReceiptConfigurationError(
      mismatch
        ? `PriorSeal authorization does not match the assessed transaction field: ${mismatch}.`
        : 'PriorSeal authorization does not contain the Insight assessment commitment.'
    );
  }
}

function buildJointAssuranceReport(
  assessment: SwapAssessment,
  insightReceipt: ExecutionReceiptResult | null,
  priorSealEvidence: PriorSealObservationResult | null
): AssessedSwapExecutionVerificationResult['report'] {
  const pending = isPriorSealPending(priorSealEvidence);
  const evidenceStatus = jointEvidenceStatus(insightReceipt, priorSealEvidence, pending);
  const compliance = priorSealEvidence?.receipt?.compliance?.status ?? null;
  const priorSealReceiptValid = priorSealEvidence?.receipt
    ? (priorSealEvidence.verification?.valid ?? null)
    : null;
  const exactCallMatched = exactCallMatch(priorSealEvidence, priorSealReceiptValid, compliance);
  const constraintsSatisfied = insightConstraintsSatisfied(insightReceipt);
  const executionFinal = ['CONFIRMED', 'REVERTED'].includes(
    priorSealEvidence?.observation.status ?? ''
  );
  const recommendationFollowed = followedRecommendation(assessment.recommendation, executionFinal);
  const reasonCodes = [...assessment.reasonCodes];
  if (priorSealReceiptValid === false) reasonCodes.push('PRIORSEAL_RECEIPT_INVALID');
  if (compliance === 'NON_COMPLIANT') reasonCodes.push('PRIORSEAL_NON_COMPLIANT');
  if (constraintsSatisfied === false) reasonCodes.push('INSIGHT_CONSTRAINTS_NOT_SATISFIED');
  if (evidenceStatus === 'PARTIAL') reasonCodes.push('EVIDENCE_PARTIAL');
  if (evidenceStatus === 'UNAVAILABLE') reasonCodes.push('EVIDENCE_UNAVAILABLE');

  const conclusion = jointConclusion({
    pending,
    evidenceStatus,
    priorSealReceiptValid,
    exactCallMatched,
    constraintsSatisfied,
    recommendationFollowed,
  });

  return {
    schema: 'insight.priorseal-assurance-report.v1',
    recommendation: assessment.recommendation,
    recommendationFollowed,
    evidenceStatus,
    insightExecutionStatus: insightReceipt?.executionStatus ?? null,
    priorSealReceiptValid,
    priorSealComplianceStatus: compliance,
    exactCallMatched,
    constraintsSatisfied,
    conclusion,
    reasonCodes: [...new Set(reasonCodes)],
  };
}

function isPriorSealPending(evidence: PriorSealObservationResult | null): boolean {
  if (!evidence) return false;
  if (['PENDING', 'NOT_FOUND', 'RPC_ERROR', 'RPC_TIMEOUT'].includes(evidence.observation.status)) {
    return true;
  }
  return Boolean(
    evidence.observationJob &&
    !['COMPLETED', 'UNDETERMINED', 'FAILED'].includes(evidence.observationJob.state)
  );
}

function jointEvidenceStatus(
  insightReceipt: ExecutionReceiptResult | null,
  priorSealEvidence: PriorSealObservationResult | null,
  pending: boolean
): AssessedSwapExecutionVerificationResult['report']['evidenceStatus'] {
  if (pending) return 'PRIORSEAL_PENDING';
  if (
    insightReceipt?.bindingMode === 'VERIFIED' &&
    priorSealEvidence?.receipt &&
    priorSealEvidence.verification?.valid === true
  ) {
    return 'COMPLETE';
  }
  return insightReceipt || priorSealEvidence?.receipt ? 'PARTIAL' : 'UNAVAILABLE';
}

function exactCallMatch(
  evidence: PriorSealObservationResult | null,
  receiptValid: boolean | null,
  compliance: string | null
): boolean | null {
  if (receiptValid === false || compliance === 'NON_COMPLIANT') return false;
  if (compliance === 'COMPLIANT') return true;
  return typeof evidence?.receipt?.binding?.bound === 'boolean'
    ? evidence.receipt.binding.bound
    : null;
}

function insightConstraintsSatisfied(receipt: ExecutionReceiptResult | null): boolean | null {
  if (receipt?.executionStatus === 'FAITHFUL') return true;
  if (receipt?.executionStatus === 'DEVIATED') return false;
  return null;
}

function followedRecommendation(
  recommendation: TransactionRecommendation,
  executionFinal: boolean
): boolean | null {
  if (!executionFinal) return null;
  if (recommendation === 'NOT_RECOMMENDED') return false;
  if (['RECOMMENDED', 'CONDITIONALLY_RECOMMENDED'].includes(recommendation)) return true;
  return null;
}

function jointConclusion(input: {
  pending: boolean;
  evidenceStatus: AssessedSwapExecutionVerificationResult['report']['evidenceStatus'];
  priorSealReceiptValid: boolean | null;
  exactCallMatched: boolean | null;
  constraintsSatisfied: boolean | null;
  recommendationFollowed: boolean | null;
}): AssessedSwapExecutionVerificationResult['report']['conclusion'] {
  if (input.pending) return 'EXECUTION_PENDING';
  if (input.evidenceStatus === 'PARTIAL') return 'PARTIAL_EVIDENCE';
  if (input.evidenceStatus === 'UNAVAILABLE') return 'UNASSESSABLE';
  if (input.priorSealReceiptValid === false || input.exactCallMatched === false) {
    return 'AUTHORIZATION_MISMATCH';
  }
  if (input.constraintsSatisfied === false) return 'EXECUTED_OUTSIDE_ASSESSED_CONSTRAINTS';
  if (input.recommendationFollowed === false) return 'EXECUTED_AGAINST_RECOMMENDATION';
  if (input.exactCallMatched === true && input.constraintsSatisfied === true) {
    return 'EXECUTED_AS_ASSESSED_AND_AUTHORIZED';
  }
  return 'UNASSESSABLE';
}

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
