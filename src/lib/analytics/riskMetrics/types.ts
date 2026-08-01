import { type OracleMarketData } from '@/lib/services/marketData/types';
import { createLogger } from '@/lib/utils/logger';

export const riskMetricsLogger = createLogger('riskMetrics');

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface HHIResult {
  value: number;
  level: RiskLevel;
  description: string;
  concentrationRatio: number;
}

export interface DiversificationResult {
  score: number;
  level: RiskLevel;
  description: string;
  factors: {
    chainDiversity: number;
    protocolDiversity: number;
    assetDiversity: number;
  };
}

export interface VolatilityResult {
  index: number;
  level: RiskLevel;
  description: string;
  annualizedVolatility: number;
  dailyVolatility: number;
}

export interface CorrelationRiskResult {
  score: number;
  level: RiskLevel;
  description: string;
  avgCorrelation: number;
  highCorrelationPairs: string[];
  correlationMatrix: number[][];
  oracleNames: string[];
}

export interface FreshnessRiskResult {
  score: number;
  level: RiskLevel;
  description: string;
  staleOracleCount: number;
  maxStalenessSeconds: number;
  staleOracles: Array<{ name: string; stalenessSeconds: number }>;
}

export interface ManipulationResistanceResult {
  score: number;
  level: RiskLevel;
  description: string;
  factors: {
    dataSourceDiversity: number;
    aggregationRobustness: number;
    updateFrequency: number;
    onChainVerification: number;
  };
}

export interface SharedDependencyResult {
  score: number;
  level: RiskLevel;
  description: string;
  sharedSourceGroups: Array<{
    source: string;
    oracles: string[];
  }>;
  systemicRiskFactor: number;
}

export interface RiskMetrics {
  hhi: HHIResult;
  diversification: DiversificationResult;
  volatility: VolatilityResult;
  correlationRisk: CorrelationRiskResult;
  freshnessRisk: FreshnessRiskResult;
  manipulationResistance: ManipulationResistanceResult;
  sharedDependency: SharedDependencyResult;
  overallRisk: {
    score: number;
    level: RiskLevel;
    timestamp: number;
    weights: RiskWeights;
  };
}

export interface RiskWeights {
  hhi: number;
  diversification: number;
  volatility: number;
  correlation: number;
  freshness: number;
  manipulationResistance: number;
  sharedDependency: number;
}

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  hhi: 0.15,
  diversification: 0.15,
  volatility: 0.15,
  correlation: 0.15,
  freshness: 0.15,
  manipulationResistance: 0.15,
  sharedDependency: 0.1,
};

export interface RiskMetricsInput {
  oracleData: OracleMarketData[];
  priceHistoriesByProvider: Map<string, number[]>;
  priceHistoryTimestampsByProvider?: Map<string, number[]>;
  oracleTimestamps: Array<{ name: string; timestamp: number }>;
  manipulationResistanceData: Array<{
    name: string;
    dataSources: number;
    updateFrequencySeconds: number;
    hasOnChainVerification: boolean;
    aggregationMethod: 'median' | 'weighted_average' | 'simple_average' | 'unknown';
  }>;
  sharedDependencyData: Array<{
    name: string;
    primaryDataSources: string[];
  }>;
  weights?: Partial<RiskWeights>;
}
