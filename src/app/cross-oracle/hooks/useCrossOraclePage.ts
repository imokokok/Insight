/**
 * @fileoverview 多预言机对比页面组合 Hook
 * @description 组合所有专注 hooks，提供统一的页面状态管理接口
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { useFavorites } from '@/hooks';
import { useUser } from '@/stores/authStore';
import type { PriceData, SnapshotStats } from '@/types/oracle';
import { OracleProvider } from '@/types/oracle';

import { type TimeRange, symbols } from '../constants';

import { useChartConfig } from './useChartConfig';
import { useDataQualityScore } from './useDataQualityScore';
import { useExport } from './useExport';
import { useFilterSort } from './useFilterSort';
import { useOracleData } from './useOracleData';
import { usePriceAnomalyDetection } from './usePriceAnomalyDetection';
import { usePriceStats } from './usePriceStats';

import type { TabId, MovingAverageData, QualityTrendData } from '../types/index';

interface UseCrossOraclePageOptions {
  initialSymbol?: string;
  initialOracles?: OracleProvider[];
}

export function useCrossOraclePage(options: UseCrossOraclePageOptions = {}) {
  const user = useUser();

  const {
    initialSymbol = 'BTC/USD',
    initialOracles = [
      OracleProvider.CHAINLINK,
      OracleProvider.PYTH,
      OracleProvider.API3,
      OracleProvider.REDSTONE,
      OracleProvider.DIA,
      OracleProvider.WINKLINK,
      OracleProvider.SUPRA,
    ],
  } = options;

  // ==========================================================================
  // 基础状态
  // ==========================================================================
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>(initialOracles);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
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
    oracleDataError,
    retryConfig,
    setRetryConfig,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,
    queryProgress,
  } = useOracleData({
    selectedOracles,
    selectedSymbol,
    timeRange,
  });

  // ==========================================================================
  // 统计数据
  // ==========================================================================
  const priceStats = usePriceStats(priceData);

  const lastStats = useMemo<SnapshotStats | null>(() => {
    if (priceStats.validPrices.length > 0) {
      return priceStats.currentStats;
    }
    return null;
  }, [priceStats.validPrices.length, priceStats.currentStats]);

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
    performanceMetrics,
  });

  // ==========================================================================
  // 筛选排序
  // ==========================================================================
  const filterSort = useFilterSort({
    priceData,
    validPrices: priceStats.validPrices,
    avgPrice: priceStats.avgPrice,
    standardDeviation: priceStats.standardDeviation,
    initialTimeRange: timeRange,
  });

  // ==========================================================================
  // 导出功能
  // ==========================================================================
  const exportHandlers = useExport({
    priceData,
    avgPrice: priceStats.avgPrice,
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

  const toggleOracle = useCallback((oracle: OracleProvider) => {
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
        const validOracles = config.selectedOracles.filter((o): o is OracleProvider =>
          Object.values(OracleProvider).includes(o as OracleProvider)
        );
        if (validOracles.length > 0) {
          setSelectedOracles(validOracles);
        }
      }
      if (config.symbol) {
        setSelectedSymbol(config.symbol);
      }
      setShowFavoritesDropdown(false);
    },
    []
  );

  const calculateChangePercent = useCallback((current: number, previous: number): number | null => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }, []);

  const getConsistencyRating = useCallback((stdDevPercent: number): string => {
    if (stdDevPercent < 0.1) return 'A';
    if (stdDevPercent < 0.3) return 'B';
    if (stdDevPercent < 0.5) return 'C';
    return 'D';
  }, []);

  const getLineStrokeDasharray = useCallback(
    (oracle: OracleProvider): string => {
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
        data: history.map((h: PriceData, i: number) => {
          const updateLatency = i > 0 ? h.timestamp - (history[i - 1]?.timestamp || 0) : 0;
          const deviationFromMedian =
            priceStats.medianPrice > 0
              ? ((h.price - priceStats.medianPrice) / priceStats.medianPrice) * 100
              : 0;
          const isOutlier =
            priceStats.standardDeviation > 0
              ? Math.abs(h.price - priceStats.avgPrice) / priceStats.standardDeviation > 2
              : false;
          const maxAcceptableLatency = 60000;
          const isStale = updateLatency > maxAcceptableLatency;
          const heartbeatCompliance = isStale
            ? Math.max(
                0,
                100 - ((updateLatency - maxAcceptableLatency) / maxAcceptableLatency) * 50
              )
            : 100;
          return {
            timestamp: h.timestamp,
            updateLatency,
            deviationFromMedian,
            isOutlier,
            isStale,
            heartbeatCompliance,
          };
        }),
      };
    });

    return { maData, qualityTrendData };
  }, [
    historicalData,
    selectedOracles,
    priceStats.medianPrice,
    priceStats.avgPrice,
    priceStats.standardDeviation,
  ]);

  // ==========================================================================
  // 返回值
  // ==========================================================================
  return {
    // 基础状态
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    timeRange,
    setTimeRange,
    activeTab,
    setActiveTab,

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
    setZoomLevel,

    // 性能分析状态
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,

    // Refs
    filterPanelRef,
    favoritesDropdownRef,

    // 数据
    priceData,
    historicalData,
    isLoading,
    error,
    lastUpdated,
    fetchPriceData,

    // 统计数据
    priceStats,
    lastStats,

    // 异常检测
    anomalyDetection,

    // 数据质量
    qualityScore,

    // 图表配置
    chartConfig,

    // 筛选排序
    filterSort,

    // 导出功能
    exportHandlers,

    // 收藏功能
    oracleFavorites,
    currentFavoriteConfig,

    // 性能指标
    performanceMetrics,
    isCalculatingMetrics,

    // 错误和重试
    oracleDataError,
    retryConfig,
    setRetryConfig,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,
    queryProgress,

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

    // 技术指标
    technicalIndicators,

    // 用户
    user,

    // 符号列表
    symbols,
  };
}
