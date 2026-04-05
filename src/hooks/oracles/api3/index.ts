'use client';

export type {
  RequestPriority,
  API3DataType,
  CacheStatus,
  UseAPI3PriceOptions,
  UseAPI3HistoricalOptions,
  UseAPI3QualityMetricsReturn,
  UseAPI3OHLCOptions,
  UseAPI3AllDataOptions,
  UseAPI3AllDataReturn,
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
  CoveragePoolEvent,
  CoveragePoolDetails,
  CoveragePoolClaim,
  StakerReward,
  OEVNetworkStats,
  OEVAuction,
  API3Alert,
  AlertThreshold,
} from './types';
export { getAPI3Key } from './types';

export { useAPI3Price, useAPI3OHLC } from './useAPI3Price';
export { useAPI3Historical, useAPI3QualityHistory } from './useAPI3Historical';
export { useAPI3Alerts, useAPI3AlertHistory, useAPI3AlertThresholds } from './useAPI3Alerts';
export { useAPI3QualityMetrics, useAPI3Deviations, useAPI3SourceTrace } from './useAPI3Quality';
export { useAPI3Staking, useAPI3StakerRewards } from './useAPI3Staking';
export {
  useAPI3DapiCoverage,
  useAPI3CoverageEvents,
  useAPI3CoveragePoolDetails,
  useAPI3CoveragePoolClaims,
} from './useAPI3Coverage';
export { useAPI3OEVStats, useAPI3OEVAuctions } from './useAPI3OEV';
export {
  useAPI3AirnodeStats,
  useAPI3Latency,
  useAPI3GasFees,
  useAPI3FirstParty,
  useAPI3CrossOracle,
} from './useAPI3Network';
export { useCacheStatus, useAPI3OfflineStatus, useAPI3CacheActions } from './useAPI3Cache';
export { useAPI3AllData } from './useAPI3AllData';
