'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import {
  getMultipleTokensMarketData,
  type TokenMarketData,
} from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';

import { ORACLE_TOKENS, type OracleToken } from '../constants/oracleTokens';

import type { OracleTokenPrice } from '../types/oracle';

// 预言机名称映射
const ORACLE_NAME_MAP: Record<string, string> = {
  'Chainlink': 'Chainlink',
  'Pyth Network': 'Pyth Network',
  'UMA Voting Token': 'UMA',
  'API3 Token': 'API3',
  'RedStone Token': 'RedStone',
  'DIA Token': 'DIA',
  'WIN Token': 'WINkLink',
};

// 主题颜色映射
const THEME_COLOR_MAP: Record<string, string> = {
  'LINK': '#375BD2',
  'PYTH': '#E6B800',
  'UMA': '#FF4A8D',
  'API3': '#7CE3CB',
  'REDSTONE': '#FF6B6B',
  'DIA': '#6366F1',
  'WIN': '#FF4D4D',
};

const logger = createLogger('useOracleTokenPrices');

const DEFAULT_REFRESH_INTERVAL = 30000; // 30秒
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5秒

export interface UseOracleTokenPricesReturn {
  /** 代币价格数据 */
  prices: OracleTokenPrice[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否出错 */
  isError: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 最后更新时间 */
  lastUpdated: Date | null;
  /** 手动刷新函数 */
  refetch: () => Promise<void>;
  /** 刷新间隔（毫秒） */
  refreshInterval: number;
  /** 设置刷新间隔 */
  setRefreshInterval: (interval: number) => void;
}

/**
 * 将 Binance 市场数据转换为 OracleTokenPrice
 */
function convertToOracleTokenPrice(
  marketData: TokenMarketData,
  config: OracleToken
): OracleTokenPrice {
  return {
    oracleName: ORACLE_NAME_MAP[config.name] || config.name,
    symbol: marketData.symbol,
    tokenName: marketData.name,
    currentPrice: marketData.currentPrice,
    high24h: marketData.high24h,
    low24h: marketData.low24h,
    priceChange24h: marketData.priceChange24h,
    priceChangePercentage24h: marketData.priceChangePercentage24h,
    volume24h: marketData.totalVolume24h,
    logoPath: config.logoUrl || '',
    themeColor: THEME_COLOR_MAP[config.symbol] || '#888888',
    lastUpdated: marketData.lastUpdated,
  };
}

/**
 * 获取预言机代币价格的 Hook
 */
export function useOracleTokenPrices(
  autoRefresh: boolean = true,
  initialRefreshInterval: number = DEFAULT_REFRESH_INTERVAL
): UseOracleTokenPricesReturn {
  const [prices, setPrices] = useState<OracleTokenPrice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(initialRefreshInterval);

  // 使用 ref 保存上次成功获取的数据，用于失败时回退
  const lastSuccessfulPrices = useRef<OracleTokenPrice[]>([]);
  const retryCount = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 获取价格数据
   */
  const fetchPrices = useCallback(async (): Promise<void> => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const symbols = ORACLE_TOKENS.map((token) => token.symbol);
      logger.info(`Fetching prices for ${symbols.join(', ')}...`);

      const marketDataList = await getMultipleTokensMarketData(symbols);

      if (marketDataList.length === 0) {
        throw new Error('No price data received from Binance API');
      }

      // 将市场数据与配置合并
      const priceData: OracleTokenPrice[] = [];

      for (const marketData of marketDataList) {
        const config = ORACLE_TOKENS.find(
          (t) => t.symbol.toUpperCase() === marketData.symbol.toUpperCase()
        );

        if (config) {
          priceData.push(convertToOracleTokenPrice(marketData, config));
        }
      }

      // 按照 ORACLE_TOKENS 的顺序排序
      const orderedPrices = ORACLE_TOKENS.map((config) =>
        priceData.find((p) => p.symbol.toUpperCase() === config.symbol.toUpperCase())
      ).filter((p): p is OracleTokenPrice => p !== undefined);

      setPrices(orderedPrices);
      lastSuccessfulPrices.current = orderedPrices;
      setLastUpdated(new Date());
      retryCount.current = 0;

      logger.info(`Successfully fetched prices for ${orderedPrices.length} tokens`);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to fetch oracle token prices:', fetchError);

      setIsError(true);
      setError(fetchError);

      // 如果有上次成功的数据，保留它
      if (lastSuccessfulPrices.current.length > 0) {
        setPrices(lastSuccessfulPrices.current);
      }

      // 重试逻辑
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        logger.info(
          `Retrying in ${RETRY_DELAY}ms... (attempt ${retryCount.current}/${MAX_RETRIES})`
        );
        setTimeout(() => {
          fetchPrices();
        }, RETRY_DELAY);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 手动刷新
   */
  const refetch = useCallback(async (): Promise<void> => {
    retryCount.current = 0;
    await fetchPrices();
  }, [fetchPrices]);

  // 初始加载和自动刷新
  useEffect(() => {
    // 初始加载
    fetchPrices();

    // 设置自动刷新
    let intervalId: NodeJS.Timeout | null = null;

    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchPrices();
      }, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrices, autoRefresh, refreshInterval]);

  return {
    prices,
    isLoading,
    isError,
    error,
    lastUpdated,
    refetch,
    refreshInterval,
    setRefreshInterval,
  };
}
