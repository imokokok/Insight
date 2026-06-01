export enum FailureMode {
  NONE = 'none',
  SOURCE_UNAVAILABLE = 'source_unavailable',
  STALE_TIMESTAMP = 'stale_timestamp',
  DELAYED_UPDATE = 'delayed_update',
  FALLBACK_METADATA = 'fallback_metadata',
  PARTIAL_DATA = 'partial_data',
  INVALID_RESPONSE = 'invalid_response',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
}

export const FAILURE_MODE_VALUES: readonly FailureMode[] = Object.values(FailureMode);

export interface ConsensusContext {
  consensusPrice: number;
  agreement: number;
  participantCount: number;
  isOutlier: boolean;
  excludedProviders: string[];
  method: string;
  confidenceLevel: string;
}

export interface OracleSignalVector {
  freshness: number;
  sourceReliability: number;
  metadataCompleteness: number;
  consistency: number;
  auditStatus: number;
}

export function classifyFailureMode(params: {
  isAvailable: boolean;
  dataAgeSeconds: number;
  isMetadataFallback: boolean;
  hasPartialData: boolean;
  isInvalidResponse: boolean;
  isNetworkError: boolean;
  isTimeout: boolean;
  isRateLimited: boolean;
  staleThresholdSeconds?: number;
  delayedThresholdSeconds?: number;
}): FailureMode {
  const {
    isAvailable,
    dataAgeSeconds,
    isMetadataFallback,
    hasPartialData,
    isInvalidResponse,
    isNetworkError,
    isTimeout,
    isRateLimited,
    staleThresholdSeconds = 300,
    delayedThresholdSeconds = 60,
  } = params;

  if (!isAvailable) return FailureMode.SOURCE_UNAVAILABLE;
  if (isNetworkError) return FailureMode.NETWORK_ERROR;
  if (isTimeout) return FailureMode.TIMEOUT;
  if (isRateLimited) return FailureMode.RATE_LIMITED;
  if (isInvalidResponse) return FailureMode.INVALID_RESPONSE;
  if (dataAgeSeconds > staleThresholdSeconds) return FailureMode.STALE_TIMESTAMP;
  if (dataAgeSeconds > delayedThresholdSeconds) return FailureMode.DELAYED_UPDATE;
  if (isMetadataFallback) return FailureMode.FALLBACK_METADATA;
  if (hasPartialData) return FailureMode.PARTIAL_DATA;

  return FailureMode.NONE;
}

function calculateFreshnessSignal(
  dataAgeSeconds: number,
  staleThresholdSeconds: number = 300
): number {
  if (dataAgeSeconds <= 0) return 1;
  if (dataAgeSeconds >= staleThresholdSeconds) return 0;
  return Math.max(0, 1 - dataAgeSeconds / staleThresholdSeconds);
}

function calculateSourceReliabilitySignal(params: {
  isOnChain: boolean;
  hasVerification: boolean;
  providerUptime: number;
}): number {
  const { isOnChain, hasVerification, providerUptime } = params;
  let score = 0;
  if (isOnChain) score += 0.35;
  if (hasVerification) score += 0.35;
  score += (Math.min(providerUptime, 100) / 100) * 0.3;
  return Math.min(1, score);
}

function calculateMetadataCompletenessSignal(params: {
  hasConfidence: boolean;
  hasTimestamp: boolean;
  hasVerification: boolean;
  hasDecimals: boolean;
  hasSource: boolean;
  totalPossibleFields: number;
}): number {
  const {
    hasConfidence,
    hasTimestamp,
    hasVerification,
    hasDecimals,
    hasSource,
    totalPossibleFields,
  } = params;
  let present = 0;
  if (hasConfidence) present++;
  if (hasTimestamp) present++;
  if (hasVerification) present++;
  if (hasDecimals) present++;
  if (hasSource) present++;
  return Math.min(1, present / Math.max(totalPossibleFields, 1));
}

export function calculateConsistencySignal(params: {
  deviationFromConsensus: number;
  isOutlier: boolean;
  agreement: number;
}): number {
  const { deviationFromConsensus, isOutlier, agreement } = params;
  if (isOutlier) return Math.max(0, 0.3 * agreement);
  const deviationPenalty = Math.min(1, Math.abs(deviationFromConsensus) / 5);
  return Math.max(0, agreement * (1 - deviationPenalty));
}

function calculateAuditStatusSignal(params: {
  hasOnChainVerification: boolean;
  verificationMethod: string;
  blockNumber: number | null;
}): number {
  const { hasOnChainVerification, verificationMethod, blockNumber } = params;
  if (!hasOnChainVerification) return 0.2;
  let score = 0.6;
  if (verificationMethod === 'latestRoundData' || verificationMethod === 'readDataFeed')
    score += 0.2;
  if (blockNumber !== null && blockNumber > 0) score += 0.2;
  return Math.min(1, score);
}

export function buildSignalVector(params: {
  dataAgeSeconds: number;
  isOnChain: boolean;
  hasVerification: boolean;
  providerUptime: number;
  hasConfidence: boolean;
  hasTimestamp: boolean;
  hasDecimals: boolean;
  hasSource: boolean;
  totalPossibleFields?: number;
  deviationFromConsensus?: number;
  isOutlier?: boolean;
  agreement?: number;
  verificationMethod?: string;
  blockNumber?: number | null;
}): OracleSignalVector {
  const {
    dataAgeSeconds,
    isOnChain,
    hasVerification,
    providerUptime,
    hasConfidence,
    hasTimestamp,
    hasDecimals,
    hasSource,
    totalPossibleFields = 5,
    deviationFromConsensus = 0,
    isOutlier = false,
    agreement = 1,
    verificationMethod = '',
    blockNumber = null,
  } = params;

  return {
    freshness: calculateFreshnessSignal(dataAgeSeconds),
    sourceReliability: calculateSourceReliabilitySignal({
      isOnChain,
      hasVerification,
      providerUptime,
    }),
    metadataCompleteness: calculateMetadataCompletenessSignal({
      hasConfidence,
      hasTimestamp,
      hasVerification,
      hasDecimals,
      hasSource,
      totalPossibleFields,
    }),
    consistency: calculateConsistencySignal({ deviationFromConsensus, isOutlier, agreement }),
    auditStatus: calculateAuditStatusSignal({
      hasOnChainVerification: hasVerification,
      verificationMethod,
      blockNumber,
    }),
  };
}

export function getFailureModeLabel(mode: FailureMode): string {
  const labels: Record<FailureMode, string> = {
    [FailureMode.NONE]: 'Normal',
    [FailureMode.SOURCE_UNAVAILABLE]: 'Source Unavailable',
    [FailureMode.STALE_TIMESTAMP]: 'Stale Data',
    [FailureMode.DELAYED_UPDATE]: 'Delayed Update',
    [FailureMode.FALLBACK_METADATA]: 'Fallback Metadata',
    [FailureMode.PARTIAL_DATA]: 'Partial Data',
    [FailureMode.INVALID_RESPONSE]: 'Invalid Response',
    [FailureMode.NETWORK_ERROR]: 'Network Error',
    [FailureMode.TIMEOUT]: 'Timeout',
    [FailureMode.RATE_LIMITED]: 'Rate Limited',
  };
  return labels[mode] ?? mode;
}

export function getFailureModeSeverity(
  mode: FailureMode
): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  const severity: Record<FailureMode, 'none' | 'low' | 'medium' | 'high' | 'critical'> = {
    [FailureMode.NONE]: 'none',
    [FailureMode.FALLBACK_METADATA]: 'low',
    [FailureMode.PARTIAL_DATA]: 'low',
    [FailureMode.DELAYED_UPDATE]: 'medium',
    [FailureMode.STALE_TIMESTAMP]: 'high',
    [FailureMode.SOURCE_UNAVAILABLE]: 'critical',
    [FailureMode.INVALID_RESPONSE]: 'high',
    [FailureMode.NETWORK_ERROR]: 'high',
    [FailureMode.TIMEOUT]: 'medium',
    [FailureMode.RATE_LIMITED]: 'medium',
  };
  return severity[mode] ?? 'none';
}
