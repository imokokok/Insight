/**
 * @fileoverview 数据质量评分 Hook
 * @description 计算数据质量的三个维度评分（一致性、新鲜度、完整性）和综合评分
 */

import { useMemo } from 'react';

import { type DataQualityScore as DataQualityScoreType } from '../types/index';

// 重新导出类型
export type DataQualityScore = DataQualityScoreType;

/**
 * 数据质量评分输入参数
 */
export interface UseDataQualityScoreParams {
  /** 价格数据数组，用于计算一致性 */
  prices?: number[];
  /** 最后更新时间戳（毫秒） */
  lastUpdated?: number;
  /** 成功响应次数 */
  successCount?: number;
  /** 总请求次数 */
  totalCount?: number;
  /** 历史数据点数组，用于更精确的一致性计算 */
  historicalPrices?: number[][];
  /** 权重配置 */
  weights?: {
    consistency?: number;
    freshness?: number;
    completeness?: number;
  };
}

/**
 * 计算一致性评分（基于标准差）
 * 标准差越小，一致性越高
 * @param prices - 价格数组
 * @returns 0-100 的评分
 */
function calculateConsistencyScore(prices: number[]): number {
  if (!prices || prices.length < 2) {
    return 100; // 数据不足时默认满分
  }

  const validPrices = prices.filter((p) => p > 0);
  if (validPrices.length < 2) {
    return 100;
  }

  // 计算平均值
  const mean = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;
  if (mean === 0) {
    return 100;
  }

  // 计算标准差
  const variance =
    validPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / validPrices.length;
  const stdDev = Math.sqrt(variance);

  // 计算变异系数（CV）= 标准差 / 平均值
  const cv = stdDev / mean;

  // 将变异系数转换为 0-100 的评分
  // CV = 0 时，评分为 100
  // CV >= 0.05（5%）时，评分为 0
  // 使用指数衰减公式：score = 100 * exp(-20 * cv)
  const score = 100 * Math.exp(-20 * cv);

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * 计算新鲜度评分（基于最后更新时间）
 * 越新分数越高
 * @param lastUpdated - 最后更新时间戳（毫秒）
 * @returns 0-100 的评分
 */
function calculateFreshnessScore(lastUpdated?: number): number {
  if (!lastUpdated || lastUpdated <= 0) {
    return 0; // 无更新时间，评分为 0
  }

  const now = Date.now();
  const ageMs = now - lastUpdated;

  // 定义时间阈值
  const THRESHOLDS = {
    excellent: 30 * 1000, // 30秒内：优秀
    good: 60 * 1000, // 1分钟内：良好
    acceptable: 5 * 60 * 1000, // 5分钟内：可接受
    poor: 15 * 60 * 1000, // 15分钟内：较差
  };

  if (ageMs <= THRESHOLDS.excellent) {
    return 100;
  } else if (ageMs <= THRESHOLDS.good) {
    // 30秒到1分钟之间，线性递减 100 -> 80
    const ratio = (ageMs - THRESHOLDS.excellent) / (THRESHOLDS.good - THRESHOLDS.excellent);
    return Math.round(100 - ratio * 20);
  } else if (ageMs <= THRESHOLDS.acceptable) {
    // 1分钟到5分钟之间，线性递减 80 -> 50
    const ratio = (ageMs - THRESHOLDS.good) / (THRESHOLDS.acceptable - THRESHOLDS.good);
    return Math.round(80 - ratio * 30);
  } else if (ageMs <= THRESHOLDS.poor) {
    // 5分钟到15分钟之间，线性递减 50 -> 20
    const ratio = (ageMs - THRESHOLDS.acceptable) / (THRESHOLDS.poor - THRESHOLDS.acceptable);
    return Math.round(50 - ratio * 30);
  } else {
    // 超过15分钟，指数衰减到 0
    const excessMs = ageMs - THRESHOLDS.poor;
    const decayFactor = Math.exp(-excessMs / (60 * 60 * 1000)); // 1小时衰减到约37%
    return Math.round(20 * decayFactor);
  }
}

/**
 * 计算完整性评分（基于成功响应率）
 * @param successCount - 成功响应次数
 * @param totalCount - 总请求次数
 * @returns 0-100 的评分
 */
function calculateCompletenessScore(successCount?: number, totalCount?: number): number {
  if (!totalCount || totalCount <= 0) {
    return 0;
  }

  const success = successCount ?? 0;
  const rate = success / totalCount;

  // 基础分数
  const baseScore = rate * 100;

  // 如果成功率低于50%，额外扣分
  if (rate < 0.5) {
    return Math.round(baseScore * 0.8);
  }

  // 如果成功率低于80%，轻微扣分
  if (rate < 0.8) {
    return Math.round(baseScore * 0.95);
  }

  return Math.round(baseScore);
}

/**
 * 计算综合评分（加权平均）
 * @param scores - 各维度评分
 * @param weights - 权重配置
 * @returns 0-100 的综合评分
 */
function calculateOverallScore(
  scores: { consistency: number; freshness: number; completeness: number },
  weights: { consistency: number; freshness: number; completeness: number }
): number {
  const totalWeight = weights.consistency + weights.freshness + weights.completeness;

  if (totalWeight === 0) {
    return Math.round((scores.consistency + scores.freshness + scores.completeness) / 3);
  }

  const weightedSum =
    scores.consistency * weights.consistency +
    scores.freshness * weights.freshness +
    scores.completeness * weights.completeness;

  return Math.round(weightedSum / totalWeight);
}

/**
 * 生成改进建议
 * @param scores - 各维度评分
 * @param params - 输入参数
 * @returns 建议数组
 */
function generateSuggestions(
  scores: { consistency: number; freshness: number; completeness: number },
  params: UseDataQualityScoreParams
): string[] {
  const suggestions: string[] = [];

  // 一致性建议
  if (scores.consistency < 60) {
    suggestions.push('数据一致性较差，建议检查各数据源的价格差异');
  } else if (scores.consistency < 80) {
    suggestions.push('数据一致性有提升空间，可考虑优化数据源选择策略');
  }

  // 新鲜度建议
  if (scores.freshness < 60) {
    suggestions.push('数据更新延迟较大，建议缩短数据刷新间隔');
  } else if (scores.freshness < 80) {
    suggestions.push('数据新鲜度一般，可适当增加更新频率');
  }

  // 完整性建议
  if (scores.completeness < 60) {
    suggestions.push('数据完整性不足，建议检查网络连接和数据源可用性');
  } else if (scores.completeness < 80) {
    suggestions.push('数据获取成功率有待提高，可考虑增加重试机制');
  }

  // 如果所有维度都很好，给出正面反馈
  if (suggestions.length === 0) {
    suggestions.push('数据质量良好，继续保持当前的数据获取策略');
  }

  // 基于具体情况的额外建议
  const { prices, totalCount } = params;

  if (prices && prices.length < 3) {
    suggestions.push('数据源数量较少，建议增加更多预言机以提高数据可靠性');
  }

  if (totalCount && totalCount < 10) {
    suggestions.push('数据样本量较小，建议积累更多历史数据以优化评分准确性');
  }

  return suggestions;
}

/**
 * 获取评分等级
 * @param score - 评分值
 * @returns 等级描述
 */
export function getScoreLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * 获取评分颜色
 * @param score - 评分值
 * @returns 颜色类名
 */
export function getScoreColor(score: number): string {
  const level = getScoreLevel(score);
  const colors = {
    excellent: 'text-success-500',
    good: 'text-primary-500',
    fair: 'text-warning-500',
    poor: 'text-danger-500',
  };
  return colors[level];
}

/**
 * 获取评分背景色
 * @param score - 评分值
 * @returns 背景色类名
 */
export function getScoreBgColor(score: number): string {
  const level = getScoreLevel(score);
  const colors = {
    excellent: 'bg-success-500',
    good: 'bg-primary-500',
    fair: 'bg-warning-500',
    poor: 'bg-danger-500',
  };
  return colors[level];
}

/**
 * 数据质量评分 Hook
 * @param params - 评分参数
 * @returns 数据质量评分结果
 * @example
 * ```tsx
 * const { score, isGood } = useDataQualityScore({
 *   prices: [100, 101, 99, 100.5],
 *   lastUpdated: Date.now(),
 *   successCount: 95,
 *   totalCount: 100,
 * });
 * ```
 */
export function useDataQualityScore(params: UseDataQualityScoreParams): {
  score: DataQualityScoreType;
  isGood: boolean;
  level: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const { prices = [], lastUpdated, successCount = 0, totalCount = 0, weights = {} } = params;

  // 默认权重
  const defaultWeights = {
    consistency: 0.35,
    freshness: 0.35,
    completeness: 0.3,
  };

  const finalWeights = {
    consistency: weights.consistency ?? defaultWeights.consistency,
    freshness: weights.freshness ?? defaultWeights.freshness,
    completeness: weights.completeness ?? defaultWeights.completeness,
  };

  const score = useMemo<DataQualityScoreType>(() => {
    // 计算各维度评分
    const consistency = calculateConsistencyScore(prices);
    const freshness = calculateFreshnessScore(lastUpdated);
    const completeness = calculateCompletenessScore(successCount, totalCount);

    // 计算综合评分
    const overall = calculateOverallScore({ consistency, freshness, completeness }, finalWeights);

    // 生成改进建议
    const suggestions = generateSuggestions({ consistency, freshness, completeness }, params);

    return {
      consistency,
      freshness,
      completeness,
      overall,
      suggestions,
    };
  }, [prices, lastUpdated, successCount, totalCount, finalWeights, params]);

  // 判断是否良好（overall >= 60）
  const isGood = score.overall >= 60;

  // 获取等级
  const level = getScoreLevel(score.overall);

  return {
    score,
    isGood,
    level,
  };
}

export default useDataQualityScore;
