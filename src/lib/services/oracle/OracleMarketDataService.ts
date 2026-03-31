'use client';

import { useQuery } from '@tanstack/react-query';

import { createLogger } from '@/lib/utils/logger';

import {
  CACHE_CONFIG,
  COLORS,
  DEFAULT_CHAIN_SUPPORT_DATA,
  DEFAULT_MARKET_SHARE_DATA,
  TVS_TREND_DATA_BY_RANGE,
  type ChainSupportDataItem,
  type MarketShareDataItem,
  type TimeRangeKey,
  type TvsTrendDataPoint,
} from './marketDataDefaults';

const logger = createLogger('OracleMarketDataService');

export type { ChainSupportDataItem, MarketShareDataItem, TimeRangeKey, TvsTrendDataPoint };

export interface MarketShareStats {
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;
  avgDominance: string;
  oracleCount: number;
}

function calculateMarketShareStats(data: MarketShareDataItem[]): MarketShareStats {
  const totalTVS = data.reduce((acc, item) => {
    const tvsValue = parseFloat(item.tvs.replace(/[$B]/g, ''));
    return acc + tvsValue;
  }, 0);

  const totalChains = data.reduce((acc, item) => acc + item.chains, 0);
  const totalProtocols = DEFAULT_CHAIN_SUPPORT_DATA.reduce((acc, item) => acc + item.protocols, 0);
  const avgDominance = data[0]?.value || 0;

  return {
    totalTVS: `$${totalTVS.toFixed(1)}B`,
    totalChains,
    totalProtocols,
    avgDominance: `${avgDominance}%`,
    oracleCount: data.length,
  };
}

async function fetchMarketShareData(): Promise<MarketShareDataItem[]> {
  logger.info('Fetching market share data...');

  await new Promise((resolve) => setTimeout(resolve, 100));

  return DEFAULT_MARKET_SHARE_DATA;
}

async function fetchTvsTrendData(range: TimeRangeKey): Promise<TvsTrendDataPoint[]> {
  logger.info(`Fetching TVS trend data for range: ${range}`);

  await new Promise((resolve) => setTimeout(resolve, 50));

  return TVS_TREND_DATA_BY_RANGE[range] || TVS_TREND_DATA_BY_RANGE['30D'];
}

async function fetchChainSupportData(): Promise<ChainSupportDataItem[]> {
  logger.info('Fetching chain support data...');

  await new Promise((resolve) => setTimeout(resolve, 100));

  return DEFAULT_CHAIN_SUPPORT_DATA;
}

export interface UseMarketShareDataOptions {
  enabled?: boolean;
}

export interface UseMarketShareDataReturn {
  data: MarketShareDataItem[] | undefined;
  stats: MarketShareStats;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMarketShareData(
  options: UseMarketShareDataOptions = {}
): UseMarketShareDataReturn {
  const { enabled = true } = options;

  const queryResult = useQuery<MarketShareDataItem[], Error>({
    queryKey: ['oracle', 'marketShare'],
    queryFn: fetchMarketShareData,
    enabled,
    staleTime: CACHE_CONFIG.marketShare.staleTime,
    gcTime: CACHE_CONFIG.marketShare.gcTime,
    refetchInterval: CACHE_CONFIG.marketShare.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const stats = calculateMarketShareStats(queryResult.data || DEFAULT_MARKET_SHARE_DATA);

  return {
    data: queryResult.data,
    stats,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: () => queryResult.refetch(),
  };
}

export interface UseTvsTrendDataOptions {
  range: TimeRangeKey;
  enabled?: boolean;
}

export interface UseTvsTrendDataReturn {
  data: TvsTrendDataPoint[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTvsTrendData(options: UseTvsTrendDataOptions): UseTvsTrendDataReturn {
  const { range, enabled = true } = options;

  const queryResult = useQuery<TvsTrendDataPoint[], Error>({
    queryKey: ['oracle', 'tvsTrend', range],
    queryFn: () => fetchTvsTrendData(range),
    enabled,
    staleTime: CACHE_CONFIG.tvsTrend.staleTime,
    gcTime: CACHE_CONFIG.tvsTrend.gcTime,
    refetchInterval: CACHE_CONFIG.tvsTrend.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: () => queryResult.refetch(),
  };
}

export interface UseChainSupportDataOptions {
  enabled?: boolean;
}

export interface UseChainSupportDataReturn {
  data: ChainSupportDataItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useChainSupportData(
  options: UseChainSupportDataOptions = {}
): UseChainSupportDataReturn {
  const { enabled = true } = options;

  const queryResult = useQuery<ChainSupportDataItem[], Error>({
    queryKey: ['oracle', 'chainSupport'],
    queryFn: fetchChainSupportData,
    enabled,
    staleTime: CACHE_CONFIG.chainSupport.staleTime,
    gcTime: CACHE_CONFIG.chainSupport.gcTime,
    refetchInterval: CACHE_CONFIG.chainSupport.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: () => queryResult.refetch(),
  };
}

export const OracleMarketDataService = {
  fetchMarketShareData,
  fetchTvsTrendData,
  fetchChainSupportData,
  calculateMarketShareStats,
  DEFAULT_MARKET_SHARE_DATA,
  DEFAULT_CHAIN_SUPPORT_DATA,
  TVS_TREND_DATA_BY_RANGE,
  COLORS,
  CACHE_CONFIG,
};
