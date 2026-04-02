'use client';

/**
 * @fileoverview 异常检测面板组件
 * @description 紧凑展示离群值和延迟异常
 */

import { memo } from 'react';

import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';

import { oracleNames } from '../../constants';
import { formatLatency } from '../../hooks/useDataQualityScore';

import type { OracleQualityMetrics } from '../../hooks/useDataQualityScore';

// ============================================================================
// 类型定义
// ============================================================================

interface QualityAnomaliesPanelProps {
  outliers: OracleQualityMetrics[];
  highLatencyOracles: OracleQualityMetrics[];
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化百分比
 */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * 格式化价格
 */
function formatPrice(price: number): string {
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/**
 * 格式化Z-Score
 */
function formatZScore(zScore: number): string {
  return zScore.toFixed(2);
}

/**
 * 获取Z-Score严重程度
 */
function getZScoreSeverity(zScore: number): 'critical' | 'warning' | 'moderate' {
  const absZ = Math.abs(zScore);
  if (absZ > 3) return 'critical';
  if (absZ > 2.5) return 'warning';
  return 'moderate';
}

/**
 * 获取严重程度样式
 */
function getSeverityStyles(severity: 'critical' | 'warning' | 'moderate') {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-red-300',
        bg: 'bg-red-50',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
      };
    case 'warning':
      return {
        border: 'border-orange-300',
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-700',
      };
    case 'moderate':
      return {
        border: 'border-yellow-300',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-700',
      };
  }
}

// ============================================================================
// 离群值项组件
// ============================================================================

interface OutlierItemProps {
  metric: OracleQualityMetrics;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function OutlierItem({ metric, t }: OutlierItemProps) {
  const severity = getZScoreSeverity(metric.zScore);
  const styles = getSeverityStyles(severity);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded border',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', styles.text)} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{oracleNames[metric.provider]}</span>
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', styles.badge)}>
              Z={formatZScore(metric.zScore)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span>{formatPrice(metric.price)}</span>
            <span className={metric.deviationPercent > 0 ? 'text-red-600' : 'text-green-600'}>
              {formatPercent(metric.deviationPercent)}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={cn('text-xs font-medium', styles.text)}>
          {severity === 'critical'
            ? t('crossOracle.quality.severeOutlier') || '严重异常'
            : severity === 'warning'
              ? t('crossOracle.quality.moderateOutlier') || '中度异常'
              : t('crossOracle.quality.lightOutlier') || '轻度异常'}
        </div>
        <div className="text-xs text-gray-400">
          {t('crossOracle.quality.confidence') || '置信度'}: {(metric.confidence * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 延迟异常项组件
// ============================================================================

interface LatencyItemProps {
  metric: OracleQualityMetrics;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function LatencyItem({ metric, t }: LatencyItemProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded border border-yellow-200 bg-yellow-50/50">
      <div className="flex items-center gap-3">
        <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        <div>
          <span className="font-medium text-gray-900">{oracleNames[metric.provider]}</span>
          <div className="text-xs text-gray-500">{formatPrice(metric.price)}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono font-medium text-yellow-700">
          {formatLatency(metric.latency)}
        </div>
        <div className="text-xs text-gray-400">
          {t('crossOracle.quality.updateDelayed') || '更新延迟'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function QualityAnomaliesPanelComponent({
  outliers,
  highLatencyOracles,
  t,
  className,
}: QualityAnomaliesPanelProps) {
  const hasOutliers = outliers.length > 0;
  const hasHighLatency = highLatencyOracles.length > 0;

  // 如果没有异常，不显示面板
  if (!hasOutliers && !hasHighLatency) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-red-600" />
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.quality.anomaliesDetected') || '检测到数据异常'}
        </h4>
        <span className="ml-auto text-xs text-gray-500">
          {hasOutliers && `${t('crossOracle.quality.outliers') || '离群值'}: ${outliers.length}`}
          {hasOutliers && hasHighLatency && ' | '}
          {hasHighLatency &&
            `${t('crossOracle.quality.delayed') || '延迟'}: ${highLatencyOracles.length}`}
        </span>
      </div>

      {/* 异常列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 离群值列表 */}
        {hasOutliers && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t('crossOracle.quality.priceOutliers') || '价格离群值'}</span>
            </div>
            <div className="space-y-1.5">
              {outliers.map((metric) => (
                <OutlierItem key={metric.provider} metric={metric} t={t} />
              ))}
            </div>
          </div>
        )}

        {/* 延迟异常列表 */}
        {hasHighLatency && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('crossOracle.quality.highLatency') || '高延迟数据源'}</span>
            </div>
            <div className="space-y-1.5">
              {highLatencyOracles.map((metric) => (
                <LatencyItem key={metric.provider} metric={metric} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const QualityAnomaliesPanel = memo(QualityAnomaliesPanelComponent);
QualityAnomaliesPanel.displayName = 'QualityAnomaliesPanel';

export default QualityAnomaliesPanel;
