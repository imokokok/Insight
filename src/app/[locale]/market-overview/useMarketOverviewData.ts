'use client';

import { useState, useMemo } from 'react';
import {
  OracleMarketData,
  AssetData,
  MarketStats,
  ChartType,
  ViewType,
  UseMarketOverviewDataReturn,
} from './types';
import { useDataFetching } from './useDataFetching';
import { useExport } from './useExport';
import { useWebSocketHandler } from './useWebSocketHandler';

export type { PriceData } from '@/types/oracle';

export function useMarketOverviewData(): UseMarketOverviewDataReturn {
  const [activeChart, setActiveChart] = useState<ChartType>('pie');
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const {
    oracleData,
    assets,
    trendData,
    chainBreakdown,
    protocolDetails,
    assetCategories,
    comparisonData,
    benchmarkData,
    correlationData,
    riskMetrics,
    anomalies,
    isLoading,
    isLoadingEnhanced,
    isLoadingComparison,
    isLoadingRiskMetrics,
    isLoadingAnomalies,
    lastUpdated,
    refreshStatus,
    showRefreshSuccess,
    error,
    isUsingMockData,
    selectedTimeRange,
    setSelectedTimeRange,
    refreshInterval,
    setRefreshInterval,
    fetchData,
    fetchEnhancedData,
    acknowledgeAnomaly,
    oracleDataRef,
    assetsRef,
    setOracleData,
    setAssets,
    setTrendData,
    setLastUpdated,
  } = useDataFetching();

  const marketStats = useMemo<MarketStats>(() => {
    const totalTVS = oracleData.reduce((sum, oracle) => sum + oracle.tvsValue, 0);
    const totalChains = oracleData.reduce((sum, oracle) => sum + oracle.chains, 0);
    const totalProtocols = oracleData.reduce((sum, oracle) => sum + oracle.protocols, 0);
    const avgLatency =
      oracleData.reduce((sum, oracle) => sum + oracle.avgLatency, 0) / oracleData.length;
    const marketDominance = oracleData[0]?.share || 0;
    const totalChange24h =
      oracleData.reduce((sum, oracle) => sum + oracle.change24h * oracle.share, 0) / 100;

    return {
      totalTVS,
      totalChains,
      totalProtocols,
      totalAssets: assets.length,
      avgUpdateLatency: Math.round(avgLatency),
      marketDominance,
      oracleCount: oracleData.length,
      change24h: totalChange24h,
    };
  }, [oracleData, assets]);

  const sortedOracleData = useMemo(() => {
    return [...oracleData].sort((a, b) => b.share - a.share);
  }, [oracleData]);

  const { topGainers, topLosers } = useMemo(() => {
    const sorted = [...assets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    return {
      topGainers: sorted.filter((a) => a.change24h > 0).slice(0, 5),
      topLosers: sorted.filter((a) => a.change24h < 0).slice(0, 5),
    };
  }, [assets]);

  const totalTVS = useMemo(() => {
    return `$${marketStats.totalTVS.toFixed(1)}B`;
  }, [marketStats.totalTVS]);

  const totalChains = marketStats.totalChains;
  const totalProtocols = marketStats.totalProtocols;

  const { exportToCSV, exportToJSON, checkApiHealth } = useExport({
    oracleData,
    assets,
    trendData,
    marketStats,
    selectedTimeRange,
  });

  const {
    wsStatus,
    wsLastMessage,
    wsLastUpdated,
    wsReconnect,
    wsMessageCount,
    wsConnectedChannels,
    priceAlerts,
    alertHistory,
    addPriceAlert,
    removePriceAlert,
    togglePriceAlert,
    acknowledgeAlertHistory,
    clearAlertHistory,
    requestNotificationPermission,
    hasNotificationPermission,
    triggeredAlerts,
  } = useWebSocketHandler({
    setOracleData,
    setAssets,
    setLastUpdated,
  });

  return {
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
    riskMetrics,
    anomalies,
    isLoading,
    isLoadingEnhanced,
    isLoadingComparison,
    isLoadingRiskMetrics,
    isLoadingAnomalies,
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
    showRefreshSuccess,
    error,
    isUsingMockData,
    fetchData,
    fetchEnhancedData,
    exportToCSV,
    exportToJSON,
    checkApiHealth,
    sortedOracleData,
    topGainers,
    topLosers,
    totalTVS,
    totalChains,
    totalProtocols,
    acknowledgeAnomaly,
    wsStatus,
    wsLastMessage,
    wsLastUpdated,
    wsReconnect,
    wsMessageCount,
    wsConnectedChannels,
    priceAlerts,
    alertHistory,
    addPriceAlert,
    removePriceAlert,
    togglePriceAlert,
    acknowledgeAlertHistory,
    clearAlertHistory,
    requestNotificationPermission,
    hasNotificationPermission,
    triggeredAlerts,
  };
}
