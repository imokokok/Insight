import { createLogger } from '@/lib/utils/logger';
import { binanceMarketService, TokenMarketData, HistoricalPricePoint } from './binanceMarketService';

const logger = createLogger('CoinGeckoMarketService');

// 重新导出类型，保持兼容性
export type { TokenMarketData, HistoricalPricePoint };

/**
 * 获取代币市场数据
 * 注意：此服务现在使用 Binance API 替代 CoinGecko
 */
export async function getTokenMarketData(symbol: string): Promise<TokenMarketData | null> {
  logger.info(`Delegating to Binance API for ${symbol} market data`);
  return binanceMarketService.getTokenMarketData(symbol);
}

/**
 * 获取多个代币的市场数据
 * 注意：此服务现在使用 Binance API 替代 CoinGecko
 */
export async function getMultipleTokensMarketData(symbols: string[]): Promise<TokenMarketData[]> {
  logger.info(`Delegating to Binance API for multiple tokens market data`);
  return binanceMarketService.getMultipleTokensMarketData(symbols);
}

/**
 * 获取历史价格数据
 * 注意：此服务现在使用 Binance API 替代 CoinGecko
 */
export async function getHistoricalPrices(
  symbol: string,
  days: number = 30
): Promise<HistoricalPricePoint[]> {
  logger.info(`Delegating to Binance API for ${symbol} historical prices`);
  return binanceMarketService.getHistoricalPrices(symbol, days);
}

/**
 * 获取 OHLC 数据
 * 注意：此服务现在使用 Binance API 替代 CoinGecko
 */
export async function getOHLCData(
  symbol: string,
  days: number = 30
): Promise<Array<{ timestamp: number; open: number; high: number; low: number; close: number }>> {
  logger.info(`Delegating to Binance API for ${symbol} OHLC data`);
  return binanceMarketService.getOHLCData(symbol, days);
}

/**
 * 为了保持向后兼容，保留 coinGeckoMarketService 对象
 * 但所有方法都委托给 binanceMarketService
 */
export const coinGeckoMarketService = {
  getTokenMarketData,
  getMultipleTokensMarketData,
  getHistoricalPrices,
  getOHLCData,
};
