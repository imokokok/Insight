'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import type { OHLCVDataPoint } from '@/lib/indicators';
import { API3Client } from '@/lib/oracles/api3';
import type {
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
  CoveragePoolEvent,
  CoveragePoolDetails,
  CoveragePoolClaim,
  StakerReward,
  OEVNetworkStats,
  OEVAuction,
  API3Alert,
  AlertThreshold,
} from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';
import {
  api3RequestManager,
  REQUEST_PRIORITIES,
  type RequestPriority,
} from '@/lib/oracles/api3RequestManager';
import type { GasFeeData } from '@/types/comparison';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

const api3Client = new API3Client();

type API3DataType =
  | 'price'
  | 'historical'
  | 'airnodeStats'
  | 'dapiCoverage'
  | 'staking'
  | 'firstParty'
  | 'latency'
  | 'quality'
  | 'deviations'
  | 'sourceTrace'
  | 'coverageEvents'
  | 'gasFees'
  | 'ohlc'
  | 'qualityHistory'
  | 'crossOracle'
  | 'oevStats'
  | 'oevAuctions'
  | 'alerts'
  | 'alertHistory'
  | 'alertThresholds'
  | 'coveragePoolDetails'
  | 'coveragePoolClaims'
  | 'stakerRewards';

const getAPI3Key = (type: API3DataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['api3', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface CacheStatus {
  isStale: boolean;
  lastUpdated: number | null;
  source: 'network' | 'cache' | 'offline' | null;
  isOffline: boolean;
}

export function useCacheStatus(
  dataType: API3DataType,
  params?: Record<string, unknown>
): CacheStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CacheStatus>({
    isStale: false,
    lastUpdated: null,
    source: null,
    isOffline: false,
  });

  const queryKey = getAPI3Key(dataType, params);
  const checkCountRef = useRef(0);

  useEffect(() => {
    const isClient = typeof window !== 'undefined';
    if (!isClient) return;

    const checkStatus = () => {
      checkCountRef.current++;

      if (checkCountRef.current % 2 !== 0) {
        return;
      }

      const queryState = queryClient.getQueryState(queryKey);
      const config = CACHE_CONFIG.api3[dataType as keyof typeof CACHE_CONFIG.api3];

      if (queryState) {
        const now = Date.now();
        const lastUpdated = queryState.dataUpdatedAt;
        const isStale = config && now - lastUpdated > config.staleTime;

        setStatus({
          isStale: isStale || false,
          lastUpdated,
          source: queryState.status === 'success' ? 'network' : null,
          isOffline: !navigator.onLine,
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    const handleOnline = () => setStatus((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, queryKey, dataType]);

  return status;
}

interface UseAPI3PriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useAPI3Price(options: UseAPI3PriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getAPI3Key('price', { symbol, chain });
  const config = CACHE_CONFIG.api3.price;

  const { data, error, isLoading, refetch, isStale, dataUpdatedAt } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getPrice(symbol, chain);
        await api3OfflineStorage.setData(
          `price-${symbol}-${chain || 'default'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<PriceData>(
          `price-${symbol}-${chain || 'default'}`
        );
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const cacheStatus = useCacheStatus('price', { symbol, chain });

  return {
    price: data,
    error,
    isLoading,
    refetch,
    isStale: isStale || cacheStatus.isStale,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3Alerts(enabled = true) {
  const queryKey = getAPI3Key('alerts');
  const config = CACHE_CONFIG.api3.alerts;

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery<API3Alert[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getActiveAlerts();
        await api3OfflineStorage.setData('alerts', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<API3Alert[]>('alerts');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  const unreadCount = useMemo(() => {
    return data?.filter((alert) => !alert.isRead).length ?? 0;
  }, [data]);

  const criticalCount = useMemo(() => {
    return data?.filter((alert) => alert.severity === 'critical' && !alert.isResolved).length ?? 0;
  }, [data]);

  const warningCount = useMemo(() => {
    return data?.filter((alert) => alert.severity === 'warning' && !alert.isResolved).length ?? 0;
  }, [data]);

  const cacheStatus = useCacheStatus('alerts');

  return {
    alerts: data ?? [],
    unreadCount,
    criticalCount,
    warningCount,
    error,
    isLoading,
    refetch,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3AlertHistory(limit: number = 20, enabled = true) {
  const queryKey = getAPI3Key('alertHistory', { limit });
  const config = CACHE_CONFIG.api3.alertHistory;

  const { data, error, isLoading, refetch } = useQuery<API3Alert[], Error>({
    queryKey,
    queryFn: () => api3Client.getAlertHistory(limit),
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    alertHistory: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3AlertThresholds(enabled = true) {
  const queryKey = getAPI3Key('alertThresholds');
  const config = CACHE_CONFIG.api3.alertThresholds;

  const { data, error, isLoading, refetch } = useQuery<AlertThreshold[], Error>({
    queryKey,
    queryFn: () => api3Client.getAlertThresholds(),
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    thresholds: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3HistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useAPI3Historical(options: UseAPI3HistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getAPI3Key('historical', { symbol, chain, period });
  const config = CACHE_CONFIG.api3.historical;

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getHistoricalPrices(symbol, chain, period);
        await api3OfflineStorage.setData(
          `historical-${symbol}-${chain || 'default'}-${period}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<PriceData[]>(
          `historical-${symbol}-${chain || 'default'}-${period}`
        );
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const cacheStatus = useCacheStatus('historical', { symbol, chain, period });

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3AirnodeStats(enabled = true) {
  const queryKey = getAPI3Key('airnodeStats');
  const config = CACHE_CONFIG.api3.airnodeStats;

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery<AirnodeNetworkStats, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getAirnodeNetworkStats();
        await api3OfflineStorage.setData('airnodeStats', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<AirnodeNetworkStats>('airnodeStats');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const cacheStatus = useCacheStatus('airnodeStats');

  return {
    airnodeStats: data,
    error,
    isLoading,
    refetch,
    lastUpdated: dataUpdatedAt,
    source: cacheStatus.source,
    isOffline: cacheStatus.isOffline,
  };
}

export function useAPI3DapiCoverage(enabled = true) {
  const queryKey = getAPI3Key('dapiCoverage');
  const config = CACHE_CONFIG.api3.dapiCoverage;

  const { data, error, isLoading, refetch } = useQuery<DAPICoverage, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDapiCoverage();
        await api3OfflineStorage.setData('dapiCoverage', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<DAPICoverage>('dapiCoverage');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    dapiCoverage: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3Staking(enabled = true) {
  const queryKey = getAPI3Key('staking');
  const config = CACHE_CONFIG.api3.staking;

  const { data, error, isLoading, refetch } = useQuery<StakingData, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getStakingData();
        await api3OfflineStorage.setData('staking', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<StakingData>('staking');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    staking: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3FirstParty(enabled = true) {
  const queryKey = getAPI3Key('firstParty');
  const config = CACHE_CONFIG.api3.firstParty;

  const { data, error, isLoading, refetch } = useQuery<FirstPartyOracleData, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getFirstPartyOracleData();
        await api3OfflineStorage.setData('firstParty', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<FirstPartyOracleData>('firstParty');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    firstParty: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3Latency(enabled = true) {
  const queryKey = getAPI3Key('latency');
  const config = CACHE_CONFIG.api3.latency;

  const { data, error, isLoading, refetch } = useQuery<number[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getLatencyDistribution();
        await api3OfflineStorage.setData('latency', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<number[]>('latency');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    latency: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3QualityMetricsReturn {
  freshness: { lastUpdated: Date; updateInterval: number };
  completeness: { successCount: number; totalCount: number };
  reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
}

export function useAPI3QualityMetrics(enabled = true) {
  const queryKey = getAPI3Key('quality');
  const config = CACHE_CONFIG.api3.quality;

  const { data, error, isLoading, refetch } = useQuery<UseAPI3QualityMetricsReturn, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDataQualityMetrics();
        await api3OfflineStorage.setData('quality', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<UseAPI3QualityMetricsReturn>('quality');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    qualityMetrics: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3Deviations(enabled = true) {
  const queryKey = getAPI3Key('deviations');
  const config = CACHE_CONFIG.api3.deviations;

  const { data, error, isLoading, refetch } = useQuery<DAPIPriceDeviation[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDapiPriceDeviations();
        await api3OfflineStorage.setData('deviations', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<DAPIPriceDeviation[]>('deviations');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    deviations: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3SourceTrace(enabled = true) {
  const queryKey = getAPI3Key('sourceTrace');
  const config = CACHE_CONFIG.api3.sourceTrace;

  const { data, error, isLoading, refetch } = useQuery<DataSourceInfo[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getDataSourceTraceability();
        await api3OfflineStorage.setData('sourceTrace', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<DataSourceInfo[]>('sourceTrace');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    sourceTrace: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CoverageEvents(enabled = true) {
  const queryKey = getAPI3Key('coverageEvents');
  const config = CACHE_CONFIG.api3.coverageEvents;

  const { data, error, isLoading, refetch } = useQuery<CoveragePoolEvent[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCoveragePoolEvents();
        await api3OfflineStorage.setData('coverageEvents', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<CoveragePoolEvent[]>('coverageEvents');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    coverageEvents: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3GasFees(enabled = true) {
  const queryKey = getAPI3Key('gasFees');
  const config = CACHE_CONFIG.api3.gasFees;

  const { data, error, isLoading, refetch } = useQuery<GasFeeData[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getGasFeeData();
        await api3OfflineStorage.setData('gasFees', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<GasFeeData[]>('gasFees');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    gasFees: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3OHLCOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useAPI3OHLC(options: UseAPI3OHLCOptions) {
  const { symbol, chain, period = 30, enabled = true } = options;
  const queryKey = getAPI3Key('ohlc', { symbol, chain, period });
  const config = CACHE_CONFIG.api3.ohlc;

  const { data, error, isLoading, refetch } = useQuery<OHLCVDataPoint[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getOHLCPrices(symbol, chain, period);
        await api3OfflineStorage.setData(
          `ohlc-${symbol}-${chain || 'default'}-${period}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<OHLCVDataPoint[]>(
          `ohlc-${symbol}-${chain || 'default'}-${period}`
        );
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    ohlc: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3QualityHistory(enabled = true) {
  const queryKey = getAPI3Key('qualityHistory');
  const config = CACHE_CONFIG.api3.qualityHistory;

  const { data, error, isLoading, refetch } = useQuery<QualityDataPoint[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getQualityHistory();
        await api3OfflineStorage.setData('qualityHistory', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<QualityDataPoint[]>('qualityHistory');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    qualityHistory: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CrossOracle(enabled = true) {
  const queryKey = getAPI3Key('crossOracle');
  const config = CACHE_CONFIG.api3.crossOracle;

  const { data, error, isLoading, refetch } = useQuery<
    {
      oracle: OracleProvider;
      responseTime: number;
      accuracy: number;
      availability: number;
      costEfficiency: number;
      updateFrequency: number;
    }[],
    Error
  >({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCrossOracleComparison();
        await api3OfflineStorage.setData('crossOracle', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<
          {
            oracle: OracleProvider;
            responseTime: number;
            accuracy: number;
            availability: number;
            costEfficiency: number;
            updateFrequency: number;
          }[]
        >('crossOracle');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    crossOracle: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3AllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseAPI3AllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  airnodeStats: AirnodeNetworkStats | undefined;
  dapiCoverage: DAPICoverage | undefined;
  staking: StakingData | undefined;
  firstParty: FirstPartyOracleData | undefined;
  latency: number[];
  qualityMetrics: UseAPI3QualityMetricsReturn | undefined;
  hourlyActivity: number[];
  deviations: DAPIPriceDeviation[];
  sourceTrace: DataSourceInfo[];
  coverageEvents: CoveragePoolEvent[];
  gasFees: GasFeeData[];
  ohlc: OHLCVDataPoint[];
  qualityHistory: QualityDataPoint[];
  crossOracle: {
    oracle: OracleProvider;
    responseTime: number;
    accuracy: number;
    availability: number;
    costEfficiency: number;
    updateFrequency: number;
  }[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
  cacheStatus: {
    isOffline: boolean;
    lastUpdated: number | null;
  };
}

export function useAPI3AllData(options: UseAPI3AllDataOptions): UseAPI3AllDataReturn {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useAPI3Price({ symbol, chain, enabled });
  const historicalQuery = useAPI3Historical({ symbol, chain, period: 7, enabled });
  const airnodeStatsQuery = useAPI3AirnodeStats(enabled);
  const dapiCoverageQuery = useAPI3DapiCoverage(enabled);
  const stakingQuery = useAPI3Staking(enabled);
  const firstPartyQuery = useAPI3FirstParty(enabled);
  const latencyQuery = useAPI3Latency(enabled);
  const qualityQuery = useAPI3QualityMetrics(enabled);
  const deviationsQuery = useAPI3Deviations(enabled);
  const sourceTraceQuery = useAPI3SourceTrace(enabled);
  const coverageEventsQuery = useAPI3CoverageEvents(enabled);
  const gasFeesQuery = useAPI3GasFees(enabled);
  const ohlcQuery = useAPI3OHLC({ symbol, chain, period: 30, enabled });
  const qualityHistoryQuery = useAPI3QualityHistory(enabled);
  const crossOracleQuery = useAPI3CrossOracle(enabled);

  const isLoading = useMemo(() => {
    if (!enabled) return false;
    return (
      priceQuery.isLoading ||
      historicalQuery.isLoading ||
      airnodeStatsQuery.isLoading ||
      dapiCoverageQuery.isLoading ||
      stakingQuery.isLoading ||
      firstPartyQuery.isLoading ||
      latencyQuery.isLoading ||
      qualityQuery.isLoading ||
      deviationsQuery.isLoading ||
      sourceTraceQuery.isLoading ||
      coverageEventsQuery.isLoading ||
      gasFeesQuery.isLoading ||
      ohlcQuery.isLoading ||
      qualityHistoryQuery.isLoading ||
      crossOracleQuery.isLoading
    );
  }, [
    enabled,
    priceQuery.isLoading,
    historicalQuery.isLoading,
    airnodeStatsQuery.isLoading,
    dapiCoverageQuery.isLoading,
    stakingQuery.isLoading,
    firstPartyQuery.isLoading,
    latencyQuery.isLoading,
    qualityQuery.isLoading,
    deviationsQuery.isLoading,
    sourceTraceQuery.isLoading,
    coverageEventsQuery.isLoading,
    gasFeesQuery.isLoading,
    ohlcQuery.isLoading,
    qualityHistoryQuery.isLoading,
    crossOracleQuery.isLoading,
  ]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    if (priceQuery.error) errs.push(priceQuery.error);
    if (historicalQuery.error) errs.push(historicalQuery.error);
    if (airnodeStatsQuery.error) errs.push(airnodeStatsQuery.error);
    if (dapiCoverageQuery.error) errs.push(dapiCoverageQuery.error);
    if (stakingQuery.error) errs.push(stakingQuery.error);
    if (firstPartyQuery.error) errs.push(firstPartyQuery.error);
    if (latencyQuery.error) errs.push(latencyQuery.error);
    if (qualityQuery.error) errs.push(qualityQuery.error);
    if (deviationsQuery.error) errs.push(deviationsQuery.error);
    if (sourceTraceQuery.error) errs.push(sourceTraceQuery.error);
    if (coverageEventsQuery.error) errs.push(coverageEventsQuery.error);
    if (gasFeesQuery.error) errs.push(gasFeesQuery.error);
    if (ohlcQuery.error) errs.push(ohlcQuery.error);
    if (qualityHistoryQuery.error) errs.push(qualityHistoryQuery.error);
    if (crossOracleQuery.error) errs.push(crossOracleQuery.error);
    return errs;
  }, [
    priceQuery.error,
    historicalQuery.error,
    airnodeStatsQuery.error,
    dapiCoverageQuery.error,
    stakingQuery.error,
    firstPartyQuery.error,
    latencyQuery.error,
    qualityQuery.error,
    deviationsQuery.error,
    sourceTraceQuery.error,
    coverageEventsQuery.error,
    gasFeesQuery.error,
    ohlcQuery.error,
    qualityHistoryQuery.error,
    crossOracleQuery.error,
  ]);

  const isError = errors.length > 0;

  const refetchAll = useCallback(async () => {
    const criticalRequests = [priceQuery.refetch()];

    const highPriorityRequests = [stakingQuery.refetch(), dapiCoverageQuery.refetch()];

    const normalPriorityRequests = [
      historicalQuery.refetch(),
      airnodeStatsQuery.refetch(),
      firstPartyQuery.refetch(),
      latencyQuery.refetch(),
      qualityQuery.refetch(),
      deviationsQuery.refetch(),
    ];

    const lowPriorityRequests = [
      sourceTraceQuery.refetch(),
      coverageEventsQuery.refetch(),
      gasFeesQuery.refetch(),
      ohlcQuery.refetch(),
      qualityHistoryQuery.refetch(),
      crossOracleQuery.refetch(),
    ];

    await Promise.all(criticalRequests);
    await Promise.all(highPriorityRequests);
    await Promise.all([...normalPriorityRequests, ...lowPriorityRequests]);
  }, [
    priceQuery,
    historicalQuery,
    airnodeStatsQuery,
    dapiCoverageQuery,
    stakingQuery,
    firstPartyQuery,
    latencyQuery,
    qualityQuery,
    deviationsQuery,
    sourceTraceQuery,
    coverageEventsQuery,
    gasFeesQuery,
    ohlcQuery,
    qualityHistoryQuery,
    crossOracleQuery,
  ]);

  const cacheStatus = useMemo(
    () => ({
      isOffline: priceQuery.isOffline,
      lastUpdated: priceQuery.lastUpdated,
    }),
    [priceQuery.isOffline, priceQuery.lastUpdated]
  );

  const queueStats = useMemo(() => api3RequestManager.getQueueStats(), []);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    airnodeStats: airnodeStatsQuery.airnodeStats,
    dapiCoverage: dapiCoverageQuery.dapiCoverage,
    staking: stakingQuery.staking,
    firstParty: firstPartyQuery.firstParty,
    latency: latencyQuery.latency,
    qualityMetrics: qualityQuery.qualityMetrics,
    hourlyActivity: airnodeStatsQuery.airnodeStats?.hourlyActivity ?? [],
    deviations: deviationsQuery.deviations,
    sourceTrace: sourceTraceQuery.sourceTrace,
    coverageEvents: coverageEventsQuery.coverageEvents,
    gasFees: gasFeesQuery.gasFees,
    ohlc: ohlcQuery.ohlc,
    qualityHistory: qualityHistoryQuery.qualityHistory,
    crossOracle: crossOracleQuery.crossOracle,
    isLoading,
    isError,
    errors,
    refetchAll,
    cacheStatus,
    queueStats,
  };
}

export function useAPI3OEVStats(enabled = true) {
  const queryKey = getAPI3Key('oevStats');
  const config = CACHE_CONFIG.api3.oev;

  const { data, error, isLoading, refetch } = useQuery<OEVNetworkStats, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getOEVNetworkStats();
        const oevStats = 'data' in result ? result.data : result;
        await api3OfflineStorage.setData('oevStats', oevStats, config.gcTime);
        return oevStats;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<OEVNetworkStats>('oevStats');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    oevStats: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3OEVAuctions(limit?: number, enabled = true) {
  const queryKey = getAPI3Key('oevAuctions', { limit });
  const config = CACHE_CONFIG.api3.oevAuctions;

  const { data, error, isLoading, refetch } = useQuery<OEVAuction[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getOEVAuctions(limit);
        await api3OfflineStorage.setData(
          `oevAuctions-${limit || 'default'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<OEVAuction[]>(
          `oevAuctions-${limit || 'default'}`
        );
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    auctions: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CoveragePoolDetails(enabled = true) {
  const queryKey = getAPI3Key('coveragePoolDetails');
  const config = CACHE_CONFIG.api3.coveragePoolDetails;

  const { data, error, isLoading, refetch } = useQuery<CoveragePoolDetails, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCoveragePoolDetails();
        await api3OfflineStorage.setData('coveragePoolDetails', result, config.gcTime);
        return result;
      } catch (error) {
        const cachedData =
          await api3OfflineStorage.getData<CoveragePoolDetails>('coveragePoolDetails');
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    coveragePoolDetails: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CoveragePoolClaims(status?: string, enabled = true) {
  const queryKey = getAPI3Key('coveragePoolClaims', { status });
  const config = CACHE_CONFIG.api3.coveragePoolClaims;

  const { data, error, isLoading, refetch } = useQuery<CoveragePoolClaim[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getCoveragePoolClaims(status);
        await api3OfflineStorage.setData(
          `coveragePoolClaims-${status || 'all'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<CoveragePoolClaim[]>(
          `coveragePoolClaims-${status || 'all'}`
        );
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    claims: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3StakerRewards(address?: string, enabled = true) {
  const queryKey = getAPI3Key('stakerRewards', { address });
  const config = CACHE_CONFIG.api3.stakerRewards;

  const { data, error, isLoading, refetch } = useQuery<StakerReward[], Error>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await api3Client.getStakerRewards(address);
        await api3OfflineStorage.setData(
          `stakerRewards-${address || 'all'}`,
          result,
          config.gcTime
        );
        return result;
      } catch (error) {
        const cachedData = await api3OfflineStorage.getData<StakerReward[]>(
          `stakerRewards-${address || 'all'}`
        );
        if (cachedData) {
          return cachedData;
        }
        throw error;
      }
    },
    enabled,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    refetchInterval: config.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    stakerRewards: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3OfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    const checkOfflineStatus = async () => {
      const status = await api3OfflineStorage.getOfflineDataStatus();
      setIsOffline(status.isOffline);
      setLastSync(status.lastSync);
    };

    checkOfflineStatus();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, lastSync };
}

export function useAPI3CacheActions() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['api3'] });
  }, [queryClient]);

  const invalidateType = useCallback(
    async (type: API3DataType) => {
      await queryClient.invalidateQueries({ queryKey: ['api3', type] });
    },
    [queryClient]
  );

  const clearOfflineCache = useCallback(async () => {
    await api3OfflineStorage.clearAll();
  }, []);

  const precacheCritical = useCallback(async () => {
    await api3OfflineStorage.precacheCriticalData();
  }, []);

  return {
    invalidateAll,
    invalidateType,
    clearOfflineCache,
    precacheCritical,
  };
}
