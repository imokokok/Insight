import { keccak256 } from 'viem';

import {
  type buildDecisionInputPairCommitment,
  decisionInputQuoteValidUntil,
  verifyLinkedDecisionInputPair,
} from './decision-input';
import { evaluateFreshness } from './diagnostics';
import { InsightApiError, ReceiptConfigurationError } from './errors';
import {
  buildInsightPriorSealContextCommitment,
  buildPriorSealExactCallIntent,
  PriorSealBridgeError,
} from './priorseal';
import { v3SwapRiskCommitment, type V3SwapRiskReport } from './swap-transaction-risk';

import type {
  AssessedSwapExecutionVerificationResult,
  DecisionInputTrust,
  ExecutionReceiptRequest,
  ExecutionReceiptResult,
  FreshnessProfile,
  GuardedSwapRequest,
  GuardedSwapResult,
  JointEvidenceCheckpoint,
  JointEvidenceError,
  OracleWatchTarget,
  PreTradeRequest,
  PreTradeResult,
  PreparedExactCallTransaction,
  PriorSealAcceptedAuthorization,
  PriorSealObservationResult,
  SignedAttestation,
  SwapAssessment,
  TransactionRecommendation,
} from './types';

export type BlockedSwapResult = Extract<GuardedSwapResult, { status: 'blocked' }>;
export type SwapGateRequest = Pick<
  GuardedSwapRequest,
  'source' | 'destination' | 'watchTarget' | 'receipt' | 'freshness'
>;
export type SwapGateEvaluation =
  | { ready: false; result: BlockedSwapResult }
  | {
      ready: true;
      sourcePreTrade: PreTradeResult;
      destinationPreTrade: PreTradeResult;
      receiptDraft: Omit<ExecutionReceiptRequest, 'txHash' | 'taker'>;
    };

export function recommendationFor(
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

export function assessmentReasonCodes(
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

export function minimumPositive(values: Array<number | null | undefined>): number | null {
  if (
    values.length === 0 ||
    values.some((value) => value == null || !Number.isFinite(value) || value <= 0)
  ) {
    return null;
  }
  return Math.min(...(values as number[]));
}

export function minimumKnownNonNegative(values: Array<number | null | undefined>): number | null {
  const known = values.filter(
    (value): value is number => value != null && Number.isFinite(value) && value >= 0
  );
  return known.length ? Math.min(...known) : null;
}

export function requireAssessmentEvidence(
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

export function assertAuthorizationMatchesAssessment(
  accepted: PriorSealAcceptedAuthorization,
  assessment: SwapAssessment,
  transaction: PreparedExactCallTransaction,
  allowExpired = false,
  transactionRisk?: V3SwapRiskReport,
  decisionInputCommitment?: ReturnType<typeof buildDecisionInputPairCommitment>
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
    contextCommitments: [
      assessment.contextCommitment!,
      ...(transactionRisk ? [v3SwapRiskCommitment(transactionRisk)] : []),
      ...(decisionInputCommitment ? [decisionInputCommitment] : []),
    ],
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
  if (transactionRisk) {
    const commitment = v3SwapRiskCommitment(transactionRisk);
    const matches =
      actual.contextCommitments?.filter((entry) => entry.namespace === commitment.namespace) ?? [];
    if (
      matches.length !== 1 ||
      matches[0].algorithm !== commitment.algorithm ||
      matches[0].digest.toLowerCase() !== commitment.digest.toLowerCase()
    ) {
      throw new ReceiptConfigurationError(
        'PriorSeal authorization does not bind the V3 transaction risk review.'
      );
    }
  }
  if (decisionInputCommitment) {
    const matches =
      actual.contextCommitments?.filter(
        (entry) => entry.namespace === decisionInputCommitment.namespace
      ) ?? [];
    if (
      matches.length !== 1 ||
      matches[0].algorithm !== decisionInputCommitment.algorithm ||
      matches[0].digest.toLowerCase() !== decisionInputCommitment.digest.toLowerCase()
    ) {
      throw new ReceiptConfigurationError(
        'PriorSeal authorization does not bind both trusted Decision Input assessments.'
      );
    }
  }
}

export async function verifyDecisionInputPair(
  assessment: SwapAssessment,
  trust: DecisionInputTrust,
  now: number,
  authorizationValidUntil?: number
) {
  const sourcePreTrade = assessment.sourcePreTrade;
  const destinationPreTrade = assessment.destinationPreTrade;
  if (!sourcePreTrade || !destinationPreTrade)
    throw new ReceiptConfigurationError(
      'Both pre-trade results are required for Decision Input verification.'
    );
  const sourceInput = sourcePreTrade.decisionInputAssessment;
  const destinationInput = destinationPreTrade.decisionInputAssessment;
  const sourceAssetId = sourcePreTrade.attestation?.data.sourceAssetId;
  const destinationAssetId = destinationPreTrade.attestation?.data.sourceAssetId;
  if (
    !sourceInput ||
    !destinationInput ||
    typeof sourceAssetId !== 'string' ||
    typeof destinationAssetId !== 'string' ||
    trust.policy.assetIds[sourceInput.asset.trim().toUpperCase()]?.toLowerCase() !==
      sourceAssetId.toLowerCase() ||
    trust.policy.assetIds[destinationInput.asset.trim().toUpperCase()]?.toLowerCase() !==
      destinationAssetId.toLowerCase()
  ) {
    throw new ReceiptConfigurationError(
      'Decision Input asset labels are not bound to the trusted CAIP-19 asset profile.'
    );
  }
  let pair: Awaited<ReturnType<typeof verifyLinkedDecisionInputPair>>;
  try {
    pair = await verifyLinkedDecisionInputPair(sourcePreTrade, destinationPreTrade, trust, {
      now: Math.max(now, Math.ceil(Date.now() / 1000)),
    });
  } catch (error) {
    throw new ReceiptConfigurationError(
      `Decision Input verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const sourceValidUntil = sourcePreTrade.decisionInputAssessment?.attestation?.data.validUntil;
  const destinationValidUntil =
    destinationPreTrade.decisionInputAssessment?.attestation?.data.validUntil;
  const sourceQuoteValidUntil = sourceInput
    ? decisionInputQuoteValidUntil(sourceInput, trust.policy)
    : 0;
  const destinationQuoteValidUntil = destinationInput
    ? decisionInputQuoteValidUntil(destinationInput, trust.policy)
    : 0;
  const sourceIssuedAt = sourcePreTrade.decisionInputAssessment?.attestation?.data.issuedAt;
  const destinationIssuedAt =
    destinationPreTrade.decisionInputAssessment?.attestation?.data.issuedAt;
  if (
    authorizationValidUntil !== undefined &&
    (!Number.isSafeInteger(sourceValidUntil) ||
      !Number.isSafeInteger(destinationValidUntil) ||
      authorizationValidUntil > Math.min(Number(sourceValidUntil), Number(destinationValidUntil)) ||
      authorizationValidUntil > Math.min(sourceQuoteValidUntil, destinationQuoteValidUntil))
  ) {
    throw new ReceiptConfigurationError(
      'PriorSeal authorization cannot outlive either Decision Input attestation or its quote freshness window.'
    );
  }
  if (
    !Number.isSafeInteger(sourceIssuedAt) ||
    !Number.isSafeInteger(destinationIssuedAt) ||
    Number(sourceIssuedAt) > now ||
    Number(destinationIssuedAt) > now
  ) {
    throw new ReceiptConfigurationError(
      'Decision Input evidence must be issued no later than the PriorSeal authorization.'
    );
  }
  return pair.commitment;
}

export function assertCurrentV3Risk(
  report: V3SwapRiskReport,
  assessment: SwapAssessment,
  transaction: PreparedExactCallTransaction,
  now: number,
  validUntil: number | null
): void {
  v3SwapRiskCommitment(report);
  const tx = report.transaction!,
    evidence = report.evidence!;
  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(validUntil) ||
    validUntil! <= now ||
    report.validUntil! < validUntil! ||
    evidence.blockTimestamp > now + 5 ||
    now - evidence.blockTimestamp > 30 ||
    tx.chainId !== transaction.chainId ||
    tx.from !== transaction.from.toLowerCase() ||
    tx.router !== transaction.to.toLowerCase() ||
    tx.calldataHash.toLowerCase() !== keccak256(transaction.data).toLowerCase() ||
    tx.amountIn !== String(transaction.sourceAmount) ||
    evidence.sourceAttestationUid !== assessment.sourcePreTrade?.attestation?.uid ||
    evidence.destinationAttestationUid !== assessment.destinationPreTrade?.attestation?.uid
  ) {
    throw new ReceiptConfigurationError(
      'V3 transaction risk review is stale or does not match the prepared call.'
    );
  }
}

export function assertAcceptedAuthorizationMatchesPresented(
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

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function buildJointAssuranceReport(
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

export function isPriorSealPending(evidence: PriorSealObservationResult | null): boolean {
  if (!evidence) return false;
  // Terminal jobs retain their last observation, which can still say PENDING/RPC_ERROR.
  if (evidence.observationJob)
    return !['COMPLETED', 'UNDETERMINED', 'FAILED'].includes(evidence.observationJob.state);
  return ['PENDING', 'NOT_FOUND', 'RPC_ERROR', 'RPC_TIMEOUT'].includes(evidence.observation.status);
}

export function jointEvidenceStatus(
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

export function exactCallMatch(
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

export function insightConstraintsSatisfied(
  receipt: ExecutionReceiptResult | null
): boolean | null {
  if (receipt?.executionStatus === 'FAITHFUL') return true;
  if (receipt?.executionStatus === 'DEVIATED') return false;
  return null;
}

export function followedRecommendation(
  recommendation: TransactionRecommendation,
  executionFinal: boolean
): boolean | null {
  if (!executionFinal) return null;
  if (recommendation === 'NOT_RECOMMENDED') return false;
  if (['RECOMMENDED', 'CONDITIONALLY_RECOMMENDED'].includes(recommendation)) return true;
  return null;
}

export function jointConclusion(input: {
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

export function evidenceAvailabilityFor(
  insightReceipt: ExecutionReceiptResult | null,
  priorSealEvidence: PriorSealObservationResult | null
): 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' {
  const insightPresent = insightReceipt !== null;
  const priorSealPresent = priorSealEvidence?.receipt != null;
  if (insightPresent && priorSealPresent) return 'COMPLETE';
  return insightPresent || priorSealPresent ? 'PARTIAL' : 'UNAVAILABLE';
}

export function correlateTransactionHashes(
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

export function normalizeTxHash(value: unknown): string | null {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value)
    ? value.toLowerCase()
    : null;
}

export function evidenceError(error: unknown): JointEvidenceError {
  if (error instanceof PriorSealBridgeError) {
    return { code: error.options.code, status: error.options.status, message: error.message };
  }
  if (error instanceof InsightApiError) {
    return { code: error.options.code, status: error.options.status, message: error.message };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: String(error) };
}

export function buildVerifiedReceiptDraft(
  source: PreTradeResult,
  destination: PreTradeResult,
  receipt: GuardedSwapRequest['receipt']
): Omit<ExecutionReceiptRequest, 'txHash' | 'taker'> {
  const maxSlippageBps = receipt.maxSlippageBps ?? 50;
  if (!Number.isSafeInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps > 50) {
    throw new ReceiptConfigurationError(
      'Execution receipt maxSlippageBps must be an integer from 0 to 50.'
    );
  }
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
    maxSlippageBps,
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

export function requireV2Proof(
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

export function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function isExecutionAuthorised(verdict: string): boolean {
  return verdict === 'PASS' || verdict === 'CAUTION';
}

export function targetKey(target: OracleWatchTarget): string {
  return `${target.symbol.trim().toUpperCase()}@${(target.chain ?? '').trim().toLowerCase()}`;
}

export function assertPairFreshness(
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

export function jsonSafe<T>(value: T): T {
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
  const decisionInputs = [
    [
      'decision-input-source',
      'insight.decision-input.source',
      checkpoint.assessment.sourcePreTrade?.decisionInputAssessment,
    ],
    [
      'decision-input-destination',
      'insight.decision-input.destination',
      checkpoint.assessment.destinationPreTrade?.decisionInputAssessment,
    ],
  ] as const;
  const transactionRisk = checkpoint.transactionRisk?.evidence?.decisionInputPair
    ? [
        {
          id: 'transaction-risk',
          role: 'insight.swap-transaction-risk',
          profile: 'insight.swap-transaction-risk.v1',
          rawJson: JSON.stringify(checkpoint.transactionRisk),
        },
      ]
    : [];
  return [
    ...artifacts.flatMap(([id, role, proof]) =>
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
    ),
    ...decisionInputs.flatMap(([id, role, assessment]) =>
      assessment
        ? [{ id, role, profile: 'insight.decision-input.v1', rawJson: JSON.stringify(assessment) }]
        : []
    ),
    ...transactionRisk,
  ];
}

export function requestedScopeAvailable(result: PreTradeResult): boolean {
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

export function protocolScopeAvailable(result: PreTradeResult, request: PreTradeRequest): boolean {
  if (!request.protocolId) return true;
  if (result.assessmentScope)
    return result.assessmentScope.evaluatedDimensions.includes('protocol_parameters');
  // Older APIs return an actual protocolSafety object when evaluated.
  return result.protocolSafety !== null && typeof result.protocolSafety === 'object';
}
