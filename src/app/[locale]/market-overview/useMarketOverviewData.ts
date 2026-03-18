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
  ChainBreakdown,
  ProtocolDetail,
  AssetCategory,
  ComparisonData,
  BenchmarkData,
  CorrelationData,
  RiskMetrics,
  AnomalyData,
} from './types';
import {
  MOCK_ORACLE_DATA,
  MOCK_ASSETS,
  generateTVSTrendData as generateMockTVSTrendData,
  RefreshInterval,
} from './constants';
import {
  fetchOraclesData,
  fetchAssetsData,
  generateTVSTrendData,
  checkApiHealth,
  fetchChainBreakdown,
  fetchProtocolDetails,
  fetchAssetCategories,
  fetchComparisonData,
  fetchBenchmarkData,
  calculateCorrelation,
  fetchRiskMetrics,
  detectAnomalies,
} from '@/lib/services/marketData';
import { createLogger } from '@/lib/utils/logger';
import { useWebSocket, WebSocketStatus, WebSocketMessage } from '@/lib/realtime/websocket';
import { usePriceAlerts, AlertCheckResult, PriceDataForAlert } from '@/lib/realtime/priceAlerts';
import type { PriceData } from '@/types/oracle';

export type { PriceData };

const logger = createLogger('useMarketOverviewData');

// 功能开关：是否使用真实 API 数据
const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_MARKET_DATA === 'true';

export interface UseMarketOverviewDataReturn {
  // 数据状态
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  marketStats: MarketStats;
  chainBreakdown: ChainBreakdown[];
  protocolDetails: ProtocolDetail[];
  assetCategories: AssetCategory[];
  comparisonData: ComparisonData[];
  benchmarkData: BenchmarkData[];
  correlationData: CorrelationData;
  riskMetrics: RiskMetrics | null;
  anomalies: AnomalyData[];
  loading: boolean;
  loadingEnhanced: boolean;
  loadingComparison: boolean;
  loadingRiskMetrics: boolean;
  loadingAnomalies: boolean;
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

  // 错误状态
  error: string | null;
  isUsingMockData: boolean;

  // 操作方法
  fetchData: () => Promise<void>;
  fetchEnhancedData: () => Promise<void>;
  exportToCSV: () => void;
  exportToJSON: () => void;
  checkApiHealth: () => Promise<{ healthy: boolean; message: string }>;
  acknowledgeAnomaly: (id: string) => void;

  // 计算属性
  sortedOracleData: OracleMarketData[];
  topGainers: AssetData[];
  topLosers: AssetData[];
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;

  // WebSocket 状态
  wsStatus: WebSocketStatus;
  wsLastMessage: WebSocketMessage<unknown> | null;
  wsLastUpdated: Date | null;
  wsReconnect: () => void;
  wsMessageCount: number;
  wsConnectedChannels: string[];

  // 价格预警
  priceAlerts: import('@/lib/realtime/priceAlerts').PriceAlert[];
  alertHistory: import('@/lib/realtime/priceAlerts').AlertHistory[];
  addPriceAlert: (
    alert: Omit<
      import('@/lib/realtime/priceAlerts').PriceAlert,
      'id' | 'createdAt' | 'triggeredCount'
    >
  ) => void;
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  acknowledgeAlertHistory: (historyId: string) => void;
  clearAlertHistory: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  hasNotificationPermission: boolean;
  triggeredAlerts: AlertCheckResult[];
}

export function useMarketOverviewData(): UseMarketOverviewDataReturn {
  // 数据状态 - 使用默认值避免初始渲染时图表空白
  const [oracleData, setOracleData] = useState<OracleMarketData[]>(MOCK_ORACLE_DATA);
  const [assets, setAssets] = useState<AssetData[]>(MOCK_ASSETS);
  const [trendData, setTrendData] = useState<TVSTrendData[]>(() => generateMockTVSTrendData(720));
  const [chainBreakdown, setChainBreakdown] = useState<ChainBreakdown[]>([]);
  const [protocolDetails, setProtocolDetails] = useState<ProtocolDetail[]>([]);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [correlationData, setCorrelationData] = useState<CorrelationData>({
    oracles: [],
    matrix: [],
    pairs: [],
    timeRange: '30D',
    lastUpdated: new Date().toISOString(),
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingEnhanced, setLoadingEnhanced] = useState<boolean>(false);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);
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

  // 错误状态
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState<boolean>(!USE_REAL_API);

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

  // 从真实 API 获取数据
  const fetchDataFromApi = useCallback(async () => {
    setRefreshStatus('refreshing');
    setLoading(true);
    setError(null);

    try {
      const hours = getTimeRangeHours(selectedTimeRange);

      // 并行获取预言机和资产数据
      const [oracleResult, assetsResult] = await Promise.allSettled([
        fetchOraclesData(),
        fetchAssetsData(),
      ]);

      let newOracleData: OracleMarketData[] = [];
      let newAssets: AssetData[] = [];
      let hasError = false;

      // 处理预言机数据
      if (oracleResult.status === 'fulfilled' && oracleResult.value.length > 0) {
        newOracleData = oracleResult.value;
        setIsUsingMockData(false);
      } else {
        logger.warn('Failed to fetch oracle data from API, using mock data');
        newOracleData = MOCK_ORACLE_DATA;
        setIsUsingMockData(true);
        hasError = true;
      }

      // 处理资产数据
      if (assetsResult.status === 'fulfilled' && assetsResult.value.length > 0) {
        newAssets = assetsResult.value;
      } else {
        logger.warn('Failed to fetch asset data from API, using mock data');
        newAssets = MOCK_ASSETS;
        hasError = true;
      }

      // 生成趋势数据
      const newTrendData = generateTVSTrendData(hours, newOracleData);

      setOracleData(newOracleData);
      setAssets(newAssets);
      setTrendData(newTrendData);
      setLastUpdated(new Date());
      setRefreshStatus(hasError ? 'error' : 'success');
      setShowRefreshSuccess(!hasError);
      setTimeout(() => setShowRefreshSuccess(false), 2000);

      if (hasError) {
        setError('部分数据获取失败，已使用本地数据');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        'Error fetching market data from API',
        err instanceof Error ? err : new Error(errorMessage)
      );

      // 使用 Mock 数据作为后备
      const hours = getTimeRangeHours(selectedTimeRange);
      setOracleData(MOCK_ORACLE_DATA);
      setAssets(MOCK_ASSETS);
      setTrendData(generateTVSTrendData(hours, MOCK_ORACLE_DATA));
      setIsUsingMockData(true);
      setError(`数据获取失败: ${errorMessage}`);
      setRefreshStatus('error');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, getTimeRangeHours]);

  // 模拟数据获取（用于开发/测试）
  const fetchMockData = useCallback(async () => {
    setRefreshStatus('refreshing');
    setLoading(true);
    setError(null);

    try {
      // 模拟API延迟
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 生成趋势数据
      const hours = getTimeRangeHours(selectedTimeRange);
      const newTrendData = generateMockTVSTrendData(hours);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        'Error fetching mock data',
        err instanceof Error ? err : new Error(errorMessage)
      );
      setError(`数据获取失败: ${errorMessage}`);
      setRefreshStatus('error');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, getTimeRangeHours]);

  // 统一的数据获取方法
  const fetchData = useCallback(async () => {
    if (USE_REAL_API) {
      await fetchDataFromApi();
    } else {
      await fetchMockData();
    }
  }, [fetchDataFromApi, fetchMockData]);

  // 获取增强数据（链级别、协议级别、资产类别）
  const fetchEnhancedData = useCallback(async () => {
    setLoadingEnhanced(true);
    try {
      const [chains, protocols, categories] = await Promise.all([
        fetchChainBreakdown(),
        fetchProtocolDetails(),
        fetchAssetCategories(),
      ]);
      setChainBreakdown(chains);
      setProtocolDetails(protocols);
      setAssetCategories(categories);
    } catch (err) {
      logger.error(
        'Failed to fetch enhanced data',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setLoadingEnhanced(false);
    }
  }, []);

  // 获取对比分析数据
  const fetchComparisonDataCallback = useCallback(async () => {
    setLoadingComparison(true);
    try {
      const [comparison, benchmark, correlation] = await Promise.all([
        fetchComparisonData(),
        fetchBenchmarkData(),
        calculateCorrelation(selectedTimeRange),
      ]);
      setComparisonData(comparison);
      setBenchmarkData(benchmark);
      setCorrelationData(correlation);
    } catch (err) {
      logger.error(
        'Failed to fetch comparison data',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setLoadingComparison(false);
    }
  }, [selectedTimeRange]);

  // 风险指标和异常检测状态
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [loadingRiskMetrics, setLoadingRiskMetrics] = useState<boolean>(false);
  const [loadingAnomalies, setLoadingAnomalies] = useState<boolean>(false);

  // 获取风险指标
  const fetchRiskMetricsCallback = useCallback(async () => {
    setLoadingRiskMetrics(true);
    try {
      const currentOracleData = oracleDataRef.current;
      if (currentOracleData.length > 0) {
        const metrics = await fetchRiskMetrics(currentOracleData);
        setRiskMetrics(metrics);
      }
    } catch (err) {
      logger.error(
        'Failed to fetch risk metrics',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setLoadingRiskMetrics(false);
    }
  }, []);

  // 检测异常
  const detectAnomaliesCallback = useCallback(async () => {
    setLoadingAnomalies(true);
    try {
      const currentOracleData = oracleDataRef.current;
      const currentAssets = assetsRef.current;
      if (currentOracleData.length > 0 && currentAssets.length > 0) {
        const detectedAnomalies = await detectAnomalies(currentOracleData, currentAssets);
        setAnomalies(detectedAnomalies);
      }
    } catch (err) {
      logger.error(
        'Failed to detect anomalies',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setLoadingAnomalies(false);
    }
  }, []);

  // 初始加载 - 只在组件挂载时执行一次
  useEffect(() => {
    fetchData();
    fetchEnhancedData();
    fetchComparisonDataCallback();
    fetchRiskMetricsCallback();
    detectAnomaliesCallback();
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

  // API 健康检查包装函数
  const checkApiHealthWrapper = useCallback(async () => {
    return checkApiHealth();
  }, []);

  // 确认异常
  const acknowledgeAnomaly = useCallback((id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  // ==================== WebSocket 集成 ====================
  const [wsMessageCount, setWsMessageCount] = useState(0);
  const [wsConnectedChannels] = useState(['prices', 'tvs', 'marketStats']);
  const [triggeredAlerts, setTriggeredAlerts] = useState<AlertCheckResult[]>([]);

  const {
    status: wsStatus,
    lastMessage: wsLastMessage,
    lastUpdated: wsLastUpdated,
    reconnect: wsReconnect,
  } = useWebSocket({
    channels: wsConnectedChannels,
    autoConnect: true,
    useMock: true, // 使用模拟 WebSocket
  });

  // 价格预警 Hook
  const {
    alerts: priceAlerts,
    history: alertHistory,
    addAlert: addPriceAlert,
    removeAlert: removePriceAlert,
    toggleAlert: togglePriceAlert,
    acknowledgeHistory: acknowledgeAlertHistory,
    clearHistory: clearAlertHistory,
    checkPriceAlerts,
    requestNotificationPermission,
    hasNotificationPermission,
  } = usePriceAlerts();

  // 处理 WebSocket 消息更新数据
  useEffect(() => {
    if (!wsLastMessage) return;

    setWsMessageCount((prev) => prev + 1);

    // 根据消息类型更新数据
    switch (wsLastMessage.channel) {
      case 'prices':
        // 更新资产价格
        const priceData = wsLastMessage.data as {
          symbol: string;
          price: number;
          change24h: number;
          timestamp: number;
        };
        setAssets((prev) =>
          prev.map((asset) =>
            asset.symbol === priceData.symbol
              ? {
                  ...asset,
                  price: priceData.price,
                  change24h: priceData.change24h,
                }
              : asset
          )
        );

        // 检查价格预警
        const priceAlertData: PriceDataForAlert = {
          symbol: priceData.symbol,
          price: priceData.price,
          change24h: priceData.change24h,
          changePercent24h: priceData.change24h,
          timestamp: priceData.timestamp,
        };
        const alerts = checkPriceAlerts([priceAlertData]);
        if (alerts.length > 0) {
          setTriggeredAlerts((prev) => [...prev, ...alerts]);
        }
        break;

      case 'tvs':
        // 更新预言机 TVS
        const tvsData = wsLastMessage.data as {
          oracle: string;
          tvs: number;
          change24h: number;
        };
        setOracleData((prev) =>
          prev.map((oracle) =>
            oracle.name === tvsData.oracle
              ? {
                  ...oracle,
                  tvsValue: tvsData.tvs,
                  change24h: tvsData.change24h,
                }
              : oracle
          )
        );
        break;

      case 'marketStats':
        const _statsData = wsLastMessage.data as {
          totalTVS: number;
          totalChains: number;
          totalProtocols: number;
          marketDominance: number;
          avgUpdateLatency: number;
        };
        // 市场统计会通过 oracleData 和 assets 的 memo 自动计算
        break;
    }

    setLastUpdated(new Date());
  }, [wsLastMessage, checkPriceAlerts]);

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
    loading,
    loadingEnhanced,
    loadingComparison,
    loadingRiskMetrics,
    loadingAnomalies,
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
    checkApiHealth: checkApiHealthWrapper,
    sortedOracleData,
    topGainers,
    topLosers,
    totalTVS,
    totalChains,
    totalProtocols,
    acknowledgeAnomaly,

    // WebSocket
    wsStatus,
    wsLastMessage,
    wsLastUpdated,
    wsReconnect,
    wsMessageCount,
    wsConnectedChannels,

    // 价格预警
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
