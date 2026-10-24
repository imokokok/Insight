import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import { supraSymbols, SUPRA_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import {
  SUPRA_PAIR_INDEX_MAP,
  SUPRA_DORA_REST_URL,
  getSupraPairIndexAsync,
} from '@/lib/oracles/constants/supraConstants';
import {
  SUPRA_MONAD_CHAIN_ID,
  SUPRA_MONAD_PUSHED_FEEDS,
  SUPRA_MONAD_SVALUE_FEED_ADDRESS,
  resolveSupraMonadFeed,
} from '@/lib/oracles/constants/supraMonad';
import { getSupraDataService } from '@/lib/oracles/services/supraDataService';
import { supraMonadOnChainService } from '@/lib/oracles/services/supraMonadOnChainService';
import { isSymbolActiveInCacheSync } from '@/lib/oracles/utils/dynamicFeedResolver';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { buildApiVerification, buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { roundTo } from '@/lib/utils/format';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import {
  OracleProvider,
  Blockchain,
  type SupraTokenOnChainData,
  type PriceData,
} from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

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
    Blockchain.MONAD,
  ];

  supportedSymbolsList = [
    ...new Set([...supraSymbols, ...SUPRA_MONAD_PUSHED_FEEDS.map((feed) => feed.alias)]),
  ];

  defaultUpdateIntervalMinutes = 5;
  private cache = new OracleCache();

  constructor() {
    super();
    this.cache.startCleanupInterval();
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    if (chain === Blockchain.MONAD) {
      return this.getMonadPushPrice(symbol, options?.signal);
    }

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

  /**
   * Monad is deliberately read through Supra's Push contract, never through
   * the DORA HTTP API. The on-chain `time` field is a millisecond timestamp
   * and is validated by the service before this observation is exposed.
   */
  private async getMonadPushPrice(symbol: string, signal?: AbortSignal): Promise<PriceData> {
    const feed = resolveSupraMonadFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, Blockchain.MONAD);

    try {
      const reading = await withOracleRetry(
        () => supraMonadOnChainService.getPrice(feed, signal),
        'supra-monad:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );
      const dataAge = Math.max(0, Math.floor((Date.now() - reading.sourceTimestampMs) / 1000));
      const data: PriceData = {
        provider: OracleProvider.SUPRA,
        chain: Blockchain.MONAD,
        symbol: feed.alias,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: reading.decimals,
        source: `Supra DORA Push on Monad:${feed.alias} (${feed.quality}; ${feed.quoteType})`,
        priceId: String(feed.pairIndex),
        feedId: `supra-monad:${feed.pairIndex}`,
        pairIndex: feed.pairIndex,
        dataAge,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        // DORA Push is an independently-verifiable observation, but it stays
        // shadow-only while Insight collects source-overlap and deviation
        // evidence. Stablecoin quotes and reference rates are visible with
        // their exact denomination and cannot manufacture a USD quorum vote.
        countsTowardOracleQuorum: false,
        signalVector: buildSignalVector({
          dataAgeSeconds: dataAge,
          isOnChain: true,
          hasVerification: true,
          providerUptime: 90,
          hasConfidence: false,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'getSvalue(uint256)+millisecond-freshness-gate',
        }),
        verification: {
          ...buildEvmVerification(
            SUPRA_MONAD_SVALUE_FEED_ADDRESS,
            SUPRA_MONAD_CHAIN_ID,
            'getSvalue(uint256)+millisecond-freshness-gate'
          ),
          rawValue: reading.rawValue.toString(),
          sourceTimestamp: reading.sourceTimestamp,
          valueExponent: -reading.decimals,
          assetId: `${feed.alias};quality=${feed.quality};quote=${feed.quoteAsset};type=${feed.quoteType}`,
        },
      };
      return this.validatePriceData(data, 'supra-monad:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Supra DORA Push on Monad', 'SUPRA_ERROR');
    }
  }

  async getTokenOnChainData(
    symbol: string,
    chain?: Blockchain
  ): Promise<SupraTokenOnChainData | null> {
    if (chain === Blockchain.MONAD) {
      return this.getMonadPushOnChainData(symbol);
    }

    const cacheKey = `onchain-data:${chain ?? 'default'}:${symbol.toUpperCase()}`;
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
      logger.error(`Failed to get on-chain data for ${upperSymbol}`, normalizeError(error));
      return null;
    }
  }

  /**
   * The detail/statistics endpoint must use the same verified Push reading as
   * getPrice on Monad. Falling back to DORA's HTTP API here would show an
   * unrelated observation beside an on-chain price and timestamp.
   */
  private async getMonadPushOnChainData(symbol: string): Promise<SupraTokenOnChainData | null> {
    const feed = resolveSupraMonadFeed(symbol);
    if (!feed) {
      logger.warn(`Symbol '${symbol.toUpperCase()}' is not supported by Supra DORA Push on Monad`);
      return null;
    }

    const cacheKey = `onchain-data:${Blockchain.MONAD}:${feed.alias}`;
    const cached = this.cache.get<SupraTokenOnChainData>(cacheKey);
    if (cached) return cached;

    try {
      const reading = await withOracleRetry(
        () => supraMonadOnChainService.getPrice(feed),
        'supra-monad:getTokenOnChainData',
        ORACLE_RETRY_PRESETS.standard
      );
      const dataAge = Math.max(0, Math.floor((Date.now() - reading.sourceTimestampMs) / 1000));
      const onChainData: SupraTokenOnChainData = {
        symbol: feed.alias,
        price: reading.price,
        decimals: reading.decimals,
        pairIndex: feed.pairIndex,
        pairName: feed.alias,
        // This is a Monad-only Push deployment. Do not imply that this exact
        // contract/pair observation has the generic API's multi-chain reach.
        supportedChainsCount: 1,
        // This is the maximum accepted source age, not an asserted cadence.
        updateIntervalMinutes: Math.ceil(feed.maxStalenessSeconds / 60),
        dataAge,
        lastUpdated: reading.timestamp,
        source: 'Supra DORA Push on Monad (getSvalue)',
      };
      this.cache.set(cacheKey, onChainData, Math.min(30_000, feed.maxStalenessSeconds * 1000));
      return onChainData;
    } catch (error) {
      logger.error(
        `Failed to get on-chain Supra DORA Push data for ${feed.alias}`,
        normalizeError(error)
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

    // The Push contract exposes only its latest S-value. Returning DORA HTTP
    // candles here would look like Monad on-chain history even though it is a
    // different transport and can have a different timestamp/value. Database
    // snapshots collected from verified Push reads remain available through
    // fetchHistoricalPricesWithDatabase when present.
    if (chain === Blockchain.MONAD) {
      return [];
    }

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
        const change24h = roundTo(latestClose - item.close, 4);
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
      logger.error(`Failed to get historical prices for ${upperSymbol}`, normalizeError(error));
      return [];
    }
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();
    if (chain === Blockchain.MONAD) {
      return resolveSupraMonadFeed(upperSymbol) !== null;
    }
    if (chain === undefined && resolveSupraMonadFeed(upperSymbol) !== null) {
      return true;
    }
    if (isSymbolActiveInCacheSync('supra', upperSymbol)) {
      return chain === undefined || this.supportedChains.includes(chain);
    }
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
