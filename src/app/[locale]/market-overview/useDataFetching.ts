'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import {
  fetchOraclesData,
  fetchAssetsData,
  generateTVSTrendData,
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

import { MOCK_ORACLE_DATA, MOCK_ASSETS, type RefreshInterval } from './constants';
import {
  type OracleMarketData,
  type AssetData,
  type TVSTrendData,
  type ChainBreakdown,
  type ProtocolDetail,
  type AssetCategory,
  type ComparisonData,
  type BenchmarkData,
  type CorrelationData,
  type RiskMetrics,
  type AnomalyData,
  TIME_RANGES,
  type RefreshStatus,
} from './types';
import {
  dataCache,
  getCachedOracleData,
  setCachedOracleData,
  getCachedAssets,
  setCachedAssets,
  getCachedTrendData,
  setCachedTrendData,
  getCachedChainBreakdown,
  setCachedChainBreakdown,
  getCachedProtocolDetails,
  setCachedProtocolDetails,
  getCachedAssetCategories,
  setCachedAssetCategories,
  getCachedComparisonData,
  setCachedComparisonData,
  getCachedBenchmarkData,
  setCachedBenchmarkData,
  getCachedCorrelationData,
  setCachedCorrelationData,
  getCachedRiskMetrics,
  setCachedRiskMetrics,
  getCachedAnomalies,
  setCachedAnomalies,
  type CacheStats,
} from './utils/dataCache';

const logger = createLogger('useDataFetching');

const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_MARKET_DATA === 'true';

export interface UseDataFetchingReturn {
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  chainBreakdown: ChainBreakdown[];
  protocolDetails: ProtocolDetail[];
  assetCategories: AssetCategory[];
  comparisonData: ComparisonData[];
  benchmarkData: BenchmarkData[];
  correlationData: CorrelationData;
  riskMetrics: RiskMetrics | null;
  anomalies: AnomalyData[];
  isLoading: boolean;
  isLoadingEnhanced: boolean;
  isLoadingComparison: boolean;
  isLoadingRiskMetrics: boolean;
  isLoadingAnomalies: boolean;
  lastUpdated: Date | null;
  refreshStatus: RefreshStatus;
  showRefreshSuccess: boolean;
  error: string | null;
  isUsingMockData: boolean;
  selectedTimeRange: string;
  setSelectedTimeRange: (range: string) => void;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
  fetchData: (forceRefresh?: boolean) => Promise<void>;
  fetchEnhancedData: (forceRefresh?: boolean) => Promise<void>;
  acknowledgeAnomaly: (id: string) => void;
  oracleDataRef: React.MutableRefObject<OracleMarketData[]>;
  assetsRef: React.MutableRefObject<AssetData[]>;
  setOracleData: React.Dispatch<React.SetStateAction<OracleMarketData[]>>;
  setAssets: React.Dispatch<React.SetStateAction<AssetData[]>>;
  setTrendData: React.Dispatch<React.SetStateAction<TVSTrendData[]>>;
  setLastUpdated: React.Dispatch<React.SetStateAction<Date | null>>;
  cacheStats: CacheStats;
  clearCache: () => void;
  clearExpiredCache: () => number;
}

export function useDataFetching(): UseDataFetchingReturn {
  const [oracleData, setOracleData] = useState<OracleMarketData[]>(MOCK_ORACLE_DATA);
  const [assets, setAssets] = useState<AssetData[]>(MOCK_ASSETS);
  const [trendData, setTrendData] = useState<TVSTrendData[]>(() => generateTVSTrendData(720));
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingEnhanced, setIsLoadingEnhanced] = useState<boolean>(false);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30D');
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);

  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle');
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState<boolean>(!USE_REAL_API);

  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [isLoadingRiskMetrics, setIsLoadingRiskMetrics] = useState<boolean>(false);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState<boolean>(false);

  const oracleDataRef = useRef(oracleData);
  const assetsRef = useRef(assets);
  const selectedTimeRangeRef = useRef(selectedTimeRange);

  useEffect(() => {
    oracleDataRef.current = oracleData;
  }, [oracleData]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    selectedTimeRangeRef.current = selectedTimeRange;
  }, [selectedTimeRange]);

  const getTimeRangeHours = useCallback((rangeKey: string): number => {
    const range = TIME_RANGES.find((r) => r.key === rangeKey);
    return range?.hours || 720;
  }, []);

  const fetchDataFromApi = useCallback(
    async (forceRefresh: boolean = false) => {
      const timeRange = selectedTimeRangeRef.current;

      if (!forceRefresh) {
        const cachedOracleData = getCachedOracleData(timeRange);
        const cachedAssets = getCachedAssets(timeRange);
        const cachedTrendData = getCachedTrendData(timeRange);

        if (cachedOracleData && cachedAssets && cachedTrendData) {
          logger.debug(`Using cached data for timeRange: ${timeRange}`);
          setOracleData(cachedOracleData);
          setAssets(cachedAssets);
          setTrendData(cachedTrendData);
          setLastUpdated(new Date());
          setRefreshStatus('success');
          setIsLoading(false);
          return;
        }
      }

      setRefreshStatus('refreshing');
      setIsLoading(true);
      setError(null);

      try {
        const hours = getTimeRangeHours(timeRange);

        const [oracleResult, assetsResult] = await Promise.allSettled([
          fetchOraclesData(),
          fetchAssetsData(),
        ]);

        let newOracleData: OracleMarketData[] = [];
        let newAssets: AssetData[] = [];
        let hasError = false;

        if (oracleResult.status === 'fulfilled' && oracleResult.value.length > 0) {
          newOracleData = oracleResult.value;
          setIsUsingMockData(false);
        } else {
          logger.warn('Failed to fetch oracle data from API, using mock data');
          newOracleData = MOCK_ORACLE_DATA;
          setIsUsingMockData(true);
          hasError = true;
        }

        if (assetsResult.status === 'fulfilled' && assetsResult.value.length > 0) {
          newAssets = assetsResult.value;
        } else {
          logger.warn('Failed to fetch asset data from API, using mock data');
          newAssets = MOCK_ASSETS;
          hasError = true;
        }

        const newTrendData = generateTVSTrendData(hours, newOracleData);

        setCachedOracleData(timeRange, newOracleData);
        setCachedAssets(timeRange, newAssets);
        setCachedTrendData(timeRange, newTrendData);

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

        const hours = getTimeRangeHours(timeRange);
        setOracleData(MOCK_ORACLE_DATA);
        setAssets(MOCK_ASSETS);
        setTrendData(generateTVSTrendData(hours, MOCK_ORACLE_DATA));
        setIsUsingMockData(true);
        setError(`数据获取失败: ${errorMessage}`);
        setRefreshStatus('error');
      } finally {
        setIsLoading(false);
      }
    },
    [getTimeRangeHours]
  );

  const fetchMockData = useCallback(
    async (forceRefresh: boolean = false) => {
      const timeRange = selectedTimeRangeRef.current;

      if (!forceRefresh) {
        const cachedOracleData = getCachedOracleData(timeRange);
        const cachedAssets = getCachedAssets(timeRange);
        const cachedTrendData = getCachedTrendData(timeRange);

        if (cachedOracleData && cachedAssets && cachedTrendData) {
          logger.debug(`Using cached mock data for timeRange: ${timeRange}`);
          setOracleData(cachedOracleData);
          setAssets(cachedAssets);
          setTrendData(cachedTrendData);
          setLastUpdated(new Date());
          setRefreshStatus('success');
          setIsLoading(false);
          return;
        }
      }

      setRefreshStatus('refreshing');
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 800));

        const hours = getTimeRangeHours(timeRange);
        const newTrendData = generateTVSTrendData(hours);

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

        setCachedOracleData(timeRange, updatedOracleData);
        setCachedAssets(timeRange, updatedAssets);
        setCachedTrendData(timeRange, newTrendData);

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
        setIsLoading(false);
      }
    },
    [getTimeRangeHours]
  );

  const fetchData = useCallback(
    async (forceRefresh: boolean = false) => {
      if (USE_REAL_API) {
        await fetchDataFromApi(forceRefresh);
      } else {
        await fetchMockData(forceRefresh);
      }
    },
    [fetchDataFromApi, fetchMockData]
  );

  const fetchEnhancedData = useCallback(async (forceRefresh: boolean = false) => {
    const timeRange = selectedTimeRangeRef.current;

    if (!forceRefresh) {
      const cachedChainBreakdown = getCachedChainBreakdown(timeRange);
      const cachedProtocolDetails = getCachedProtocolDetails(timeRange);
      const cachedAssetCategories = getCachedAssetCategories(timeRange);

      if (cachedChainBreakdown && cachedProtocolDetails && cachedAssetCategories) {
        logger.debug(`Using cached enhanced data for timeRange: ${timeRange}`);
        setChainBreakdown(cachedChainBreakdown);
        setProtocolDetails(cachedProtocolDetails);
        setAssetCategories(cachedAssetCategories);
        return;
      }
    }

    setIsLoadingEnhanced(true);
    try {
      const [chains, protocols, categories] = await Promise.all([
        fetchChainBreakdown(),
        fetchProtocolDetails(),
        fetchAssetCategories(),
      ]);

      setCachedChainBreakdown(timeRange, chains);
      setCachedProtocolDetails(timeRange, protocols);
      setCachedAssetCategories(timeRange, categories);

      setChainBreakdown(chains);
      setProtocolDetails(protocols);
      setAssetCategories(categories);
    } catch (err) {
      logger.error(
        'Failed to fetch enhanced data',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setIsLoadingEnhanced(false);
    }
  }, []);

  const fetchComparisonDataCallback = useCallback(async (forceRefresh: boolean = false) => {
    const timeRange = selectedTimeRangeRef.current;

    if (!forceRefresh) {
      const cachedComparisonData = getCachedComparisonData(timeRange);
      const cachedBenchmarkData = getCachedBenchmarkData(timeRange);
      const cachedCorrelationData = getCachedCorrelationData(timeRange);

      if (cachedComparisonData && cachedBenchmarkData && cachedCorrelationData) {
        logger.debug(`Using cached comparison data for timeRange: ${timeRange}`);
        setComparisonData(cachedComparisonData);
        setBenchmarkData(cachedBenchmarkData);
        setCorrelationData(cachedCorrelationData);
        return;
      }
    }

    setIsLoadingComparison(true);
    try {
      const [comparison, benchmark, correlation] = await Promise.all([
        fetchComparisonData(),
        fetchBenchmarkData(),
        calculateCorrelation(timeRange),
      ]);

      setCachedComparisonData(timeRange, comparison);
      setCachedBenchmarkData(timeRange, benchmark);
      setCachedCorrelationData(timeRange, correlation);

      setComparisonData(comparison);
      setBenchmarkData(benchmark);
      setCorrelationData(correlation);
    } catch (err) {
      logger.error(
        'Failed to fetch comparison data',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setIsLoadingComparison(false);
    }
  }, []);

  const fetchRiskMetricsCallback = useCallback(async (forceRefresh: boolean = false) => {
    const timeRange = selectedTimeRangeRef.current;

    if (!forceRefresh) {
      const cachedRiskMetrics = getCachedRiskMetrics(timeRange);
      if (cachedRiskMetrics !== undefined) {
        logger.debug(`Using cached risk metrics for timeRange: ${timeRange}`);
        setRiskMetrics(cachedRiskMetrics);
        return;
      }
    }

    setIsLoadingRiskMetrics(true);
    try {
      const currentOracleData = oracleDataRef.current;
      if (currentOracleData.length > 0) {
        const metrics = await fetchRiskMetrics(currentOracleData);
        setCachedRiskMetrics(timeRange, metrics);
        setRiskMetrics(metrics);
      }
    } catch (err) {
      logger.error(
        'Failed to fetch risk metrics',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setIsLoadingRiskMetrics(false);
    }
  }, []);

  const detectAnomaliesCallback = useCallback(async (forceRefresh: boolean = false) => {
    const timeRange = selectedTimeRangeRef.current;

    if (!forceRefresh) {
      const cachedAnomalies = getCachedAnomalies(timeRange);
      if (cachedAnomalies) {
        logger.debug(`Using cached anomalies for timeRange: ${timeRange}`);
        setAnomalies(cachedAnomalies);
        return;
      }
    }

    setIsLoadingAnomalies(true);
    try {
      const currentOracleData = oracleDataRef.current;
      const currentAssets = assetsRef.current;
      if (currentOracleData.length > 0 && currentAssets.length > 0) {
        const detectedAnomalies = await detectAnomalies(currentOracleData, currentAssets);
        setCachedAnomalies(timeRange, detectedAnomalies);
        setAnomalies(detectedAnomalies);
      }
    } catch (err) {
      logger.error(
        'Failed to detect anomalies',
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setIsLoadingAnomalies(false);
    }
  }, []);

  const acknowledgeAnomaly = useCallback((id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  const clearCache = useCallback(() => {
    dataCache.clearAll();
    logger.info('Cache cleared by user');
  }, []);

  const clearExpiredCache = useCallback(() => {
    const count = dataCache.clearExpired();
    logger.info(`Cleared ${count} expired cache entries`);
    return count;
  }, []);

  useEffect(() => {
    fetchData();
    fetchEnhancedData();
    fetchComparisonDataCallback();
    fetchRiskMetricsCallback();
    detectAnomaliesCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastUpdated !== null) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeRange]);

  useEffect(() => {
    if (refreshInterval === 0) return;
    const intervalId = setInterval(() => {
      fetchData(true);
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval, fetchData]);

  const [cacheStats, setCacheStats] = useState<CacheStats>(() => dataCache.getStats());

  useEffect(() => {
    const updateStats = () => setCacheStats(dataCache.getStats());
    const intervalId = setInterval(updateStats, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return {
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
    cacheStats,
    clearCache,
    clearExpiredCache,
  };
}
