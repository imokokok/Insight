import { type DataStatus } from './constants';
import { type OracleProvider, type Blockchain } from './enums';

export type OracleErrorCode =
  | 'SYMBOL_NOT_SUPPORTED'
  | 'NO_DATA_AVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_UNAVAILABLE'
  | 'STALE_DATA'
  | 'INVALID_PRICE'
  | 'INSUFFICIENT_DATA'
  | 'INVALID_SYMBOL'
  | 'REAL_DATA_NOT_AVAILABLE'
  | 'API3_ERROR'
  | 'API3_PRICE_NOT_AVAILABLE'
  | 'API3_PRICE_ERROR'
  | 'API3_HISTORICAL_PRICES_NOT_AVAILABLE'
  | 'API3_HISTORICAL_PRICES_ERROR'
  | 'API3_OHLC_PRICES_NOT_AVAILABLE'
  | 'API3_OHLC_PRICES_ERROR'
  | 'REAL_DATA_REQUIRED'
  | 'MOCK_DATA_DISABLED'
  | 'CHAINLINK_ERROR'
  | 'CHAINLINK_HISTORICAL_ERROR'
  | 'BINANCE_NO_DATA'
  | 'DIA_ERROR'
  | 'DIA_HISTORICAL_ERROR'
  | 'PYTH_ERROR'
  | 'FETCH_ERROR'
  | 'REDSTONE_ERROR'
  | 'PRICE_FETCH_ERROR'
  | 'UMA_SYMBOL_NOT_SUPPORTED'
  | 'HISTORICAL_PRICE_ERROR'
  | 'UMA_HISTORICAL_PRICES_NOT_AVAILABLE'
  | 'UMA_HISTORICAL_PRICES_ERROR'
  | 'UMA_SUBGRAPH_NOT_CONFIGURED'
  | 'UMA_NO_VALIDATORS'
  | 'UMA_VALIDATORS_ERROR'
  | 'UMA_NO_DISPUTES'
  | 'UMA_DISPUTES_ERROR'
  | 'UMA_DISPUTE_TRENDS_NOT_AVAILABLE'
  | 'UMA_EARNINGS_TRENDS_NOT_AVAILABLE'
  | 'UMA_NETWORK_STATS_NOT_AVAILABLE'
  | 'UMA_VERIFICATION_ACTIVITY_NOT_AVAILABLE'
  | 'UMA_VALIDATOR_PERFORMANCE_HEATMAP_NOT_AVAILABLE'
  | 'UMA_VALIDATOR_PERFORMANCE_HEATMAP_BY_DAY_NOT_AVAILABLE'
  | 'UMA_DISPUTE_EFFICIENCY_STATS_NOT_AVAILABLE'
  | 'UMA_DATA_QUALITY_SCORE_NOT_AVAILABLE'
  | 'UMA_VALIDATOR_HISTORY_NOT_AVAILABLE'
  | 'UMA_STAKING_CALCULATION_NOT_AVAILABLE'
  | 'UMA_STAKING_REWARDS_CALCULATION_NOT_AVAILABLE'
  | 'UMA_VALIDATOR_EARNINGS_ATTRIBUTION_NOT_AVAILABLE'
  | 'UMA_NETWORK_EARNINGS_ATTRIBUTION_NOT_AVAILABLE'
  | 'UMA_EARNINGS_SOURCE_BREAKDOWN_NOT_AVAILABLE'
  | 'UMA_DISPUTE_AMOUNT_DISTRIBUTION_NOT_AVAILABLE'
  | 'WINKLINK_ERROR'
  | 'WINKLINK_HISTORICAL_ERROR'
  | 'TRON_ECOSYSTEM_ERROR'
  | 'STAKING_ERROR'
  | 'GAMING_ERROR'
  | 'NETWORK_STATS_ERROR'
  | 'RISK_METRICS_ERROR';

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
