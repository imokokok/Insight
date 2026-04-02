'use client';

/**
 * @fileoverview 多预言机对比页面
 * @description 提供多预言机价格对比、数据质量检测、风险预警功能
 * @layout 左侧选择框 + 右侧查询结果（参照价格查询页面布局）
 */

import { useRef, useCallback, useMemo } from 'react';

import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts } from '@/hooks';
import { useTranslations } from '@/i18n';

import { ControlPanel } from './components/ControlPanel';
import { QueryResults } from './components/QueryResults';
import { useCrossOraclePage } from './hooks';

export default function CrossOraclePage() {
  const t = useTranslations();
  const filterInputRef = useRef<HTMLInputElement>(null);

  const {
    // 基础状态
    selectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    timeRange,
    setTimeRange,

    // 数据
    priceData,
    isLoading,
    lastUpdated,
    fetchPriceData,

    // 统计数据
    avgPrice,
    medianPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviation,
    standardDeviationPercent,
    validPrices,

    // 异常检测
    anomalies,
    anomalyCount,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    maxDeviation,

    // 质量评分
    qualityScore,

    // 预言机特性
    oracleFeatures,

    // 历史数据
    historicalData,

    // 回调
    toggleOracle,

    // 其他
    symbols,
  } = useCrossOraclePage();

  // Debounced search focus handler
  const debouncedSearchFocus = useCallback(() => {
    requestAnimationFrame(() => {
      filterInputRef.current?.focus();
    });
  }, []);

  // Keyboard shortcuts
  useCommonShortcuts({
    onRefresh: fetchPriceData,
    onSearch: debouncedSearchFocus,
  });

  // 构建 queryProgress（模拟进度）
  const queryProgress = useMemo(
    () => ({
      completed: isLoading ? Math.floor(priceData.length / 2) : priceData.length,
      total: selectedOracles.length,
    }),
    [isLoading, priceData.length, selectedOracles.length]
  );

  // 当前查询目标
  const currentQueryTarget = useMemo(
    () => ({
      oracle: selectedOracles[0] || null,
      chain: null,
    }),
    [selectedOracles]
  );

  // 构建 qualityScore 对象
  const qualityScoreData = useMemo(
    () => ({
      overall: qualityScore?.overall || 85,
      consistency: qualityScore?.consistency || 88,
      freshness: qualityScore?.freshness || 92,
      completeness: qualityScore?.completeness || 75,
      suggestions: qualityScore?.suggestions || [],
    }),
    [qualityScore]
  );

  // 预言机颜色配置
  const oracleChartColors = useMemo(() => {
    const colors: Record<string, string> = {};
    selectedOracles.forEach((oracle, index) => {
      const colorPalette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
      colors[oracle] = colorPalette[index % colorPalette.length];
    });
    return colors;
  }, [selectedOracles]);

  // 活跃筛选器计数
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedOracles.length > 0) count++;
    if (selectedSymbol) count++;
    if (timeRange !== '24H') count++;
    return count;
  }, [selectedOracles.length, selectedSymbol, timeRange]);

  // 清除筛选器
  const handleClearFilters = useCallback(() => {
    setTimeRange('24H');
  }, [setTimeRange]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      {/* 屏幕阅读器通知区域 */}
      <div aria-live="polite" className="sr-only">
        {isLoading
          ? t('crossOracle.loadingData') || 'Loading data'
          : `${priceData.length} ${t('crossOracle.results') || 'results'}`}
      </div>

      {/* 页面头部 */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('crossOracle.title') || 'Cross-Oracle Comparison'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('crossOracle.subtitle') ||
                'Compare prices across multiple oracles, detect anomalies, and assess data quality'}
            </p>
          </div>

          {/* 收藏和快捷操作 */}
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {t('crossOracle.lastUpdated') || 'Last updated'}: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <LiveStatusBar
          isConnected={!isLoading}
          latency={undefined}
          lastUpdate={lastUpdated || undefined}
        />
      </div>

      {/* 主内容区域 - 左右布局 */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* 左侧选择框 */}
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <div className="xl:sticky xl:top-4">
            <ControlPanel
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              symbols={symbols}
              selectedOracles={selectedOracles}
              onOracleToggle={toggleOracle}
              oracleChartColors={oracleChartColors}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onQuery={fetchPriceData}
              isLoading={isLoading}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
              t={t}
            />
          </div>
        </aside>

        {/* 右侧查询结果 */}
        <main className="flex-1 min-w-0">
          <QueryResults
            priceData={priceData}
            selectedOracles={selectedOracles}
            selectedSymbol={selectedSymbol}
            timeRange={timeRange}
            isLoading={isLoading}
            queryProgress={queryProgress}
            currentQueryTarget={currentQueryTarget}
            avgPrice={avgPrice}
            medianPrice={medianPrice}
            maxPrice={maxPrice}
            minPrice={minPrice}
            priceRange={priceRange}
            standardDeviation={standardDeviation}
            standardDeviationPercent={standardDeviationPercent}
            validPrices={validPrices}
            anomalies={anomalies}
            anomalyCount={anomalyCount}
            highRiskCount={highRiskCount}
            mediumRiskCount={mediumRiskCount}
            lowRiskCount={lowRiskCount}
            maxDeviation={maxDeviation}
            qualityScore={qualityScoreData}
            oracleFeatures={oracleFeatures}
            historicalData={historicalData}
            oracleColors={oracleChartColors}
            onRefresh={fetchPriceData}
          />
        </main>
      </div>
    </div>
  );
}
