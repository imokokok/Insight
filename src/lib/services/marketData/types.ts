// 市场数据类型定义

export interface OracleMarketData {
  name: string;
  share: number;
  color: string;
  tvs: string;
  tvsValue: number;
  chains: number;
  protocols: number;
  avgLatency: number;
  accuracy: number;
  updateFrequency: number;
  change24h: number;
  change7d: number;
  change30d: number;
}

export interface AssetData {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  primaryOracle: string;
  oracleCount: number;
  priceSources: Array<{
    oracle: string;
    price: number;
    timestamp: number;
  }>;
}

export interface ChainBreakdown {
  chainId: string;
  chainName: string;
  tvs: number;
  tvsFormatted: string;
  share: number;
  protocols: number;
  color: string;
  change24h: number;
  change7d: number;
  topOracle: string;
  topOracleShare: number;
}

export interface ProtocolDetail {
  id: string;
  name: string;
  category: string;
  tvl: number;
  tvlFormatted: string;
  chains: string[];
  primaryOracle: string;
  oracleCount: number;
  change24h: number;
  change7d: number;
}

export interface AssetCategory {
  category: string;
  label: string;
  value: number;
  share: number;
  color: string;
  assets: string[];
  avgVolatility: number;
  avgLiquidity: number;
}

export interface ComparisonMetric {
  name: string;
  value: number;
  normalizedValue: number;
  unit: string;
  rank: number;
}

export interface ComparisonData {
  oracle: string;
  color: string;
  metrics: {
    tvs: ComparisonMetric;
    latency: ComparisonMetric;
    accuracy: ComparisonMetric;
    marketShare: ComparisonMetric;
    chains: ComparisonMetric;
    protocols: ComparisonMetric;
    updateFrequency: ComparisonMetric;
  };
  overallScore: number;
  rank: number;
}

export interface BenchmarkMetric {
  name: string;
  industryAverage: number;
  industryMedian: number;
  industryBest: number;
  unit: string;
  description: string;
}

export interface BenchmarkOracleValue {
  oracle: string;
  color: string;
  value: number;
  diffFromAverage: number;
  diffPercent: number;
  percentile: number;
}

export interface BenchmarkData {
  metric: BenchmarkMetric;
  oracleValues: BenchmarkOracleValue[];
}

export interface CorrelationPair {
  oracleA: string;
  oracleB: string;
  correlation: number;
  sampleSize: number;
  confidence: number;
}

export interface CorrelationData {
  oracles: string[];
  matrix: number[][];
  pairs: CorrelationPair[];
  timeRange: string;
  lastUpdated: string;
}

export interface RadarDataPoint {
  metric: string;
  fullMark: number;
  [oracleName: string]: string | number;
}

export interface TVSTrendData {
  date: string;
  chainlink: number;
  pyth: number;
  api3: number;
  redstone: number;
  supra: number;
  supraUpper: number;
  supraLower: number;
  [key: string]: string | number;
}

export interface MarketStats {
  totalTVS: number;
  totalChains: number;
  totalProtocols: number;
  totalAssets: number;
  avgUpdateLatency: number;
  marketDominance: number;
  oracleCount: number;
  change24h: number;
  chainsChange24h: number;
  protocolsChange24h: number;
  dominanceChange24h: number;
  latencyChange24h: number;
  oracleCountChange24h: number;
}

export interface ChainSupportData {
  name: string;
  chains: number;
  protocols: number;
  color: string;
}

export interface PriceAlert {
  id: string;
  asset: string;
  type: 'above' | 'below' | 'percent_change';
  price: number;
  enabled: boolean;
  channels: ('email' | 'push')[];
  createdAt: string;
  triggered?: boolean;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  asset: string;
  triggeredAt: string;
  price: number;
  acknowledged: boolean;
}

export interface AnomalyData {
  id: string;
  type:
    | 'price_spike'
    | 'price_drop'
    | 'volatility_spike'
    | 'trend_break'
    | 'volume_anomaly'
    | 'correlation_break';
  level: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  asset?: string;
  oracle?: string;
  value: number;
  expectedValue: number;
  deviation: number;
  duration: number;
  acknowledged: boolean;
}

export interface HHIResult {
  value: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  concentrationRatio: number;
}

export interface DiversificationResult {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  factors: {
    chainDiversity: number;
    protocolDiversity: number;
    assetDiversity: number;
  };
}

export interface VolatilityResult {
  index: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  annualizedVolatility: number;
  dailyVolatility?: number;
}

export interface CorrelationRiskResult {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  avgCorrelation: number;
  highCorrelationPairs?: string[];
}

export interface RiskMetrics {
  hhi: HHIResult;
  diversification: DiversificationResult;
  volatility: VolatilityResult;
  correlationRisk: CorrelationRiskResult;
  overallRisk: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    timestamp?: number;
  };
}

export type ChartType =
  | 'pie'
  | 'trend'
  | 'bar'
  | 'comparison'
  | 'benchmark'
  | 'correlation'
  | 'chain'
  | 'protocol'
  | 'category'
  | 'radar';

export type ViewType = 'chart' | 'table';

export type RefreshStatus = 'idle' | 'refreshing' | 'success' | 'error';

export type TimeRange = '24H' | '7D' | '30D' | '90D' | '1Y';
