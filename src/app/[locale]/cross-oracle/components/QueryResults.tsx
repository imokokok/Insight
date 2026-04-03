'use client';

/**
 * @fileoverview 多预言机对比查询结果组件
 * @description 使用 Tab 切换展示价格对比、数据质量检测、风险预警三大核心功能
 */

import { memo, useState, useCallback } from 'react';

import { Database } from 'lucide-react';

import { EmptyStateEnhanced, ProgressBar } from '@/components/ui';
import { useTranslations } from '@/i18n';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { TabContentSwitcher, type TabType } from './TabContentSwitcher';
import { RiskAlertTab } from './tabs/RiskAlertTab';
import { SimplePriceComparisonTab } from './tabs/SimplePriceComparisonTab';
import { SimpleQualityAnalysisTab } from './tabs/SimpleQualityAnalysisTab';

import type { TimeRange } from '../constants';
import type { DataQualityScore } from '../hooks/useDataQualityScore';
import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

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
  description: string;
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
  performanceMetrics: import('@/lib/oracles/performanceMetricsCalculator').CalculatedPerformanceMetrics[];
  isCalculatingMetrics: boolean;
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
      <ProgressBar
        progress={queryProgress.completed}
        total={queryProgress.total}
        showPercentage={true}
        size="md"
        variant="default"
      />
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
  anomalyCount,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  maxDeviation,
  qualityScore,
  historicalData,
  oracleColors,
  performanceMetrics,
  isCalculatingMetrics,
}: QueryResultsProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabType>('priceComparison');

  // Tab 切换回调
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // 加载状态
  if (isLoading) {
    return <LoadingState queryProgress={queryProgress} currentQueryTarget={currentQueryTarget} />;
  }

  // 空状态
  if (priceData.length === 0) {
    return <EmptyState selectedSymbol={selectedSymbol} />;
  }

  // 渲染 Tab 内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'priceComparison':
        return (
          <div
            className="p-6"
            role="tabpanel"
            id="tabpanel-priceComparison"
            aria-labelledby="tab-priceComparison"
          >
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
        );

      case 'dataQuality':
        return (
          <div
            className="p-6"
            role="tabpanel"
            id="tabpanel-dataQuality"
            aria-labelledby="tab-dataQuality"
          >
            <SimpleQualityAnalysisTab
              priceData={priceData}
              selectedOracles={selectedOracles}
              t={t}
            />
          </div>
        );

      case 'riskAlert':
        return (
          <div
            className="p-6"
            role="tabpanel"
            id="tabpanel-riskAlert"
            aria-labelledby="tab-riskAlert"
          >
            <RiskAlertTab
              anomalies={anomalies}
              anomalyCount={anomalyCount}
              highRiskCount={highRiskCount}
              mediumRiskCount={mediumRiskCount}
              lowRiskCount={lowRiskCount}
              maxDeviation={maxDeviation}
              t={t}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Tab 切换导航 */}
      <TabContentSwitcher
        activeTab={activeTab}
        onTabChange={handleTabChange}
        riskAlertCount={anomalyCount}
        t={t}
      />

      {/* Tab 内容区域 */}
      <div className="min-h-[400px]">{renderTabContent()}</div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const QueryResults = memo(QueryResultsComponent);
QueryResults.displayName = 'QueryResults';

export default QueryResults;
