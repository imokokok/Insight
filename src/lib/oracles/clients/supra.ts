import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { supraSymbols, SUPRA_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import { SUPRA_PAIR_INDEX_MAP, SUPRA_DORA_REST_URL } from '@/lib/oracles/constants/supraConstants';
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
        ingestionTimestamp: Date.now(),
        verification: buildApiVerification(
          `${SUPRA_DORA_REST_URL}/price`,
          'fetchLatestPrice',
          'Supra DORA'
        ),
      };
    } catch (error) {
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
    this.cache.clear();
    this.cache.startCleanupInterval();
  }
}
