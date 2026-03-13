'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { useCallback, useMemo } from 'react';
import { API3Client } from '@/lib/oracles/api3';
import type {
  AirnodeNetworkStats,
  DapiCoverage,
  StakingData,
  FirstPartyOracleData,
  DapiPriceDeviation,
  DataSourceInfo,
  CoveragePoolEvent,
} from '@/lib/oracles/api3';
import type { GasFeeData } from '@/components/oracle/GasFeeComparison';
import type { QualityDataPoint } from '@/components/oracle/DataQualityTrend';
import type { PriceDataPoint } from '@/components/oracle/ATRIndicator';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

// 创建单例 client
const api3Client = new API3Client();

// API3 数据类型的联合类型
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
  | 'crossOracle';

// 生成 SWR key
const getAPI3Key = (type: API3DataType, params?: Record<string, unknown>): string => {
  const baseKey = 'api3';
  if (!params) return `${baseKey}/${type}`;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${baseKey}/${type}?${paramStr}`;
};

// 基础 fetcher 工厂函数
const createAPI3Fetcher =
  <T>(fetchFn: () => Promise<T>) =>
  async (): Promise<T> => {
    return fetchFn();
  };

// ===== 单个数据 hooks =====

interface UseAPI3PriceOptions {
  symbol: string;
  chain?: Blockchain;
  swrOptions?: SWRConfiguration<PriceData>;
}

export function useAPI3Price(options: UseAPI3PriceOptions) {
  const { symbol, chain, swrOptions } = options;
  const key = getAPI3Key('price', { symbol, chain });

  const { data, error, isLoading, mutate } = useSWR<PriceData>(
    key,
    createAPI3Fetcher(() => api3Client.getPrice(symbol, chain)),
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    price: data,
    error,
    isLoading,
    refetch: mutate,
  };
}

interface UseAPI3HistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  swrOptions?: SWRConfiguration<PriceData[]>;
}

export function useAPI3Historical(options: UseAPI3HistoricalOptions) {
  const { symbol, chain, period = 7, swrOptions } = options;
  const key = getAPI3Key('historical', { symbol, chain, period });

  const { data, error, isLoading, mutate } = useSWR<PriceData[]>(
    key,
    createAPI3Fetcher(() => api3Client.getHistoricalPrices(symbol, chain, period)),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3AirnodeStats(swrOptions?: SWRConfiguration<AirnodeNetworkStats>) {
  const key = getAPI3Key('airnodeStats');

  const { data, error, isLoading, mutate } = useSWR<AirnodeNetworkStats>(
    key,
    createAPI3Fetcher(() => api3Client.getAirnodeNetworkStats()),
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    airnodeStats: data,
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3DapiCoverage(swrOptions?: SWRConfiguration<DapiCoverage>) {
  const key = getAPI3Key('dapiCoverage');

  const { data, error, isLoading, mutate } = useSWR<DapiCoverage>(
    key,
    createAPI3Fetcher(() => api3Client.getDapiCoverage()),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    dapiCoverage: data,
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3Staking(swrOptions?: SWRConfiguration<StakingData>) {
  const key = getAPI3Key('staking');

  const { data, error, isLoading, mutate } = useSWR<StakingData>(
    key,
    createAPI3Fetcher(() => api3Client.getStakingData()),
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    staking: data,
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3FirstParty(swrOptions?: SWRConfiguration<FirstPartyOracleData>) {
  const key = getAPI3Key('firstParty');

  const { data, error, isLoading, mutate } = useSWR<FirstPartyOracleData>(
    key,
    createAPI3Fetcher(() => api3Client.getFirstPartyOracleData()),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    firstParty: data,
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3Latency(swrOptions?: SWRConfiguration<number[]>) {
  const key = getAPI3Key('latency');

  const { data, error, isLoading, mutate } = useSWR<number[]>(
    key,
    createAPI3Fetcher(() => api3Client.getLatencyDistribution()),
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    latency: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

interface UseAPI3QualityMetricsReturn {
  freshness: { lastUpdated: Date; updateInterval: number };
  completeness: { successCount: number; totalCount: number };
  reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
}

export function useAPI3QualityMetrics(swrOptions?: SWRConfiguration<UseAPI3QualityMetricsReturn>) {
  const key = getAPI3Key('quality');

  const { data, error, isLoading, mutate } = useSWR<UseAPI3QualityMetricsReturn>(
    key,
    createAPI3Fetcher(() => api3Client.getDataQualityMetrics()),
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    qualityMetrics: data,
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3Deviations(swrOptions?: SWRConfiguration<DapiPriceDeviation[]>) {
  const key = getAPI3Key('deviations');

  const { data, error, isLoading, mutate } = useSWR<DapiPriceDeviation[]>(
    key,
    createAPI3Fetcher(() => api3Client.getDapiPriceDeviations()),
    {
      refreshInterval: 30 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    deviations: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3SourceTrace(swrOptions?: SWRConfiguration<DataSourceInfo[]>) {
  const key = getAPI3Key('sourceTrace');

  const { data, error, isLoading, mutate } = useSWR<DataSourceInfo[]>(
    key,
    createAPI3Fetcher(() => api3Client.getDataSourceTraceability()),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    sourceTrace: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3CoverageEvents(swrOptions?: SWRConfiguration<CoveragePoolEvent[]>) {
  const key = getAPI3Key('coverageEvents');

  const { data, error, isLoading, mutate } = useSWR<CoveragePoolEvent[]>(
    key,
    createAPI3Fetcher(() => api3Client.getCoveragePoolEvents()),
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    coverageEvents: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3GasFees(swrOptions?: SWRConfiguration<GasFeeData[]>) {
  const key = getAPI3Key('gasFees');

  const { data, error, isLoading, mutate } = useSWR<GasFeeData[]>(
    key,
    createAPI3Fetcher(() => api3Client.getGasFeeData()),
    {
      refreshInterval: 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    gasFees: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

interface UseAPI3OHLCOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  swrOptions?: SWRConfiguration<PriceDataPoint[]>;
}

export function useAPI3OHLC(options: UseAPI3OHLCOptions) {
  const { symbol, chain, period = 30, swrOptions } = options;
  const key = getAPI3Key('ohlc', { symbol, chain, period });

  const { data, error, isLoading, mutate } = useSWR<PriceDataPoint[]>(
    key,
    createAPI3Fetcher(() => api3Client.getOHLCPrices(symbol, chain, period)),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    ohlc: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3QualityHistory(swrOptions?: SWRConfiguration<QualityDataPoint[]>) {
  const key = getAPI3Key('qualityHistory');

  const { data, error, isLoading, mutate } = useSWR<QualityDataPoint[]>(
    key,
    createAPI3Fetcher(() => api3Client.getQualityHistory()),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    qualityHistory: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useAPI3CrossOracle(
  swrOptions?: SWRConfiguration<
    {
      oracle: OracleProvider;
      responseTime: number;
      accuracy: number;
      availability: number;
      costEfficiency: number;
      updateFrequency: number;
    }[]
  >
) {
  const key = getAPI3Key('crossOracle');

  const { data, error, isLoading, mutate } = useSWR<
    {
      oracle: OracleProvider;
      responseTime: number;
      accuracy: number;
      availability: number;
      costEfficiency: number;
      updateFrequency: number;
    }[]
  >(
    key,
    createAPI3Fetcher(() => api3Client.getCrossOracleComparison()),
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );

  return {
    crossOracle: data ?? [],
    error,
    isLoading,
    refetch: mutate,
  };
}

// ===== 组合数据 hook - 并行获取所有数据 =====

interface UseAPI3AllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseAPI3AllDataReturn {
  // 基础数据
  price: PriceData | undefined;
  historicalData: PriceData[];

  // Airnode 数据
  airnodeStats: AirnodeNetworkStats | undefined;
  dapiCoverage: DapiCoverage | undefined;

  // 质押和保险池
  staking: StakingData | undefined;
  firstParty: FirstPartyOracleData | undefined;

  // 质量和性能
  latency: number[];
  qualityMetrics: UseAPI3QualityMetricsReturn | undefined;
  hourlyActivity: number[];
  deviations: DapiPriceDeviation[];
  sourceTrace: DataSourceInfo[];
  coverageEvents: CoveragePoolEvent[];

  // 高级分析
  gasFees: GasFeeData[];
  ohlc: PriceDataPoint[];
  qualityHistory: QualityDataPoint[];
  crossOracle: {
    oracle: OracleProvider;
    responseTime: number;
    accuracy: number;
    availability: number;
    costEfficiency: number;
    updateFrequency: number;
  }[];

  // 状态
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
}

export function useAPI3AllData(options: UseAPI3AllDataOptions): UseAPI3AllDataReturn {
  const { symbol, chain, enabled = true } = options;

  // 使用多个 SWR hooks 并行获取数据
  const priceQuery = useAPI3Price({ symbol, chain, swrOptions: { suspense: false } });
  const historicalQuery = useAPI3Historical({
    symbol,
    chain,
    period: 7,
    swrOptions: { suspense: false },
  });
  const airnodeStatsQuery = useAPI3AirnodeStats({ suspense: false });
  const dapiCoverageQuery = useAPI3DapiCoverage({ suspense: false });
  const stakingQuery = useAPI3Staking({ suspense: false });
  const firstPartyQuery = useAPI3FirstParty({ suspense: false });
  const latencyQuery = useAPI3Latency({ suspense: false });
  const qualityQuery = useAPI3QualityMetrics({ suspense: false });
  const deviationsQuery = useAPI3Deviations({ suspense: false });
  const sourceTraceQuery = useAPI3SourceTrace({ suspense: false });
  const coverageEventsQuery = useAPI3CoverageEvents({ suspense: false });
  const gasFeesQuery = useAPI3GasFees({ suspense: false });
  const ohlcQuery = useAPI3OHLC({ symbol, chain, period: 30, swrOptions: { suspense: false } });
  const qualityHistoryQuery = useAPI3QualityHistory({ suspense: false });
  const crossOracleQuery = useAPI3CrossOracle({ suspense: false });

  // 计算整体加载状态
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

  // 收集所有错误
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

  // 统一的 refetch 函数
  const refetchAll = useCallback(async () => {
    await Promise.all([
      priceQuery.refetch(),
      historicalQuery.refetch(),
      airnodeStatsQuery.refetch(),
      dapiCoverageQuery.refetch(),
      stakingQuery.refetch(),
      firstPartyQuery.refetch(),
      latencyQuery.refetch(),
      qualityQuery.refetch(),
      deviationsQuery.refetch(),
      sourceTraceQuery.refetch(),
      coverageEventsQuery.refetch(),
      gasFeesQuery.refetch(),
      ohlcQuery.refetch(),
      qualityHistoryQuery.refetch(),
      crossOracleQuery.refetch(),
    ]);
  }, [
    priceQuery.refetch,
    historicalQuery.refetch,
    airnodeStatsQuery.refetch,
    dapiCoverageQuery.refetch,
    stakingQuery.refetch,
    firstPartyQuery.refetch,
    latencyQuery.refetch,
    qualityQuery.refetch,
    deviationsQuery.refetch,
    sourceTraceQuery.refetch,
    coverageEventsQuery.refetch,
    gasFeesQuery.refetch,
    ohlcQuery.refetch,
    qualityHistoryQuery.refetch,
    crossOracleQuery.refetch,
  ]);

  return {
    // 基础数据
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,

    // Airnode 数据
    airnodeStats: airnodeStatsQuery.airnodeStats,
    dapiCoverage: dapiCoverageQuery.dapiCoverage,

    // 质押和保险池
    staking: stakingQuery.staking,
    firstParty: firstPartyQuery.firstParty,

    // 质量和性能
    latency: latencyQuery.latency,
    qualityMetrics: qualityQuery.qualityMetrics,
    hourlyActivity: airnodeStatsQuery.airnodeStats?.hourlyActivity ?? [],
    deviations: deviationsQuery.deviations,
    sourceTrace: sourceTraceQuery.sourceTrace,
    coverageEvents: coverageEventsQuery.coverageEvents,

    // 高级分析
    gasFees: gasFeesQuery.gasFees,
    ohlc: ohlcQuery.ohlc,
    qualityHistory: qualityHistoryQuery.qualityHistory,
    crossOracle: crossOracleQuery.crossOracle,

    // 状态
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
