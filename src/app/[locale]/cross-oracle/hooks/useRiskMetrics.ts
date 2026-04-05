/**
 * @fileoverview 风险指标计算 Hook
 * @description 基于价格数据计算风险指标，包括波动率、一致性、敏感度和健康度
 */

import { useMemo } from 'react';

import { calculateMean, calculateStdDev } from '@/lib/utils/statistics';
import type { PriceData } from '@/types/oracle';

import type { PriceAnomaly } from './usePriceAnomalyDetection';

/** 趋势方向 */
export type TrendDirection = 'up' | 'down' | 'stable';

/** 单个风险指标 */
export interface RiskMetric {
  /** 指标值 (0-100) */
  value: number;
  /** 趋势方向 */
  trend: TrendDirection;
  /** 趋势变化值 */
  trendValue: number;
  /** 指标状态 */
  status: 'good' | 'warning' | 'danger';
  /** 指标描述翻译键 */
  descriptionKey: string;
  /** 描述参数 */
  descriptionParams?: Record<string, string | number>;
}

/** 历史风险指标（用于趋势计算） */
export interface HistoricalRiskMetric {
  /** 价格波动率 */
  volatility?: number;
  /** 数据一致性评分 */
  consistency?: number;
  /** 异常检测敏感度 */
  sensitivity?: number;
  /** 系统健康度 */
  health?: number;
}

/** 风险指标结果 */
export interface RiskMetricsResult {
  /** 价格波动率 */
  volatility: RiskMetric;
  /** 数据一致性评分 */
  consistency: RiskMetric;
  /** 异常检测敏感度 */
  sensitivity: RiskMetric;
  /** 系统健康度 */
  health: RiskMetric;
  /** 综合风险评分 */
  overallRiskScore: number;
  /** 指标更新时间 */
  lastUpdated: number;
}

function calculateTrend(
  currentValue: number,
  previousValue?: number,
  threshold: number = 2
): { trend: TrendDirection; trendValue: number } {
  if (previousValue === undefined || previousValue === null) {
    return { trend: 'stable', trendValue: 0 };
  }

  if (previousValue === 0) {
    return { trend: currentValue > 0 ? 'up' : 'stable', trendValue: 0 };
  }

  const changePercent = ((currentValue - previousValue) / previousValue) * 100;
  const trendValue = parseFloat(changePercent.toFixed(1));

  if (changePercent > threshold) {
    return { trend: 'up', trendValue };
  }
  if (changePercent < -threshold) {
    return { trend: 'down', trendValue };
  }
  return { trend: 'stable', trendValue };
}

/**
 * 根据值获取状态
 * @param value - 指标值
 * @param thresholds - 阈值配置
 * @returns 状态
 */
function getStatus(
  value: number,
  thresholds: { good: number; warning: number }
): 'good' | 'warning' | 'danger' {
  if (value >= thresholds.good) return 'good';
  if (value >= thresholds.warning) return 'warning';
  return 'danger';
}

/**
 * 计算波动率指标
 * @param validPrices - 有效价格数组
 * @param previousValue - 之前的波动率值（用于趋势计算）
 * @returns 波动率指标
 */
function calculateVolatilityMetric(validPrices: number[], previousValue?: number): RiskMetric {
  if (validPrices.length < 2) {
    return {
      value: 0,
      trend: 'stable',
      trendValue: 0,
      status: 'good',
      descriptionKey: 'riskMetrics.volatility.insufficientData',
    };
  }

  const mean = calculateMean(validPrices);
  const stdDev = calculateStdDev(validPrices, mean);

  const volatilityPercent = mean !== 0 ? (stdDev / mean) * 100 : 0;

  const value = Math.max(0, Math.min(100, Math.round(100 - volatilityPercent * 10)));

  const { trend, trendValue } = calculateTrend(value, previousValue);

  return {
    value,
    trend,
    trendValue,
    status: getStatus(value, { good: 70, warning: 40 }),
    descriptionKey: 'riskMetrics.volatility.description',
    descriptionParams: { volatility: volatilityPercent.toFixed(2) },
  };
}

/**
 * 计算一致性指标
 * @param validPrices - 有效价格数组
 * @param previousValue - 之前的一致性值（用于趋势计算）
 * @returns 一致性指标
 */
function calculateConsistencyMetric(validPrices: number[], previousValue?: number): RiskMetric {
  if (validPrices.length < 2) {
    return {
      value: 100,
      trend: 'stable',
      trendValue: 0,
      status: 'good',
      descriptionKey: 'riskMetrics.consistency.good',
    };
  }

  const mean = calculateMean(validPrices);
  const stdDev = calculateStdDev(validPrices, mean);

  const stdDevPercent = mean !== 0 ? (stdDev / mean) * 100 : 0;

  const value = Math.max(0, Math.min(100, Math.round(100 - stdDevPercent)));

  const { trend, trendValue } = calculateTrend(value, previousValue);

  return {
    value,
    trend,
    trendValue,
    status: getStatus(value, { good: 80, warning: 60 }),
    descriptionKey: 'riskMetrics.consistency.description',
    descriptionParams: { value, stdDev: stdDevPercent.toFixed(2) },
  };
}

/**
 * 计算敏感度指标
 * @param anomalyCount - 异常数量
 * @param totalCount - 总数据数量
 * @param previousValue - 之前的敏感度值（用于趋势计算）
 * @returns 敏感度指标
 */
function calculateSensitivityMetric(
  anomalyCount: number,
  totalCount: number,
  previousValue?: number
): RiskMetric {
  const anomalyRatio = totalCount > 0 ? anomalyCount / totalCount : 0;

  const baseValue = 75;
  const adjustment = anomalyRatio > 0.3 ? -20 : anomalyRatio > 0.1 ? -10 : 0;
  const value = Math.max(0, Math.min(100, baseValue + adjustment));

  const { trend, trendValue } = calculateTrend(value, previousValue);

  return {
    value,
    trend,
    trendValue,
    status: getStatus(value, { good: 70, warning: 50 }),
    descriptionKey: 'riskMetrics.sensitivity.description',
    descriptionParams: { value, anomalyCount },
  };
}

/**
 * 计算健康度指标
 * @param validPrices - 有效价格数组
 * @param anomalies - 异常列表
 * @param priceData - 完整价格数据
 * @param previousValue - 之前的健康度值（用于趋势计算）
 * @returns 健康度指标
 */
function calculateHealthMetric(
  validPrices: number[],
  anomalies: PriceAnomaly[],
  priceData: PriceData[],
  previousValue?: number
): RiskMetric {
  if (validPrices.length === 0) {
    return {
      value: 0,
      trend: 'down',
      trendValue: 0,
      status: 'danger',
      descriptionKey: 'riskMetrics.health.noData',
    };
  }

  const mean = calculateMean(validPrices);
  const stdDev = calculateStdDev(validPrices, mean);
  const stdDevPercent = mean !== 0 ? (stdDev / mean) * 100 : 0;

  const anomalyPenalty = Math.min(30, anomalies.length * 5);

  const now = Date.now();
  const staleDataCount = priceData.filter((p) => p.price > 0 && now - p.timestamp > 60000).length;
  const freshnessPenalty = priceData.length > 0 ? (staleDataCount / priceData.length) * 20 : 0;

  const baseHealth = 100;
  const deviationPenalty = Math.min(30, stdDevPercent * 5);

  const value = Math.max(
    0,
    Math.min(100, Math.round(baseHealth - deviationPenalty - anomalyPenalty - freshnessPenalty))
  );

  const { trend, trendValue } = calculateTrend(value, previousValue);

  return {
    value,
    trend,
    trendValue,
    status: getStatus(value, { good: 80, warning: 60 }),
    descriptionKey: 'riskMetrics.health.description',
    descriptionParams: { value, sourceCount: validPrices.length },
  };
}

/**
 * 计算综合风险评分
 * @param volatility - 波动率指标
 * @param consistency - 一致性指标
 * @param sensitivity - 敏感度指标
 * @param health - 健康度指标
 * @returns 综合风险评分 (0-100，越高越危险)
 */
function calculateOverallRiskScore(
  volatility: RiskMetric,
  consistency: RiskMetric,
  sensitivity: RiskMetric,
  health: RiskMetric
): number {
  // 权重配置
  const weights = {
    volatility: 0.25,
    consistency: 0.3,
    sensitivity: 0.15,
    health: 0.3,
  };

  // 波动率和健康度需要反转（值越高越好，但风险评分越高越危险）
  const invertedVolatility = 100 - volatility.value;
  const invertedHealth = 100 - health.value;

  const riskScore = Math.round(
    invertedVolatility * weights.volatility +
      (100 - consistency.value) * weights.consistency +
      (100 - sensitivity.value) * weights.sensitivity +
      invertedHealth * weights.health
  );

  return Math.max(0, Math.min(100, riskScore));
}

/**
 * 风险指标计算 Hook
 * @param priceData - 价格数据数组
 * @param anomalies - 异常检测结果
 * @param previousMetrics - 之前的指标值（用于趋势计算）
 * @returns 风险指标结果
 */
export function useRiskMetrics(
  priceData: PriceData[],
  anomalies: PriceAnomaly[],
  previousMetrics?: HistoricalRiskMetric,
  currentTime?: number
): RiskMetricsResult {
  return useMemo(() => {
    const validPrices = priceData.filter((p) => p.price > 0).map((p) => p.price);

    const volatility = calculateVolatilityMetric(validPrices, previousMetrics?.volatility);
    const consistency = calculateConsistencyMetric(validPrices, previousMetrics?.consistency);
    const sensitivity = calculateSensitivityMetric(
      anomalies.length,
      priceData.length,
      previousMetrics?.sensitivity
    );
    const health = calculateHealthMetric(
      validPrices,
      anomalies,
      priceData,
      previousMetrics?.health
    );

    const overallRiskScore = calculateOverallRiskScore(
      volatility,
      consistency,
      sensitivity,
      health
    );

    return {
      volatility,
      consistency,
      sensitivity,
      health,
      overallRiskScore,
      lastUpdated: currentTime ?? 0,
    };
  }, [priceData, anomalies, previousMetrics, currentTime]);
}

/**
 * 获取趋势图标方向
 * @param trend - 趋势方向
 * @returns 图标旋转角度
 */
export function getTrendIconRotation(trend: TrendDirection): number {
  switch (trend) {
    case 'up':
      return 0;
    case 'down':
      return 180;
    case 'stable':
      return 90;
    default:
      return 0;
  }
}

/**
 * 获取趋势颜色
 * @param trend - 趋势方向
 * @returns 颜色类名
 */
export function getTrendColor(trend: TrendDirection): string {
  switch (trend) {
    case 'up':
      return 'text-success-500';
    case 'down':
      return 'text-danger-500';
    case 'stable':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * 获取状态颜色
 * @param status - 状态
 * @returns 颜色类名
 */
export function getStatusColor(status: 'good' | 'warning' | 'danger'): string {
  const colors = {
    good: 'text-success-500 bg-success-50',
    warning: 'text-warning-500 bg-warning-50',
    danger: 'text-danger-500 bg-danger-50',
  };
  return colors[status];
}

export default useRiskMetrics;
