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

export interface InsightClientOptions {
  apiKey: string;
  /** Defaults to https://www.oracleinsight.xyz. */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
}

export interface GuardPolicy {
  /** Defaults to DANGER and BLOCK. */
  blockedPreTradeVerdicts?: readonly SafetyVerdict[];
  /** Defaults to true. When enabled, a Watch `halt` is remembered by this Guard. */
  blockOnWatchHalt?: boolean;
}

export interface GuardOptions extends InsightClientOptions {
  policy?: GuardPolicy;
}

export interface GuardDecision {
  allowed: boolean;
  result: PreTradeResult;
}

export interface SubmittedTransaction {
  txHash: string;
  taker?: string;
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
  submitTransaction(context: {
    sourcePreTrade: PreTradeResult;
    destinationPreTrade: PreTradeResult;
  }): Promise<SubmittedTransaction>;
}

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
}

export interface WatchHandle {
  readonly target: OracleWatchTarget;
  readonly done: Promise<void>;
  refresh(): Promise<OracleWatchResult>;
  stop(): void;
}
