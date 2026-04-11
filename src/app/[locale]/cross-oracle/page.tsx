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
import { chartColors } from '@/lib/config/colors';

import { ControlPanel } from './components/ControlPanel';
import { QueryResults } from './components/QueryResults';
import { useCrossOraclePage } from './hooks';

export default function CrossOraclePage() {
  const t = useTranslations();
  const filterInputRef = useRef<HTMLInputElement>(null);

  const {
    // 基础状态
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    timeRange,
    setTimeRange,

    // 数据
    priceData,
    historicalData,
    isLoading,
    lastUpdated,

    // 统计数据
    priceStats,

    // 异常检测
    anomalyDetection,

    // 质量评分
    qualityScore,
    qualityScoreData,

    // 性能指标
    performanceMetrics,
    isCalculatingMetrics,

    // 错误处理
    oracleDataError,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,

    // 查询进度
    queryProgress,

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

  // 从 priceStats 中提取统计数据
  const {
    avgPrice,
    medianPrice,
    maxPrice,
    minPrice,
    priceRange,
    standardDeviation,
    standardDeviationPercent,
    validPrices,
  } = priceStats;

  // 从 anomalyDetection 中提取异常数据
  const {
    anomalies,
    count: anomalyCount,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    maxDeviation,
  } = anomalyDetection;

  // Keyboard shortcuts
  useCommonShortcuts({
    onRefresh: () => {}, // fetchPriceData not exposed from hook
    onSearch: debouncedSearchFocus,
  });

  // 当前查询目标
  const currentQueryTarget = useMemo(
    () => ({
      oracle: selectedOracles[0] || null,
      chain: null,
    }),
    [selectedOracles]
  );

  // 构建 qualityScore 对象
  const qualityScoreDataMemo = useMemo(
    () => ({
      overall: qualityScore?.overall || 85,
      consistency: qualityScore?.consistency || 88,
      freshness: qualityScore?.freshness || 92,
      completeness: qualityScore?.completeness || 75,
      suggestions: qualityScore?.suggestions || [],
    }),
    [qualityScore]
  );

  // 预言机颜色配置 - 使用统一的颜色配置文件
  const oracleChartColors = useMemo(() => {
    const colors: Record<string, string> = {};
    selectedOracles.forEach((oracle) => {
      // 优先使用配置文件中的预言机品牌色
      colors[oracle] =
        chartColors.oracle[oracle as keyof typeof chartColors.oracle] ||
        chartColors.sequence[selectedOracles.indexOf(oracle) % chartColors.sequence.length];
    });
    return colors;
  }, [selectedOracles]);

  // 活跃筛选器计数
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedOracles.length > 0) count++;
    if (selectedSymbol) count++;
    if (timeRange !== '24h') count++;
    return count;
  }, [selectedOracles.length, selectedSymbol, timeRange]);

  // 清除筛选器
  const handleClearFilters = useCallback(() => {
    setSelectedOracles([]);
    setSelectedSymbol('');
    setTimeRange('24h');
  }, [setSelectedOracles, setSelectedSymbol, setTimeRange]);

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
              onQuery={() => {}}
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
            qualityScore={qualityScoreDataMemo}
            oracleFeatures={[]}
            historicalData={historicalData}
            oracleColors={oracleChartColors}
            onRefresh={() => {}}
            performanceMetrics={performanceMetrics}
            isCalculatingMetrics={isCalculatingMetrics}
            oracleDataError={oracleDataError}
            retryOracle={retryOracle}
            retryAllFailed={retryAllFailed}
            isRetrying={isRetrying}
            retryingOracles={retryingOracles}
          />
        </main>
      </div>
    </div>
  );
}
