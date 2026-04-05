'use client';

import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import type { OHLCVDataPoint } from '@/lib/indicators';
import type {
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
  CoveragePoolEvent,
  CoveragePoolDetails,
  CoveragePoolClaim,
  API3Alert,
  AlertThreshold,
} from '@/lib/oracles/api3';
import type { GasFeeData } from '@/types/comparison';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

export type RequestPriority = 'critical' | 'high' | 'normal' | 'low';

export type API3DataType =
  | 'price'
  | 'historical'
  | 'airnodeStats'
  | 'dapiCoverage'
  | 'staking'
  | 'firstParty'
  | 'latency'
  | 'quality'
  | 'deviations'
  | 'sourceTrace'
  | 'coverageEvents'
  | 'gasFees'
  | 'ohlc'
  | 'qualityHistory'
  | 'crossOracle'
  | 'alerts'
  | 'alertHistory'
  | 'alertThresholds'
  | 'coveragePoolDetails'
  | 'coveragePoolClaims';

export const getAPI3Key = (type: API3DataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['api3', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

export interface CacheStatus {
  isStale: boolean;
  lastUpdated: number | null;
  source: 'network' | 'cache' | 'offline' | null;
  isOffline: boolean;
}

export interface UseAPI3PriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export interface UseAPI3HistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export interface UseAPI3QualityMetricsReturn {
  freshness: { lastUpdated: Date; updateInterval: number };
  completeness: { successCount: number; totalCount: number };
  reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
}

export interface UseAPI3OHLCOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export interface UseAPI3AllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export interface UseAPI3AllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  airnodeStats: AirnodeNetworkStats | undefined;
  dapiCoverage: DAPICoverage | undefined;
  staking: StakingData | undefined;
  firstParty: FirstPartyOracleData | undefined;
  latency: number[];
  qualityMetrics: UseAPI3QualityMetricsReturn | undefined;
  hourlyActivity: number[];
  deviations: DAPIPriceDeviation[];
  sourceTrace: DataSourceInfo[];
  coverageEvents: CoveragePoolEvent[];
  gasFees: GasFeeData[];
  ohlc: OHLCVDataPoint[];
  qualityHistory: QualityDataPoint[];
  crossOracle: {
    oracle: OracleProvider;
    responseTime: number;
    accuracy: number;
    availability: number;
    costEfficiency: number;
    updateFrequency: number;
  }[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
  cacheStatus: {
    isOffline: boolean;
    lastUpdated: number | null;
  };
  queueStats: {
    queueLength: number;
    pendingCount: number;
    currentConcurrent: number;
    maxConcurrent: number;
  };
}

export type {
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
  CoveragePoolEvent,
  CoveragePoolDetails,
  CoveragePoolClaim,
  API3Alert,
  AlertThreshold,
};
