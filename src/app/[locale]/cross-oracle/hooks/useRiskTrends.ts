/**
 * @fileoverview 风险趋势数据 Hook
 * @description 提供风险趋势数据的类型定义和辅助函数
 * 基于真实的异常检测数据计算风险趋势
 */

import { useMemo } from 'react';

import { safeMax, safeMin } from '@/lib/utils/statistics';

import type { TimeRange } from '../constants';
import type { PriceAnomaly } from './usePriceAnomalyDetection';

export interface RiskTrendPoint {
  timestamp: number;
  riskScore: number;
  anomalyCount: number;
  event?: string;
}

export interface RiskTrendsResult {
  data: RiskTrendPoint[];
  count: number;
  avgRiskScore: number;
  maxRiskScore: number;
  minRiskScore: number;
  totalAnomalies: number;
}

export function useRiskTrends(
  timeRange: TimeRange = '24h',
  anomalies: PriceAnomaly[] = [],
  currentTime?: number
): RiskTrendsResult {
  const now = currentTime ?? Date.now();

  return useMemo(() => {
    const hours =
      timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const data: RiskTrendPoint[] = [];

    // 按小时聚合异常数据
    for (let i = hours; i >= 0; i--) {
      const hourStart = now - (i + 1) * 3600000;
      const hourEnd = now - i * 3600000;

      const hourAnomalies = anomalies.filter(
        (a) => a.timestamp >= hourStart && a.timestamp < hourEnd
      );
      const anomalyCount = hourAnomalies.length;

      // 计算风险分数：基于异常数量和严重程度
      const riskScore = Math.min(
        100,
        anomalyCount * 15 +
          hourAnomalies.filter((a) => a.severity === 'high').length * 30 +
          hourAnomalies.filter((a) => a.severity === 'medium').length * 15
      );

      data.push({
        timestamp: hourEnd,
        riskScore,
        anomalyCount,
        event: anomalyCount > 0 ? `${anomalyCount} 个异常 detected` : undefined,
      });
    }

    const totalAnomalies = anomalies.length;
    const riskScores = data.map((d) => d.riskScore);

    return {
      data,
      count: data.length,
      avgRiskScore:
        riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0,
      maxRiskScore: riskScores.length > 0 ? safeMax(riskScores) : 0,
      minRiskScore: riskScores.length > 0 ? safeMin(riskScores) : 0,
      totalAnomalies,
    };
  }, [timeRange, anomalies, now]);
}

export function getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore < 30) return 'low';
  if (riskScore < 50) return 'medium';
  if (riskScore < 75) return 'high';
  return 'critical';
}

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
