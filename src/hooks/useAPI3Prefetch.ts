'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API3Client } from '@/lib/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';
import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import type { Blockchain } from '@/types/oracle';

type PrefetchDataType =
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

interface PrefetchOptions {
  priority?: 'high' | 'low';
  force?: boolean;
}

const api3Client = new API3Client();

export function useAPI3Prefetch() {
  const queryClient = useQueryClient();
  const prefetchInProgress = useRef<Set<string>>(new Set());

  const getQueryKey = (type: PrefetchDataType, params?: Record<string, unknown>): string[] => {
    const baseKey = ['api3', type];
    if (!params) return baseKey;
    const paramStr = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return [...baseKey, paramStr];
  };

  const prefetch = useCallback(
    async (dataType: PrefetchDataType, params?: Record<string, unknown>, options?: PrefetchOptions): Promise<void> => {
      const queryKey = getQueryKey(dataType, params);
      const keyString = queryKey.join('/');

      if (prefetchInProgress.current.has(keyString) && !options?.force) {
        return;
      }

      prefetchInProgress.current.add(keyString);

      try {
        const config = CACHE_CONFIG.api3[dataType as keyof typeof CACHE_CONFIG.api3];

        await queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            let result: unknown;

            switch (dataType) {
              case 'price':
                result = await api3Client.getPrice(params?.symbol as string, params?.chain as Blockchain);
                break;
              case 'historical':
                result = await api3Client.getHistoricalPrices(
                  params?.symbol as string,
                  params?.chain as Blockchain,
                  (params?.period as number) || 7
                );
                break;
              case 'airnodeStats':
                result = await api3Client.getAirnodeNetworkStats();
                break;
              case 'dapiCoverage':
                result = await api3Client.getDapiCoverage();
                break;
              case 'staking':
                result = await api3Client.getStakingData();
                break;
              case 'firstParty':
                result = await api3Client.getFirstPartyOracleData();
                break;
              case 'latency':
                result = await api3Client.getLatencyDistribution();
                break;
              case 'quality':
                result = await api3Client.getDataQualityMetrics();
                break;
              case 'deviations':
                result = await api3Client.getDapiPriceDeviations();
                break;
              case 'sourceTrace':
                result = await api3Client.getDataSourceTraceability();
                break;
              case 'coverageEvents':
                result = await api3Client.getCoveragePoolEvents();
                break;
              case 'gasFees':
                result = await api3Client.getGasFeeData();
                break;
              case 'qualityHistory':
                result = await api3Client.getQualityHistory();
                break;
              case 'crossOracle':
                result = await api3Client.getCrossOracleComparison();
                break;
              case 'oevStats':
                result = await api3Client.getOEVNetworkStats();
                break;
              case 'oevAuctions':
                result = await api3Client.getOEVAuctions(params?.limit as number);
                break;
              case 'alerts':
                result = await api3Client.getActiveAlerts();
                break;
              case 'alertHistory':
                result = await api3Client.getAlertHistory(params?.limit as number);
                break;
              case 'alertThresholds':
                result = await api3Client.getAlertThresholds();
                break;
              case 'coveragePoolDetails':
                result = await api3Client.getCoveragePoolDetails();
                break;
              case 'coveragePoolClaims':
                result = await api3Client.getCoveragePoolClaims(params?.status as string);
                break;
              case 'stakerRewards':
                result = await api3Client.getStakerRewards(params?.address as string);
                break;
              default:
                throw new Error(`Unknown data type: ${dataType}`);
            }

            if (config) {
              const cacheKey = params
                ? `${dataType}-${Object.values(params).join('-')}`
                : dataType;
              await api3OfflineStorage.setData(cacheKey, result, config.gcTime);
            }

            return result;
          },
          staleTime: config?.staleTime || 60000,
          gcTime: config?.gcTime || 120000,
        });
      } finally {
        prefetchInProgress.current.delete(keyString);
      }
    },
    [queryClient]
  );

  const prefetchAll = useCallback(
    async (symbol?: string, chain?: Blockchain): Promise<void> => {
      const prefetchPromises: Promise<void>[] = [];

      const highPriorityData: Array<{ type: PrefetchDataType; params?: Record<string, unknown> }> = [
        { type: 'alerts' },
        { type: 'airnodeStats' },
        { type: 'price', params: { symbol: symbol || 'BTC/USD', chain } },
        { type: 'deviations' },
      ];

      const mediumPriorityData: Array<{ type: PrefetchDataType; params?: Record<string, unknown> }> = [
        { type: 'dapiCoverage' },
        { type: 'staking' },
        { type: 'oevStats' },
        { type: 'coveragePoolDetails' },
        { type: 'historical', params: { symbol: symbol || 'BTC/USD', chain, period: 7 } },
      ];

      const lowPriorityData: Array<{ type: PrefetchDataType; params?: Record<string, unknown> }> = [
        { type: 'firstParty' },
        { type: 'latency' },
        { type: 'quality' },
        { type: 'sourceTrace' },
        { type: 'coverageEvents' },
        { type: 'gasFees' },
        { type: 'qualityHistory' },
        { type: 'crossOracle' },
        { type: 'oevAuctions' },
        { type: 'alertThresholds' },
      ];

      for (const item of highPriorityData) {
        prefetchPromises.push(prefetch(item.type, item.params, { priority: 'high' }));
      }

      await Promise.allSettled(prefetchPromises);

      const mediumPromises = mediumPriorityData.map((item) =>
        prefetch(item.type, item.params, { priority: 'low' })
      );
      await Promise.allSettled(mediumPromises);

      const lowPromises = lowPriorityData.map((item) =>
        prefetch(item.type, item.params, { priority: 'low' })
      );
      await Promise.allSettled(lowPromises);
    },
    [prefetch]
  );

  const prefetchPrices = useCallback(
    async (symbols: string[], chain?: Blockchain): Promise<void> => {
      const promises = symbols.map((symbol) =>
        prefetch('price', { symbol, chain }, { priority: 'high' })
      );
      await Promise.allSettled(promises);
    },
    [prefetch]
  );

  const prefetchHistorical = useCallback(
    async (symbols: string[], chain?: Blockchain, period: number = 7): Promise<void> => {
      const promises = symbols.map((symbol) =>
        prefetch('historical', { symbol, chain, period }, { priority: 'low' })
      );
      await Promise.allSettled(promises);
    },
    [prefetch]
  );

  const prefetchCriticalData = useCallback(async (): Promise<void> => {
    const criticalTypes = CACHE_CONFIG.offline.criticalDataTypes;

    const promises: Promise<void>[] = [];

    if (criticalTypes.includes('price' as never)) {
      promises.push(prefetchPrices(['BTC/USD', 'ETH/USD', 'SOL/USD', 'API3/USD']));
    }

    if (criticalTypes.includes('alerts' as never)) {
      promises.push(prefetch('alerts'));
    }

    if (criticalTypes.includes('airnodeStats' as never)) {
      promises.push(prefetch('airnodeStats'));
    }

    await Promise.allSettled(promises);
  }, [prefetch, prefetchPrices]);

  const prefetchOnHover = useCallback(
    (dataType: PrefetchDataType, params?: Record<string, unknown>) => {
      return () => {
        prefetch(dataType, params, { priority: 'low' });
      };
    },
    [prefetch]
  );

  const prefetchOnFocus = useCallback(
    (dataType: PrefetchDataType, params?: Record<string, unknown>) => {
      let timeoutId: NodeJS.Timeout | null = null;

      return () => {
        timeoutId = setTimeout(() => {
          prefetch(dataType, params, { priority: 'low' });
        }, 200);
      };
    },
    [prefetch]
  );

  const cancelPrefetchOnBlur = useCallback(() => {
    return () => {
      // QueryClient handles cancellation internally
    };
  }, []);

  return {
    prefetch,
    prefetchAll,
    prefetchPrices,
    prefetchHistorical,
    prefetchCriticalData,
    prefetchOnHover,
    prefetchOnFocus,
    cancelPrefetchOnBlur,
  };
}
