'use client';

/**
 * @fileoverview 风险预警 Tab 组件
 * @description 展示价格异常检测信息和风险预警
 */

import { memo } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { oracleNames } from '../../constants';
import type { PriceAnomaly, AnomalySeverity } from '../../hooks/usePriceAnomalyDetection';

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

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取严重程度对应的颜色类
 */
function getSeverityColorClass(severity: AnomalySeverity): {
  bg: string;
  border: string;
  text: string;
  icon: string;
  badge: string;
} {
  switch (severity) {
    case 'high':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: 'text-red-500',
        badge: 'bg-red-500 text-white',
      };
    case 'medium':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        icon: 'text-orange-500',
        badge: 'bg-orange-500 text-white',
      };
    case 'low':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        icon: 'text-yellow-500',
        badge: 'bg-yellow-500 text-white',
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        icon: 'text-gray-500',
        badge: 'bg-gray-500 text-white',
      };
  }
}

/**
 * 获取严重程度标签文本
 */
function getSeverityLabel(
  severity: AnomalySeverity,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  switch (severity) {
    case 'high':
      return t('crossOracle.risk.high') || '高风险';
    case 'medium':
      return t('crossOracle.risk.medium') || '中风险';
    case 'low':
      return t('crossOracle.risk.low') || '低风险';
    default:
      return t('crossOracle.risk.unknown') || '未知';
  }
}

/**
 * 获取严重程度图标
 */
function getSeverityIcon(severity: AnomalySeverity): React.ReactNode {
  switch (severity) {
    case 'high':
      return <AlertOctagon className="w-5 h-5" />;
    case 'medium':
      return <AlertTriangle className="w-5 h-5" />;
    case 'low':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
}

/**
 * 格式化百分比显示
 */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * 格式化价格显示
 */
function formatPrice(value: number): string {
  if (value <= 0) return '-';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// 风险分布卡片组件
// ============================================================================

interface RiskDistributionCardProps {
  severity: AnomalySeverity;
  count: number;
  total: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function RiskDistributionCard({ severity, count, total, t }: RiskDistributionCardProps) {
  const colors = getSeverityColorClass(severity);
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border p-4
        transition-all duration-200 hover:shadow-md
        ${colors.bg} ${colors.border}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
            {getSeverityIcon(severity)}
            <span>{getSeverityLabel(severity, t)}</span>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-bold ${colors.text}`}>{count}</span>
            <span className={`ml-1 text-sm ${colors.text} opacity-70`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className={`p-2 rounded-lg bg-white/60 ${colors.icon}`}>
          {getSeverityIcon(severity)}
        </div>
      </div>
      <div className="mt-3">
        <div className="w-full bg-white/50 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${colors.badge}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 异常列表项组件
// ============================================================================

interface AnomalyListItemProps {
  anomaly: PriceAnomaly;
  index: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function AnomalyListItem({ anomaly, index, t }: AnomalyListItemProps) {
  const colors = getSeverityColorClass(anomaly.severity);

  return (
    <div
      className={`
        flex items-start gap-4 p-4 rounded-xl border
        transition-all duration-200 hover:shadow-sm
        ${colors.bg} ${colors.border}
      `}
    >
      <div className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>
        {getSeverityIcon(anomaly.severity)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">
            {oracleNames[anomaly.provider]}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colors.badge}`}>
            {getSeverityLabel(anomaly.severity, t)}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500">
              {t('crossOracle.price') || '价格'}
            </span>
            <p className="text-sm font-medium text-gray-900">
              {formatPrice(anomaly.price)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">
              {t('crossOracle.deviation') || '偏差'}
            </span>
            <p className={`text-sm font-medium ${anomaly.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatPercent(anomaly.deviationPercent)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-600">{anomaly.reason}</p>
      </div>
      <div className="flex-shrink-0 text-xs text-gray-400 font-mono">
        #{index + 1}
      </div>
    </div>
  );
}

// ============================================================================
// 安全状态组件
// ============================================================================

function SafeState({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <ShieldCheck className="w-10 h-10 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">
        {t('crossOracle.risk.allClear') || '数据正常'}
      </h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        {t('crossOracle.risk.allClearDesc') || '所有预言机价格数据在合理范围内，未发现异常偏差'}
      </p>
      <div className="mt-6 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-sm text-emerald-700 font-medium">
          {t('crossOracle.risk.monitoring') || '实时监控中'}
        </span>
      </div>
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
  // 有异常时的展示
  if (anomalyCount > 0) {
    const hasHighRisk = highRiskCount > 0;

    return (
      <div className="space-y-6">
        {/* 风险概览卡片 */}
        <Card className={hasHighRisk ? 'border-red-200 bg-red-50/30' : 'border-orange-200 bg-orange-50/30'}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasHighRisk ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {t('crossOracle.risk.alertTitle', { count: anomalyCount }) || `检测到 ${anomalyCount} 个价格异常`}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t('crossOracle.risk.maxDeviation') || '最大偏差'}: {' '}
                  <span className={`font-mono font-semibold ${hasHighRisk ? 'text-red-600' : 'text-orange-600'}`}>
                    {formatPercent(maxDeviation)}
                  </span>
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 风险等级分布 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            {t('crossOracle.risk.distribution') || '风险分布'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RiskDistributionCard
              severity="high"
              count={highRiskCount}
              total={anomalyCount}
              t={t}
            />
            <RiskDistributionCard
              severity="medium"
              count={mediumRiskCount}
              total={anomalyCount}
              t={t}
            />
            <RiskDistributionCard
              severity="low"
              count={lowRiskCount}
              total={anomalyCount}
              t={t}
            />
          </div>
        </div>

        {/* 异常列表 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-gray-400" />
            {t('crossOracle.risk.anomalyList') || '异常详情'}
          </h4>
          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <AnomalyListItem
                key={`${anomaly.provider}-${index}`}
                anomaly={anomaly}
                index={index}
                t={t}
              />
            ))}
          </div>
        </div>

        {/* 处理建议 */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  {t('crossOracle.risk.suggestions') || '处理建议'}
                </h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{t('crossOracle.risk.suggestion1') || '建议检查异常预言机的数据源连接状态'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{t('crossOracle.risk.suggestion2') || '考虑暂时停用偏差过大的数据源'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{t('crossOracle.risk.suggestion3') || '关注市场波动情况，确认是否为系统性风险'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 无异常时的安全状态
  return <SafeState t={t} />;
}

// ============================================================================
// 导出
// ============================================================================

export const RiskAlertTab = memo(RiskAlertTabComponent);
RiskAlertTab.displayName = 'RiskAlertTab';

export default RiskAlertTab;
