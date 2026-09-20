import { InsightClient } from './client';
import { verifyCoverageReport, type SignedCoverageReport } from './coverage';
import { diagnosePreTrade, evaluateFreshness, validateFreshnessProfile } from './diagnostics';
import { InsightApiError, ReceiptConfigurationError, TradeBlockedError } from './errors';
import {
  buildInsightPriorSealContextCommitment,
  buildPriorSealExactCallIntent,
  generatePriorSealAuthorizationNonce,
  PriorSealBridgeError,
} from './priorseal';
import { createWatch } from './watch';

import type {
  FreshnessProfile,
  RefreshedSwapAssessment,
  JointEvidenceCheckpoint,
  JointEvidenceError,
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

const BLOCKED_BY_DEFAULT = new Set(['DANGER', 'BLOCK']);

/**
 * The agent-facing workflow layer. It deliberately does not contain Insight's
 * risk engine: every decision, attestation and receipt is issued by the API.
 */
export class InsightGuard {
  readonly client: InsightClient;
  private readonly blockedVerdicts: ReadonlySet<string>;
  private readonly blockOnWatchHalt: boolean;
  private readonly freshness: FreshnessProfile;
  private readonly coverage: GuardOptions['coverage'];
  private readonly haltedTargets = new Set<string>();
  private readonly watchHandles = new Map<string, WatchHandle>();
  private readonly watchGenerations = new Map<string, symbol>();
  private readonly watchStateWrites = new Map<string, Promise<void>>();

  constructor(options: GuardOptions) {
    this.client = new InsightClient(options);
    this.coverage = options.coverage ? JSON.parse(JSON.stringify(options.coverage)) : undefined;
    this.freshness = options.freshness ?? {};
    validateFreshnessProfile(this.freshness);
    this.blockedVerdicts = new Set(options.policy?.blockedPreTradeVerdicts ?? BLOCKED_BY_DEFAULT);
    this.blockOnWatchHalt = options.policy?.blockOnWatchHalt ?? true;
  }

  async check(request: PreTradeRequest, signal?: AbortSignal): Promise<GuardDecision> {
    const result = await this.client.preTrade(request, signal);
    return {
      allowed:
        isExecutionAuthorised(result.verdict) &&
        !this.blockedVerdicts.has(result.verdict) &&
        evaluateFreshness(result, this.freshness).satisfied &&
        requestedScopeAvailable(result) &&
        protocolScopeAvailable(result, request),
      result,
    };
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
   * This performs two C3 Pre-Trade calls and does not issue a C4 Execution Receipt.
   * receiptDraft is an unsigned request template, not an issued receipt.
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
    const errors = {
      ...(sourceResult.status === 'rejected' ? { source: evidenceError(sourceResult.reason) } : {}),
      ...(destinationResult.status === 'rejected'
        ? { destination: evidenceError(destinationResult.reason) }
        : {}),
    };

    return this.assessmentFromResults(request, sourcePreTrade, destinationPreTrade, errors);
  }

  private assessmentFromResults(
    request: SwapAssessmentRequest,
    sourcePreTrade: PreTradeResult | null,
    destinationPreTrade: PreTradeResult | null,
    errors: {
      source?: JointEvidenceError;
      destination?: JointEvidenceError;
      binding?: JointEvidenceError;
    } = {}
  ): SwapAssessment {
    const watchHalted = Boolean(request.watchTarget && this.isHalted(request.watchTarget));
    const profile = { ...this.freshness, ...request.freshness };
    const freshness = {
      source: sourcePreTrade ? evaluateFreshness(sourcePreTrade, profile) : null,
      destination: destinationPreTrade ? evaluateFreshness(destinationPreTrade, profile) : null,
    };
    let receiptDraft: Omit<ExecutionReceiptRequest, 'txHash' | 'taker'> | null = null;
    let bindingError: JointEvidenceError | undefined = errors.binding;
    if (
      (sourcePreTrade && !requestedScopeAvailable(sourcePreTrade)) ||
      (destinationPreTrade && !requestedScopeAvailable(destinationPreTrade))
    )
      bindingError = {
        code: 'REQUESTED_DIMENSIONS_UNASSESSED',
        message:
          'A requested assessment dimension lacks evidence; the original verdict does not cover the missing dimension.',
      };
    if (
      (sourcePreTrade && !protocolScopeAvailable(sourcePreTrade, request.source)) ||
      (destinationPreTrade && !protocolScopeAvailable(destinationPreTrade, request.destination))
    )
      bindingError = {
        code: 'REQUESTED_PROTOCOL_UNASSESSED',
        message:
          'The explicitly requested protocol dimension was not evaluated; a general oracle verdict does not cover it.',
      };
    if (sourcePreTrade && destinationPreTrade && !bindingError) {
      try {
        assertPairFreshness(sourcePreTrade, destinationPreTrade, profile);
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
      diagnostics: [
        ...diagnosePreTrade(sourcePreTrade, 'source', errors.source, freshness.source),
        ...diagnosePreTrade(
          destinationPreTrade,
          'destination',
          errors.destination,
          freshness.destination
        ),
        ...(bindingError
          ? [
              {
                side: 'workflow' as const,
                category: 'binding' as const,
                code: bindingError.code ?? 'EVIDENCE_BINDING_INVALID',
                message: bindingError.message,
                action: 'review' as const,
                origin: 'local_policy' as const,
              },
            ]
          : []),
      ],
      freshness,
      freshnessProfile: profile,
      recommendation,
      reasonCodes,
      sourcePreTrade,
      destinationPreTrade,
      watchHalted,
      constraints: {
        maxSlippageBps: request.receipt.maxSlippageBps ?? 50,
        recommendedMaxPositionUsd: minimumKnownNonNegative([
          sourcePreTrade?.recommendedMaxPositionUsd,
          destinationPreTrade?.recommendedMaxPositionUsd,
        ]),
        validUntil,
      },
      contextCommitment,
      receiptDraft,
      errors: { ...errors, ...(bindingError ? { binding: bindingError } : {}) },
    };
  }

  /** Re-runs the same trade and retains the old proofs untouched. Never signs or broadcasts. */
  async refreshAssessment(
    assessment: SwapAssessment,
    request: SwapAssessmentRequest,
    signal?: AbortSignal
  ): Promise<RefreshedSwapAssessment> {
    const recheck = (old: PreTradeResult | null, input: PreTradeRequest) => {
      if (!old?.attestation || ![2, 3].includes(old.attestation.schemaVersion))
        return Promise.reject(
          new ReceiptConfigurationError('Refresh requires the original v2/v3 proof.')
        );
      return this.client.recheck(
        {
          ...input,
          schemaVersion: old.attestation.schemaVersion as 2 | 3,
          originalUid: old.attestation.uid,
          originalRequestHash: String(old.attestation.data.requestHash) as `0x${string}`,
          originalConsensusPrice: old.consensusPrice,
        },
        signal
      );
    };
    const [source, destination] = await Promise.allSettled([
      recheck(assessment.sourcePreTrade, request.source),
      recheck(assessment.destinationPreTrade, request.destination),
    ]);
    const sourceRecheck = source.status === 'fulfilled' ? source.value : null;
    const destinationRecheck = destination.status === 'fulfilled' ? destination.value : null;
    const signalValidity =
      sourceRecheck?.stillValid === true && destinationRecheck?.stillValid === true;
    const proofs =
      Number(Boolean(sourceRecheck?.recheck)) + Number(Boolean(destinationRecheck?.recheck));
    const next = this.assessmentFromResults(request, sourceRecheck, destinationRecheck, {
      ...(source.status === 'rejected' ? { source: evidenceError(source.reason) } : {}),
      ...(destination.status === 'rejected'
        ? { destination: evidenceError(destination.reason) }
        : {}),
      ...(!signalValidity || proofs !== 2
        ? {
            binding: {
              code: !signalValidity ? 'RECHECK_SIGNAL_INVALID' : 'RECHECK_PROOF_UNAVAILABLE',
              message:
                'Refreshed continuity must be valid and both portable recheck proofs available before authorization.',
            },
          }
        : {}),
    });
    const changedFields = [
      'recommendation',
      'contextCommitment',
      'constraints',
      'sourcePreTrade',
      'destinationPreTrade',
    ].filter(
      (key) =>
        canonicalJson(assessment[key as keyof SwapAssessment]) !==
        canonicalJson(next[key as keyof SwapAssessment])
    );
    return {
      assessment: next,
      sourceRecheck,
      destinationRecheck,
      signalValidity,
      proofAvailability: proofs === 2 ? 'COMPLETE' : proofs === 1 ? 'PARTIAL' : 'UNAVAILABLE',
      changedFields,
      requiresReauthorization:
        canonicalJson(assessment.contextCommitment) !== canonicalJson(next.contextCommitment) ||
        changedFields.length > 0,
    };
  }

  /** Bind an advisory assessment to an exact call. This method never broadcasts a transaction. */
  async authorizeAssessedSwap(
    request: AssessedSwapAuthorizationRequest
  ): Promise<AssessedSwapAuthorizationResult> {
    const { assessment, transaction, priorSeal } = request;
    const evidence = requireAssessmentEvidence(assessment);
    assertPairFreshness(assessment.sourcePreTrade!, assessment.destinationPreTrade!, {
      ...this.freshness,
      ...assessment.freshnessProfile,
    });
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
        authorizer: {
          type: priorSeal.authorizer?.type ?? 'eip712',
          address: priorSeal.authorizer?.address ?? priorSeal.principal.account,
        },
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
    assertPairFreshness(assessment.sourcePreTrade!, assessment.destinationPreTrade!, {
      ...this.freshness,
      ...assessment.freshnessProfile,
    });
    const signature = await priorSeal.signAuthorization(preparedAuthorization);
    if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
      throw new ReceiptConfigurationError('PriorSeal signer returned no hex signature.');
    }
    assertPairFreshness(
      assessment.sourcePreTrade!,
      assessment.destinationPreTrade!,
      { ...this.freshness, ...assessment.freshnessProfile },
      preparedAuthorization.authorization
    );
    const signedAuthorization = { ...preparedAuthorization.authorization, signature };
    const priorSealAuthorization = await priorSeal.client.acceptAuthorization(
      signedAuthorization,
      priorSeal.signal
    );
    assertAcceptedAuthorizationMatchesPresented(priorSealAuthorization, signedAuthorization);
    assertAuthorizationMatchesAssessment(priorSealAuthorization, assessment, transaction);
    assertPairFreshness(
      assessment.sourcePreTrade!,
      assessment.destinationPreTrade!,
      { ...this.freshness, ...assessment.freshnessProfile },
      priorSealAuthorization.authorization
    );
    return { assessment, transaction, priorSealAuthorization };
  }

  /** Observe an externally submitted transaction and derive a joint, non-authoritative report. */
  async verifyAssessedSwapExecution(
    request: AssessedSwapExecutionVerificationRequest
  ): Promise<AssessedSwapExecutionVerificationResult> {
    return this.resumeAssessedSwapExecution(
      {
        schema: 'insight.joint-evidence-checkpoint.v1',
        assessment: request.assessment,
        transaction: jsonSafe(request.transaction),
        priorSealAuthorization: request.priorSealAuthorization,
        txHash: request.txHash,
        taker: request.taker,
        confirmations: request.priorSeal.confirmations,
        insightReceipt: null,
        priorSealEvidence: null,
      },
      request.priorSeal
    );
  }

  /** Evidence-only recovery: no transaction, signing, or already completed issuance is repeated. */
  async resumeAssessedSwapExecution(
    checkpoint: JointEvidenceCheckpoint,
    priorSeal: AssessedSwapExecutionVerificationRequest['priorSeal']
  ): Promise<AssessedSwapExecutionVerificationResult> {
    if (
      checkpoint.schema !== 'insight.joint-evidence-checkpoint.v1' ||
      !/^0x[0-9a-fA-F]{64}$/.test(checkpoint.txHash)
    )
      throw new ReceiptConfigurationError('Invalid joint evidence checkpoint.');
    const evidence = requireAssessmentEvidence(checkpoint.assessment, true);
    assertAuthorizationMatchesAssessment(
      checkpoint.priorSealAuthorization,
      checkpoint.assessment,
      checkpoint.transaction,
      true
    );
    if (
      correlateTransactionHashes(
        checkpoint.txHash,
        checkpoint.insightReceipt,
        checkpoint.priorSealEvidence
      ) === false
    )
      throw new ReceiptConfigurationError(
        'Checkpoint contains evidence for a different transaction.'
      );
    const priorEvidence = checkpoint.priorSealEvidence;
    const observe = async (): Promise<PriorSealObservationResult> => {
      if (priorEvidence?.receipt) return priorEvidence;
      if (priorEvidence?.observationJob) {
        if (['COMPLETED', 'UNDETERMINED', 'FAILED'].includes(priorEvidence.observationJob.state))
          return priorEvidence;
        if (!priorSeal.client.getObservationJob)
          throw new PriorSealBridgeError(
            'Resume requires getObservationJob; the existing job must not be re-issued.',
            { code: 'JOB_QUERY_UNAVAILABLE', jobId: priorEvidence.observationJob.jobId }
          );
        const job = await priorSeal.client.getObservationJob(
          priorEvidence.observationJob.jobId,
          priorSeal.signal
        );
        return {
          ...(job.result ?? priorEvidence),
          observation: job.result?.observation ?? job.observation ?? priorEvidence.observation,
          observationJob: job,
        };
      }
      return priorSeal.client.observeExecution(
        {
          authorizationId: checkpoint.priorSealAuthorization.authorization.authorizationId,
          chainId: checkpoint.transaction.chainId,
          txHash: checkpoint.txHash,
          confirmations: checkpoint.confirmations,
        },
        priorSeal.signal
      );
    };
    const [insightResult, priorSealResult] = await Promise.allSettled([
      checkpoint.insightReceipt
        ? Promise.resolve(checkpoint.insightReceipt)
        : this.client.issueExecutionReceipt(
            { ...evidence, txHash: checkpoint.txHash, taker: checkpoint.taker },
            priorSeal.signal
          ),
      observe(),
    ]);
    const insightReceipt =
      insightResult.status === 'fulfilled' ? insightResult.value : checkpoint.insightReceipt;
    const priorSealEvidence =
      priorSealResult.status === 'fulfilled' ? priorSealResult.value : checkpoint.priorSealEvidence;
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
      report: buildJointAssuranceReport(
        checkpoint.assessment,
        checkpoint.txHash,
        insightReceipt,
        priorSealEvidence
      ),
      checkpoint: jsonSafe({ ...checkpoint, insightReceipt, priorSealEvidence }),
    };
  }

  /**
   * Full two-sided swap workflow: pre-trade gates, submit only when both pass,
   * then create a VERIFIED execution receipt from the two signed gate proofs.
   */
  async executeSwap(request: GuardedSwapRequest): Promise<GuardedSwapResult> {
    const gated = await this.evaluateSwapGates(request);
    if (!gated.ready) return gated.result;

    const coverage = await this.collectSwapCoverage(request);
    await this.checkSwapCoverage(coverage);

    assertPairFreshness(gated.sourcePreTrade, gated.destinationPreTrade, {
      ...this.freshness,
      ...request.freshness,
    });
    if (this.blockOnWatchHalt && request.watchTarget && this.isHalted(request.watchTarget))
      return {
        status: 'blocked',
        stage: 'watch_halt',
        sourcePreTrade: gated.sourcePreTrade,
        destinationPreTrade: gated.destinationPreTrade,
      };
    const transaction = await request.submitTransaction({
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
    });
    if (!transaction.txHash)
      throw new ReceiptConfigurationError('submitTransaction returned no txHash.');

    const receiptRequest: ExecutionReceiptRequest = {
      ...gated.receiptDraft,
      txHash: transaction.txHash,
      taker: transaction.taker,
    };

    let receipt: ExecutionReceiptResult;
    try {
      receipt = await this.client.issueExecutionReceipt(receiptRequest);
    } catch (error) {
      // The transaction is already broadcast. Never reject the whole workflow:
      // callers commonly retry rejected operations, which could submit a
      // duplicate trade. Return the exact receipt request for evidence-only
      // recovery instead.
      return {
        status: 'executed_receipt_pending',
        ...(coverage.length ? { coverageReports: coverage } : {}),
        sourcePreTrade: gated.sourcePreTrade,
        destinationPreTrade: gated.destinationPreTrade,
        transaction,
        receiptRequest,
        evidenceError: evidenceError(error),
      };
    }

    return {
      status: 'executed',
      sourcePreTrade: gated.sourcePreTrade,
      ...(coverage.length ? { coverageReports: coverage } : {}),
      destinationPreTrade: gated.destinationPreTrade,
      transaction,
      receipt,
    };
  }

  /** Retry evidence issuance for an already-broadcast swap without resubmitting it. */
  async retryExecutionReceipt(
    receiptRequest: ExecutionReceiptRequest,
    signal?: AbortSignal
  ): Promise<ExecutionReceiptResult> {
    return this.client.issueExecutionReceipt(receiptRequest, signal);
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

    const coverage = await this.collectSwapCoverage(request);

    const preparedTransaction = await request.prepareTransaction({
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
    });
    await this.checkSwapCoverage(coverage);
    if (preparedTransaction.chainId !== request.receipt.settlementChainId) {
      throw new ReceiptConfigurationError(
        'Prepared transaction and Insight receipt must use the same settlement chain.'
      );
    }

    const issuedAt = request.priorSeal.issuedAt ?? Math.floor(Date.now() / 1000);
    const signedGateValidUntil = Math.min(
      number(gated.sourcePreTrade.attestation?.data.validUntil),
      number(gated.destinationPreTrade.attestation?.data.validUntil)
    );
    const validUntil = Math.min(
      request.priorSeal.validUntil ?? signedGateValidUntil,
      ...coverage.map((p) => p.report.validUntil)
    );
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
      contextCommitments: [
        insightContextCommitment,
        ...coverage.map((p, index) => ({
          namespace: `insight.coverage.${index === 0 ? 'source' : 'destination'}.v1`,
          algorithm: 'keccak256' as const,
          digest: p.digest as `0x${string}`,
        })),
      ],
    });
    const preparedAuthorization = await request.priorSeal.client.prepareAuthorization(
      {
        intent,
        principal: request.priorSeal.principal,
        authorizer: {
          type: request.priorSeal.authorizer?.type ?? 'eip712',
          address: request.priorSeal.authorizer?.address ?? request.priorSeal.principal.account,
        },
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
    assertPairFreshness(gated.sourcePreTrade, gated.destinationPreTrade, {
      ...this.freshness,
      ...request.freshness,
    });
    await this.checkSwapCoverage(coverage, preparedAuthorization.authorization.intent);
    const signature = await request.priorSeal.signAuthorization(preparedAuthorization);
    if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
      throw new ReceiptConfigurationError('PriorSeal signer returned no hex signature.');
    }
    assertPairFreshness(
      gated.sourcePreTrade,
      gated.destinationPreTrade,
      { ...this.freshness, ...request.freshness },
      preparedAuthorization.authorization
    );
    const signedAuthorization = { ...preparedAuthorization.authorization, signature };
    const priorSealAuthorization = await request.priorSeal.client.acceptAuthorization(
      signedAuthorization,
      request.priorSeal.signal
    );
    assertAcceptedAuthorizationMatchesPresented(priorSealAuthorization, signedAuthorization);
    const assessment = this.assessmentFromResults(
      request,
      gated.sourcePreTrade,
      gated.destinationPreTrade
    );
    assertAuthorizationMatchesAssessment(priorSealAuthorization, assessment, preparedTransaction);
    assertPairFreshness(
      gated.sourcePreTrade,
      gated.destinationPreTrade,
      { ...this.freshness, ...request.freshness },
      priorSealAuthorization.authorization
    );

    if (this.blockOnWatchHalt && request.watchTarget && this.isHalted(request.watchTarget))
      return {
        status: 'blocked',
        stage: 'watch_halt',
        sourcePreTrade: gated.sourcePreTrade,
        destinationPreTrade: gated.destinationPreTrade,
      };
    await this.checkSwapCoverage(coverage, priorSealAuthorization.authorization.intent);
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
    const priorSealPending = isPriorSealPending(priorSealEvidence);
    const evidenceAvailability = evidenceAvailabilityFor(insightReceipt, priorSealEvidence);
    const transactionCorrelation = correlateTransactionHashes(
      transaction.txHash,
      insightReceipt,
      priorSealEvidence
    );
    const assuranceValid =
      insightReceipt && priorSealEvidence?.receipt
        ? insightReceipt.bindingMode === 'VERIFIED' &&
          priorSealEvidence.verification?.valid === true &&
          transactionCorrelation === true
        : null;
    const evidenceStatus = priorSealPending
      ? 'PRIORSEAL_PENDING'
      : assuranceValid === true
        ? 'COMPLETE'
        : evidenceAvailability === 'UNAVAILABLE'
          ? 'UNAVAILABLE'
          : 'PARTIAL';

    return {
      status: 'executed',
      checkpoint: jsonSafe({
        schema: 'insight.joint-evidence-checkpoint.v1' as const,
        ...(coverage.length ? { coverageReports: coverage } : {}),
        assessment,
        transaction: preparedTransaction,
        priorSealAuthorization,
        txHash: transaction.txHash,
        taker: transaction.taker,
        confirmations: request.priorSeal.confirmations,
        insightReceipt,
        priorSealEvidence,
      }),
      ...(coverage.length ? { coverageReports: coverage } : {}),
      verificationOrigin: 'service_response',
      independentVerificationPerformed: false,
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
      transaction,
      preparedTransaction,
      priorSealAuthorization,
      insightReceipt,
      priorSealEvidence,
      evidenceStatus,
      evidenceAvailability,
      transactionCorrelation,
      assuranceValid,
      evidenceErrors,
    };
  }

  private async collectSwapCoverage(
    request: GuardedSwapRequest | PriorSealGuardedSwapRequest
  ): Promise<SignedCoverageReport[]> {
    if (!this.coverage) return [];
    return Promise.all(
      (['source', 'destination'] as const).map(async (side) => {
        const trust = this.coverage![side];
        const leg = request[side];
        if (!trust || trust.asset !== leg.asset || trust.evidenceChainId !== leg.chainId)
          throw new ReceiptConfigurationError(
            `Coverage ${side} trust does not match the requested scope.`
          );
        return this.client.coverageAssessment({
          asset: leg.asset,
          chainId: leg.chainId,
          policyId: trust.policyId,
        });
      })
    );
  }

  private async checkSwapCoverage(
    proofs: SignedCoverageReport[],
    intent?: {
      validUntil: number;
      contextCommitments?: { namespace: string; algorithm: string; digest: string }[];
    }
  ): Promise<void> {
    if (!this.coverage) return;
    if (proofs.length !== 2)
      throw new ReceiptConfigurationError('Both coverage legs are required.');
    for (const [index, side] of (['source', 'destination'] as const).entries()) {
      const proof = proofs[index];
      const verified = await verifyCoverageReport(proof, this.coverage[side]);
      if (!verified.valid)
        throw new ReceiptConfigurationError(
          `Coverage ${side} blocked: ${verified.reasons.join(',')}`
        );
      if (intent) {
        const matching =
          intent.contextCommitments?.filter((c) => c.namespace === `insight.coverage.${side}.v1`) ??
          [];
        if (
          matching.length !== 1 ||
          matching[0].algorithm !== 'keccak256' ||
          matching[0].digest !== proof.digest ||
          intent.validUntil > proof.report.validUntil
        )
          throw new ReceiptConfigurationError(
            'Authorization does not bind the verified coverage report.'
          );
      }
    }
    if (proofs.some((p) => Math.floor(Date.now() / 1000) >= p.report.validUntil))
      throw new ReceiptConfigurationError('Coverage expired before provider entry.');
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

    assertPairFreshness(sourceDecision.result, destinationDecision.result, {
      ...this.freshness,
      ...request.freshness,
    });
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
    const generation = Symbol(key);
    this.watchGenerations.set(key, generation);
    this.watchHandles.get(key)?.stop();
    const isCurrent = () => this.watchGenerations.get(key) === generation;
    const adapter = options.stateAdapter;
    const watchOptions: WatchOptions = adapter
      ? {
          ...options,
          stateAdapter: {
            load: async (stateKey) => {
              // A previous generation's already-started write must finish before restore.
              await this.watchStateWrites.get(key)?.catch(() => undefined);
              return adapter.load(stateKey);
            },
            save: async (stateKey, state) => {
              const previous = this.watchStateWrites.get(key) ?? Promise.resolve();
              const write = previous
                .catch(() => undefined)
                .then(async () => {
                  if (isCurrent()) await adapter.save(stateKey, state);
                });
              this.watchStateWrites.set(key, write);
              await write;
            },
          },
        }
      : options;
    const handle = createWatch(
      this.client,
      target,
      watchOptions,
      (halted) => {
        if (!isCurrent()) return;
        if (halted) this.haltedTargets.add(key);
        else this.haltedTargets.delete(key);
      },
      isCurrent
    );
    this.watchHandles.set(key, handle);
    return handle;
  }

  isHalted(target: OracleWatchTarget): boolean {
    return (
      this.haltedTargets.has(targetKey(target)) ||
      this.watchHandles.get(targetKey(target))?.getState().status === 'monitor_unavailable'
    );
  }

  clearHalt(target: OracleWatchTarget): void {
    this.haltedTargets.delete(targetKey(target));
  }
}

type BlockedSwapResult = Extract<GuardedSwapResult, { status: 'blocked' }>;
type SwapGateRequest = Pick<
  GuardedSwapRequest,
  'source' | 'destination' | 'watchTarget' | 'receipt' | 'freshness'
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

function minimumPositive(values: Array<number | null | undefined>): number | null {
  if (
    values.length === 0 ||
    values.some((value) => value == null || !Number.isFinite(value) || value <= 0)
  ) {
    return null;
  }
  return Math.min(...(values as number[]));
}

function minimumKnownNonNegative(values: Array<number | null | undefined>): number | null {
  const known = values.filter(
    (value): value is number => value != null && Number.isFinite(value) && value >= 0
  );
  return known.length ? Math.min(...known) : null;
}

function requireAssessmentEvidence(
  assessment: SwapAssessment,
  allowExpired = false
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
  const sourceAttestation = requireV2Proof(assessment.sourcePreTrade, 'source', allowExpired);
  const destinationAttestation = requireV2Proof(
    assessment.destinationPreTrade,
    'destination',
    allowExpired
  );
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
  transaction: PreparedExactCallTransaction,
  allowExpired = false
): void {
  const evidence = requireAssessmentEvidence(assessment, allowExpired);
  const actual = accepted.authorization?.intent;
  if (!actual) throw new ReceiptConfigurationError('PriorSeal returned no authorized intent.');
  if (
    assessment.constraints.validUntil == null ||
    actual.validUntil > assessment.constraints.validUntil
  ) {
    throw new ReceiptConfigurationError(
      'PriorSeal authorization outlives the signed Insight assessment.'
    );
  }
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
  const insightCommitments =
    actual.contextCommitments?.filter(
      (entry) => entry.namespace === assessment.contextCommitment!.namespace
    ) ?? [];
  const commitmentMatched = insightCommitments.some(
    (entry) =>
      entry.algorithm === assessment.contextCommitment!.algorithm &&
      entry.digest.toLowerCase() === assessment.contextCommitment!.digest.toLowerCase()
  );
  if (mismatch || insightCommitments.length !== 1 || !commitmentMatched) {
    throw new ReceiptConfigurationError(
      mismatch
        ? `PriorSeal authorization does not match the assessed transaction field: ${mismatch}.`
        : 'PriorSeal authorization does not contain the Insight assessment commitment.'
    );
  }
}

function assertAcceptedAuthorizationMatchesPresented(
  accepted: PriorSealAcceptedAuthorization,
  presented: PriorSealAcceptedAuthorization['authorization']
): void {
  if (accepted.acceptance?.status !== 'ACCEPTED') {
    throw new ReceiptConfigurationError('PriorSeal returned no accepted authorization evidence.');
  }
  if (canonicalJson(accepted.authorization) !== canonicalJson(presented)) {
    throw new ReceiptConfigurationError(
      'PriorSeal accepted authorization differs from the authorization presented for signing.'
    );
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function buildJointAssuranceReport(
  assessment: SwapAssessment,
  expectedTxHash: string,
  insightReceipt: ExecutionReceiptResult | null,
  priorSealEvidence: PriorSealObservationResult | null
): AssessedSwapExecutionVerificationResult['report'] {
  const pending = isPriorSealPending(priorSealEvidence);
  const evidenceAvailability = evidenceAvailabilityFor(insightReceipt, priorSealEvidence);
  const transactionCorrelation = correlateTransactionHashes(
    expectedTxHash,
    insightReceipt,
    priorSealEvidence
  );
  const evidenceStatus = jointEvidenceStatus(
    insightReceipt,
    priorSealEvidence,
    pending,
    transactionCorrelation
  );
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
  if (priorSealEvidence?.observationJob && !priorSealEvidence.receipt && !pending)
    reasonCodes.push(`PRIORSEAL_JOB_${priorSealEvidence.observationJob.state}_WITHOUT_RECEIPT`);
  if (priorSealReceiptValid === false) reasonCodes.push('PRIORSEAL_RECEIPT_INVALID');
  if (compliance === 'NON_COMPLIANT') reasonCodes.push('PRIORSEAL_NON_COMPLIANT');
  if (constraintsSatisfied === false) reasonCodes.push('INSIGHT_CONSTRAINTS_NOT_SATISFIED');
  if (transactionCorrelation === false) reasonCodes.push('EVIDENCE_TRANSACTION_MISMATCH');
  if (evidenceStatus === 'PARTIAL') reasonCodes.push('EVIDENCE_PARTIAL');
  if (evidenceStatus === 'UNAVAILABLE') reasonCodes.push('EVIDENCE_UNAVAILABLE');
  const assuranceValid =
    evidenceAvailability === 'COMPLETE'
      ? insightReceipt?.bindingMode === 'VERIFIED' &&
        priorSealReceiptValid === true &&
        transactionCorrelation === true
      : null;

  const conclusion = jointConclusion({
    recommendation: assessment.recommendation,
    pending,
    evidenceStatus,
    priorSealReceiptValid,
    exactCallMatched,
    constraintsSatisfied,
    recommendationFollowed,
    transactionCorrelation,
  });

  return {
    schema: 'insight.priorseal-assurance-report.v1',
    verificationOrigin: 'service_response',
    independentVerificationPerformed: false,
    limitations: [
      'This report correlates artifacts and service responses; it does not independently verify signatures or signer trust.',
      'Exact-call matching does not prove output amounts, liquidity, or price execution.',
      'Historical contract-wallet state and external anchors may require separate verification.',
    ],
    recommendation: assessment.recommendation,
    recommendationFollowed,
    evidenceStatus,
    evidenceAvailability,
    expectedTxHash: normalizeTxHash(expectedTxHash) ?? expectedTxHash,
    transactionCorrelation,
    assuranceValid,
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
  // Terminal jobs retain their last observation, which can still say PENDING/RPC_ERROR.
  if (evidence.observationJob)
    return !['COMPLETED', 'UNDETERMINED', 'FAILED'].includes(evidence.observationJob.state);
  return ['PENDING', 'NOT_FOUND', 'RPC_ERROR', 'RPC_TIMEOUT'].includes(evidence.observation.status);
}

function jointEvidenceStatus(
  insightReceipt: ExecutionReceiptResult | null,
  priorSealEvidence: PriorSealObservationResult | null,
  pending: boolean,
  transactionCorrelation: boolean | null
): AssessedSwapExecutionVerificationResult['report']['evidenceStatus'] {
  if (pending) return 'PRIORSEAL_PENDING';
  if (
    insightReceipt?.bindingMode === 'VERIFIED' &&
    priorSealEvidence?.receipt &&
    priorSealEvidence.verification?.valid === true &&
    transactionCorrelation === true
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
  recommendation: TransactionRecommendation;
  pending: boolean;
  evidenceStatus: AssessedSwapExecutionVerificationResult['report']['evidenceStatus'];
  priorSealReceiptValid: boolean | null;
  exactCallMatched: boolean | null;
  constraintsSatisfied: boolean | null;
  recommendationFollowed: boolean | null;
  transactionCorrelation: boolean | null;
}): AssessedSwapExecutionVerificationResult['report']['conclusion'] {
  if (input.transactionCorrelation === false) return 'EVIDENCE_TRANSACTION_MISMATCH';
  if (input.pending) return 'EXECUTION_PENDING';
  if (input.priorSealReceiptValid === false || input.exactCallMatched === false) {
    return 'AUTHORIZATION_MISMATCH';
  }
  if (input.recommendationFollowed === false) return 'EXECUTED_AGAINST_RECOMMENDATION';
  if (input.recommendation === 'REVIEW_REQUIRED' && input.exactCallMatched === true) {
    return 'EXECUTED_WITHOUT_REQUIRED_REVIEW_EVIDENCE';
  }
  if (input.evidenceStatus === 'PARTIAL') return 'PARTIAL_EVIDENCE';
  if (input.evidenceStatus === 'UNAVAILABLE') return 'UNASSESSABLE';
  if (input.constraintsSatisfied === false) return 'EXECUTED_OUTSIDE_ASSESSED_CONSTRAINTS';
  if (
    input.exactCallMatched === true &&
    input.constraintsSatisfied === true &&
    input.recommendationFollowed === true
  ) {
    return 'EXECUTED_AS_ASSESSED_AND_AUTHORIZED';
  }
  return 'UNASSESSABLE';
}

function evidenceAvailabilityFor(
  insightReceipt: ExecutionReceiptResult | null,
  priorSealEvidence: PriorSealObservationResult | null
): 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' {
  const insightPresent = insightReceipt !== null;
  const priorSealPresent = priorSealEvidence?.receipt != null;
  if (insightPresent && priorSealPresent) return 'COMPLETE';
  return insightPresent || priorSealPresent ? 'PARTIAL' : 'UNAVAILABLE';
}

function correlateTransactionHashes(
  expectedTxHash: string,
  insightReceipt: ExecutionReceiptResult | null,
  priorSealEvidence: PriorSealObservationResult | null
): boolean | null {
  const expected = normalizeTxHash(expectedTxHash);
  if (!expected) return false;
  const hashes: Array<string | undefined> = [];
  if (insightReceipt) hashes.push(text(insightReceipt.attestation?.data?.txHash));
  if (priorSealEvidence) {
    hashes.push(text(priorSealEvidence.observation?.txHash));
    if (priorSealEvidence.receipt) hashes.push(text(priorSealEvidence.receipt.execution?.txHash));
  }
  if (hashes.length === 0) return null;
  return hashes.every((hash) => normalizeTxHash(hash) === expected);
}

function normalizeTxHash(value: unknown): string | null {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value)
    ? value.toLowerCase()
    : null;
}

function evidenceError(error: unknown): JointEvidenceError {
  if (error instanceof PriorSealBridgeError) {
    return { code: error.options.code, status: error.options.status, message: error.message };
  }
  if (error instanceof InsightApiError) {
    return { code: error.options.code, status: error.options.status, message: error.message };
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

function requireV2Proof(
  result: PreTradeResult,
  label: string,
  allowExpired = false
): SignedAttestation {
  const attestation = result.attestation;
  if (
    !attestation ||
    ![2, 3].includes(attestation.schemaVersion) ||
    typeof attestation.signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(attestation.signature)
  ) {
    throw new ReceiptConfigurationError(
      `${label} pre-trade needs a signed v2/v3 attestation for a VERIFIED execution receipt.`
    );
  }
  const signedVerdict = text(attestation.data.verdict).toUpperCase();
  if (signedVerdict !== result.verdict) {
    throw new ReceiptConfigurationError(
      `${label} pre-trade verdict does not match its signed attestation.`
    );
  }
  const checkedAt = number(attestation.data.checkedAt);
  const validUntil = number(attestation.data.validUntil);
  if (checkedAt <= 0 || validUntil < checkedAt) {
    throw new ReceiptConfigurationError(`${label} pre-trade has an invalid signed time window.`);
  }
  if (!allowExpired && validUntil <= Math.floor(Date.now() / 1000)) {
    throw new ReceiptConfigurationError(`${label} pre-trade signed evidence has expired.`);
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

function assertPairFreshness(
  source: PreTradeResult,
  destination: PreTradeResult,
  profile: FreshnessProfile,
  authorization?: PriorSealAcceptedAuthorization['authorization']
): void {
  for (const [label, result] of [
    ['source', source],
    ['destination', destination],
  ] as const) {
    requireV2Proof(result, label);
    const freshness = evaluateFreshness(result, profile);
    if (!freshness.satisfied)
      throw new ReceiptConfigurationError(
        `${label} freshness policy failed: ${freshness.reasons.join(', ')}. Refresh assessment and reauthorize changed evidence.`
      );
  }
  if (authorization) {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.min(authorization.expiresAt, authorization.intent.validUntil) - now;
    if (
      authorization.notBefore > now ||
      remaining <= 0 ||
      remaining < (profile.minimumRemainingValiditySeconds ?? 0)
    )
      throw new ReceiptConfigurationError(
        'PriorSeal authorization is not currently valid or has insufficient remaining validity.'
      );
  }
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, entry) => (typeof entry === 'bigint' ? entry.toString() : entry))
  ) as T;
}

/** Attach original proof objects without re-signing. Preserve received raw bytes separately when byte identity matters. */
export function exportReviewAttachments(
  checkpoint: JointEvidenceCheckpoint
): Array<{ id: string; role: string; profile: string; rawJson: string }> {
  const artifacts = [
    ['source', 'insight.source', checkpoint.assessment.sourcePreTrade?.attestation],
    ['destination', 'insight.destination', checkpoint.assessment.destinationPreTrade?.attestation],
    ['execution', 'insight.execution', checkpoint.insightReceipt?.attestation],
  ] as const;
  return artifacts.flatMap(([id, role, proof]) =>
    proof
      ? [
          {
            id,
            role,
            profile: `insight.${id === 'execution' ? 'execution' : 'pretrade'}.v${proof.schemaVersion}`,
            rawJson: JSON.stringify(proof),
          },
        ]
      : []
  );
}

function requestedScopeAvailable(result: PreTradeResult): boolean {
  const scope = result.assessmentScope;
  return (
    !scope ||
    scope.requestedDimensions.every(
      (dimension) =>
        scope.evaluatedDimensions.includes(dimension) &&
        !scope.unavailableDimensions.some((item) => item.dimension === dimension)
    )
  );
}

function protocolScopeAvailable(result: PreTradeResult, request: PreTradeRequest): boolean {
  if (!request.protocolId) return true;
  if (result.assessmentScope)
    return result.assessmentScope.evaluatedDimensions.includes('protocol_parameters');
  // Older APIs return an actual protocolSafety object when evaluated.
  return result.protocolSafety !== null && typeof result.protocolSafety === 'object';
}
