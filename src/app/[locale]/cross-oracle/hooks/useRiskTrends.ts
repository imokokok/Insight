/**
 * @fileoverview 风险趋势数据 Hook
 * @description 提供风险趋势数据的类型定义和辅助函数
 * 注意：模拟数据已禁用，需要从真实 API 获取数据
 */

import { useMemo } from 'react';

import type { TimeRange } from '../constants';

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
  _timeRange: TimeRange = '24h',
  _baseRiskScore: number = 30
): RiskTrendsResult {
  return useMemo(() => {
    console.warn('useRiskTrends: Mock data is disabled. Please provide real risk data from API.');
    return {
      data: [],
      count: 0,
      avgRiskScore: 0,
      maxRiskScore: 0,
      minRiskScore: 0,
      totalAnomalies: 0,
    };
  }, [_timeRange, _baseRiskScore]);
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
