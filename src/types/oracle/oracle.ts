import { type DataStatus, type TrendDirection } from './constants';
import { type OracleProvider, type Blockchain } from './enums';

export type OracleErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_UNAVAILABLE'
  | 'STALE_DATA'
  | 'INVALID_PRICE'
  | 'INSUFFICIENT_DATA';

export interface OracleError {
  message: string;
  provider: OracleProvider;
  code?: OracleErrorCode;
  timestamp?: number;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export interface DataQualityMetrics {
  freshness: {
    lastUpdated: number;
    updateInterval: number;
    isStale: boolean;
    stalenessDuration?: number;
  };
  completeness: {
    successCount: number;
    totalCount: number;
    percentage: number;
  };
  reliability: {
    historicalAccuracy: number;
    responseSuccessRate: number;
    uptime: number;
    avgResponseTime?: number;
  };
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    status: DataStatus;
  };
}

export interface OracleConfig {
  provider: OracleProvider;
  chain?: Blockchain;
  symbol: string;
  updateInterval?: number;
  heartbeat?: number;
  decimals?: number;
}

export interface OracleHealth {
  provider: OracleProvider;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  issues: Array<{
    type: 'stale_data' | 'high_deviation' | 'network_issue' | 'rate_limit';
    severity: 'warning' | 'critical';
    message: string;
    timestamp: number;
  }>;
  uptime: number;
  avgLatency: number;
}

export type OracleCategory = 'decentralized' | 'hybrid' | 'centralized';

export interface OracleMetadata {
  provider: OracleProvider;
  name: string;
  category: OracleCategory;
  website: string;
  documentation: string;
  supportedChains: Blockchain[];
  supportedSymbols: string[];
  updateFrequency: number;
  latency: number;
  decentralizationScore: number;
  securityScore: number;
}
