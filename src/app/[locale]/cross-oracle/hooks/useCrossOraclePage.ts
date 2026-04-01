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
import type { PriceData, SnapshotStats, OracleSnapshot } from '@/types/oracle';
import { OracleProvider, saveSnapshot } from '@/types/oracle';

import { type TimeRange, type DeviationFilter, symbols } from '../constants';

import { useChartConfig } from './useChartConfig';
import { useExport } from './useExport';
import { useFilterSort } from './useFilterSort';
import { useOracleData } from './useOracleData';
import { usePriceStats } from './usePriceStats';

import type { TabId, HistoryMinMax, MovingAverageData } from '../types/index';

interface UseCrossOraclePageOptions {
  initialSymbol?: string;
  initialOracles?: OracleProvider[];
}

export function useCrossOraclePage(options: UseCrossOraclePageOptions = {}) {
  const t = useTranslations();
  const router = useRouter();
  const user = useUser();

  const {
    initialSymbol = 'BTC/USD',
    initialOracles = [OracleProvider.CHAINLINK, OracleProvider.PYTH],
  } = options;

  // ==========================================================================
  // 基础状态
  // ==========================================================================
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>(initialOracles);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // UI 状态
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [hoveredOracle, setHoveredOracle] = useState<OracleProvider | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);
  const [useAccessibleColors, setUseAccessibleColors] = useState(false);

  // 图表状态
  const [zoomLevel, setZoomLevel] = useState(1);

  // 快照状态
  const [selectedSnapshot, setSelectedSnapshot] = useState<OracleSnapshot | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedPerformanceOracle, setSelectedPerformanceOracle] = useState<OracleProvider | null>(
    null
  );

  // 历史统计
  const [lastStats, setLastStats] = useState<SnapshotStats | null>(null);

  // Refs
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const favoritesDropdownRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // 数据获取
  // ==========================================================================
  const { priceData, historicalData, isLoading, error, lastUpdated, fetchPriceData } =
    useOracleData({
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
        setSelectedOracles(config.selectedOracles as OracleProvider[]);
      }
      if (config.symbol) {
        setSelectedSymbol(config.symbol);
      }
      setShowFavoritesDropdown(false);
    },
    []
  );

  const handleSelectSnapshot = useCallback((snapshot: OracleSnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowComparison(true);
  }, []);

  const calculateChangePercent = useCallback((current: number, previous: number): number | null => {
    if (previous === 0 || current === 0) return null;
    return ((current - previous) / previous) * 100;
  }, []);

  const getConsistencyRating = useCallback((stdDevPercent: number): string => {
    if (stdDevPercent < 0.1) return 'excellent';
    if (stdDevPercent < 0.3) return 'good';
    if (stdDevPercent < 0.5) return 'fair';
    return 'poor';
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
  // 键盘导航
  // ==========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filterSort.filteredPriceData.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, filterSort.filteredPriceData.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev === null ? filterSort.filteredPriceData.length - 1 : Math.max(prev - 1, 0)
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setSelectedRowIndex((prev) => {
          if (prev !== null) {
            setExpandedRow((current) => (current === prev ? null : prev));
          }
          return prev;
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedRowIndex(null);
        setExpandedRow(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filterSort.filteredPriceData.length]);

  // ==========================================================================
  // 质量分数数据
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
    selectedRowIndex,
    setSelectedRowIndex,
    hoveredRowIndex,
    setHoveredRowIndex,
    hoveredOracle,
    setHoveredOracle,
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    isChartFullscreen,
    setIsChartFullscreen,
    showFavoritesDropdown,
    setShowFavoritesDropdown,
    useAccessibleColors,
    setUseAccessibleColors,

    // 图表状态
    zoomLevel,

    // 快照状态
    selectedSnapshot,
    setSelectedSnapshot,
    showComparison,
    setShowComparison,
    selectedPerformanceOracle,
    setSelectedPerformanceOracle,

    // 历史统计
    lastStats,

    // Refs
    filterPanelRef,
    favoritesDropdownRef,
    chartContainerRef,

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

    // 技术指标
    maData: technicalIndicators.maData,
    qualityTrendData: technicalIndicators.qualityTrendData,

    // 回调函数
    handleTabChange,
    toggleOracle,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleApplyFavorite,
    handleSelectSnapshot,
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
    onDeviationFilterChange: filterSort.setDeviationFilter,
    onAccessibleColorsChange: setUseAccessibleColors,
  };
}

export default useCrossOraclePage;
