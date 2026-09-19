export type SafetyVerdict = 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK';
export type OracleWatchVerdict = 'normal' | 'caution' | 'danger';
export type OracleWatchRecommendation = 'proceed' | 'proceed_with_caution' | 'halt';
export type TradeAction = 'swap' | 'borrow' | 'lend' | 'liquidate' | 'repay';

export interface SignedAttestation {
  uid: string;
  schemaVersion: number;
  attester: string;
  signedAt?: string | number;
  validUntil?: number;
  data: Record<string, unknown>;
  signature?: string;
  [key: string]: unknown;
}

export interface PreTradeRequest {
  asset: string;
  chainId: number;
  action: TradeAction;
  tradeAmountUsd: number;
  targetProviders?: string[];
  protocolId?: string;
  /** SDK defaults to v3 so the quorum and independence thresholds are signed. */
  schemaVersion?: 1 | 2 | 3;
  destinationAsset?: string;
  /** Audit-only workflow and baseline labels; not part of the signed request hash. */
  workflowTag?: string;
  baselineVerdict?: 'allow' | 'alert' | 'block' | 'unknown';
  baselineVersion?: string;
}

export interface PreTradeResult {
  verdict: SafetyVerdict;
  consensusPrice: number;
  maxDeviationPct: number;
  crossProviderAgreement: number;
  recommendedMaxPositionUsd: number;
  participantCount: number;
  warnings: string[];
  contributingFactors: Array<{ message: string; [key: string]: unknown }>;
  evaluatedAt: string;
  attestation: SignedAttestation | null;
  assessmentScope?: {
    requestedDimensions: string[];
    evaluatedDimensions: string[];
    unavailableDimensions: { dimension: string; reason: string }[];
    actionRiskDirection:
      | 'increase_debt'
      | 'reduce_debt'
      | 'supply_assets'
      | 'liquidation'
      | 'exchange';
    [key: string]: unknown;
  };
  sizingBasis?: {
    kind: 'oracle_condition_advisory_cap';
    baselineUsd: number;
    inputsUsed: string[];
    inputsMissing: string[];
    executionCapacityVerified: false;
    assumptions?: string[];
  };
  [key: string]: unknown;
}

export interface OracleWatchTarget {
  symbol: string;
  chain?: string;
}

export interface OracleWatchResult {
  symbol: string;
  chain: string | null;
  verdict: OracleWatchVerdict;
  recommendation: OracleWatchRecommendation;
  reason: string;
  reasonCodes: string[];
  evaluatedAt: string;
  attestation?: SignedAttestation | null;
  [key: string]: unknown;
}

export interface ExecutionReceiptRequest {
  preTradeUid: string;
  requestHash: string;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  settlementChainId: number;
  participantCount: number;
  sourceGroupCount: number;
  preTradeSignedAt: number;
  quotedPrice: number;
  txHash: string;
  taker?: string;
  maxSlippageBps?: 50;
  action?: string;
  quotedAmountUsd?: number;
  executedAmountUsd?: number;
  actualFeeUsd?: number;
  mevRiskScore?: number;
  quoteVenueIndependent?: boolean;
  quoteBasis?: 'PREV_BLOCK_CLOSE' | 'PRE_SWAP_IN_BLOCK' | 'ORACLE_CONSENSUS' | 'UNSPECIFIED';
  quoteBlockNumber?: number;
  priceStateAgeAtExecSeconds?: number;
  claimRole?: 'FIRST_PARTY_EXECUTION' | 'THIRD_PARTY_OBSERVATION';
  destinationPreTradeUid?: string;
  preTradeAttestations?: {
    source: SignedAttestation;
    destination: SignedAttestation;
  };
}

export interface ExecutionReceiptResult {
  attestation: SignedAttestation;
  executionStatus: string;
  bindingMode: 'VERIFIED' | 'SELF_REPORTED' | null;
  binding: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResponseMeta {
  path: string;
  status: number;
  success: boolean;
  requestId?: string;
  creditCost?: number;
  /** Snapshot before this request; concurrent requests can change the balance. */
  creditBalance?: number;
  balanceBasis: 'before_request_snapshot';
  retryAfterSeconds?: number;
}

export interface FreshnessProfile {
  maxSourceAgeSeconds?: number;
  maxAssessmentAgeSeconds?: number;
  minimumRemainingValiditySeconds?: number;
}

export interface FreshnessCheck {
  satisfied: boolean;
  checkedAt: number;
  reasons: string[];
  assessmentAgeSeconds: number | null;
  sourceAgeSeconds: number | null;
  remainingValiditySeconds: number | null;
}

export interface AssessmentDiagnostic {
  side: 'source' | 'destination' | 'workflow';
  category:
    | 'market_risk'
    | 'evidence_insufficient'
    | 'freshness'
    | 'scope_unavailable'
    | 'budget'
    | 'service'
    | 'binding'
    | 'unknown';
  code: string;
  action: 'review' | 'refresh' | 'retry' | 'check_configuration' | 'restore_budget';
  /** Hash binding is not a verification of the signer's signature or trust root. */
  origin: 'reason_codes_hash_bound' | 'response_metadata' | 'local_policy' | 'service_error';
  message?: string;
}

export interface PreTradeRecheckRequest extends Omit<PreTradeRequest, 'schemaVersion'> {
  schemaVersion?: 2 | 3;
  originalUid: string;
  originalRequestHash: `0x${string}`;
  originalConsensusPrice?: number;
  maxDriftPct?: number;
}

export interface PreTradeRecheckResult extends PreTradeResult {
  recheck: SignedAttestation | null;
  originalUid: string;
  originalRequestHash: `0x${string}`;
  driftSinceOriginalPct: number | null;
  stillValid: boolean;
  stillValidReason: string;
}

export interface RefreshedSwapAssessment {
  assessment: SwapAssessment;
  sourceRecheck: PreTradeRecheckResult | null;
  destinationRecheck: PreTradeRecheckResult | null;
  signalValidity: boolean;
  proofAvailability: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
  changedFields: string[];
  /** A refreshed pair is a new commitment. Existing authorization is never migrated. */
  requiresReauthorization: boolean;
}

export interface InsightClientOptions {
  apiKey: string;
  /** Defaults to https://www.oracleinsight.xyz. */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  /** Defaults to 15 seconds. */
  timeoutMs?: number;
  /** Observational only: callback errors cannot turn a completed request into a retry. */
  onResponseMeta?(meta: ResponseMeta): void | Promise<void>;
}

export interface GuardPolicy {
  /** Defaults to DANGER and BLOCK. */
  blockedPreTradeVerdicts?: readonly SafetyVerdict[];
  /** Defaults to true. When enabled, a Watch `halt` is remembered by this Guard. */
  blockOnWatchHalt?: boolean;
}

export interface GuardOptions extends InsightClientOptions {
  policy?: GuardPolicy;
  freshness?: FreshnessProfile;
}

export interface GuardDecision {
  allowed: boolean;
  result: PreTradeResult;
}

/** Advisory only: callers remain responsible for deciding whether to execute. */
export type TransactionRecommendation =
  | 'RECOMMENDED'
  | 'CONDITIONALLY_RECOMMENDED'
  | 'REVIEW_REQUIRED'
  | 'NOT_RECOMMENDED'
  | 'UNASSESSABLE';

export interface SwapAssessmentRequest {
  source: PreTradeRequest;
  destination: PreTradeRequest;
  watchTarget?: OracleWatchTarget;
  receipt: SwapReceiptOptions;
  freshness?: FreshnessProfile;
}

/**
 * A non-intervening assessment. It never submits, signs, or blocks a transaction.
 * `receiptDraft` is retained so the caller can later request execution evidence.
 */
export interface SwapAssessment {
  schema: 'insight.swap-assessment.v1';
  diagnostics?: AssessmentDiagnostic[];
  freshness?: { source: FreshnessCheck | null; destination: FreshnessCheck | null };
  freshnessProfile?: FreshnessProfile;
  recommendation: TransactionRecommendation;
  reasonCodes: string[];
  sourcePreTrade: PreTradeResult | null;
  destinationPreTrade: PreTradeResult | null;
  watchHalted: boolean;
  constraints: {
    maxSlippageBps: number;
    recommendedMaxPositionUsd: number | null;
    validUntil: number | null;
  };
  contextCommitment: PriorSealContextCommitment | null;
  receiptDraft: Omit<ExecutionReceiptRequest, 'txHash' | 'taker'> | null;
  errors: {
    source?: JointEvidenceError;
    destination?: JointEvidenceError;
    binding?: JointEvidenceError;
  };
}

export interface SubmittedTransaction {
  txHash: string;
  taker?: string;
}

export interface PreparedExactCallTransaction {
  chainId: number;
  from: string;
  to: string;
  data: `0x${string}`;
  value?: bigint | number | string;
  nonce: bigint | number | string;
  /** Atomic source amount. Signed as descriptive context; calldata remains authoritative. */
  sourceAmount: bigint | number | string;
}

export interface PriorSealContextCommitment {
  namespace: string;
  algorithm: 'keccak256' | 'sha256';
  digest: `0x${string}`;
}

export interface PriorSealIntent {
  schema: 'priorseal.intent.v2';
  executionProfile: 'priorseal.execution-profile.exact-call.v1';
  intentId: string;
  intentHash?: string;
  chainId: number;
  action: 'CONTRACT_CALL';
  asset: string;
  amount: string;
  sender: string;
  recipient: string;
  validUntil: number;
  nonce: string;
  callTarget: string;
  calldataHash: `0x${string}`;
  transactionValue: string;
  constraints?: { minConfirmations?: number };
  contextCommitments?: PriorSealContextCommitment[];
}

export interface PriorSealAuthorization {
  schema: 'priorseal.authorization.v2';
  domain: string;
  authorizationId: string;
  intent: PriorSealIntent;
  intentHash: string;
  principal: { type: 'user' | 'organization'; id: string; account: string };
  authorizer: { type: 'eip712' | 'eip1271'; address: string };
  delegate: { agentId: string; executor: string };
  issuedAt: number;
  notBefore: number;
  expiresAt: number;
  authorizationNonce: `0x${string}`;
  maxUses: '1';
  audience: string;
  policyHash: string;
  signature?: string;
}

export interface PriorSealPreparedAuthorization {
  authorization: PriorSealAuthorization;
  typedData: Record<string, unknown>;
  requestId?: string;
}

export interface PriorSealAcceptedAuthorization {
  authorization: PriorSealAuthorization;
  acceptance: Record<string, unknown>;
  requestId?: string;
  [key: string]: unknown;
}

export interface PriorSealObservationJob {
  jobId: string;
  state: 'QUEUED' | 'RUNNING' | 'RETRY_WAIT' | 'COMPLETED' | 'UNDETERMINED' | 'FAILED' | string;
  attempts: number;
  observation: { txHash?: string; status: string; [key: string]: unknown } | null;
  result?: PriorSealObservationResult | null;
  error?: { code: string; message: string } | null;
  [key: string]: unknown;
}

export interface PriorSealObservationResult {
  observation: { txHash?: string; status: string; [key: string]: unknown };
  receipt: {
    receiptId: string;
    execution?: { txHash?: string };
    compliance?: {
      status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_ASSESSABLE' | string;
      reasonCodes?: string[];
    };
    binding?: { bound?: boolean; reasonCodes?: string[]; [key: string]: unknown };
    [key: string]: unknown;
  } | null;
  verification?: {
    valid: boolean;
    code: string;
    complianceStatus?: string;
    [key: string]: unknown;
  };
  requestId?: string;
  observationJob?: PriorSealObservationJob;
}

export interface PriorSealApi {
  prepareAuthorization(
    input: Omit<
      PriorSealAuthorization,
      'schema' | 'domain' | 'authorizationId' | 'intentHash' | 'policyHash' | 'signature'
    >,
    signal?: AbortSignal
  ): Promise<PriorSealPreparedAuthorization>;
  acceptAuthorization(
    authorization: PriorSealAuthorization,
    signal?: AbortSignal
  ): Promise<PriorSealAcceptedAuthorization>;
  observeExecution(
    input: { authorizationId: string; chainId: number; txHash: string; confirmations?: number },
    signal?: AbortSignal
  ): Promise<PriorSealObservationResult>;
  getObservationJob?(jobId: string, signal?: AbortSignal): Promise<PriorSealObservationJob>;
  waitForObservationJob?(
    jobId: string,
    options?: { signal?: AbortSignal; pollIntervalMs?: number; timeoutMs?: number }
  ): Promise<PriorSealObservationJob>;
}

export interface PriorSealFlowOptions {
  client: PriorSealApi;
  principal: { type: 'user' | 'organization'; id: string; account: string };
  /** Defaults to an EOA authorizer at principal.account. Use eip1271 for a Safe or contract account. */
  authorizer?: { type: 'eip712' | 'eip1271'; address?: string };
  agentId: string;
  /** Must not exceed the exact transaction's own deadline. */
  validUntil?: number;
  intentId?: string;
  issuedAt?: number;
  authorizationNonce?: `0x${string}`;
  confirmations?: number;
  audience?: string;
  signal?: AbortSignal;
  signAuthorization(input: PriorSealPreparedAuthorization): Promise<string>;
}

export interface SwapReceiptOptions {
  settlementChainId: number;
  maxSlippageBps?: 50;
  action?: string;
  quotedAmountUsd?: number;
  executedAmountUsd?: number;
  actualFeeUsd?: number;
  mevRiskScore?: number;
  quoteVenueIndependent?: boolean;
  quoteBasis?: 'PREV_BLOCK_CLOSE' | 'PRE_SWAP_IN_BLOCK' | 'ORACLE_CONSENSUS' | 'UNSPECIFIED';
  quoteBlockNumber?: number;
  priceStateAgeAtExecSeconds?: number;
  claimRole?: 'FIRST_PARTY_EXECUTION' | 'THIRD_PARTY_OBSERVATION';
}

export interface GuardedSwapRequest {
  /** Source-side gate. For a complete receipt this must be a v2/v3 check. */
  source: PreTradeRequest;
  /** Destination-side gate. It must describe the inverse asset pair. */
  destination: PreTradeRequest;
  /** Optional Watch target. When this Guard has recorded a `halt` for it, no transaction is submitted. */
  watchTarget?: OracleWatchTarget;
  receipt: SwapReceiptOptions;
  freshness?: FreshnessProfile;
  submitTransaction(context: {
    sourcePreTrade: PreTradeResult;
    destinationPreTrade: PreTradeResult;
  }): Promise<SubmittedTransaction>;
}

export interface PriorSealGuardedSwapRequest extends Omit<GuardedSwapRequest, 'submitTransaction'> {
  priorSeal: PriorSealFlowOptions;
  prepareTransaction(context: {
    sourcePreTrade: PreTradeResult;
    destinationPreTrade: PreTradeResult;
  }): Promise<PreparedExactCallTransaction>;
  submitTransaction(context: {
    sourcePreTrade: PreTradeResult;
    destinationPreTrade: PreTradeResult;
    transaction: PreparedExactCallTransaction;
    priorSealAuthorization: PriorSealAcceptedAuthorization;
  }): Promise<SubmittedTransaction>;
}

export interface AssessedSwapAuthorizationRequest {
  assessment: SwapAssessment;
  transaction: PreparedExactCallTransaction;
  priorSeal: PriorSealFlowOptions;
}

export interface AssessedSwapAuthorizationResult {
  assessment: SwapAssessment;
  transaction: PreparedExactCallTransaction;
  priorSealAuthorization: PriorSealAcceptedAuthorization;
}

export interface AssessedSwapExecutionVerificationRequest {
  assessment: SwapAssessment;
  transaction: PreparedExactCallTransaction;
  priorSealAuthorization: PriorSealAcceptedAuthorization;
  txHash: string;
  taker?: string;
  priorSeal: {
    client: PriorSealApi;
    confirmations?: number;
    signal?: AbortSignal;
  };
}

export type JointAssuranceConclusion =
  | 'EXECUTED_AS_ASSESSED_AND_AUTHORIZED'
  | 'EXECUTED_AGAINST_RECOMMENDATION'
  | 'EXECUTED_WITHOUT_REQUIRED_REVIEW_EVIDENCE'
  | 'EXECUTED_OUTSIDE_ASSESSED_CONSTRAINTS'
  | 'AUTHORIZATION_MISMATCH'
  | 'EVIDENCE_TRANSACTION_MISMATCH'
  | 'EXECUTION_PENDING'
  | 'PARTIAL_EVIDENCE'
  | 'UNASSESSABLE';

export interface JointAssuranceReport {
  schema: 'insight.priorseal-assurance-report.v1';
  verificationOrigin: 'service_response';
  independentVerificationPerformed: false;
  limitations: string[];
  recommendation: TransactionRecommendation;
  recommendationFollowed: boolean | null;
  evidenceStatus: 'COMPLETE' | 'PRIORSEAL_PENDING' | 'PARTIAL' | 'UNAVAILABLE';
  /** Presence is separate from validity: two present but invalid artifacts are still available. */
  evidenceAvailability: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
  expectedTxHash: string;
  transactionCorrelation: boolean | null;
  assuranceValid: boolean | null;
  insightExecutionStatus: string | null;
  priorSealReceiptValid: boolean | null;
  priorSealComplianceStatus: string | null;
  exactCallMatched: boolean | null;
  constraintsSatisfied: boolean | null;
  conclusion: JointAssuranceConclusion;
  reasonCodes: string[];
}

export interface AssessedSwapExecutionVerificationResult {
  insightReceipt: ExecutionReceiptResult | null;
  priorSealEvidence: PriorSealObservationResult | null;
  evidenceErrors: { insight?: JointEvidenceError; priorSeal?: JointEvidenceError };
  report: JointAssuranceReport;
  checkpoint: JointEvidenceCheckpoint;
}

export interface JointEvidenceError {
  code?: string;
  status?: number;
  message: string;
}

export type PriorSealGuardedSwapResult =
  | Extract<GuardedSwapResult, { status: 'blocked' }>
  | {
      status: 'executed';
      checkpoint: JointEvidenceCheckpoint;
      verificationOrigin: 'service_response';
      independentVerificationPerformed: false;
      sourcePreTrade: PreTradeResult;
      destinationPreTrade: PreTradeResult;
      transaction: SubmittedTransaction;
      preparedTransaction: PreparedExactCallTransaction;
      priorSealAuthorization: PriorSealAcceptedAuthorization;
      insightReceipt: ExecutionReceiptResult | null;
      priorSealEvidence: PriorSealObservationResult | null;
      evidenceStatus: 'COMPLETE' | 'PRIORSEAL_PENDING' | 'PARTIAL' | 'UNAVAILABLE';
      evidenceAvailability: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
      transactionCorrelation: boolean | null;
      assuranceValid: boolean | null;
      evidenceErrors: { insight?: JointEvidenceError; priorSeal?: JointEvidenceError };
    };

export type GuardedSwapResult =
  | {
      status: 'blocked';
      stage: 'source_pre_trade' | 'destination_pre_trade' | 'watch_halt';
      sourcePreTrade?: PreTradeResult;
      destinationPreTrade?: PreTradeResult;
    }
  | {
      status: 'executed';
      sourcePreTrade: PreTradeResult;
      destinationPreTrade: PreTradeResult;
      transaction: SubmittedTransaction;
      receipt: ExecutionReceiptResult;
    }
  | {
      /** The transaction is already on-chain; retry only receipt issuance. */
      status: 'executed_receipt_pending';
      sourcePreTrade: PreTradeResult;
      destinationPreTrade: PreTradeResult;
      transaction: SubmittedTransaction;
      receiptRequest: ExecutionReceiptRequest;
      evidenceError: JointEvidenceError;
    };

export interface WatchOptions {
  /** Defaults to 15 minutes, matching Insight's published snapshot cadence. */
  intervalMs?: number;
  /** Faster polling is costly and generally cannot return fresher source data. */
  allowFasterPolling?: boolean;
  /** Defaults to true: stop polling after the first `halt` signal. */
  stopOnHalt?: boolean;
  signal?: AbortSignal;
  onSignal?(signal: OracleWatchResult): void | Promise<void>;
  /** Bind this to the agent's pause/cancel operation. */
  onHalt?(signal: OracleWatchResult): void | Promise<void>;
  onError?(error: unknown): void | Promise<void>;
  stateAdapter?: WatchStateAdapter;
  /** Defaults to 2 healthy observations. Recovery never clears an execution halt. */
  recoveryHealthySamples?: number;
  /** Defaults to twice intervalMs; a stale last-good sample becomes unavailable. */
  unavailableAfterMs?: number;
  onStateChange?(state: WatchState): void | Promise<void>;
  onIncident?(state: WatchState): void | Promise<void>;
  onRecoveryReady?(state: WatchState): void | Promise<void>;
}

export interface WatchHandle {
  readonly target: OracleWatchTarget;
  readonly done: Promise<void>;
  refresh(): Promise<OracleWatchResult>;
  getState(): WatchState;
  /** Explicit acknowledgement; never calls a wallet or resumes a transaction. */
  acknowledgeRecovery(): Promise<void>;
  stop(): void;
}

/** JSON-safe evidence-only recovery input; never contains API keys or a submit callback. */
export interface JointEvidenceCheckpoint {
  schema: 'insight.joint-evidence-checkpoint.v1';
  assessment: SwapAssessment;
  transaction: PreparedExactCallTransaction;
  priorSealAuthorization: PriorSealAcceptedAuthorization;
  txHash: string;
  taker?: string;
  confirmations?: number;
  insightReceipt: ExecutionReceiptResult | null;
  priorSealEvidence: PriorSealObservationResult | null;
}

export interface WatchState {
  schema: 'insight.watch-state.v1';
  targetKey: string;
  status: 'running' | 'degraded' | 'halted' | 'recovering' | 'monitor_unavailable';
  halted: boolean;
  incidentId: string | null;
  incidentKind: 'market' | 'evidence' | 'budget' | 'service' | null;
  consecutiveHealthy: number;
  lastSuccessAt: number | null;
  nextCheckAt: number | null;
  lastSignalValidUntil: number | null;
  updatedAt: number;
}

export interface WatchStateAdapter {
  load(key: string): Promise<WatchState | null>;
  save(key: string, state: WatchState): Promise<void>;
}

export interface CoverageRequest {
  asset?: string;
  chainId?: number;
  /** Explicit opt-in live probe; default is registry-only. */
  probe?: boolean;
  maxSourceAgeSeconds?: number;
}
export interface CoverageResult {
  diagnostic?: {
    asset: string;
    evidenceChainId: number;
    evidenceChain: string;
    settlementChainEvaluated: false;
    sampledAt: string;
    mode: 'live_probe' | 'registry';
    signed: false;
    status: 'NOT_PROBED' | 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE';
    freshnessStatus: 'NOT_EVALUATED' | 'SUFFICIENT' | 'INSUFFICIENT_FRESH_EVIDENCE';
    requiredParticipantCount: number;
    requiredNonDerivedGroupCount: number;
    includedCount: number | null;
    freshCount: number | null;
    providers: Array<{
      provider: string;
      sourceGroup: string;
      registered: boolean;
      responding: boolean | null;
      fresh: boolean | null;
      included: boolean | null;
      dataAgeSeconds: number | null;
      reason: string | null;
      [key: string]: unknown;
    }>;
    nextAction: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
