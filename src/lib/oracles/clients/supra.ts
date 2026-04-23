import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { supraSymbols, SUPRA_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import { SUPRA_PAIR_INDEX_MAP } from '@/lib/oracles/constants/supraConstants';
import { getSupraDataService } from '@/lib/oracles/services/supraDataService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

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
  ];

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
    if (!symbol) {
      throw this.createError('Symbol is required', 'SYMBOL_NOT_SUPPORTED');
    }

    if (options?.signal?.aborted) {
      throw this.createError('Request was aborted', 'NETWORK_ERROR', {
        retryable: false,
      });
    }

    const upperSymbol = symbol.toUpperCase();
    const pairIndex = SUPRA_PAIR_INDEX_MAP[upperSymbol];

    if (pairIndex === undefined || pairIndex === null) {
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
        'SUPRA_ERROR'
      );
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
        decimals: latestData.decimals,
        pairIndex: latestData.pairIndex,
        pairName: `${upperSymbol}/USDT`,
        supportedChainsCount: this.supportedChains.length,
        updateIntervalMinutes: this.defaultUpdateIntervalMinutes,
        dataAge,
        lastUpdated: latestData.timestamp,
        source: 'DORA V2',
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
    this.cache.startCleanupInterval();
  }
}
