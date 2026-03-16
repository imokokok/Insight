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
  priceSources: {
    oracle: string;
    price: number;
    latency: number;
    timestamp: number;
  }[];
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
}

export interface TVSTrendData {
  timestamp: number;
  date: string;
  chainlink: number;
  chainlinkUpper: number; // 置信区间上界
  chainlinkLower: number; // 置信区间下界
  pyth: number;
  pythUpper: number;
  pythLower: number;
  band: number;
  bandUpper: number;
  bandLower: number;
  api3: number;
  api3Upper: number;
  api3Lower: number;
  uma: number;
  umaUpper: number;
  umaLower: number;
  total: number;
}

export interface ChainSupportData {
  name: string;
  chains: number;
  protocols: number;
  color: string;
  share?: number;
  tvs?: number;
  change24h?: number;
}

export interface TimeRange {
  key: string;
  label: string;
  hours: number;
}

export type ChartType =
  | 'pie'
  | 'trend'
  | 'bar'
  | 'chain'
  | 'protocol'
  | 'asset'
  | 'comparison'
  | 'benchmark'
  | 'correlation';
export type ViewType = 'chart' | 'table';

// ==================== 对比分析数据类型 ====================

// 多预言机对比数据
export interface ComparisonMetric {
  name: string;
  value: number;
  normalizedValue: number; // 0-100 标准化值
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

// 行业基准数据
export interface BenchmarkMetric {
  name: string;
  industryAverage: number;
  industryMedian: number;
  industryBest: number;
  unit: string;
  description: string;
}

export interface BenchmarkData {
  metric: BenchmarkMetric;
  oracleValues: {
    oracle: string;
    color: string;
    value: number;
    diffFromAverage: number;
    diffPercent: number;
    percentile: number; // 0-100 排名百分比
  }[];
}

// 相关性数据
export interface CorrelationPair {
  oracleA: string;
  oracleB: string;
  correlation: number; // -1 to 1
  sampleSize: number;
  confidence: number; // 0-1
}

export interface CorrelationData {
  oracles: string[];
  matrix: number[][]; // 相关系数矩阵
  pairs: CorrelationPair[];
  timeRange: string;
  lastUpdated: string;
}

// 雷达图数据点
export interface RadarDataPoint {
  metric: string;
  fullMark: number;
  [oracle: string]: string | number;
}

// 链级别明细数据
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

// 协议级别数据
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
  logoUrl?: string;
  url?: string;
}

// 资产类别分析
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

// 增强的预言机数据
export interface EnhancedOracleMarketData extends OracleMarketData {
  chainBreakdown: ChainBreakdown[];
  protocolDetails: ProtocolDetail[];
  assetCategories: AssetCategory[];
  lastUpdated: string;
}

export const TIME_RANGES: TimeRange[] = [
  { key: '1H', label: '1H', hours: 1 },
  { key: '24H', label: '24H', hours: 24 },
  { key: '7D', label: '7D', hours: 168 },
  { key: '30D', label: '30D', hours: 720 },
  { key: '90D', label: '90D', hours: 2160 },
  { key: '1Y', label: '1Y', hours: 8760 },
  { key: 'ALL', label: 'ALL', hours: 0 },
];

// ==================== 风险指标数据类型 ====================

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * HHI 指数结果
 */
export interface HHIResult {
  value: number;
  level: RiskLevel;
  description: string;
  concentrationRatio: number;
}

/**
 * 多元化评分结果
 */
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

/**
 * 波动率指数结果
 */
export interface VolatilityResult {
  index: number;
  level: RiskLevel;
  description: string;
  annualizedVolatility: number;
  dailyVolatility: number;
}

/**
 * 相关性风险评估结果
 */
export interface CorrelationRiskResult {
  score: number;
  level: RiskLevel;
  description: string;
  avgCorrelation: number;
  highCorrelationPairs: string[];
}

/**
 * 综合风险指标
 */
export interface RiskMetrics {
  hhi: HHIResult;
  diversification: DiversificationResult;
  volatility: VolatilityResult;
  correlationRisk: CorrelationRiskResult;
  overallRisk: {
    score: number;
    level: RiskLevel;
    timestamp: number;
  };
}

// ==================== 异常检测数据类型 ====================

/**
 * 异常等级
 */
export type AnomalyLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 异常类型
 */
export type AnomalyType =
  | 'price_spike'
  | 'price_drop'
  | 'volatility_spike'
  | 'trend_break'
  | 'volume_anomaly'
  | 'correlation_break';

/**
 * 异常数据
 */
export interface AnomalyData {
  id: string;
  type: AnomalyType;
  level: AnomalyLevel;
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

/**
 * 导出配置
 */
export interface ExportConfig {
  format: 'csv' | 'json' | 'xlsx';
  dateRange: '7d' | '30d' | '90d' | 'custom';
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  startDate?: string;
  endDate?: string;
  includeCharts: boolean;
  includeRawData: boolean;
  includeMetadata: boolean;
  metrics: string[];
  filters: {
    oracles: string[];
    assets: string[];
    chains: string[];
  };
}

/**
 * 定时导出配置
 */
export interface ScheduledExport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  email: string;
  format: 'csv' | 'json' | 'excel';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
  lastRunStatus?: 'success' | 'failed' | 'pending';
}

/**
 * 价格预警
 */
export interface PriceAlert {
  id: string;
  asset: string;
  type: 'above' | 'below';
  price: number;
  enabled: boolean;
  channels: ('email' | 'webhook' | 'push')[];
  createdAt: string;
  updatedAt: string;
}
