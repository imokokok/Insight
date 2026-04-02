/**
 * @fileoverview 数据质量评分 Hook
 * @description 计算数据质量的专业指标（变异系数、置信区间、Z-Score等）
 */

import { useMemo } from 'react';

import type { OracleProvider, PriceData } from '@/types/oracle';

import type {
  DataQualityScore as DataQualityScoreType,
  ExtendedDataQualityScore,
  LatencyStats,
  OracleQualityMetrics,
  ProfessionalQualityMetrics,
} from '../types/index';

// 重新导出类型
export type DataQualityScore = DataQualityScoreType;
export type {
  ExtendedDataQualityScore,
  LatencyStats,
  OracleQualityMetrics,
  ProfessionalQualityMetrics,
};

/**
 * 计算百分位数
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * 计算中位数
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * 计算平均值
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * 计算标准差
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * 计算专业质量指标
 */
function calculateProfessionalMetrics(prices: number[]): ProfessionalQualityMetrics {
  const validPrices = prices.filter((p) => p > 0);
  const sampleSize = validPrices.length;

  if (sampleSize === 0) {
    return {
      coefficientOfVariation: 0,
      standardError: 0,
      confidenceIntervalLower: 0,
      confidenceIntervalUpper: 0,
      sampleSize: 0,
      mean: 0,
      median: 0,
      standardDeviation: 0,
      variance: 0,
    };
  }

  const mean = calculateMean(validPrices);
  const median = calculateMedian(validPrices);
  const standardDeviation = calculateStdDev(validPrices, mean);
  const variance = Math.pow(standardDeviation, 2);

  // 变异系数 (CV) = 标准差 / 平均值
  const coefficientOfVariation = mean !== 0 ? standardDeviation / mean : 0;

  // 标准误差 (SEM) = 标准差 / √n
  const standardError = sampleSize > 0 ? standardDeviation / Math.sqrt(sampleSize) : 0;

  // 95%置信区间 = 平均值 ± 1.96 × SEM
  const confidenceIntervalLower = mean - 1.96 * standardError;
  const confidenceIntervalUpper = mean + 1.96 * standardError;

  return {
    coefficientOfVariation,
    standardError,
    confidenceIntervalLower,
    confidenceIntervalUpper,
    sampleSize,
    mean,
    median,
    standardDeviation,
    variance,
  };
}

/**
 * 计算延迟统计
 */
function calculateLatencyStats(priceData: PriceData[]): LatencyStats {
  const now = Date.now();
  const latencies = priceData
    .filter((p) => p.price > 0 && p.timestamp)
    .map((p) => now - new Date(p.timestamp).getTime());

  if (latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);

  return {
    p50: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: calculateMean(latencies),
  };
}

/**
 * 计算各预言机质量指标
 */
function calculateOracleMetrics(
  priceData: PriceData[],
  medianPrice: number,
  stdDev: number
): OracleQualityMetrics[] {
  const now = Date.now();

  return priceData
    .filter((p) => p.price > 0)
    .map((p) => {
      const price = p.price;
      const deviationPercent = medianPrice !== 0 ? ((price - medianPrice) / medianPrice) * 100 : 0;

      // Z-Score = (价格 - 中位数) / 标准差
      const zScore = stdDev !== 0 ? (price - medianPrice) / stdDev : 0;

      // 更新延迟
      const lastUpdated = new Date(p.timestamp).getTime();
      const latency = now - lastUpdated;

      // 置信度计算（基于Z-Score，|Z|越小置信度越高）
      const confidence = Math.max(0, Math.min(1, 1 - Math.abs(zScore) / 3));

      // 是否为异常值 (|Z-Score| > 2)
      const isOutlier = Math.abs(zScore) > 2;

      return {
        provider: p.provider,
        price,
        deviationPercent,
        zScore,
        latency,
        confidence,
        isOutlier,
        lastUpdated,
      };
    })
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)); // 按Z-Score绝对值排序，异常值在前
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
 * 获取Z-Score颜色类
 */
export function getZScoreColorClass(zScore: number): string {
  const absZ = Math.abs(zScore);
  if (absZ > 3) return 'text-red-600 bg-red-50';
  if (absZ > 2) return 'text-orange-600 bg-orange-50';
  if (absZ > 1) return 'text-yellow-600 bg-yellow-50';
  return 'text-emerald-600 bg-emerald-50';
}

/**
 * 格式化延迟显示
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

/**
 * 格式化数值（保留指定位数）
 */
export function formatNumber(value: number, digits = 4): string {
  return value.toFixed(digits);
}

/**
 * 专业数据质量指标 Hook
 * @param priceData - 价格数据数组
 * @returns 专业质量指标结果
 */
export function useProfessionalQualityMetrics(priceData: PriceData[]): {
  metrics: ProfessionalQualityMetrics;
  latencyStats: LatencyStats;
  oracleMetrics: OracleQualityMetrics[];
  outliers: OracleQualityMetrics[];
  highLatencyOracles: OracleQualityMetrics[];
} {
  return useMemo(() => {
    const validPrices = priceData.filter((p) => p.price > 0).map((p) => p.price);

    // 计算专业指标
    const metrics = calculateProfessionalMetrics(validPrices);

    // 计算延迟统计
    const latencyStats = calculateLatencyStats(priceData);

    // 计算各预言机指标
    const oracleMetrics = calculateOracleMetrics(
      priceData,
      metrics.median,
      metrics.standardDeviation
    );

    // 识别异常值 (|Z-Score| > 2)
    const outliers = oracleMetrics.filter((m) => m.isOutlier);

    // 识别高延迟 (> 30秒)
    const highLatencyThreshold = 30000;
    const highLatencyOracles = oracleMetrics.filter((m) => m.latency > highLatencyThreshold);

    return {
      metrics,
      latencyStats,
      oracleMetrics,
      outliers,
      highLatencyOracles,
    };
  }, [priceData]);
}

/**
 * 数据质量评分 Hook（兼容旧版）
 * @param params - 评分参数
 * @returns 数据质量评分结果
 */
export function useDataQualityScore(params: {
  prices?: number[];
  lastUpdated?: number;
  successCount?: number;
  totalCount?: number;
}): {
  score: DataQualityScoreType;
  isGood: boolean;
  level: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const { prices = [], lastUpdated, successCount = 0, totalCount = 0 } = params;

  const score = useMemo<DataQualityScoreType>(() => {
    // 计算一致性评分（基于变异系数）
    const validPrices = prices.filter((p) => p > 0);
    let consistency = 100;
    if (validPrices.length >= 2) {
      const mean = calculateMean(validPrices);
      const stdDev = calculateStdDev(validPrices, mean);
      const cv = mean !== 0 ? stdDev / mean : 0;
      consistency = Math.round(Math.max(0, Math.min(100, 100 * Math.exp(-20 * cv))));
    }

    // 计算新鲜度评分
    let freshness = 0;
    if (lastUpdated && lastUpdated > 0) {
      const ageMs = Date.now() - lastUpdated;
      if (ageMs <= 30000) freshness = 100;
      else if (ageMs <= 60000) freshness = Math.round(100 - ((ageMs - 30000) / 30000) * 20);
      else if (ageMs <= 300000) freshness = Math.round(80 - ((ageMs - 60000) / 240000) * 30);
      else freshness = Math.max(0, Math.round(50 * Math.exp(-(ageMs - 300000) / 600000)));
    }

    // 计算完整性评分
    const completeness = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    // 综合评分
    const overall = Math.round(consistency * 0.4 + freshness * 0.35 + completeness * 0.25);

    return {
      consistency,
      freshness,
      completeness,
      overall,
      suggestions: [],
    };
  }, [prices, lastUpdated, successCount, totalCount]);

  return {
    score,
    isGood: score.overall >= 60,
    level: getScoreLevel(score.overall),
  };
}

export default useDataQualityScore;
