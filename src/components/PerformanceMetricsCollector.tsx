'use client';

import { useEffect, useRef } from 'react';

import { performanceMetricsCalculator } from '@/lib/services/marketData';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PerformanceMetricsCollector');

const REFERENCE_PRICE_INTERVAL = 60000; // 每分钟收集一次参考价格
const CLEANUP_INTERVAL = 3600000; // 每小时清理一次旧数据

const SUPPORTED_ASSETS = [
  'BTC',
  'ETH',
  'SOL',
  'AVAX',
  'BNB',
  'MATIC',
  'ARB',
  'OP',
  'UNI',
  'AAVE',
  'LINK',
  'USDC',
  'USDT',
  'DAI',
];

async function fetchCoinGeckoPrices(): Promise<Record<string, number>> {
  try {
    const ids = SUPPORTED_ASSETS.map((asset) =>
      asset.toLowerCase() === 'bnb'
        ? 'binancecoin'
        : asset.toLowerCase() === 'matic'
          ? 'matic-network'
          : asset.toLowerCase()
    ).join(',');

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: Record<string, number> = {};
    SUPPORTED_ASSETS.forEach((asset) => {
      const id =
        asset.toLowerCase() === 'bnb'
          ? 'binancecoin'
          : asset.toLowerCase() === 'matic'
            ? 'matic-network'
            : asset.toLowerCase();
      if (data[id]?.usd) {
        prices[asset] = data[id].usd;
      }
    });

    return prices;
  } catch (error) {
    logger.error('Failed to fetch CoinGecko prices', error as Error);
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
        const prices = await fetchCoinGeckoPrices();
        const timestamp = Date.now();

        Object.entries(prices).forEach(([asset, price]) => {
          performanceMetricsCalculator.addReferencePrice({
            asset,
            price,
            timestamp,
            source: 'coingecko',
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
