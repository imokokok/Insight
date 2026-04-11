'use client';

/**
 * @fileoverview 多预言机对比查询结果组件
 * @description 展示价格对比核心功能
 */

import { memo } from 'react';

import { Database } from 'lucide-react';

import { EmptyStateEnhanced } from '@/components/ui';
import { useTranslations } from '@/i18n';
import type { CalculatedPerformanceMetrics } from '@/lib/oracles/performanceMetricsCalculator';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { OracleErrorPanel } from './OracleErrorPanel';
import { SimplePriceComparisonTab } from './tabs/SimplePriceComparisonTab';

import type { TimeRange } from '../constants';
import type { DataQualityScore } from '../hooks/useDataQualityScore';
import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';
import type { OracleDataError } from '../types';

// ============================================================================
// 类型定义
// ============================================================================

interface OracleFeature {
  provider: string;
  name: string;
  symbolCount: number;
  avgLatency: number;
  updateFrequency: string;
  features: string[];
  descriptionKey: string;
}

interface QueryResultsProps {
  // 数据
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;

  // 加载状态
  isLoading: boolean;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: string | null };

  // 统计数据
  avgPrice: number;
  medianPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  validPrices: number[];

  // 异常检测
  anomalies: PriceAnomaly[];
  anomalyCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  maxDeviation: number;

  // 质量评分
  qualityScore: DataQualityScore;

  // 预言机特性
  oracleFeatures: OracleFeature[];

  // 历史数据（用于走势图）
  historicalData?: Partial<Record<OracleProvider, Array<{ timestamp: number; price: number }>>>;

  // 预言机颜色配置
  oracleColors: Record<OracleProvider, string>;

  // 回调
  onRefresh: () => void;

  // 性能指标（新增）
  performanceMetrics: CalculatedPerformanceMetrics[];
  isCalculatingMetrics: boolean;

  // 错误处理（新增）
  oracleDataError?: OracleDataError;
  retryOracle?: (provider: OracleProvider) => Promise<void>;
  retryAllFailed?: () => Promise<void>;
  isRetrying?: boolean;
  retryingOracles?: OracleProvider[];
}

// ============================================================================
// 加载状态组件
// ============================================================================

function LoadingState({
  queryProgress,
  currentQueryTarget,
}: {
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: string | null };
}) {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.loadingData') || 'Loading Data'}
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          {queryProgress.completed} / {queryProgress.total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300 bg-primary-600"
          style={{ width: `${(queryProgress.completed / queryProgress.total) * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {t('crossOracle.querying') || 'Querying'}{' '}
        {currentQueryTarget.oracle && t(`navbar.${currentQueryTarget.oracle.toLowerCase()}`)}
      </p>
    </div>
  );
}

// ============================================================================
// 空状态组件
// ============================================================================

function EmptyState({ selectedSymbol }: { selectedSymbol: string }) {
  const t = useTranslations();

  return (
    <EmptyStateEnhanced
      type="search"
      title={
        t('crossOracle.noDataTitle', { symbol: selectedSymbol }) || `No data for ${selectedSymbol}`
      }
      description={
        t('crossOracle.noDataDescription') ||
        'Please select oracles and query to view comparison data'
      }
      size="lg"
      variant="page"
    />
  );
}

// ============================================================================
// 主组件
// ============================================================================

function QueryResultsComponent({
  priceData,
  selectedOracles,
  selectedSymbol,
  isLoading,
  queryProgress,
  currentQueryTarget,
  avgPrice,
  medianPrice,
  minPrice,
  maxPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  validPrices,
  anomalies,
  anomalyCount: _anomalyCount,
  highRiskCount: _highRiskCount,
  mediumRiskCount: _mediumRiskCount,
  lowRiskCount: _lowRiskCount,
  maxDeviation: _maxDeviation,
  qualityScore: _qualityScore,
  historicalData,
  oracleColors,
  performanceMetrics: _performanceMetrics,
  isCalculatingMetrics: _isCalculatingMetrics,
  oracleDataError,
  retryOracle,
  retryAllFailed,
  isRetrying,
  retryingOracles,
  onRefresh,
}: QueryResultsProps) {
  const t = useTranslations();

  // 加载状态
  if (isLoading) {
    return <LoadingState queryProgress={queryProgress} currentQueryTarget={currentQueryTarget} />;
  }

  // 全局错误状态（所有预言机都失败）
  if (oracleDataError?.globalError && !oracleDataError.isPartialSuccess && priceData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <OracleErrorPanel
          oracleDataError={oracleDataError}
          retryOracle={retryOracle}
          retryAllFailed={retryAllFailed}
          isRetrying={isRetrying}
          retryingOracles={retryingOracles}
          onRefresh={onRefresh}
          t={t}
        />
      </div>
    );
  }

  // 空状态（没有选择预言机或没有数据）
  if (priceData.length === 0) {
    return <EmptyState selectedSymbol={selectedSymbol} />;
  }

  return (
    <div className="space-y-4">
      {/* 部分成功错误面板 */}
      {oracleDataError?.hasError && oracleDataError.isPartialSuccess && (
        <OracleErrorPanel
          oracleDataError={oracleDataError}
          retryOracle={retryOracle}
          retryAllFailed={retryAllFailed}
          isRetrying={isRetrying}
          retryingOracles={retryingOracles}
          onRefresh={onRefresh}
          t={t}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 价格对比内容 */}
        <div className="min-h-[400px] p-6">
          <SimplePriceComparisonTab
            priceData={priceData}
            selectedOracles={selectedOracles}
            selectedSymbol={selectedSymbol}
            medianPrice={medianPrice}
            minPrice={minPrice}
            maxPrice={maxPrice}
            priceRange={priceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            avgPrice={avgPrice}
            validPrices={validPrices}
            anomalies={anomalies}
            historicalData={historicalData}
            oracleColors={oracleColors}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const QueryResults = memo(QueryResultsComponent);
QueryResults.displayName = 'QueryResults';

export default QueryResults;
