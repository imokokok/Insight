'use client';

/**
 * @fileoverview 风险热力图组件
 * @description 展示各预言机的风险状态网格热力图
 */

import { memo, useMemo } from 'react';

import { AlertTriangle, Info, ShieldCheck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// ============================================================================
// 类型定义
// ============================================================================

export type RiskLevel = 'high' | 'medium' | 'low' | 'normal';

export interface RiskHeatmapData {
  oracle: string;
  riskLevel: RiskLevel;
  deviation: number;
  timestamp: number;
}

interface RiskHeatmapProps {
  data: RiskHeatmapData[];
  selectedSymbol: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取风险等级对应的颜色类
 */
function getRiskColorClass(riskLevel: RiskLevel): {
  bg: string;
  border: string;
  text: string;
  hover: string;
} {
  switch (riskLevel) {
    case 'high':
      return {
        bg: 'bg-red-500',
        border: 'border-red-600',
        text: 'text-white',
        hover: 'hover:bg-red-600',
      };
    case 'medium':
      return {
        bg: 'bg-orange-500',
        border: 'border-orange-600',
        text: 'text-white',
        hover: 'hover:bg-orange-600',
      };
    case 'low':
      return {
        bg: 'bg-yellow-500',
        border: 'border-yellow-600',
        text: 'text-white',
        hover: 'hover:bg-yellow-600',
      };
    case 'normal':
    default:
      return {
        bg: 'bg-emerald-500',
        border: 'border-emerald-600',
        text: 'text-white',
        hover: 'hover:bg-emerald-600',
      };
  }
}

/**
 * 获取风险等级标签文本
 */
function getRiskLevelLabel(
  riskLevel: RiskLevel,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  switch (riskLevel) {
    case 'high':
      return t('crossOracle.risk.high');
    case 'medium':
      return t('crossOracle.risk.medium');
    case 'low':
      return t('crossOracle.risk.low');
    case 'normal':
      return t('crossOracle.risk.normal');
    default:
      return t('crossOracle.risk.unknown');
  }
}

/**
 * 格式化百分比显示
 */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * 格式化时间显示
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ============================================================================
// 热力图方块组件
// ============================================================================

interface HeatmapCellProps {
  item: RiskHeatmapData;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function HeatmapCell({ item, t }: HeatmapCellProps) {
  const colors = getRiskColorClass(item.riskLevel);

  const tooltipContent = useMemo(() => {
    return [
      `${t('crossOracle.oracle')}: ${item.oracle}`,
      `${t('crossOracle.deviation')}: ${formatPercent(item.deviation)}`,
      `${t('crossOracle.risk.level')}: ${getRiskLevelLabel(item.riskLevel, t)}`,
      `${t('crossOracle.detectedAt')}: ${formatTime(item.timestamp)}`,
    ].join('\n');
  }, [item, t]);

  return (
    <div
      className={`
        relative aspect-square rounded-xl border-2 p-3
        flex flex-col items-center justify-center
        transition-all duration-200 cursor-pointer
        shadow-sm hover:shadow-md hover:scale-105
        ${colors.bg} ${colors.border} ${colors.hover}
      `}
      title={tooltipContent}
    >
      {/* 风险图标 */}
      <div className="absolute top-2 right-2">
        {item.riskLevel === 'high' && <AlertTriangle className="w-4 h-4 text-white/80" />}
        {item.riskLevel === 'normal' && <ShieldCheck className="w-4 h-4 text-white/80" />}
      </div>

      {/* 预言机名称 */}
      <span className={`text-sm font-semibold ${colors.text} text-center leading-tight`}>
        {item.oracle}
      </span>

      {/* 偏差值 */}
      <span className={`text-xs ${colors.text} opacity-90 mt-1 font-mono`}>
        {formatPercent(item.deviation)}
      </span>
    </div>
  );
}

// ============================================================================
// 图例组件
// ============================================================================

interface LegendItemProps {
  riskLevel: RiskLevel;
  label: string;
  count: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function LegendItem({ riskLevel, label, count }: LegendItemProps) {
  const colors = getRiskColorClass(riskLevel);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded ${colors.bg} border ${colors.border}`} />
      <span className="text-sm text-gray-600">
        {label}
        {count > 0 && <span className="ml-1 text-gray-400">({count})</span>}
      </span>
    </div>
  );
}

// ============================================================================
// 空状态组件
// ============================================================================

function EmptyState({
  t,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Info className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-gray-900">
        {t('crossOracle.risk.noData')}
      </h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        {t('crossOracle.risk.noDataDesc')}
      </p>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function RiskHeatmapComponent({ data, selectedSymbol, t }: RiskHeatmapProps) {
  // 统计数据
  const stats = useMemo(() => {
    return {
      high: data.filter((item) => item.riskLevel === 'high').length,
      medium: data.filter((item) => item.riskLevel === 'medium').length,
      low: data.filter((item) => item.riskLevel === 'low').length,
      normal: data.filter((item) => item.riskLevel === 'normal').length,
    };
  }, [data]);

  // 解析交易对
  const [baseAsset, quoteAsset] = selectedSymbol.split('/');

  // 无数据时显示空状态
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-400" />
            {t('crossOracle.risk.heatmapTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState t={t} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-lg">
              {t('crossOracle.risk.heatmapTitle')}
              <span className="text-gray-400 mx-2">|</span>
              <span className="text-gray-700">
                {baseAsset}
                <span className="text-gray-400">/{quoteAsset}</span>
              </span>
            </CardTitle>
          </div>

          {/* 统计摘要 */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              {t('crossOracle.total')}:{' '}
              <strong className="text-gray-900">{data.length}</strong>
            </span>
            {stats.high > 0 && (
              <span className="text-red-600">
                {t('crossOracle.risk.high')}: <strong>{stats.high}</strong>
              </span>
            )}
            {stats.medium > 0 && (
              <span className="text-orange-600">
                {t('crossOracle.risk.medium')}: <strong>{stats.medium}</strong>
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 热力图网格 */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-6">
          {data.map((item, index) => (
            <HeatmapCell key={`${item.oracle}-${index}`} item={item} t={t} />
          ))}
        </div>

        {/* 图例 */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {t('crossOracle.risk.legend')}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <LegendItem
              riskLevel="high"
              label={t('crossOracle.risk.high')}
              count={stats.high}
              t={t}
            />
            <LegendItem
              riskLevel="medium"
              label={t('crossOracle.risk.medium')}
              count={stats.medium}
              t={t}
            />
            <LegendItem
              riskLevel="low"
              label={t('crossOracle.risk.low')}
              count={stats.low}
              t={t}
            />
            <LegendItem
              riskLevel="normal"
              label={t('crossOracle.risk.normal')}
              count={stats.normal}
              t={t}
            />
          </div>
        </div>

        {/* 说明文字 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            {t('crossOracle.risk.heatmapDesc') ||
              '热力图展示各预言机的风险状态，颜色越红表示风险越高。悬停在方块上可查看详细信息。'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const RiskHeatmap = memo(RiskHeatmapComponent);
RiskHeatmap.displayName = 'RiskHeatmap';

export default RiskHeatmap;
