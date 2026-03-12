'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  OracleMarketData,
  AssetData,
  TVSTrendData,
  MarketStats,
  ChartType,
  ViewType,
  TIME_RANGES,
} from './types';
import {
  MOCK_ORACLE_DATA,
  MOCK_ASSETS,
  generateTVSTrendData,
  CHAIN_SUPPORT_DATA,
  RefreshInterval,
} from './constants';

export interface UseMarketOverviewDataReturn {
  // 数据状态
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  marketStats: MarketStats;
  loading: boolean;
  lastUpdated: Date | null;

  // UI状态
  selectedTimeRange: string;
  setSelectedTimeRange: (range: string) => void;
  activeChart: ChartType;
  setActiveChart: (chart: ChartType) => void;
  viewType: ViewType;
  setViewType: (view: ViewType) => void;
  hoveredItem: string | null;
  setHoveredItem: (item: string | null) => void;
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;

  // 刷新状态
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;

  // 操作方法
  fetchData: () => Promise<void>;
  exportToCSV: () => void;
  exportToJSON: () => void;

  // 计算属性
  sortedOracleData: OracleMarketData[];
  topGainers: AssetData[];
  topLosers: AssetData[];
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;
}

export function useMarketOverviewData(): UseMarketOverviewDataReturn {
  // 数据状态
  const [oracleData, setOracleData] = useState<OracleMarketData[]>(MOCK_ORACLE_DATA);
  const [assets, setAssets] = useState<AssetData[]>(MOCK_ASSETS);
  const [trendData, setTrendData] = useState<TVSTrendData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // UI状态
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30D');
  const [activeChart, setActiveChart] = useState<ChartType>('pie');
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);

  // 刷新状态
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'success' | 'error'>(
    'idle'
  );
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);

  // 使用ref来存储最新数据，避免循环依赖
  const oracleDataRef = useRef(oracleData);
  const assetsRef = useRef(assets);

  useEffect(() => {
    oracleDataRef.current = oracleData;
  }, [oracleData]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  // 获取时间范围对应的小时数
  const getTimeRangeHours = useCallback((rangeKey: string): number => {
    const range = TIME_RANGES.find((r) => r.key === rangeKey);
    return range?.hours || 720;
  }, []);

  // 模拟数据获取 - 使用ref而不是state作为依赖
  const fetchData = useCallback(async () => {
    setRefreshStatus('refreshing');
    setLoading(true);

    try {
      // 模拟API延迟
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 生成趋势数据
      const hours = getTimeRangeHours(selectedTimeRange);
      const newTrendData = generateTVSTrendData(hours);

      // 模拟数据变化（添加随机波动）- 使用ref获取最新数据
      const updatedOracleData = oracleDataRef.current.map((oracle) => ({
        ...oracle,
        change24h: oracle.change24h + (Math.random() - 0.5) * 0.5,
        tvsValue: oracle.tvsValue * (1 + (Math.random() - 0.5) * 0.01),
      }));

      const updatedAssets = assetsRef.current.map((asset) => ({
        ...asset,
        price: asset.price * (1 + (Math.random() - 0.5) * 0.005),
        change24h: asset.change24h + (Math.random() - 0.5) * 0.3,
      }));

      setTrendData(newTrendData);
      setOracleData(updatedOracleData);
      setAssets(updatedAssets);
      setLastUpdated(new Date());
      setRefreshStatus('success');
      setShowRefreshSuccess(true);
      setTimeout(() => setShowRefreshSuccess(false), 2000);
    } catch (error) {
      console.error('Error fetching market data:', error);
      setRefreshStatus('error');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, getTimeRangeHours]);

  // 初始加载 - 只在组件挂载时执行一次
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 时间范围变化时获取数据
  useEffect(() => {
    // 跳过初始渲染，避免重复调用
    if (lastUpdated !== null) {
      fetchData();
    }
  }, [selectedTimeRange, fetchData]);

  // 自动刷新
  useEffect(() => {
    if (refreshInterval === 0) return;
    const intervalId = setInterval(() => {
      fetchData();
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  // 计算市场统计数据
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

  // 排序后的预言机数据
  const sortedOracleData = useMemo(() => {
    return [...oracleData].sort((a, b) => b.share - a.share);
  }, [oracleData]);

  // 涨跌榜
  const { topGainers, topLosers } = useMemo(() => {
    const sorted = [...assets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    return {
      topGainers: sorted.filter((a) => a.change24h > 0).slice(0, 5),
      topLosers: sorted.filter((a) => a.change24h < 0).slice(0, 5),
    };
  }, [assets]);

  // 格式化统计数据
  const totalTVS = useMemo(() => {
    return `$${marketStats.totalTVS.toFixed(1)}B`;
  }, [marketStats.totalTVS]);

  const totalChains = marketStats.totalChains;
  const totalProtocols = marketStats.totalProtocols;

  // 导出CSV
  const exportToCSV = useCallback(() => {
    const csvLines: string[] = [];

    // Oracle数据
    csvLines.push('Oracle Market Data');
    csvLines.push(
      [
        'Name',
        'Market Share (%)',
        'TVS',
        'Chains',
        'Protocols',
        '24h Change (%)',
        'Accuracy (%)',
      ].join(',')
    );
    oracleData.forEach((oracle) => {
      csvLines.push(
        [
          oracle.name,
          oracle.share.toFixed(1),
          oracle.tvs,
          oracle.chains,
          oracle.protocols,
          oracle.change24h.toFixed(2),
          oracle.accuracy.toFixed(1),
        ].join(',')
      );
    });

    csvLines.push('');

    // 资产数据
    csvLines.push('Asset Data');
    csvLines.push(
      ['Symbol', 'Price', '24h Change (%)', 'Volume (24h)', 'Market Cap', 'Primary Oracle'].join(
        ','
      )
    );
    assets.forEach((asset) => {
      csvLines.push(
        [
          asset.symbol,
          asset.price.toFixed(4),
          asset.change24h.toFixed(2),
          asset.volume24h.toString(),
          asset.marketCap.toString(),
          asset.primaryOracle,
        ].join(',')
      );
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `market-overview-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [oracleData, assets]);

  // 导出JSON
  const exportToJSON = useCallback(() => {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        timeRange: selectedTimeRange,
        dataPoints: {
          oracles: oracleData.length,
          assets: assets.length,
          trendPoints: trendData.length,
        },
      },
      marketStats: {
        totalTVS: marketStats.totalTVS,
        totalChains: marketStats.totalChains,
        totalProtocols: marketStats.totalProtocols,
        totalAssets: marketStats.totalAssets,
        avgUpdateLatency: marketStats.avgUpdateLatency,
        marketDominance: marketStats.marketDominance,
      },
      oracleData: oracleData.map((oracle) => ({
        name: oracle.name,
        share: oracle.share,
        tvs: oracle.tvs,
        tvsValue: oracle.tvsValue,
        chains: oracle.chains,
        protocols: oracle.protocols,
        avgLatency: oracle.avgLatency,
        accuracy: oracle.accuracy,
        updateFrequency: oracle.updateFrequency,
        change24h: oracle.change24h,
        change7d: oracle.change7d,
        change30d: oracle.change30d,
      })),
      assets: assets.map((asset) => ({
        symbol: asset.symbol,
        price: asset.price,
        change24h: asset.change24h,
        change7d: asset.change7d,
        volume24h: asset.volume24h,
        marketCap: asset.marketCap,
        primaryOracle: asset.primaryOracle,
        oracleCount: asset.oracleCount,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `market-overview-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [oracleData, assets, trendData, marketStats, selectedTimeRange]);

  return {
    oracleData,
    assets,
    trendData,
    marketStats,
    loading,
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
    fetchData,
    exportToCSV,
    exportToJSON,
    sortedOracleData,
    topGainers,
    topLosers,
    totalTVS,
    totalChains,
    totalProtocols,
  };
}
