'use client';

import { useState, useEffect } from 'react';

import { AlertTriangle, CheckCircle2, Clock, Database, Shield, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleNames } from '../../constants';
import { QualityScoreCard } from '../QualityScoreCard';
import RiskAlertBanner from '../RiskAlertBanner';

import type { DataQualityScore } from '../../hooks/useDataQualityScore';
import type { PriceAnomaly } from '../../hooks/usePriceAnomalyDetection';

interface QualityAnalysisTabProps {
  priceData: PriceData[];
  isLoading: boolean;
  selectedOracles: OracleProvider[];
  qualityScore: DataQualityScore;
  anomalies: PriceAnomaly[];
  anomalyCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  maxDeviation: number;
  lastUpdated: Date;
  successCount: number;
  totalCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// 格式化价格显示
function formatPrice(value: number): string {
  if (value <= 0) return '-';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 格式化百分比显示
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// 获取严重程度颜色
function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'low':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// 获取严重程度标签
function getSeverityLabel(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return '高风险';
    case 'medium':
      return '中风险';
    case 'low':
      return '低风险';
    default:
      return '未知';
  }
}

// 获取评分等级颜色
function getScoreLevelColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

// 获取评分等级背景色
function getScoreLevelBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function QualityAnalysisTab({
  priceData,
  isLoading,
  selectedOracles,
  qualityScore,
  anomalies,
  anomalyCount,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  maxDeviation,
  lastUpdated,
  successCount,
  totalCount,
  t,
}: QualityAnalysisTabProps) {
  const [freshnessMinutes, setFreshnessMinutes] = useState(() =>
    Math.floor((Date.now() - lastUpdated.getTime()) / 1000 / 60)
  );

  useEffect(() => {
    const updateFreshness = () => {
      setFreshnessMinutes(Math.floor((Date.now() - lastUpdated.getTime()) / 1000 / 60));
    };
    updateFreshness();
    const interval = setInterval(updateFreshness, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const completenessPercent = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 风险预警横幅 */}
      <RiskAlertBanner
        anomalies={anomalies}
        count={anomalyCount}
        highRiskCount={highRiskCount}
        mediumRiskCount={mediumRiskCount}
        lowRiskCount={lowRiskCount}
        maxDeviation={maxDeviation}
        t={t}
      />

      {/* 质量评分卡片 */}
      <QualityScoreCard
        score={qualityScore}
        title="数据质量综合评估"
        showSuggestions={true}
        variant="default"
        isLoading={isLoading}
      />

      {/* 详细分析网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 价格异常列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <CardTitle>价格异常检测</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {anomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <p className="text-gray-900 font-medium">未发现价格异常</p>
                <p className="text-sm text-gray-500 mt-1">所有数据源价格均在正常范围内</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((anomaly, index) => (
                  <div
                    key={`${anomaly.provider}-${index}`}
                    className={`p-4 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {oracleNames[anomaly.provider]}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/80">
                            {getSeverityLabel(anomaly.severity)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">价格:</span>
                            <span className="ml-2 font-medium">{formatPrice(anomaly.price)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">偏差:</span>
                            <span
                              className={`ml-2 font-medium ${
                                anomaly.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {formatPercent(anomaly.deviationPercent)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{anomaly.reasonKeys.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数据质量详细分析 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-500" />
              <CardTitle>数据质量详细分析</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 一致性分析 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">数据一致性</span>
                  </div>
                  <span
                    className={`text-lg font-bold ${getScoreLevelColor(qualityScore.consistency)}`}
                  >
                    {Math.round(qualityScore.consistency)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getScoreLevelBgColor(qualityScore.consistency)}`}
                    style={{ width: `${Math.max(0, Math.min(100, qualityScore.consistency))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  基于各数据源价格的标准差计算，分数越高表示数据越一致
                </p>
              </div>

              {/* 新鲜度分析 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700">数据新鲜度</span>
                  </div>
                  <span
                    className={`text-lg font-bold ${getScoreLevelColor(qualityScore.freshness)}`}
                  >
                    {Math.round(qualityScore.freshness)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getScoreLevelBgColor(qualityScore.freshness)}`}
                    style={{ width: `${Math.max(0, Math.min(100, qualityScore.freshness))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">最后更新: {freshnessMinutes} 分钟前</p>
              </div>

              {/* 完整性分析 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">数据完整性</span>
                  </div>
                  <span
                    className={`text-lg font-bold ${getScoreLevelColor(qualityScore.completeness)}`}
                  >
                    {Math.round(qualityScore.completeness)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getScoreLevelBgColor(qualityScore.completeness)}`}
                    style={{ width: `${Math.max(0, Math.min(100, qualityScore.completeness))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  成功响应: {successCount} / {totalCount} ({completenessPercent.toFixed(1)}%)
                </p>
              </div>

              {/* 综合评分 */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span className="text-base font-semibold text-gray-900">综合评分</span>
                  </div>
                  <span
                    className={`text-2xl font-bold ${getScoreLevelColor(qualityScore.overall)}`}
                  >
                    {Math.round(qualityScore.overall)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  基于一致性、新鲜度、完整性的加权综合评估
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 数据源状态概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-500" />
            <CardTitle>数据源状态概览</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {selectedOracles.map((oracle) => {
              const oracleData = priceData.find((p) => p.provider === oracle);
              const hasAnomaly = anomalies.some((a) => a.provider === oracle);
              const anomaly = anomalies.find((a) => a.provider === oracle);

              return (
                <div
                  key={oracle}
                  className={`p-4 rounded-lg border ${
                    hasAnomaly
                      ? anomaly?.severity === 'high'
                        ? 'bg-red-50 border-red-200'
                        : anomaly?.severity === 'medium'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-yellow-50 border-yellow-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">{oracleNames[oracle]}</span>
                    {hasAnomaly ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {oracleData ? formatPrice(oracleData.price) : '-'}
                  </p>
                  {hasAnomaly && anomaly && (
                    <p
                      className={`text-xs mt-1 ${
                        anomaly.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      偏差 {formatPercent(anomaly.deviationPercent)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
