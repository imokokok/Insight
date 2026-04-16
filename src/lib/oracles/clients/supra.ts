import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig, OracleCacheEntry } from '@/lib/oracles/base';
import { supraSymbols, SUPRA_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import { SUPRA_PAIR_INDEX_MAP } from '@/lib/oracles/constants/supraConstants';
import { getSupraDataService } from '@/lib/oracles/services/supraDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData, OracleErrorCode } from '@/types/oracle';

const logger = createLogger('SupraClient');

export interface SupraTokenOnChainData {
  symbol: string;
  price: number;
  decimals: number;
  pairIndex: number;
  pairName: string;
  supportedChainsCount: number;
  updateIntervalMinutes: number;
  dataAge: number | null;
  lastUpdated: number;
  source: string;
}

export class SupraClient extends BaseOracleClient {
  name = OracleProvider.SUPRA;
  // 项目 RPC 支持的链（与 .env.local 中的 ALCHEMY_*_RPC 对应）
  supportedChains = [
    // 主要链（有 ALCHEMY RPC）
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.SOLANA,
    Blockchain.BNB_CHAIN,
    Blockchain.AVALANCHE,
    // RedStone 特有链
    Blockchain.ZKSYNC,
    Blockchain.SCROLL,
    Blockchain.MANTLE,
    Blockchain.LINEA,
  ];

  defaultUpdateIntervalMinutes = 5;
  private cache: Map<string, OracleCacheEntry<unknown>> = new Map();

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as OracleCacheEntry<T> | undefined;
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

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();
    const pairIndex = SUPRA_PAIR_INDEX_MAP[upperSymbol];

    if (pairIndex === undefined || pairIndex === null) {
      throw this.createError(
        `Symbol '${upperSymbol}' is not supported by Supra`,
        'SYMBOL_NOT_SUPPORTED' as OracleErrorCode
      );
    }

    try {
      const supraDataService = getSupraDataService();
      const latestData = await supraDataService.fetchLatestPrice(upperSymbol, options?.signal);

      if (!latestData || isNaN(latestData.price)) {
        throw this.createError(
          `No price data available for ${upperSymbol} from Supra DORA`,
          'NO_DATA_AVAILABLE' as OracleErrorCode
        );
      }

      return {
        provider: OracleProvider.SUPRA,
        symbol: upperSymbol,
        price: latestData.price,
        timestamp: latestData.timestamp,
        decimals: latestData.decimals,
        confidence: 0.95,
        chain: chain || Blockchain.ETHEREUM,
        source: 'supra-dora',
        pairIndex: latestData.pairIndex,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Supra',
        'SUPRA_ERROR' as OracleErrorCode
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    const upperSymbol = symbol.toUpperCase();

    if (SUPRA_PAIR_INDEX_MAP[upperSymbol] === undefined) {
      logger.warn(`Symbol '${upperSymbol}' is not supported by Supra`);
      return [];
    }

    try {
      const historicalPrices = await binanceMarketService.getHistoricalPricesByHours(
        upperSymbol,
        period
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        logger.warn(`No historical data available for ${upperSymbol}`, { symbol: upperSymbol });
        return [];
      }

      logger.info(`Using Binance historical data for ${upperSymbol}`, {
        symbol: upperSymbol,
        points: historicalPrices.length,
        period,
      });

      const targetChain = chain || Blockchain.ETHEREUM;
      const latestPrice = historicalPrices[historicalPrices.length - 1].price;

      return historicalPrices.map((point) => {
        const change24h = latestPrice - point.price;
        const change24hPercent =
          point.price > 0 ? ((latestPrice - point.price) / point.price) * 100 : 0;

        return {
          provider: this.name,
          chain: targetChain,
          symbol: upperSymbol,
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          source: 'binance-api',
        };
      });
    } catch (error) {
      logger.error(
        `Failed to fetch historical prices for ${upperSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return [];
    }
  }

  async getTokenOnChainData(symbol: string): Promise<SupraTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.getFromCache<SupraTokenOnChainData>(cacheKey);
    if (cached) {
      return cached;
    }

    const upperSymbol = symbol.toUpperCase();
    const pairIndex = SUPRA_PAIR_INDEX_MAP[upperSymbol];

    if (pairIndex === undefined || pairIndex === null) {
      logger.warn(`Symbol '${upperSymbol}' is not supported by Supra`);
      return null;
    }

    try {
      const supraDataService = getSupraDataService();
      const latestData = await supraDataService.fetchLatestPrice(upperSymbol);

      if (!latestData || isNaN(latestData.price)) {
        return null;
      }

      const now = Date.now();
      const dataAge = latestData.timestamp ? Math.round((now - latestData.timestamp) / 1000) : null;

      const onChainData: SupraTokenOnChainData = {
        symbol: upperSymbol,
        price: latestData.price,
        decimals: latestData.decimals,
        pairIndex: latestData.pairIndex,
        pairName: `${upperSymbol}/USDT`,
        supportedChainsCount: this.supportedChains.length,
        updateIntervalMinutes: this.defaultUpdateIntervalMinutes,
        dataAge,
        lastUpdated: latestData.timestamp,
        source: 'DORA V2',
      };

      this.setCache(cacheKey, onChainData, 60000);
      return onChainData;
    } catch (error) {
      logger.error(
        `Failed to get on-chain data for ${upperSymbol}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  getSupportedSymbols(): string[] {
    return [...supraSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();
    const isSymbolInList = supraSymbols.includes(upperSymbol as (typeof supraSymbols)[number]);
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      const chainKey = chain.toLowerCase();
      const chainSymbols = SUPRA_AVAILABLE_PAIRS[chainKey];
      return chainSymbols ? chainSymbols.includes(upperSymbol) : false;
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
