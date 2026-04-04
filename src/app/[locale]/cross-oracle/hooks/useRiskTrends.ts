/**
 * @fileoverview 风险趋势数据 Hook
 * @description 生成模拟的风险趋势数据，支持不同时间范围的数据生成
 */

import { useMemo } from 'react';

import type { TimeRange } from '../constants';

/** 风险趋势数据点 */
export interface RiskTrendPoint {
  /** 时间戳 */
  timestamp: number;
  /** 风险评分 (0-100) */
  riskScore: number;
  /** 异常数量 */
  anomalyCount: number;
  /** 相关事件描述（可选） */
  event?: string;
}

/** 风险趋势结果 */
export interface RiskTrendsResult {
  /** 趋势数据数组 */
  data: RiskTrendPoint[];
  /** 数据点数量 */
  count: number;
  /** 平均风险评分 */
  avgRiskScore: number;
  /** 最高风险评分 */
  maxRiskScore: number;
  /** 最低风险评分 */
  minRiskScore: number;
  /** 总异常数量 */
  totalAnomalies: number;
}

/**
 * 根据时间范围获取数据点数量和间隔
 * @param timeRange - 时间范围
 * @returns 数据点数量和间隔（毫秒）
 */
function getTimeRangeConfig(timeRange: TimeRange): { points: number; interval: number } {
  switch (timeRange) {
    case '1H':
      return { points: 60, interval: 60 * 1000 }; // 每分钟一个点
    case '24H':
      return { points: 48, interval: 30 * 60 * 1000 }; // 每30分钟一个点
    case '7D':
      return { points: 84, interval: 2 * 60 * 60 * 1000 }; // 每2小时一个点
    case '30D':
      return { points: 60, interval: 12 * 60 * 60 * 1000 }; // 每12小时一个点
    case '90D':
      return { points: 90, interval: 24 * 60 * 60 * 1000 }; // 每天一个点
    case '1Y':
      return { points: 52, interval: 7 * 24 * 60 * 60 * 1000 }; // 每周一个点
    case 'ALL':
      return { points: 100, interval: 7 * 24 * 60 * 60 * 1000 }; // 每周一个点
    default:
      return { points: 48, interval: 30 * 60 * 1000 };
  }
}

/**
 * 生成随机风险评分
 * @param baseScore - 基础评分
 * @param volatility - 波动率
 * @returns 随机风险评分
 */
function generateRiskScore(baseScore: number, volatility: number = 10): number {
  const randomChange = (Math.random() - 0.5) * 2 * volatility;
  const score = baseScore + randomChange;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 生成异常数量
 * @param riskScore - 当前风险评分
 * @returns 异常数量
 */
function generateAnomalyCount(riskScore: number): number {
  // 风险评分越高，异常数量越多
  const baseCount = Math.floor(riskScore / 25);
  const randomFactor = Math.random() > 0.7 ? 1 : 0;
  return baseCount + randomFactor;
}

/**
 * 生成事件描述
 * @param riskScore - 当前风险评分
 * @param anomalyCount - 异常数量
 * @returns 事件描述或 undefined
 */
function generateEvent(riskScore: number, anomalyCount: number): string | undefined {
  if (riskScore > 80 && anomalyCount >= 3) {
    const events = [
      '检测到严重价格偏差',
      '多个预言机数据异常',
      '数据延迟超过阈值',
      '价格波动率异常升高',
    ];
    return events[Math.floor(Math.random() * events.length)];
  }
  if (riskScore > 60 && anomalyCount >= 2) {
    const events = ['价格偏差警告', '数据一致性下降', '预言机响应延迟'];
    return events[Math.floor(Math.random() * events.length)];
  }
  return undefined;
}

/**
 * 风险趋势数据 Hook
 * @param timeRange - 时间范围：'1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL'
 * @param baseRiskScore - 基础风险评分（默认 30）
 * @returns 风险趋势结果
 */
export function useRiskTrends(
  timeRange: TimeRange = '24H',
  baseRiskScore: number = 30
): RiskTrendsResult {
  return useMemo(() => {
    const { points, interval } = getTimeRangeConfig(timeRange);
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const data: RiskTrendPoint[] = [];

    let currentScore = baseRiskScore;

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = now - i * interval;

      // 生成带有一定趋势和随机性的风险评分
      const trendFactor = Math.sin(i / 10) * 5; // 添加周期性趋势
      currentScore = generateRiskScore(baseRiskScore + trendFactor, 15);

      const anomalyCount = generateAnomalyCount(currentScore);
      const event = generateEvent(currentScore, anomalyCount);

      data.push({
        timestamp,
        riskScore: currentScore,
        anomalyCount,
        event,
      });
    }

    // 计算统计数据
    const riskScores = data.map((d) => d.riskScore);
    const avgRiskScore = Math.round(
      riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
    );
    const maxRiskScore = Math.max(...riskScores);
    const minRiskScore = Math.min(...riskScores);
    const totalAnomalies = data.reduce((sum, d) => sum + d.anomalyCount, 0);

    return {
      data,
      count: data.length,
      avgRiskScore,
      maxRiskScore,
      minRiskScore,
      totalAnomalies,
    };
  }, [timeRange, baseRiskScore]);
}

/**
 * 获取风险等级
 * @param riskScore - 风险评分
 * @returns 风险等级
 */
export function getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore < 30) return 'low';
  if (riskScore < 50) return 'medium';
  if (riskScore < 75) return 'high';
  return 'critical';
}

/**
 * 获取风险等级颜色
 * @param riskScore - 风险评分
 * @returns 颜色类名
 */
export function getRiskLevelColor(riskScore: number): string {
  const level = getRiskLevel(riskScore);
  const colors = {
    low: 'text-success-500',
    medium: 'text-primary-500',
    high: 'text-warning-500',
    critical: 'text-danger-500',
  };
  return colors[level];
}

/**
 * 获取风险等级背景色
 * @param riskScore - 风险评分
 * @returns 背景色类名
 */
export function getRiskLevelBgColor(riskScore: number): string {
  const level = getRiskLevel(riskScore);
  const colors = {
    low: 'bg-success-500',
    medium: 'bg-primary-500',
    high: 'bg-warning-500',
    critical: 'bg-danger-500',
  };
  return colors[level];
}

export default useRiskTrends;
