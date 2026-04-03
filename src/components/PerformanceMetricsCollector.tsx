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

// Binance 交易对映射
const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  AVAX: 'AVAXUSDT',
  BNB: 'BNBUSDT',
  MATIC: 'MATICUSDT',
  ARB: 'ARBUSDT',
  OP: 'OPUSDT',
  UNI: 'UNIUSDT',
  AAVE: 'AAVEUSDT',
  LINK: 'LINKUSDT',
  USDC: 'USDCUSDT',
  USDT: 'USDT',
  DAI: 'DAIUSDT',
};

async function fetchBinancePrices(): Promise<Record<string, number>> {
  try {
    const symbols = SUPPORTED_ASSETS.map((asset) => BINANCE_SYMBOLS[asset]).filter(Boolean);

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    const prices: Record<string, number> = {};
    const symbolToAsset = Object.fromEntries(
      Object.entries(BINANCE_SYMBOLS).map(([asset, symbol]) => [symbol, asset])
    );

    data.forEach((item: { symbol: string; price: string }) => {
      const asset = symbolToAsset[item.symbol];
      if (asset) {
        prices[asset] = parseFloat(item.price);
      }
    });

    return prices;
  } catch (error) {
    logger.error('Failed to fetch Binance prices', error as Error);
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
        const prices = await fetchBinancePrices();
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
