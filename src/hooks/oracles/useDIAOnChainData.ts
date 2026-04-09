'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getDIADataService, type DIATokenOnChainData } from '@/lib/oracles/diaDataService';
import type { Blockchain } from '@/types/oracle';

export interface UseDIAOnChainDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export interface UseDIAOnChainDataReturn {
  data: DIATokenOnChainData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const getQueryKey = (symbol: string, chain?: Blockchain): string[] => {
  return ['dia', 'onchain-data', symbol.toUpperCase(), chain || 'default'];
};

/**
 * 获取DIA预言机的代币链上数据
 * 包括供应量、市值、交易所数量等真实链上数据
 */
export function useDIAOnChainData(options: UseDIAOnChainDataOptions): UseDIAOnChainDataReturn {
  const { symbol, chain, enabled = true } = options;
  const diaService = useMemo(() => getDIADataService(), []);
  const queryKey = getQueryKey(symbol, chain);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch: queryRefetch,
  } = useQuery<DIATokenOnChainData | null, Error>({
    queryKey,
    queryFn: () => diaService.getTokenOnChainData(symbol, chain),
    enabled: enabled && !!symbol,
    staleTime: 60000, // 1分钟
    gcTime: 300000, // 5分钟
    refetchInterval: 60000, // 每分钟自动刷新
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    data: data || null,
    isLoading,
    isError,
    error: error || null,
    refetch,
  };
}

/**
 * 格式化大数字显示
 */
export function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '-';

  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(2)}T`;
  }
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

/**
 * 格式化供应量显示
 */
export function formatSupply(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '-';

  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  return num.toLocaleString();
}

/**
 * 格式化百分比变化
 */
export function formatChangePercent(percent: number | null | undefined): string {
  if (percent === null || percent === undefined || isNaN(percent)) return '-';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}
