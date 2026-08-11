import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { supraSymbols, SUPRA_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import {
  SUPRA_PAIR_INDEX_MAP,
  SUPRA_DORA_REST_URL,
  getSupraPairIndexAsync,
} from '@/lib/oracles/constants/supraConstants';
import { getSupraDataService } from '@/lib/oracles/services/supraDataService';
import { buildApiVerification } from '@/lib/oracles/utils/verificationUtils';
import { createLogger } from '@/lib/utils/logger';
import {
  OracleProvider,
  Blockchain,
  type SupraTokenOnChainData,
  type PriceData,
} from '@/types/oracle';

const logger = createLogger('SupraClient');

export type { SupraTokenOnChainData };

export class SupraClient extends BaseOracleClient {
  name = OracleProvider.SUPRA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.SOLANA,
    Blockchain.BNB_CHAIN,
    Blockchain.AVALANCHE,
    Blockchain.ZKSYNC,
    Blockchain.SCROLL,
    Blockchain.MANTLE,
    Blockchain.LINEA,
    Blockchain.SUPRA_CHAIN,
    Blockchain.APTOS,
    Blockchain.SUI,
  ];

  supportedSymbolsList = supraSymbols;

  defaultUpdateIntervalMinutes = 5;
  private cache = new OracleCache();

  constructor(config?: OracleClientConfig) {
    super(config);
    this.cache.startCleanupInterval();
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    const upperSymbol = symbol.toUpperCase();
    const pairIndex = await getSupraPairIndexAsync(upperSymbol);

    if (pairIndex === null) {
      throw this.createError(
        `Symbol '${upperSymbol}' is not supported by Supra`,
        'SYMBOL_NOT_SUPPORTED'
      );
    }

    try {
      const supraDataService = getSupraDataService();
      const latestData = await supraDataService.fetchLatestPrice(upperSymbol, options?.signal);

      if (!latestData || isNaN(latestData.price) || latestData.price <= 0) {
        throw this.createError(
          `No price data available for ${upperSymbol} from Supra DORA`,
          'NO_DATA_AVAILABLE'
        );
      }

      // Central schema validation: Supra's DORA response is untrusted; reject
      // NaN/negative prices or bad timestamps before caching.
      return this.validatePriceData(
        {
          provider: OracleProvider.SUPRA,
          symbol: upperSymbol,
          price: latestData.price,
          timestamp: latestData.timestamp,
          decimals: latestData.decimals ?? 8,
          confidence: 0.95,
          chain: chain || Blockchain.ETHEREUM,
          source: 'supra-dora',
          pairIndex: latestData.pairIndex,
          high24h: latestData.high24h,
          low24h: latestData.low24h,
          change24h: latestData.change24h ?? 0,
          change24hPercent: latestData.change24hPercent ?? latestData.change24h ?? 0,
          ingestionTimestamp: Date.now(),
          verification: buildApiVerification(
            `${SUPRA_DORA_REST_URL}/price`,
            'fetchLatestPrice',
            'Supra DORA'
          ),
        },
        'getPrice'
      );
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      this.handleGetPriceError(error, 'Supra', 'SUPRA_ERROR');
    }
  }

  async getTokenOnChainData(symbol: string): Promise<SupraTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.cache.get<SupraTokenOnChainData>(cacheKey);
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
        decimals: latestData.decimals ?? 8,
        pairIndex: latestData.pairIndex,
        pairName: `${upperSymbol}/USDT`,
        supportedChainsCount: this.supportedChains.length,
        updateIntervalMinutes: this.defaultUpdateIntervalMinutes,
        dataAge,
        lastUpdated: latestData.timestamp,
        source: 'DORA V2',
        high24h: latestData.high24h,
        low24h: latestData.low24h,
        change24h: latestData.change24h ?? 0,
        change24hPercent: latestData.change24hPercent ?? latestData.change24h ?? 0,
      };

      this.cache.set(cacheKey, onChainData, 60000);
      return onChainData;
    } catch (error) {
      logger.error(
        `Failed to get on-chain data for ${upperSymbol}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    const upperSymbol = symbol.toUpperCase();

    if (!this.isSymbolSupported(upperSymbol, chain)) {
      return [];
    }

    const pairName = `${upperSymbol}_USDT`.toLowerCase();
    const endTime = Date.now();
    const startTime = endTime - period * 3600 * 1000;
    const interval = 3600;

    try {
      const supraDataService = getSupraDataService();
      const data = await supraDataService.fetchHistoricalPrices(
        pairName,
        startTime,
        endTime,
        interval,
        options?.signal
      );

      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      const latestClose = data[data.length - 1]?.close;
      if (latestClose === undefined || isNaN(latestClose)) {
        return [];
      }

      const targetChain = chain || Blockchain.ETHEREUM;

      return data.map((item) => {
        const change24h = Number((latestClose - item.close).toFixed(4));
        const change24hPercent = Number(
          (((latestClose - item.close) / item.close) * 100).toFixed(2)
        );
        return {
          provider: OracleProvider.SUPRA,
          symbol: upperSymbol,
          price: item.close,
          timestamp: item.timestamp,
          decimals: 8,
          confidence: 0.95,
          chain: targetChain,
          source: 'supra-dora',
          change24h,
          change24hPercent,
        };
      });
    } catch (error) {
      logger.error(
        `Failed to get historical prices for ${upperSymbol}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
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

  clearCache(): void {
    this.cache.stopCleanupInterval();
    this.cache.clear();
    this.cache.startCleanupInterval();
  }

  override destroy(): void {
    this.cache.destroy();
  }
}
