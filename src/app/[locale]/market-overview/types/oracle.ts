/**
 * 预言机市场数据类型定义
 */

import type { AssetCategory } from './asset';

/**
 * 基础预言机市场数据
 */
export interface OracleMarketData {
  /** 预言机名称 */
  name: string;
  /** 市场份额 (%) */
  share: number;
  /** 颜色标识 */
  color: string;
  /** TVS 格式化字符串 */
  tvs: string;
  /** TVS 数值 (单位: B) */
  tvsValue: number;
  /** 支持的链数量 */
  chains: number;
  /** 支持的协议数量 */
  protocols: number;
  /** 平均延迟 (ms) */
  avgLatency: number;
  /** 准确率 (%) */
  accuracy: number;
  /** 更新频率 (秒) */
  updateFrequency: number;
  /** 24小时变化率 (%) */
  change24h: number;
  /** 7天变化率 (%) */
  change7d: number;
  /** 30天变化率 (%) */
  change30d: number;
}

/**
 * 增强的预言机市场数据（包含详细分解）
 */
export interface EnhancedOracleMarketData extends OracleMarketData {
  /** 链级别分解数据 */
  chainBreakdown: ChainBreakdown[];
  /** 协议详情 */
  protocolDetails: ProtocolDetail[];
  /** 资产类别分析 */
  assetCategories: AssetCategory[];
  /** 最后更新时间 */
  lastUpdated: string;
}

/**
 * 链级别明细数据
 */
export interface ChainBreakdown {
  /** 链ID */
  chainId: string;
  /** 链名称 */
  chainName: string;
  /** TVS 数值 */
  tvs: number;
  /** TVS 格式化字符串 */
  tvsFormatted: string;
  /** 市场份额 (%) */
  share: number;
  /** 协议数量 */
  protocols: number;
  /** 颜色标识 */
  color: string;
  /** 24小时变化率 (%) */
  change24h: number;
  /** 7天变化率 (%) */
  change7d: number;
  /** 主要预言机 */
  topOracle: string;
  /** 主要预言机份额 (%) */
  topOracleShare: number;
}

/**
 * 协议级别数据
 */
export interface ProtocolDetail {
  /** 协议ID */
  id: string;
  /** 协议名称 */
  name: string;
  /** 类别 */
  category: string;
  /** TVL 数值 */
  tvl: number;
  /** TVL 格式化字符串 */
  tvlFormatted: string;
  /** 支持的链 */
  chains: string[];
  /** 主要预言机 */
  primaryOracle: string;
  /** 预言机数量 */
  oracleCount: number;
  /** 24小时变化率 (%) */
  change24h: number;
  /** 7天变化率 (%) */
  change7d: number;
  /** Logo URL */
  logoUrl?: string;
  /** 网站 URL */
  url?: string;
}

/**
 * 链支持数据
 */
export interface ChainSupportData {
  /** 预言机名称 */
  name: string;
  /** 支持的链数量 */
  chains: number;
  /** 支持的协议数量 */
  protocols: number;
  /** 颜色标识 */
  color: string;
  /** 市场份额 (%) - 可选 */
  share?: number;
  /** TVS 数值 - 可选 */
  tvs?: number;
  /** 24小时变化率 (%) - 可选 */
  change24h?: number;
}

/**
 * 对比指标
 */
export interface ComparisonMetric {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 标准化值 (0-100) */
  normalizedValue: number;
  /** 单位 */
  unit: string;
  /** 排名 */
  rank: number;
}

/**
 * 预言机对比数据
 */
export interface ComparisonData {
  /** 预言机名称 */
  oracle: string;
  /** 颜色标识 */
  color: string;
  /** 各项指标 */
  metrics: {
    tvs: ComparisonMetric;
    latency: ComparisonMetric;
    accuracy: ComparisonMetric;
    marketShare: ComparisonMetric;
    chains: ComparisonMetric;
    protocols: ComparisonMetric;
    updateFrequency: ComparisonMetric;
  };
  /** 综合得分 */
  overallScore: number;
  /** 排名 */
  rank: number;
}

/**
 * 市场集中度结果
 */
export interface MarketConcentrationResult {
  /** 集中度数值 (CR4) */
  value: number;
  /** 等级: high | medium | low */
  level: 'high' | 'medium' | 'low';
  /** 国际化键名 */
  labelKey: string;
  /** 文字颜色类名 */
  colorClass: string;
  /** 背景颜色类名 */
  bgColorClass: string;
}

/**
 * 市场洞察数据
 */
export interface MarketInsights {
  /** 市场集中度 */
  concentration: MarketConcentrationResult;
  /** 增长最快的预言机 */
  topGainers: OracleMarketData[];
  /** 链支持最多的预言机 */
  topChainSupporters: OracleMarketData[];
  /** 总链数 */
  totalChains: number;
  /** 平均链数 */
  avgChainsPerOracle: number;
}
