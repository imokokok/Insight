'use client';

/**
 * @fileoverview 价格对比 Tab 组件（专业版）
 * @description 精简版价格对比展示，2个核心指标卡片 + 专业表格 + 多维度图表
 */

import { memo, useState, useMemo } from 'react';

import { TrendingUp, Filter } from 'lucide-react';

import type { OracleProvider, PriceData } from '@/types/oracle';

import {
  MarketConsensusCard,
  PriceDispersionCard,
  ChartTabSwitcher,
  type ChartTabType,
  PriceDistributionHistogram,
  DeviationScatterChart,
  MultiOracleTrendChart,
  MarketDepthSimulator,
} from '../price-comparison';
import { SimplePriceTable } from '../SimplePriceTable';

// ============================================================================
// 类型定义
// ============================================================================

interface SimplePriceComparisonTabProps {
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  avgPrice: number;
  validPrices: number[];
  anomalies: Array<{
    provider: OracleProvider;
    deviationPercent: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  historicalData?: Record<OracleProvider, Array<{ timestamp: number; price: number }>>;
  oracleColors: Record<OracleProvider, string>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// 辅助函数
// ============================================================================

function formatPrice(value: number): string {
  if (value <= 0) return '-';
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

// ============================================================================
// 主组件
// ============================================================================

function SimplePriceComparisonTabComponent({
  priceData,
  selectedOracles,
  selectedSymbol,
  medianPrice,
  minPrice,
  maxPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  avgPrice,
  validPrices,
  anomalies,
  historicalData,
  oracleColors,
  t,
}: SimplePriceComparisonTabProps) {
  const [baseAsset, quoteAsset] = selectedSymbol.split('/');
  const [activeChartTab, setActiveChartTab] = useState<ChartTabType>('distribution');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'error'>('all');

  // 计算统计数据
  const stats = useMemo(() => {
    const oracleCount = priceData.length;
    const anomalyCount = anomalies.length;
    return { oracleCount, anomalyCount };
  }, [priceData, anomalies]);

  // 渲染图表内容
  const renderChartContent = () => {
    switch (activeChartTab) {
      case 'distribution':
        return (
          <PriceDistributionHistogram
            priceData={priceData}
            medianPrice={medianPrice}
            anomalies={anomalies}
            t={t}
          />
        );
      case 'scatter':
        return (
          <DeviationScatterChart
            priceData={priceData}
            medianPrice={medianPrice}
            anomalies={anomalies}
            t={t}
          />
        );
      case 'trend':
        return (
          <MultiOracleTrendChart
            historicalData={historicalData || {}}
            oracleColors={oracleColors}
            t={t}
          />
        );
      case 'depth':
        return <MarketDepthSimulator priceData={priceData} medianPrice={medianPrice} t={t} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 交易对信息头部 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded text-[10px] font-medium text-emerald-700 uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
              </span>
              {t('crossOracle.live') || 'Live'}
            </span>
            {stats.anomalyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 rounded text-[10px] font-medium text-red-700">
                {stats.anomalyCount} {t('crossOracle.anomaliesDetected') || '个异常'}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">{baseAsset}</span>
            <span className="text-base text-gray-400 font-medium">/{quoteAsset}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">{t('crossOracle.oracleCount') || '预言机数量'}</p>
            <p className="text-lg font-semibold text-gray-900">{stats.oracleCount}</p>
          </div>
        </div>
      </div>

      {/* 核心指标卡片 - 2个 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketConsensusCard
          medianPrice={medianPrice}
          minPrice={minPrice}
          maxPrice={maxPrice}
          symbol={selectedSymbol}
          t={t}
        />
        <PriceDispersionCard
          standardDeviation={standardDeviation}
          avgPrice={avgPrice}
          oracleCount={stats.oracleCount}
          t={t}
        />
      </div>

      {/* 专业价格对比表格 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            {t('crossOracle.priceComparison') || '价格对比'}
          </h4>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('crossOracle.filter.all') || '全部'}</option>
              <option value="normal">{t('crossOracle.filter.normal') || '正常'}</option>
              <option value="warning">{t('crossOracle.filter.warning') || '警告'}</option>
              <option value="error">{t('crossOracle.filter.error') || '异常'}</option>
            </select>
          </div>
        </div>

        <SimplePriceTable
          priceData={priceData}
          medianPrice={medianPrice}
          validPrices={validPrices}
          anomalies={anomalies}
          statusFilter={statusFilter}
          t={t}
        />
      </div>

      {/* 图表区域 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            {t('crossOracle.visualization') || '可视化分析'}
          </h4>
          <ChartTabSwitcher activeTab={activeChartTab} onTabChange={setActiveChartTab} t={t} />
        </div>
        {renderChartContent()}
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const SimplePriceComparisonTab = memo(SimplePriceComparisonTabComponent);
SimplePriceComparisonTab.displayName = 'SimplePriceComparisonTab';

export default SimplePriceComparisonTab;
