'use client';

/**
 * @fileoverview 数据质量 Tab 组件（简化版）
 * @description 精简版数据质量展示，供 QueryResults 使用
 */

import { memo } from 'react';
import {
  Shield,
  CheckCircle2,
  Clock,
  Database,
  TrendingUp,
  AlertCircle,
  Award,
  Zap,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { OracleProvider, PriceData } from '@/types/oracle';
import { oracleNames } from '../../constants';
import type { DataQualityScore } from '../../hooks/useDataQualityScore';

// ============================================================================
// 类型定义
// ============================================================================

interface SimpleQualityAnalysisTabProps {
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  qualityScore: DataQualityScore;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// 辅助函数
// ============================================================================

function getScoreLevelColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreLevelBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getScoreLevelLabel(score: number, t: (key: string) => string): string {
  if (score >= 80) return t('crossOracle.quality.excellent') || '优秀';
  if (score >= 60) return t('crossOracle.quality.good') || '良好';
  if (score >= 40) return t('crossOracle.quality.fair') || '一般';
  return t('crossOracle.quality.poor') || '较差';
}

// ============================================================================
// 质量维度卡片组件
// ============================================================================

interface QualityDimensionCardProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  description: string;
  colorClass: string;
}

function QualityDimensionCard({
  icon,
  label,
  score,
  description,
  colorClass,
}: QualityDimensionCardProps) {
  const scoreColor = getScoreLevelColor(score);
  const scoreBg = getScoreLevelBgColor(score);

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-gray-50 ${colorClass}`}>{icon}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className={`text-lg font-bold ${scoreColor}`}>{Math.round(score)}</span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${scoreBg}`}
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 综合评分环形图组件
// ============================================================================

interface OverallScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function OverallScoreRing({ score, size = 120, strokeWidth = 10 }: OverallScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number): string => {
    if (s >= 80) return '#10B981';
    if (s >= 60) return '#3B82F6';
    if (s >= 40) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${getScoreLevelColor(score)}`}>{Math.round(score)}</span>
        <span className="text-xs text-gray-500">总分</span>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function SimpleQualityAnalysisTabComponent({
  priceData,
  selectedOracles,
  qualityScore,
  t,
}: SimpleQualityAnalysisTabProps) {
  // 计算数据新鲜度（分钟）
  const lastUpdated = priceData.length > 0
    ? new Date(Math.max(...priceData.map(p => new Date(p.timestamp).getTime())))
    : new Date();
  const freshnessMinutes = Math.floor((Date.now() - lastUpdated.getTime()) / 1000 / 60);

  // 计算完整性
  const successCount = priceData.filter(p => p.price > 0).length;
  const totalCount = selectedOracles.length;

  return (
    <div className="space-y-6">
      {/* 综合评分头部 */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <OverallScoreRing score={qualityScore.overall} />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Award className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('crossOracle.quality.overallScore') || '数据质量综合评分'}
            </h3>
          </div>
          <p className={`text-2xl font-bold mt-1 ${getScoreLevelColor(qualityScore.overall)}`}>
            {getScoreLevelLabel(qualityScore.overall, t)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('crossOracle.quality.basedOn') || '基于一致性、新鲜度、完整性的加权评估'}
          </p>
        </div>
      </div>

      {/* 三个维度分析 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gray-400" />
          {t('crossOracle.quality.dimensions') || '质量维度分析'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QualityDimensionCard
            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
            label={t('crossOracle.quality.consistency') || '数据一致性'}
            score={qualityScore.consistency}
            description={t('crossOracle.quality.consistencyDesc') || '基于各数据源价格的标准差计算'}
            colorClass="text-blue-500"
          />
          <QualityDimensionCard
            icon={<Clock className="w-5 h-5 text-emerald-500" />}
            label={t('crossOracle.quality.freshness') || '数据新鲜度'}
            score={qualityScore.freshness}
            description={
              freshnessMinutes < 1
                ? t('crossOracle.quality.justUpdated') || '刚刚更新'
                : t('crossOracle.quality.minutesAgo', { minutes: freshnessMinutes }) || `${freshnessMinutes} 分钟前更新`
            }
            colorClass="text-emerald-500"
          />
          <QualityDimensionCard
            icon={<Database className="w-5 h-5 text-purple-500" />}
            label={t('crossOracle.quality.completeness') || '数据完整性'}
            score={qualityScore.completeness}
            description={t('crossOracle.quality.completenessDesc', {
              success: successCount,
              total: totalCount,
            }) || `成功响应: ${successCount}/${totalCount}`}
            colorClass="text-purple-500"
          />
        </div>
      </div>

      {/* 数据源状态 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-400" />
          {t('crossOracle.quality.dataSourceStatus') || '数据源状态'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {selectedOracles.map((oracle) => {
            const oracleData = priceData.find((p) => p.provider === oracle);
            const hasData = oracleData && oracleData.price > 0;

            return (
              <div
                key={oracle}
                className={`
                  p-3 rounded-lg border transition-all duration-200
                  ${hasData
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  {hasData ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{oracleNames[oracle]}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {hasData ? `$${oracleData.price.toLocaleString()}` : '-'}
                </p>
                {hasData && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(oracleData.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 改进建议 */}
      {qualityScore.suggestions && qualityScore.suggestions.length > 0 && (
        <Card className="bg-amber-50/50 border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base">
                {t('crossOracle.quality.suggestions') || '改进建议'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {qualityScore.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const SimpleQualityAnalysisTab = memo(SimpleQualityAnalysisTabComponent);
SimpleQualityAnalysisTab.displayName = 'SimpleQualityAnalysisTab';

export default SimpleQualityAnalysisTab;
