import { InsightClient } from './client';
import { verifyCoverageReport, type SignedCoverageReport } from './coverage';
import {
  type buildDecisionInputPairCommitment,
  decisionInputQuoteValidUntil,
  verifyDecisionInputPair as verifyDecisionInputPairForRequest,
} from './decision-input';
import { diagnosePreTrade, evaluateFreshness, validateFreshnessProfile } from './diagnostics';
import { ReceiptConfigurationError, TradeBlockedError } from './errors';
import {
  assertAcceptedAuthorizationMatchesPresented,
  assertAuthorizationMatchesAssessment,
  assertCurrentV3Risk,
  assertPairFreshness,
  buildJointAssuranceReport,
  buildVerifiedReceiptDraft,
  canonicalJson,
  correlateTransactionHashes,
  evidenceAvailabilityFor,
  evidenceError,
  isExecutionAuthorised,
  isPriorSealPending,
  jsonSafe,
  minimumKnownNonNegative,
  minimumPositive,
  number,
  protocolScopeAvailable,
  recommendationFor,
  assessmentReasonCodes,
  requireAssessmentEvidence,
  targetKey,
  verifyDecisionInputPair,
  requestedScopeAvailable,
  type BlockedSwapResult,
  type SwapGateEvaluation,
  type SwapGateRequest,
} from './guard-helpers';
import {
  buildInsightPriorSealContextCommitment,
  buildPriorSealExactCallIntent,
  generatePriorSealAuthorizationNonce,
  PriorSealBridgeError,
} from './priorseal';
import {
  assessV3SwapTransaction,
  v3SwapRiskCommitment,
  type V3SwapRiskRequest,
  type V3SwapRiskReport,
} from './swap-transaction-risk';
import { createWatch } from './watch';

import type {
  FreshnessProfile,
  DecisionInputTrust,
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
  PriorSealSubmitTransaction,
  SwapAssessment,
  SwapAssessmentRequest,
  TrustedV3PriorSealGuardedSwapRequest,
  TrustedV3SwapRiskOptions,
  TrustedV3SwapAuthorizationRequest,
  WatchHandle,
  WatchOptions,
} from './types';

export { exportReviewAttachments } from './guard-helpers';

type StrictV3SwapOptions = { trust: DecisionInputTrust; v3Risk: TrustedV3SwapRiskOptions };
type ReadySwapGateEvaluation = Extract<SwapGateEvaluation, { ready: true }>;
type PriorSealSwapWorkflowContext = {
  request: PriorSealGuardedSwapRequest;
  submissionAdapter: PriorSealSubmitTransaction;
  strictV3?: StrictV3SwapOptions;
  gated: ReadySwapGateEvaluation;
  coverage: SignedCoverageReport[];
  preparedTransaction: PreparedExactCallTransaction;
  assessment: SwapAssessment;
  transactionRisk?: V3SwapRiskReport;
  decisionInputPairCommitment?: ReturnType<typeof buildDecisionInputPairCommitment>;
};
type PriorSealAuthorizationContext = PriorSealSwapWorkflowContext & {
  issuedAt: number;
  validUntil: number;
  intent: ReturnType<typeof buildPriorSealExactCallIntent>;
  preparedAuthorization: Awaited<
    ReturnType<PriorSealGuardedSwapRequest['priorSeal']['client']['prepareAuthorization']>
  >;
  signature: string;
};
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
  private readonly decisionInputTrust: DecisionInputTrust | undefined;
  private readonly haltedTargets = new Set<string>();
  private readonly watchHandles = new Map<string, WatchHandle>();
  private readonly watchGenerations = new Map<string, symbol>();
  private readonly watchStateWrites = new Map<string, Promise<void>>();

  constructor(options: GuardOptions) {
    this.client = new InsightClient(options);
    this.coverage = options.coverage ? JSON.parse(JSON.stringify(options.coverage)) : undefined;
    this.decisionInputTrust = options.decisionInputTrust
      ? JSON.parse(JSON.stringify(options.decisionInputTrust))
      : undefined;
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

  /** Fetch both oracle legs and assess the exact V3 call at one RPC block. The
   * route/simulation report is unsigned and must be refreshed before execution.
   */
  async assessV3Swap(
    request: SwapAssessmentRequest & {
      transaction: V3SwapRiskRequest['transaction'];
      routerAddress?: V3SwapRiskRequest['routerAddress'];
      routerCodeHash: V3SwapRiskRequest['routerCodeHash'];
      reader: V3SwapRiskRequest['reader'];
      maxOracleDeviationBps?: number;
      maxTradeAmountDeviationBps?: number;
      maxSlippageBps?: number;
      maxBlockAgeSeconds?: number;
      now?: () => number;
      decisionInputTrust?: DecisionInputTrust;
    },
    signal?: AbortSignal
  ): Promise<{ assessment: SwapAssessment; transactionRisk: V3SwapRiskReport }> {
    const assessment = await this.assessSwap(request, signal);
    const transactionRisk = await assessV3SwapTransaction({
      assessment,
      transaction: request.transaction,
      routerAddress: request.routerAddress,
      routerCodeHash: request.routerCodeHash,
      reader: request.reader,
      maxOracleDeviationBps: request.maxOracleDeviationBps,
      maxTradeAmountDeviationBps: request.maxTradeAmountDeviationBps,
      maxSlippageBps: request.maxSlippageBps,
      maxBlockAgeSeconds: request.maxBlockAgeSeconds,
      now: request.now,
      decisionInputTrust: request.decisionInputTrust ?? this.decisionInputTrust,
    });
    return { assessment, transactionRisk };
  }

  /** Reassess the prepared call and require an acceptable route review before
   * asking PriorSeal for a signature. No transaction is submitted here.
   */
  async authorizeAssessedV3Swap(
    request: SwapAssessmentRequest & {
      transaction: V3SwapRiskRequest['transaction'];
      routerAddress?: V3SwapRiskRequest['routerAddress'];
      routerCodeHash: V3SwapRiskRequest['routerCodeHash'];
      reader: V3SwapRiskRequest['reader'];
      priorSeal: AssessedSwapAuthorizationRequest['priorSeal'];
      maxOracleDeviationBps?: number;
      maxTradeAmountDeviationBps?: number;
      maxSlippageBps?: number;
      maxBlockAgeSeconds?: number;
      decisionInputTrust?: DecisionInputTrust;
    },
    signal?: AbortSignal
  ): Promise<AssessedSwapAuthorizationResult & { transactionRisk: V3SwapRiskReport }> {
    const { assessment, transactionRisk } = await this.assessV3Swap(
      { ...request, maxBlockAgeSeconds: Math.min(request.maxBlockAgeSeconds ?? 30, 30) },
      signal
    );
    if (transactionRisk.status !== 'ACCEPTABLE') {
      throw new ReceiptConfigurationError(
        `V3 swap risk: ${transactionRisk.reasonCodes.join(', ')}`
      );
    }
    const result = await this.authorizeAssessedSwap({
      assessment,
      transaction: request.transaction,
      priorSeal: request.priorSeal,
      transactionRisk,
      ...((request.decisionInputTrust ?? this.decisionInputTrust)
        ? { decisionInputTrust: request.decisionInputTrust ?? this.decisionInputTrust }
        : {}),
    });
    return { ...result, transactionRisk };
  }

  /** Strict path: both Insight decision-input proofs must satisfy the consumer's pinned policy. */
  async authorizeTrustedV3Swap(
    request: TrustedV3SwapAuthorizationRequest,
    signal?: AbortSignal
  ): Promise<
    AssessedSwapAuthorizationResult & {
      transactionRisk: V3SwapRiskReport;
      decisionInputPairCommitment: ReturnType<typeof buildDecisionInputPairCommitment>;
    }
  > {
    const trust = request.decisionInputTrust ?? this.decisionInputTrust;
    if (!trust)
      throw new ReceiptConfigurationError(
        'Trusted Decision Input policy and key registry are required.'
      );
    if (!request.source.decisionInput || !request.destination.decisionInput) {
      throw new ReceiptConfigurationError(
        'Decision Input assessments are required for both swap assets.'
      );
    }
    const strictReceipt = {
      ...request.receipt,
      maxSlippageBps: Math.min(request.receipt.maxSlippageBps ?? 50, trust.policy.maxSlippageBps),
    };
    const { assessment, transactionRisk } = await this.assessV3Swap(
      {
        ...request,
        receipt: strictReceipt,
        decisionInputTrust: trust,
        maxOracleDeviationBps: Math.min(
          request.maxOracleDeviationBps ?? 100,
          trust.policy.maxReferenceDeviationBps
        ),
        maxSlippageBps: Math.min(
          request.maxSlippageBps ?? trust.policy.maxSlippageBps,
          trust.policy.maxSlippageBps,
          request.receipt.maxSlippageBps ?? 50
        ),
        maxBlockAgeSeconds: Math.min(request.maxBlockAgeSeconds ?? 30, 30),
      },
      signal
    );
    if (transactionRisk.status !== 'ACCEPTABLE') {
      throw new ReceiptConfigurationError(
        `V3 swap risk: ${transactionRisk.reasonCodes.join(', ')}`
      );
    }
    if (!assessment.sourcePreTrade || !assessment.destinationPreTrade) {
      throw new ReceiptConfigurationError('Both signed pre-trade results are required.');
    }
    let decisionInputPairCommitment: ReturnType<typeof buildDecisionInputPairCommitment>;
    try {
      ({ commitment: decisionInputPairCommitment } = await verifyDecisionInputPairForRequest(
        assessment.sourcePreTrade,
        request.source,
        assessment.destinationPreTrade,
        request.destination,
        trust
      ));
    } catch (error) {
      throw new ReceiptConfigurationError(
        `Decision Input pair rejected: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const result = await this.authorizeAssessedSwap({
      assessment,
      transaction: request.transaction,
      priorSeal: request.priorSeal,
      transactionRisk,
      decisionInputTrust: trust,
      decisionInputPairCommitment,
    });
    return { ...result, transactionRisk, decisionInputPairCommitment };
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
      requiresReauthorization: changedFields.length > 0,
    };
  }

  /** Bind an advisory assessment to an exact call. This method never broadcasts a transaction. */
  async authorizeAssessedSwap(
    request: AssessedSwapAuthorizationRequest
  ): Promise<AssessedSwapAuthorizationResult> {
    const { assessment, transaction, priorSeal, transactionRisk, decisionInputTrust } = request;
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
    const validUntil =
      priorSeal.validUntil ??
      minimumPositive([
        assessment.constraints.validUntil,
        ...(transactionRisk ? [transactionRisk.validUntil] : []),
      ]);
    const decisionInputCommitment = decisionInputTrust
      ? await verifyDecisionInputPair(
          assessment,
          decisionInputTrust,
          issuedAt,
          validUntil ?? undefined
        )
      : undefined;
    if (
      request.decisionInputPairCommitment &&
      request.decisionInputPairCommitment.digest.toLowerCase() !==
        decisionInputCommitment?.digest.toLowerCase()
    ) {
      throw new ReceiptConfigurationError(
        'Decision Input pair commitment does not match the verified assessments.'
      );
    }
    if (transactionRisk)
      assertCurrentV3Risk(transactionRisk, assessment, transaction, issuedAt, validUntil);
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
      contextCommitments: [
        assessment.contextCommitment!,
        ...(transactionRisk ? [v3SwapRiskCommitment(transactionRisk)] : []),
        ...(decisionInputCommitment ? [decisionInputCommitment] : []),
      ],
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
    if (transactionRisk)
      assertCurrentV3Risk(
        transactionRisk,
        assessment,
        transaction,
        Math.floor(Date.now() / 1000),
        validUntil
      );
    if (decisionInputTrust) {
      const currentCommitment = await verifyDecisionInputPair(
        assessment,
        decisionInputTrust,
        Math.floor(Date.now() / 1000),
        validUntil ?? undefined
      );
      if (
        currentCommitment.digest.toLowerCase() !== decisionInputCommitment?.digest.toLowerCase()
      ) {
        throw new ReceiptConfigurationError(
          'Decision Input evidence changed after authorization preparation.'
        );
      }
    }
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
    if (transactionRisk)
      assertCurrentV3Risk(
        transactionRisk,
        assessment,
        transaction,
        Math.floor(Date.now() / 1000),
        validUntil
      );
    if (decisionInputTrust) {
      const latestCommitment = await verifyDecisionInputPair(
        assessment,
        decisionInputTrust,
        Math.floor(Date.now() / 1000),
        validUntil ?? undefined
      );
      if (latestCommitment.digest.toLowerCase() !== decisionInputCommitment?.digest.toLowerCase()) {
        throw new ReceiptConfigurationError(
          'Decision Input evidence expired or changed before authorization acceptance.'
        );
      }
    }
    const signedAuthorization = { ...preparedAuthorization.authorization, signature };
    const priorSealAuthorization = await priorSeal.client.acceptAuthorization(
      signedAuthorization,
      priorSeal.signal
    );
    assertAcceptedAuthorizationMatchesPresented(priorSealAuthorization, signedAuthorization);
    assertAuthorizationMatchesAssessment(
      priorSealAuthorization,
      assessment,
      transaction,
      false,
      transactionRisk,
      decisionInputCommitment
    );
    assertPairFreshness(
      assessment.sourcePreTrade!,
      assessment.destinationPreTrade!,
      { ...this.freshness, ...assessment.freshnessProfile },
      priorSealAuthorization.authorization
    );
    return {
      assessment,
      transaction,
      priorSealAuthorization,
      ...(decisionInputCommitment ? { decisionInputPairCommitment: decisionInputCommitment } : {}),
    };
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
        ...(request.transactionRisk ? { transactionRisk: request.transactionRisk } : {}),
        ...(request.decisionInputPairCommitment
          ? { decisionInputPairCommitment: request.decisionInputPairCommitment }
          : {}),
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
      true,
      checkpoint.transactionRisk,
      checkpoint.decisionInputPairCommitment
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
    return this.executeSwapWithPriorSealInternal(request);
  }

  /**
   * Full strict path for supported Uniswap V3 exactInputSingle swaps. It requires
   * two signed decision-input assessments, an acceptable exact-call simulation,
   * a single-use PriorSeal authorization and both post-execution evidence paths.
   */
  async executeTrustedV3SwapWithPriorSeal(
    request: TrustedV3PriorSealGuardedSwapRequest
  ): Promise<PriorSealGuardedSwapResult> {
    const trust = request.decisionInputTrust ?? this.decisionInputTrust;
    if (!trust) {
      throw new ReceiptConfigurationError(
        'Trusted Decision Input policy and independently obtained key registry are required.'
      );
    }
    if (!request.source.decisionInput || !request.destination.decisionInput) {
      throw new ReceiptConfigurationError(
        'Decision Input assessments are required for both swap assets.'
      );
    }
    return this.executeSwapWithPriorSealInternal(request, {
      trust,
      v3Risk: request.v3Risk,
    });
  }

  private async executeSwapWithPriorSealInternal(
    request: PriorSealGuardedSwapRequest,
    strictV3?: StrictV3SwapOptions
  ): Promise<PriorSealGuardedSwapResult> {
    const preparation = await this.preparePriorSealSwapWorkflow(request, strictV3);
    if ('status' in preparation) return preparation;
    const authorization = await this.preparePriorSealAuthorization(preparation);
    if ('status' in authorization) return authorization;
    return this.acceptAndSubmitPriorSealSwap(authorization);
  }

  private async preparePriorSealSwapWorkflow(
    request: PriorSealGuardedSwapRequest,
    strictV3?: StrictV3SwapOptions
  ): Promise<PriorSealSwapWorkflowContext | BlockedSwapResult> {
    const submissionAdapter = request.submitTransaction as PriorSealSubmitTransaction;
    const submissionCommitments = submissionAdapter.authorizationContextCommitments ?? [];
    if (
      strictV3 &&
      (!submissionCommitments.some(
        (commitment) => commitment.namespace === 'priorseal.swap-approval.v1'
      ) ||
        typeof submissionAdapter.assertAuthorizationTransaction !== 'function')
    ) {
      throw new ReceiptConfigurationError(
        'The strict V3 PriorSeal flow requires a submitter that binds and checks its swap approval before authorization.'
      );
    }
    if (strictV3) {
      request = {
        ...request,
        receipt: {
          ...request.receipt,
          maxSlippageBps: Math.min(
            request.receipt.maxSlippageBps ?? 50,
            strictV3.trust.policy.maxSlippageBps
          ),
        },
      };
    }
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
    try {
      submissionAdapter.assertAuthorizationTransaction?.(preparedTransaction);
    } catch (error) {
      throw new ReceiptConfigurationError(
        `PriorSeal swap approval rejected the prepared transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const assessment = this.assessmentFromResults(
      request,
      gated.sourcePreTrade,
      gated.destinationPreTrade
    );
    let transactionRisk: V3SwapRiskReport | undefined;
    let decisionInputPairCommitment:
      | ReturnType<typeof buildDecisionInputPairCommitment>
      | undefined;
    if (strictV3) {
      try {
        ({ commitment: decisionInputPairCommitment } = await verifyDecisionInputPairForRequest(
          gated.sourcePreTrade,
          request.source,
          gated.destinationPreTrade,
          request.destination,
          strictV3.trust
        ));
      } catch (error) {
        throw new ReceiptConfigurationError(
          `Decision Input pair rejected: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      transactionRisk = await assessV3SwapTransaction({
        assessment,
        transaction: preparedTransaction,
        routerAddress: strictV3.v3Risk.routerAddress,
        routerCodeHash: strictV3.v3Risk.routerCodeHash,
        reader: strictV3.v3Risk.reader,
        maxOracleDeviationBps: Math.min(
          strictV3.v3Risk.maxOracleDeviationBps ?? 100,
          strictV3.trust.policy.maxReferenceDeviationBps
        ),
        maxTradeAmountDeviationBps: strictV3.v3Risk.maxTradeAmountDeviationBps,
        maxSlippageBps: Math.min(
          strictV3.v3Risk.maxSlippageBps ?? strictV3.trust.policy.maxSlippageBps,
          strictV3.trust.policy.maxSlippageBps,
          request.receipt.maxSlippageBps ?? 50
        ),
        maxBlockAgeSeconds: Math.min(strictV3.v3Risk.maxBlockAgeSeconds ?? 30, 30),
        decisionInputTrust: strictV3.trust,
      });
      if (transactionRisk.status !== 'ACCEPTABLE') {
        throw new ReceiptConfigurationError(
          `V3 swap risk: ${transactionRisk.reasonCodes.join(', ')}`
        );
      }
    }
    const context: PriorSealSwapWorkflowContext = {
      request,
      submissionAdapter,
      strictV3,
      gated,
      coverage,
      preparedTransaction,
      assessment,
      ...(transactionRisk ? { transactionRisk } : {}),
      ...(decisionInputPairCommitment ? { decisionInputPairCommitment } : {}),
    };
    const blocked = this.watchHaltResult(context);
    return blocked ?? context;
  }

  private async preparePriorSealAuthorization(
    context: PriorSealSwapWorkflowContext
  ): Promise<PriorSealAuthorizationContext | BlockedSwapResult> {
    const { request, strictV3, gated, coverage, transactionRisk, decisionInputPairCommitment } =
      context;
    const issuedAt = request.priorSeal.issuedAt ?? Math.floor(Date.now() / 1000);
    const signedGateValidUntil = Math.min(
      number(gated.sourcePreTrade.attestation?.data.validUntil),
      number(gated.destinationPreTrade.attestation?.data.validUntil)
    );
    const strictDecisionInputValidUntil = strictV3
      ? Math.min(
          number(gated.sourcePreTrade.decisionInputAssessment?.attestation?.data.validUntil),
          number(gated.destinationPreTrade.decisionInputAssessment?.attestation?.data.validUntil)
        )
      : Number.POSITIVE_INFINITY;
    const strictDecisionInputQuoteValidUntil = strictV3
      ? Math.min(
          decisionInputQuoteValidUntil(
            gated.sourcePreTrade.decisionInputAssessment!,
            strictV3.trust.policy
          ),
          decisionInputQuoteValidUntil(
            gated.destinationPreTrade.decisionInputAssessment!,
            strictV3.trust.policy
          )
        )
      : Number.POSITIVE_INFINITY;
    const evidenceValidUntil = Math.min(
      signedGateValidUntil,
      strictDecisionInputValidUntil,
      strictDecisionInputQuoteValidUntil,
      transactionRisk?.validUntil ?? Number.POSITIVE_INFINITY,
      ...coverage.map((item) => item.report.validUntil)
    );
    if (
      request.priorSeal.validUntil !== undefined &&
      request.priorSeal.validUntil > evidenceValidUntil
    ) {
      throw new ReceiptConfigurationError(
        'PriorSeal authorization cannot outlive the shortest signed or simulated review evidence.'
      );
    }
    const validUntil = request.priorSeal.validUntil ?? evidenceValidUntil;
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
    if (strictV3) {
      const boundAtAuthorization = await verifyDecisionInputPair(
        context.assessment,
        strictV3.trust,
        issuedAt,
        validUntil
      );
      if (
        boundAtAuthorization.digest.toLowerCase() !==
        decisionInputPairCommitment?.digest.toLowerCase()
      ) {
        throw new ReceiptConfigurationError(
          'Decision Input evidence was issued after the authorization or changed during preparation.'
        );
      }
    }

    const authorizationNonce =
      request.priorSeal.authorizationNonce ?? generatePriorSealAuthorizationNonce();
    const insightContextCommitment = buildInsightPriorSealContextCommitment({
      sourceAttestation: gated.receiptDraft.preTradeAttestations!.source,
      destinationAttestation: gated.receiptDraft.preTradeAttestations!.destination,
      maxSlippageBps: gated.receiptDraft.maxSlippageBps,
    });
    const intent = buildPriorSealExactCallIntent({
      transaction: context.preparedTransaction,
      intentId: request.priorSeal.intentId ?? `insight:${authorizationNonce.slice(2, 34)}`,
      sourceAssetId: gated.receiptDraft.sourceAssetId,
      validUntil,
      minConfirmations: request.priorSeal.confirmations,
      contextCommitments: [
        insightContextCommitment,
        ...(transactionRisk ? [v3SwapRiskCommitment(transactionRisk)] : []),
        ...(decisionInputPairCommitment ? [decisionInputPairCommitment] : []),
        ...(context.submissionAdapter.authorizationContextCommitments ?? []),
        ...coverage.map((item, index) => ({
          namespace: `insight.coverage.${index === 0 ? 'source' : 'destination'}.v1`,
          algorithm: 'keccak256' as const,
          digest: item.digest as `0x${string}`,
        })),
      ],
    });
    const window = { issuedAt, validUntil };
    const blockedBeforePrepare = this.watchHaltResult(context);
    if (blockedBeforePrepare) return blockedBeforePrepare;
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
    const freshness = { ...this.freshness, ...request.freshness };
    assertPairFreshness(gated.sourcePreTrade, gated.destinationPreTrade, freshness);
    await this.assertPriorSealEvidenceCurrent(
      context,
      window,
      'Decision Input evidence changed after authorization preparation.'
    );
    await this.checkSwapCoverage(coverage, preparedAuthorization.authorization.intent);
    const blockedAfterPrepare = this.watchHaltResult(context);
    if (blockedAfterPrepare) return blockedAfterPrepare;
    const signature = await request.priorSeal.signAuthorization(preparedAuthorization);
    if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
      throw new ReceiptConfigurationError('PriorSeal signer returned no hex signature.');
    }
    assertPairFreshness(
      gated.sourcePreTrade,
      gated.destinationPreTrade,
      freshness,
      preparedAuthorization.authorization
    );
    await this.assertPriorSealEvidenceCurrent(
      context,
      window,
      'Decision Input evidence expired or changed before authorization acceptance.'
    );
    const blockedAfterSigning = this.watchHaltResult(context);
    if (blockedAfterSigning) return blockedAfterSigning;
    return {
      ...context,
      ...window,
      intent,
      preparedAuthorization,
      signature,
    };
  }

  private async acceptAndSubmitPriorSealSwap(
    context: PriorSealAuthorizationContext
  ): Promise<PriorSealGuardedSwapResult> {
    const {
      request,
      gated,
      coverage,
      transactionRisk,
      decisionInputPairCommitment,
      preparedTransaction,
    } = context;
    const signedAuthorization = {
      ...context.preparedAuthorization.authorization,
      signature: context.signature,
    };
    const priorSealAuthorization = await request.priorSeal.client.acceptAuthorization(
      signedAuthorization,
      request.priorSeal.signal
    );
    assertAcceptedAuthorizationMatchesPresented(priorSealAuthorization, signedAuthorization);
    assertAuthorizationMatchesAssessment(
      priorSealAuthorization,
      context.assessment,
      preparedTransaction,
      false,
      transactionRisk,
      decisionInputPairCommitment
    );
    assertPairFreshness(
      gated.sourcePreTrade,
      gated.destinationPreTrade,
      { ...this.freshness, ...request.freshness },
      priorSealAuthorization.authorization
    );
    const blocked = this.watchHaltResult(context);
    if (blocked) return blocked;
    await this.checkSwapCoverage(coverage, priorSealAuthorization.authorization.intent);
    await this.assertPriorSealEvidenceCurrent(
      context,
      context,
      'Decision Input evidence expired before transaction submission.'
    );
    try {
      context.submissionAdapter.assertAuthorizationTransaction?.(preparedTransaction);
    } catch (error) {
      throw new ReceiptConfigurationError(
        `PriorSeal swap approval no longer matches the prepared transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const submissionTransaction = Object.freeze({ ...preparedTransaction });
    const transaction = await request.submitTransaction({
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
      transaction: submissionTransaction,
      priorSealAuthorization,
    });
    if (!/^0x[0-9a-fA-F]{64}$/.test(transaction.txHash)) {
      throw new ReceiptConfigurationError('submitTransaction returned no valid transaction hash.');
    }
    return this.collectPriorSealSwapEvidence(context, priorSealAuthorization, transaction);
  }

  private async assertPriorSealEvidenceCurrent(
    context: PriorSealSwapWorkflowContext,
    window: { issuedAt: number; validUntil: number },
    errorMessage: string
  ): Promise<void> {
    if (context.transactionRisk) {
      assertCurrentV3Risk(
        context.transactionRisk,
        context.assessment,
        context.preparedTransaction,
        Math.floor(Date.now() / 1000),
        window.validUntil
      );
    }
    if (!context.strictV3) return;
    const current = await verifyDecisionInputPair(
      context.assessment,
      context.strictV3.trust,
      Math.floor(Date.now() / 1000),
      window.validUntil
    );
    if (
      current.digest.toLowerCase() !== context.decisionInputPairCommitment?.digest.toLowerCase()
    ) {
      throw new ReceiptConfigurationError(errorMessage);
    }
  }

  private watchHaltResult(context: PriorSealSwapWorkflowContext): BlockedSwapResult | undefined {
    const { request, gated } = context;
    if (!(this.blockOnWatchHalt && request.watchTarget && this.isHalted(request.watchTarget)))
      return undefined;
    return {
      status: 'blocked',
      stage: 'watch_halt',
      sourcePreTrade: gated.sourcePreTrade,
      destinationPreTrade: gated.destinationPreTrade,
    };
  }

  private async collectPriorSealSwapEvidence(
    context: PriorSealAuthorizationContext,
    priorSealAuthorization: PriorSealAcceptedAuthorization,
    transaction: Awaited<ReturnType<PriorSealGuardedSwapRequest['submitTransaction']>>
  ): Promise<PriorSealGuardedSwapResult> {
    const {
      request,
      gated,
      coverage,
      transactionRisk,
      decisionInputPairCommitment,
      preparedTransaction,
      assessment,
    } = context;
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
        ...(transactionRisk ? { transactionRisk } : {}),
        ...(decisionInputPairCommitment ? { decisionInputPairCommitment } : {}),
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
      ...(transactionRisk ? { transactionRisk } : {}),
      ...(decisionInputPairCommitment ? { decisionInputPairCommitment } : {}),
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
