'use client';

/**
 * @fileoverview 数据质量 Tab 组件（专业版）
 * @description 专业数据质量分析展示，包含核心统计指标、对比表格、趋势图表
 */

import { memo } from 'react';

import { BarChart3 } from 'lucide-react';

import type { OracleProvider, PriceData } from '@/types/oracle';

import { useProfessionalQualityMetrics } from '../../hooks/useDataQualityScore';
import {
  QualityMetricsHeader,
  OracleQualityTable,
  QualityTrendChart,
  QualityAnomaliesPanel,
} from '../quality';

// ============================================================================
// 类型定义
// ============================================================================

interface SimpleQualityAnalysisTabProps {
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// 主组件
// ============================================================================

function SimpleQualityAnalysisTabComponent({
  priceData,
  selectedOracles,
  t,
}: SimpleQualityAnalysisTabProps) {
  // 使用专业质量指标Hook
  const { metrics, oracleMetrics, outliers, highLatencyOracles } =
    useProfessionalQualityMetrics(priceData);

  // 过滤只显示选中的预言机
  const filteredOracleMetrics = oracleMetrics.filter((m) => selectedOracles.includes(m.provider));

  const hasAnomalies = outliers.length > 0 || highLatencyOracles.length > 0;

  return (
    <div className="space-y-5">
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-900">
          {t('crossOracle.quality.professionalAnalysis')}
        </h3>
      </div>

      {/* 核心指标行 */}
      <QualityMetricsHeader metrics={metrics} t={t} />

      {/* 两栏布局：左侧图表 + 右侧表格 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* 左侧：趋势图表 */}
        <QualityTrendChart metrics={metrics} t={t} />

        {/* 右侧：对比表格 */}
        <OracleQualityTable oracleMetrics={filteredOracleMetrics} t={t} />
      </div>

      {/* 异常检测面板（仅在存在异常时显示） */}
      {hasAnomalies && (
        <QualityAnomaliesPanel outliers={outliers} highLatencyOracles={highLatencyOracles} t={t} />
      )}

      {/* 数据说明 */}
      <div className="text-xs text-gray-400 pt-3 border-t border-gray-100">
        <p>
          {t('crossOracle.quality.dataNote') ||
            '数据说明：CV=变异系数，SEM=标准误差，Z-Score表示偏离中位数的标准差倍数。'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const SimpleQualityAnalysisTab = memo(SimpleQualityAnalysisTabComponent);
SimpleQualityAnalysisTab.displayName = 'SimpleQualityAnalysisTab';

export default SimpleQualityAnalysisTab;
