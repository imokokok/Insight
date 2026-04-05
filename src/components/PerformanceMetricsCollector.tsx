'use client';

import { useEffect, useRef } from 'react';

import { apiClient } from '@/lib/api';
import { performanceMetricsCalculator } from '@/lib/services/marketData';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PerformanceMetricsCollector');

const REFERENCE_PRICE_INTERVAL = 60000;
const CLEANUP_INTERVAL = 3600000;

interface PricesResponse {
  prices: Record<string, number>;
  cached: boolean;
  stale?: boolean;
  timestamp: number;
}

async function fetchPrices(): Promise<Record<string, number>> {
  try {
    const response = await apiClient.get<PricesResponse>('/api/prices', {
      cache: 'no-store',
      timeout: 15000,
    });

    if (response.data.stale) {
      logger.warn('Using stale price data');
    } else if (response.data.cached) {
      logger.debug('Using cached price data');
    }

    return response.data.prices;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch prices: ${errorMessage}`);
    return {};
  }
}

export function PerformanceMetricsCollector() {
  const priceCollectionRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  useEffect(() => {
    isActiveRef.current = true;

    const collectReferencePrices = async () => {
      if (!isActiveRef.current) return;

      try {
        const prices = await fetchPrices();
        const timestamp = Date.now();

        Object.entries(prices).forEach(([asset, price]) => {
          performanceMetricsCalculator.addReferencePrice({
            asset,
            price,
            timestamp,
            source: 'binance',
          });
        });

        logger.debug(`Collected reference prices for ${Object.keys(prices).length} assets`);
      } catch (error) {
        logger.error('Error collecting reference prices', error as Error);
      }
    };

    const cleanupOldData = () => {
      if (!isActiveRef.current) return;

      try {
        performanceMetricsCalculator.clearOldData(7 * 24 * 60 * 60 * 1000); // 保留7天数据
        const stats = performanceMetricsCalculator.getStats();
        logger.info(
          `Performance metrics stats: ${stats.priceDataPoints} oracle data points, ${stats.referenceDataPoints} reference data points`
        );
      } catch (error) {
        logger.error('Error cleaning up old data', error as Error);
      }
    };

    // 立即收集一次
    collectReferencePrices();

    // 设置定时器
    priceCollectionRef.current = setInterval(collectReferencePrices, REFERENCE_PRICE_INTERVAL);
    cleanupRef.current = setInterval(cleanupOldData, CLEANUP_INTERVAL);

    return () => {
      isActiveRef.current = false;
      if (priceCollectionRef.current) {
        clearInterval(priceCollectionRef.current);
      }
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
      }
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
