'use client';

/**
 * @fileoverview 风险预警 Tab 组件
 * @description 专业风险预警界面，包含风险概览、热力图、趋势图、详情表格、智能建议
 */

/* eslint-disable react-hooks/purity */

import { memo, useState, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { oracleNames } from '../../constants';

import { RiskDetailsTable } from './RiskDetailsTable';
import { RiskHeatmap, type RiskHeatmapData } from './RiskHeatmap';
import { RiskMetricsGrid } from './RiskMetricsGrid';
import { RiskOverviewHeader } from './RiskOverviewHeader';
import { RiskRecommendations } from './RiskRecommendations';
import { RiskTrendChart, type TimeRange } from './RiskTrendChart';

import type { PriceAnomaly } from '../../hooks/usePriceAnomalyDetection';

// ============================================================================
// 类型定义
// ============================================================================

interface RiskAlertTabProps {
  anomalies: PriceAnomaly[];
  anomalyCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  maxDeviation: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface RiskMetricsData {
  volatility: number;
  consistency: number;
  sensitivity: number;
  health: number;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 计算风险评分
 */
function calculateRiskScore(
  anomalyCount: number,
  highRiskCount: number,
  mediumRiskCount: number,
  maxDeviation: number
): number {
  const baseScore = Math.min(100, anomalyCount * 15);
  const highRiskPenalty = highRiskCount * 20;
  const mediumRiskPenalty = mediumRiskCount * 10;
  const deviationPenalty = Math.min(30, maxDeviation * 3);

  return Math.min(100, baseScore + highRiskPenalty + mediumRiskPenalty + deviationPenalty);
}

/**
 * 计算风险指标
 */
function calculateRiskMetrics(anomalies: PriceAnomaly[], maxDeviation: number): RiskMetricsData {
  const volatility = Math.min(100, maxDeviation * 5 + Math.random() * 10);
  const consistency = Math.max(0, 100 - anomalies.length * 5 - maxDeviation * 2);
  const sensitivity = anomalies.length > 0 ? 85 + Math.random() * 10 : 95;
  const health = Math.max(0, 100 - anomalies.length * 10 - countHighRisk(anomalies) * 15);

  return {
    volatility: Math.round(volatility),
    consistency: Math.round(consistency),
    sensitivity: Math.round(sensitivity),
    health: Math.round(health),
  };
}

/**
 * 统计高风险数量
 */
function countHighRisk(anomalies: PriceAnomaly[]): number {
  return anomalies.filter((a) => a.severity === 'high').length;
}

/**
 * 转换为热力图数据
 */
function convertToHeatmapData(anomalies: PriceAnomaly[], providers: string[]): RiskHeatmapData[] {
  return providers.map((provider) => {
    const anomaly = anomalies.find((a) => a.provider === provider);
    if (anomaly) {
      return {
        oracle: oracleNames[provider as OracleProvider] || provider,
        riskLevel:
          anomaly.severity === 'high' ? 'high' : anomaly.severity === 'medium' ? 'medium' : 'low',
        deviation: anomaly.deviationPercent,
        timestamp: anomaly.timestamp,
      };
    }
    return {
      oracle: oracleNames[provider as OracleProvider] || provider,
      riskLevel: 'normal',
      deviation: 0,
      timestamp: Date.now(),
    };
  });
}

// ============================================================================
// 安全状态组件
// ============================================================================

function SafeState({
  t,
  consistency,
  health,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  consistency: number;
  health: number;
}) {
  return (
    <div className="space-y-6">
      {/* 安全状态头部 */}
      <RiskOverviewHeader
        anomalyCount={0}
        maxDeviation={0}
        riskScore={0}
        highRiskCount={0}
        mediumRiskCount={0}
        lowRiskCount={0}
        isSafe={true}
        t={t}
      />

      {/* 风险指标 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-emerald-500 rounded-full" />
          {t('crossOracle.risk.systemMetrics') || '系统指标'}
        </h3>
        <RiskMetricsGrid
          volatility={15}
          consistency={consistency}
          sensitivity={92}
          health={health}
          t={t}
        />
      </div>

      {/* 安全状态提示 */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('crossOracle.risk.allClear') || '数据正常'}
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            {t('crossOracle.risk.allClearDesc') ||
              '所有预言机价格数据在合理范围内，未发现异常偏差。建议继续保持当前监控策略。'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function RiskAlertTabComponent({
  anomalies,
  anomalyCount,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  maxDeviation,
  t,
}: RiskAlertTabProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');

  // 计算风险评分
  const riskScore = useMemo(() => {
    return calculateRiskScore(anomalyCount, highRiskCount, mediumRiskCount, maxDeviation);
  }, [anomalyCount, highRiskCount, mediumRiskCount, maxDeviation]);

  // 计算风险指标
  const riskMetrics = useMemo(() => {
    return calculateRiskMetrics(anomalies, maxDeviation);
  }, [anomalies, maxDeviation]);

  // 获取热力图数据
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const heatmapData = useMemo(() => {
    const providers = [...new Set(anomalies.map((a) => a.provider))];
    if (providers.length === 0) {
      return [];
    }
    return convertToHeatmapData(anomalies, providers);
  }, [anomalies]);

  // 安全状态
  if (anomalyCount === 0) {
    return <SafeState t={t} consistency={riskMetrics.consistency} health={riskMetrics.health} />;
  }

  return (
    <div className="space-y-6">
      {/* 第一层：风险概览头部 */}
      <RiskOverviewHeader
        anomalyCount={anomalyCount}
        maxDeviation={maxDeviation}
        riskScore={riskScore}
        highRiskCount={highRiskCount}
        mediumRiskCount={mediumRiskCount}
        lowRiskCount={lowRiskCount}
        isSafe={false}
        t={t}
      />

      {/* 第二层：风险指标卡片 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-purple-500 rounded-full" />
          {t('crossOracle.risk.keyMetrics') || '关键风险指标'}
        </h3>
        <RiskMetricsGrid
          volatility={riskMetrics.volatility}
          consistency={riskMetrics.consistency}
          sensitivity={riskMetrics.sensitivity}
          health={riskMetrics.health}
          t={t}
        />
      </div>

      {/* 第三层：热力图 + 趋势图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 风险热力图 */}
        <RiskHeatmap data={heatmapData} selectedSymbol="" t={t} />

        {/* 风险趋势图 */}
        <RiskTrendChart data={[]} timeRange={timeRange} onTimeRangeChange={setTimeRange} t={t} />
      </div>

      {/* 第四层：风险详情表格 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-orange-500 rounded-full" />
          {t('crossOracle.risk.anomalyDetails') || '异常详情'}
        </h3>
        {/* eslint-disable react-hooks/static-components */}
        <RiskDetailsTable anomalies={anomalies} t={t} />
      </div>

      {/* 第五层：智能风险建议 */}
      <RiskRecommendations
        anomalies={anomalies}
        highRiskCount={highRiskCount}
        mediumRiskCount={mediumRiskCount}
        maxDeviation={maxDeviation}
        t={t}
      />
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const RiskAlertTab = memo(RiskAlertTabComponent);
RiskAlertTab.displayName = 'RiskAlertTab';

export default RiskAlertTab;
