/**
 * @fileoverview 多预言机对比页面组合 Hook
 * @description 组合所有专注 hooks，提供统一的页面状态管理接口
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useFavorites, type FavoriteConfig } from '@/hooks';
import { useTranslations } from '@/i18n';
import type { UserFavorite } from '@/lib/supabase/queries';
import { useUser } from '@/stores/authStore';
import type { PriceData, SnapshotStats } from '@/types/oracle';
import { OracleProvider } from '@/types/oracle';

import { type TimeRange, symbols, type PriceOracleProvider } from '../constants';

import { useChartConfig } from './useChartConfig';
import { useDataQualityScore } from './useDataQualityScore';
import { useExport } from './useExport';
import { useFilterSort } from './useFilterSort';
import { useOracleData } from './useOracleData';
import { usePriceAnomalyDetection } from './usePriceAnomalyDetection';
import { usePriceStats } from './usePriceStats';

import type { TabId, HistoryMinMax, MovingAverageData, QualityTrendData } from '../types/index';

interface UseCrossOraclePageOptions {
  initialSymbol?: string;
  initialOracles?: OracleProvider[];
}

export function useCrossOraclePage(options: UseCrossOraclePageOptions = {}) {
  const t = useTranslations();
  const router = useRouter();
  const user = useUser();

  const { initialSymbol = 'BTC/USD', initialOracles = [OracleProvider.PYTH] } = options;

  // ==========================================================================
  // 基础状态
  // ==========================================================================
  const [selectedOracles, setSelectedOracles] = useState<PriceOracleProvider[]>(
    initialOracles as PriceOracleProvider[]
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState<TabId>('priceComparison');

  // UI 状态
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [hoveredOracle, setHoveredOracle] = useState<OracleProvider | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [useAccessibleColors, setUseAccessibleColors] = useState(false);

  // 图表状态
  const [zoomLevel, setZoomLevel] = useState(1);

  // 性能分析状态
  const [selectedPerformanceOracle, setSelectedPerformanceOracle] = useState<OracleProvider | null>(
    null
  );

  // 历史统计
  const [lastStats, setLastStats] = useState<SnapshotStats | null>(null);

  // Refs
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // 数据获取
  // ==========================================================================
  const {
    priceData,
    historicalData,
    isLoading,
    error,
    lastUpdated,
    fetchPriceData,
    performanceMetrics,
    isCalculatingMetrics,
  } = useOracleData({
    selectedOracles,
    selectedSymbol,
    timeRange,
  });

  // ==========================================================================
  // 统计数据
  // ==========================================================================
  const priceStats = usePriceStats(priceData);

  // 更新历史统计
  useEffect(() => {
    if (priceStats.validPrices.length > 0) {
      setLastStats(priceStats.currentStats);
    }
  }, [priceStats.currentStats]);

  // ==========================================================================
  // 价格异常检测
  // ==========================================================================
  const anomalyDetection = usePriceAnomalyDetection(priceData, priceStats.avgPrice);

  // ==========================================================================
  // 数据质量评分
  // ==========================================================================
  const { score: qualityScore } = useDataQualityScore({
    prices: priceStats.validPrices,
    lastUpdated: lastUpdated?.getTime(),
    successCount: priceData.length,
    totalCount: selectedOracles.length,
  });

  // ==========================================================================
  // 图表配置
  // ==========================================================================
  const chartConfig = useChartConfig({
    historicalData,
    selectedOracles,
    timeRange,
    useAccessibleColors,
    validPrices: priceStats.validPrices,
    avgPrice: priceStats.avgPrice,
  });

  // ==========================================================================
  // 筛选排序
  // ==========================================================================
  const filterSort = useFilterSort({
    priceData,
    validPrices: priceStats.validPrices,
    avgPrice: priceStats.avgPrice,
    standardDeviation: priceStats.standardDeviation,
    t,
    initialTimeRange: timeRange,
  });

  // ==========================================================================
  // 导出功能
  // ==========================================================================
  const exportHandlers = useExport({
    priceData,
    avgPrice: priceStats.avgPrice,
    validPrices: priceStats.validPrices,
    selectedSymbol,
    selectedOracles,
    stats: priceStats.currentStats,
  });

  // ==========================================================================
  // 收藏功能
  // ==========================================================================
  const currentFavoriteConfig = useMemo(
    () => ({
      selectedOracles: selectedOracles.map((o) => o as string),
      symbol: selectedSymbol,
    }),
    [selectedOracles, selectedSymbol]
  );

  const { favorites: oracleFavorites } = useFavorites({ configType: 'oracle_config' });

  // ==========================================================================
  // 回调函数
  // ==========================================================================
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  const toggleOracle = useCallback((oracle: PriceOracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handleApplyFavorite = useCallback(
    (config: { selectedOracles?: string[]; symbol?: string }) => {
      if (config.selectedOracles) {
        setSelectedOracles(config.selectedOracles as PriceOracleProvider[]);
      }
      if (config.symbol) {
        setSelectedSymbol(config.symbol);
      }
      setShowFavoritesDropdown(false);
    },
    []
  );

  const calculateChangePercent = useCallback((current: number, previous: number): number | null => {
    if (previous === 0 || current === 0) return null;
    return ((current - previous) / previous) * 100;
  }, []);

  const getConsistencyRating = useCallback((stdDevPercent: number): string => {
    if (stdDevPercent < 0.1) return 'A';
    if (stdDevPercent < 0.3) return 'B';
    if (stdDevPercent < 0.5) return 'C';
    return 'D';
  }, []);

  const getLineStrokeDasharray = useCallback(
    (oracle: PriceOracleProvider): string => {
      const index = selectedOracles.indexOf(oracle);
      if (index === -1) return '0';
      // 为不同的预言机使用不同的虚线样式
      const patterns = ['0', '5 5', '10 5', '5 10', '10 10', '15 5', '5 15'];
      return patterns[index % patterns.length];
    },
    [selectedOracles]
  );

  const getOracleLatencyData = useCallback(
    (oracle: OracleProvider | null): number[] => {
      if (!oracle) return chartConfig.latencyData;
      const latencies: number[] = [];
      const history = historicalData[oracle] || [];
      for (let i = 1; i < history.length; i++) {
        const timeDiff = history[i].timestamp - history[i - 1].timestamp;
        if (timeDiff > 0 && timeDiff < 3600000) {
          latencies.push(timeDiff);
        }
      }
      return latencies.length > 0 ? latencies : chartConfig.latencyData;
    },
    [historicalData, chartConfig.latencyData]
  );

  // ==========================================================================
  // 点击外部关闭
  // ==========================================================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
      }
      if (
        favoritesDropdownRef.current &&
        !favoritesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFavoritesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================================================
  // 质量分数数据（兼容旧格式）
  // ==========================================================================
  const qualityScoreData = useMemo(
    () => ({
      freshness: { lastUpdated: lastUpdated || new Date() },
      completeness: {
        successCount: priceData.length,
        totalCount: selectedOracles.length,
      },
      reliability: {
        historicalAccuracy: 98.5,
        responseSuccessRate:
          selectedOracles.length > 0 ? (priceData.length / selectedOracles.length) * 100 : 0,
      },
    }),
    [priceData.length, selectedOracles.length, lastUpdated]
  );

  // ==========================================================================
  // 技术指标数据（简化版）
  // ==========================================================================
  const technicalIndicators = useMemo(() => {
    const maData: MovingAverageData[] = selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracle,
        prices: history.map((h: PriceData) => ({ timestamp: h.timestamp, price: h.price })),
      };
    });

    const qualityTrendData: QualityTrendData[] = selectedOracles.map((oracle) => {
      const history = historicalData[oracle] || [];
      return {
        oracle,
        data: history.map((h: PriceData, i: number) => ({
          timestamp: h.timestamp,
          updateLatency: i > 0 ? h.timestamp - (history[i - 1]?.timestamp || 0) : 0,
          deviationFromMedian: 0,
          isOutlier: false,
          isStale: false,
          heartbeatCompliance: 100,
        })),
      };
    });

    return { maData, qualityTrendData };
  }, [historicalData, selectedOracles]);

  // ==========================================================================
  // 预言机特性数据（用于 OracleProfilesTab）
  // ==========================================================================
  const oracleFeatures = useMemo(() => {
    return selectedOracles.map((oracle) => ({
      provider: oracle,
      name: oracle,
      symbolCount: 100,
      avgLatency: 1500,
      updateFrequency: 'Real-time',
      features: ['high-frequency', 'cross-chain', 'first-party'],
      description: `${oracle} is a leading blockchain oracle solution`,
    }));
  }, [selectedOracles]);

  // ==========================================================================
  // 返回值
  // ==========================================================================
  return {
    // 基础状态
    t,
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    timeRange,
    setTimeRange,
    activeTab,

    // UI 状态
    expandedRow,
    setExpandedRow,
    hoveredRowIndex,
    setHoveredRowIndex,
    selectedRowIndex,
    setSelectedRowIndex,
    hoveredOracle,
    setHoveredOracle,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    useAccessibleColors,
    setUseAccessibleColors,

    // 图表状态
    zoomLevel,

    // 性能分析状态
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,

    // 历史统计
    lastStats,

    // Refs
    filterPanelRef,
    favoritesDropdownRef,

    // 数据
    priceData,
    historicalData,
    isLoading,
    error,
    lastUpdated,

    // 统计数据
    ...priceStats,

    // 图表配置
    ...chartConfig,

    // 筛选排序
    ...filterSort,

    // 导出
    ...exportHandlers,

    // 收藏
    user,
    oracleFavorites,
    currentFavoriteConfig,

    // 质量分数
    qualityScoreData,
    qualityScore,

    // 异常检测
    anomalies: anomalyDetection.anomalies,
    anomalyCount: anomalyDetection.count,
    highRiskCount: anomalyDetection.highRiskCount,
    mediumRiskCount: anomalyDetection.mediumRiskCount,
    lowRiskCount: anomalyDetection.lowRiskCount,
    maxDeviation: anomalyDetection.maxDeviation,

    // 技术指标
    maData: technicalIndicators.maData,
    qualityTrendData: technicalIndicators.qualityTrendData,

    // 预言机特性
    oracleFeatures,

    // 性能指标（新增）
    performanceMetrics,
    isCalculatingMetrics,

    // 回调函数
    handleTabChange,
    toggleOracle,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleApplyFavorite,
    calculateChangePercent,
    getConsistencyRating,
    getLineStrokeDasharray,
    getOracleLatencyData,
    fetchPriceData,

    // 兼容属性
    symbols,
    scrollToOutlier: () => {},
    onQuery: fetchPriceData,
    onSymbolChange: setSelectedSymbol,
  };
}

export default useCrossOraclePage;
