/**
 * 风险指标数据类型定义
 */

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * HHI 指数结果
 */
export interface HHIResult {
  /** HHI 值 */
  value: number;
  /** 风险等级 */
  level: RiskLevel;
  /** 描述 */
  description: string;
  /** 集中度比率 */
  concentrationRatio: number;
}

/**
 * 多元化评分结果
 */
export interface DiversificationResult {
  /** 评分 */
  score: number;
  /** 风险等级 */
  level: RiskLevel;
  /** 描述 */
  description: string;
  /** 各维度评分 */
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
  /** 波动率指数 */
  index: number;
  /** 风险等级 */
  level: RiskLevel;
  /** 描述 */
  description: string;
  /** 年化波动率 */
  annualizedVolatility: number;
  /** 日波动率 */
  dailyVolatility: number;
}

/**
 * 相关性风险评估结果
 */
export interface CorrelationRiskResult {
  /** 风险评分 */
  score: number;
  /** 风险等级 */
  level: RiskLevel;
  /** 描述 */
  description: string;
  /** 平均相关性 */
  avgCorrelation: number;
  /** 高相关性预言机对 */
  highCorrelationPairs: string[];
}

/**
 * 风险警报
 */
export interface RiskAlert {
  /** 警报ID */
  id: string;
  /** 风险等级 */
  level: RiskLevel;
  /** 警报消息 */
  message: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 相关性对
 */
export interface CorrelationPair {
  /** 预言机A */
  oracleA: string;
  /** 预言机B */
  oracleB: string;
  /** 相关系数 (-1 to 1) */
  correlation: number;
  /** 样本大小 */
  sampleSize: number;
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * 相关性数据
 */
export interface CorrelationData {
  /** 预言机列表 */
  oracles: string[];
  /** 相关系数矩阵 */
  matrix: number[][];
  /** 相关性对列表 */
  pairs: CorrelationPair[];
  /** 时间范围 */
  timeRange: string;
  /** 最后更新时间 */
  lastUpdated: string;
}

/**
 * 综合风险指标
 */
export interface RiskMetrics {
  /** HHI 指数 */
  hhi: HHIResult;
  /** 多元化评分 */
  diversification: DiversificationResult;
  /** 波动率 */
  volatility: VolatilityResult;
  /** 相关性风险 */
  correlationRisk: CorrelationRiskResult;
  /** 综合风险 */
  overallRisk: {
    /** 风险评分 */
    score: number;
    /** 风险等级 */
    level: RiskLevel;
    /** 时间戳 */
    timestamp: number;
  };
  /** 低风险数量 - 可选 */
  lowRiskCount?: number;
  /** 中风险数量 - 可选 */
  mediumRiskCount?: number;
  /** 高风险数量 - 可选 */
  highRiskCount?: number;
  /** 严重风险数量 - 可选 */
  criticalRiskCount?: number;
  /** 综合风险等级 - 可选 */
  overallRiskLevel?: RiskLevel;
  /** 风险评分 - 可选 */
  riskScore?: number;
  /** 风险趋势 - 可选 */
  riskTrend?: 'up' | 'down' | 'stable';
  /** 总资产数 - 可选 */
  totalAssets?: number;
  /** 波动率指数 - 可选 */
  volatilityIndex?: number;
  /** 波动率变化 - 可选 */
  volatilityChange?: number;
  /** 最大回撤 - 可选 */
  maxDrawdown?: number;
  /** 夏普比率 - 可选 */
  sharpeRatio?: number;
  /** 95% VaR - 可选 */
  var95?: number;
  /** 最近警报 - 可选 */
  recentAlerts?: RiskAlert[];
  /** 最后更新时间 - 可选 */
  lastUpdated?: number;
}
