import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { DIA_ASSET_ADDRESSES } from './constants/assetAddresses';
import { DIA_CHAIN_MAPPING } from './constants/chainMapping';
import { DIA_API_BASE_URL, CACHE_TTL, DEFAULT_RETRY_CONFIG, withRetry } from './diaUtils';

import type { DIAAssetQuotation, CacheEntry } from './diaTypes';

const logger = createLogger('DIAPriceService');

// DIA API 使用的区块链名称映射
const DIA_BLOCKCHAIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  ETHEREUM: 'Ethereum',
  ARBITRUM: 'Arbitrum',
  POLYGON: 'Polygon',
  AVALANCHE: 'Avalanche',
  'BNB-CHAIN': 'BinanceSmartChain',
  BASE: 'Base',
  OPTIMISM: 'Optimism',
  FANTOM: 'Fantom',
  CRONOS: 'Cronos',
  MOONBEAM: 'Moonbeam',
  GNOSIS: 'Gnosis',
  KAVA: 'Kava',
};

// 资产符号到 DIA 格式的映射
const DIA_SYMBOL_MAPPING: Record<string, { blockchain: string; address: string }> = {
  BTC: { blockchain: 'Bitcoin', address: '0x0000000000000000000000000000000000000000' },
  ETH: { blockchain: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
};

export class DIAPriceService {
  constructor(private cache: Map<string, CacheEntry<unknown>>) {}

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  async getAssetPrice(symbol: string, chain?: Blockchain): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}:${chain || 'default'}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      logger.debug('Returning cached price', { symbol, chain });
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const upperSymbol = symbol.toUpperCase();

          // 使用 assetQuotation 端点获取价格数据
          let url: string;

          // 优先使用特定链的合约地址（如果提供了 chain 参数）
          if (chain && DIA_ASSET_ADDRESSES[upperSymbol]?.[chain]) {
            // 使用配置的合约地址
            const address = DIA_ASSET_ADDRESSES[upperSymbol][chain];
            const blockchainName = DIA_CHAIN_MAPPING[chain];
            url = `${DIA_API_BASE_URL}/assetQuotation/${blockchainName}/${address}`;
          } else if (DIA_SYMBOL_MAPPING[upperSymbol]) {
            // 检查是否有预定义的 DIA 映射
            const { blockchain, address } = DIA_SYMBOL_MAPPING[upperSymbol];
            url = `${DIA_API_BASE_URL}/assetQuotation/${blockchain}/${address}`;
          } else {
            // 尝试直接使用符号查询（某些资产支持）
            url = `${DIA_API_BASE_URL}/quotation/${upperSymbol}`;
          }

          logger.info('Fetching price from DIA', { symbol: upperSymbol, chain, url });

          try {
            const response = await fetch(url, {
              headers: {
                Accept: 'application/json',
              },
            });

            logger.info('DIA API response', {
              symbol: upperSymbol,
              status: response.status,
              statusText: response.statusText,
            });

            if (response.ok) {
              const data: DIAAssetQuotation = await response.json();
              logger.info('DIA API data received', { symbol: upperSymbol, price: data.Price });
              return this.parseAssetQuotation(data, chain);
            }

            if (response.status === 404) {
              logger.warn('Asset not found in DIA', { symbol, chain, url });
              return null;
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          } catch (fetchError) {
            logger.error(
              'DIA fetch error',
              fetchError instanceof Error ? fetchError : new Error(String(fetchError)),
              { symbol, chain, url }
            );
            throw fetchError;
          }
        },
        DEFAULT_RETRY_CONFIG,
        'getAssetPrice'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get asset price',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain }
      );
      return null;
    }
  }

  async getForexRate(symbol: string): Promise<PriceData | null> {
    const cacheKey = `forex:${symbol}`;
    const cached = this.getFromCache<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await withRetry(
        async () => {
          const url = `${DIA_API_BASE_URL}/quotation/${symbol.toUpperCase()}`;
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          return this.parseForexQuotation(data);
        },
        DEFAULT_RETRY_CONFIG,
        'getForexRate'
      );

      if (result) {
        this.setCache(cacheKey, result, CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      logger.error(
        'Failed to get forex rate',
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return null;
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    periodHours: number = 24
  ): Promise<PriceData[]> {
    const cacheKey = `historical:${symbol}:${chain || 'default'}:${periodHours}`;
    const cached = this.getFromCache<PriceData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const upperSymbol = symbol.toUpperCase();

      // DIA 历史数据端点格式: /historical/{blockchain}/{address}
      let url: string;

      if (DIA_SYMBOL_MAPPING[upperSymbol]) {
        const { blockchain, address } = DIA_SYMBOL_MAPPING[upperSymbol];
        url = `${DIA_API_BASE_URL}/historical/${blockchain}/${address}?timeRange=${periodHours}h`;
      } else if (chain && DIA_ASSET_ADDRESSES[upperSymbol]?.[chain]) {
        const address = DIA_ASSET_ADDRESSES[upperSymbol][chain];
        const blockchainName = DIA_CHAIN_MAPPING[chain];
        url = `${DIA_API_BASE_URL}/historical/${blockchainName}/${address}?timeRange=${periodHours}h`;
      } else {
        // 如果无法构建 URL，返回空数组
        logger.warn('Cannot build historical URL for asset', { symbol, chain });
        return [];
      }

      logger.info('Fetching historical prices from DIA', { symbol: upperSymbol, chain, url });

      try {
        const response = await fetch(url);

        logger.info('DIA historical API response', {
          symbol: upperSymbol,
          status: response.status,
          statusText: response.statusText,
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const prices: PriceData[] = data.map((item: { Price: number; Time: string }) => ({
              provider: OracleProvider.DIA,
              symbol: upperSymbol,
              price: item.Price,
              timestamp: new Date(item.Time).getTime(),
              decimals: 8,
              confidence: 0.98,
              chain,
            }));

            this.setCache(cacheKey, prices, CACHE_TTL.HISTORICAL);
            return prices;
          }
        }

        logger.warn('Historical data not available from DIA API', {
          symbol,
          chain,
          status: response.status,
        });
        return [];
      } catch (fetchError) {
        logger.error(
          'DIA historical fetch error',
          fetchError instanceof Error ? fetchError : new Error(String(fetchError)),
          { symbol, chain, url }
        );
        return [];
      }
    } catch (error) {
      logger.error(
        'Failed to fetch historical prices from DIA API',
        error instanceof Error ? error : new Error(String(error)),
        { symbol, chain, periodHours }
      );
      return [];
    }
  }

  private parseAssetQuotation(data: DIAAssetQuotation, chain?: Blockchain): PriceData {
    const price = data.Price;
    const priceYesterday = data.PriceYesterday || price;
    const change24h = price - priceYesterday;
    const change24hPercent = priceYesterday > 0 ? (change24h / priceYesterday) * 100 : 0;

    return {
      provider: OracleProvider.DIA,
      symbol: data.Symbol,
      price,
      timestamp: new Date(data.Time).getTime(),
      decimals: 8,
      confidence: 0.98,
      change24h,
      change24hPercent,
      chain,
      source: data.Source,
    };
  }

  private parseForexQuotation(data: { Symbol: string; Price: number; Time: string }): PriceData {
    return {
      provider: OracleProvider.DIA,
      symbol: data.Symbol,
      price: data.Price,
      timestamp: new Date(data.Time).getTime(),
      decimals: 6,
      confidence: 0.99,
      change24h: 0,
      change24hPercent: 0,
    };
  }
}
