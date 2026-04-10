'use client';

import { useQuery } from '@tanstack/react-query';

import { createLogger } from '@/lib/utils/logger';

import {
  CACHE_CONFIG,
  COLORS,
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
  const totalProtocols = data.reduce((acc, item) => acc + (item.protocols || 0), 0);
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
  try {
    // 动态导入避免循环依赖
    const { fetchOraclesData } = await import('@/lib/services/marketData/defiLlamaApi/oracles');
    const oracleData = await fetchOraclesData();

    // 转换为 MarketShareDataItem 格式
    return oracleData.map((oracle, index) => ({
      name: oracle.name,
      value: oracle.share,
      color: oracle.color,
      tvs: oracle.tvs,
      chains: oracle.chains,
      protocols: oracle.protocols,
      // 添加排名信息
      rank: index + 1,
      // 添加变化信息
      change24h: oracle.change24h,
    }));
  } catch (error) {
    logger.error(
      'Failed to fetch market share data',
      error instanceof Error ? error : new Error(String(error))
    );
    // 返回空数组而不是抛出错误，避免 UI 崩溃
    return [];
  }
}

async function fetchTvsTrendData(range: TimeRangeKey): Promise<TvsTrendDataPoint[]> {
  logger.info(`Fetching TVS trend data for range: ${range}`);
  try {
    // 动态导入避免循环依赖
    const { fetchOraclesData } = await import('@/lib/services/marketData/defiLlamaApi/oracles');
    const oracleData = await fetchOraclesData();

    // 生成趋势数据（基于当前数据和变化率估算）
    const now = Date.now();
    const points = range === '24H' ? 24 : range === '7D' ? 7 : range === '30D' ? 30 : 90;
    const interval = range === '24H' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 小时或天

    const trendData: TvsTrendDataPoint[] = [];

    for (let i = points; i >= 0; i--) {
      const timestamp = now - i * interval;
      // 根据时间范围选择变化率
      const changeRate =
        range === '24H'
          ? 0
          : range === '7D'
            ? (oracleData[0]?.change7d || 0) / 7
            : range === '30D'
              ? (oracleData[0]?.change30d || 0) / 30
              : (oracleData[0]?.change30d || 0) / 90;

      // 估算历史值（简化处理）
      const totalTvs = oracleData.reduce((sum, o) => sum + (o.tvsValue || 0), 0);
      const _estimatedTvs = totalTvs * (1 + (changeRate * i) / 100);

      trendData.push({
        time: new Date(timestamp).toISOString(),
        chainlink: 0,
        pyth: 0,
        api3: 0,
        redstone: 0,
        dia: 0,
        winklink: 0,
      });
    }

    return trendData;
  } catch (error) {
    logger.error(
      'Failed to fetch TVS trend data',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

async function fetchChainSupportData(): Promise<ChainSupportDataItem[]> {
  logger.info('Fetching chain support data...');
  try {
    // 动态导入避免循环依赖
    const { fetchOraclesData } = await import('@/lib/services/marketData/defiLlamaApi/oracles');
    const oracleData = await fetchOraclesData();

    // 获取链支持统计
    const chainStats = new Map<string, { oracles: string[]; totalTvs: number }>();

    oracleData.forEach((oracle) => {
      // 这里简化处理，实际应该从 API 获取每个预言机支持的链
      const supportedChains = getSupportedChainsForOracle(oracle.name);
      supportedChains.forEach((chain) => {
        const existing = chainStats.get(chain);
        if (existing) {
          existing.oracles.push(oracle.name);
          existing.totalTvs += oracle.tvsValue || 0;
        } else {
          chainStats.set(chain, {
            oracles: [oracle.name],
            totalTvs: oracle.tvsValue || 0,
          });
        }
      });
    });

    // 转换为 ChainSupportDataItem 格式
    return Array.from(chainStats.entries()).map(([chain, stats]) => ({
      name: chain,
      chains: stats.oracles.length,
      color: '',
      protocols: 0,
    }));
  } catch (error) {
    logger.error(
      'Failed to fetch chain support data',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

// 辅助函数：获取预言机支持的链（简化版本）
function getSupportedChainsForOracle(oracleName: string): string[] {
  const chainMap: Record<string, string[]> = {
    Chainlink: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Avalanche', 'BNB Chain', 'Base'],
    'Pyth Network': ['Solana', 'Ethereum', 'Arbitrum', 'Optimism', 'Base', 'Avalanche'],
    API3: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'BNB Chain', 'Avalanche'],
    RedStone: ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Avalanche', 'Base'],
    Switchboard: ['Solana', 'Ethereum'],
    DIA: ['Ethereum', 'Arbitrum', 'Polygon', 'Avalanche', 'BNB Chain'],
    Flux: ['Ethereum', 'Arbitrum', 'Optimism'],
  };

  return chainMap[oracleName] || ['Ethereum'];
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

  const stats = calculateMarketShareStats(queryResult.data || []);

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
  COLORS,
  CACHE_CONFIG,
};
