'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { useMarketOverviewData } from './useMarketOverviewData';
import { ChartType, ViewType, TVSTrendData } from './types';

export function useMarketPage() {
  const locale = useLocale();
  const data = useMarketOverviewData();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);

  // Chart state
  const [zoomRange, setZoomRange] = useState<{ startIndex?: number; endIndex?: number } | null>(
    null
  );
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.1);
  const [selectedAnomaly, setSelectedAnomaly] = useState<{
    dataKey: string;
    date: string;
    value: number;
    prevValue: number;
    changeRate: number;
  } | null>(null);

  const [linkedOracle, setLinkedOracle] = useState<{ primary: string; secondary: string } | null>(
    null
  );

  const [comparisonMode, setComparisonMode] = useState<'none' | 'yoy' | 'mom'>('none');
  const [trendComparisonData, setTrendComparisonData] = useState<TVSTrendData[]>([]);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(false);

  // Destructure data from useMarketOverviewData
  const {
    oracleData,
    assets,
    trendData,
    marketStats,
    chainBreakdown,
    protocolDetails,
    assetCategories,
    comparisonData,
    benchmarkData,
    correlationData,
    loading,
    loadingEnhanced,
    loadingComparison,
    lastUpdated,
    selectedTimeRange,
    setSelectedTimeRange,
    activeChart,
    setActiveChart,
    viewType,
    setViewType,
    hoveredItem,
    setHoveredItem,
    selectedItem,
    setSelectedItem,
    refreshInterval,
    setRefreshInterval,
    refreshStatus,
    fetchData,
    sortedOracleData,
    totalTVS,
    totalChains,
    totalProtocols,
    wsStatus,
    wsReconnect,
  } = data;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth < 768;
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync viewType with activeChart
  useEffect(() => {
    if (['pie', 'trend', 'bar'].includes(activeChart) && viewType === 'table') {
      setViewType('chart');
    }
  }, [activeChart, viewType]);

  // Get chart title based on active chart
  const getChartTitle = useCallback(() => {
    switch (activeChart) {
      case 'pie':
        return isChineseLocale(locale) ? '市场份额分布' : 'Market Share Distribution';
      case 'trend':
        return isChineseLocale(locale) ? 'TVS 趋势分析' : 'TVS Trend Analysis';
      case 'bar':
        return isChineseLocale(locale) ? '链支持情况' : 'Chain Support Overview';
      case 'chain':
        return isChineseLocale(locale) ? '链级别 TVS 分布' : 'Chain TVS Breakdown';
      case 'protocol':
        return isChineseLocale(locale) ? '协议列表' : 'Protocol List';
      case 'asset':
        return isChineseLocale(locale) ? '资产类别分析' : 'Asset Category Analysis';
      case 'comparison':
        return isChineseLocale(locale) ? '多预言机对比分析' : 'Multi-Oracle Comparison';
      case 'benchmark':
        return isChineseLocale(locale) ? '行业基准对比' : 'Industry Benchmark Comparison';
      case 'correlation':
        return isChineseLocale(locale) ? 'TVS 相关性分析' : 'TVS Correlation Analysis';
      default:
        return '';
    }
  }, [activeChart, locale]);

  return {
    // Refs
    chartContainerRef,

    // State
    zoomRange,
    setZoomRange,
    anomalyThreshold,
    setAnomalyThreshold,
    selectedAnomaly,
    setSelectedAnomaly,
    linkedOracle,
    setLinkedOracle,
    comparisonMode,
    setComparisonMode,
    trendComparisonData,
    setTrendComparisonData,
    showConfidenceInterval,
    setShowConfidenceInterval,

    // Data from useMarketOverviewData
    oracleData,
    assets,
    trendData,
    marketStats,
    chainBreakdown,
    protocolDetails,
    assetCategories,
    comparisonData,
    benchmarkData,
    correlationData,
    loading,
    loadingEnhanced,
    loadingComparison,
    lastUpdated,
    selectedTimeRange,
    setSelectedTimeRange,
    activeChart,
    setActiveChart,
    viewType,
    setViewType,
    hoveredItem,
    setHoveredItem,
    selectedItem,
    setSelectedItem,
    refreshInterval,
    setRefreshInterval,
    refreshStatus,
    fetchData,
    sortedOracleData,
    totalTVS,
    totalChains,
    totalProtocols,
    wsStatus,
    wsReconnect,

    // Computed
    getChartTitle,
    locale,
  };
}
