import { OracleProviderError } from '@/lib/errors';
import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import {
  SPREAD_PERCENTAGES,
  isRedStoneSymbolSupportedAsync,
} from '@/lib/oracles/constants/redstoneConstants';
import {
  REDSTONE_MONAD_CHAIN_ID,
  REDSTONE_MONAD_PRICE_FEEDS,
  resolveRedStoneMonadFeed,
} from '@/lib/oracles/constants/redstoneMonad';
import { redstoneSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { resolveOracleAgeSeconds } from '@/lib/oracles/oracleAge';
import {
  fetchRedStoneFeedSnapshot,
  REDSTONE_AUTHENTICATED_GATEWAY_URL,
} from '@/lib/oracles/services/redstoneGateway';
import { redStoneMonadOnChainService } from '@/lib/oracles/services/redstoneMonadOnChainService';
import { isSymbolActiveInCacheSync } from '@/lib/oracles/utils/dynamicFeedResolver';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import {
  type SnapshotBatchPriceRequest,
  type SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { buildApiVerification, buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { roundTo } from '@/lib/utils/format';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import { toMilliseconds } from '@/lib/utils/timestamp';
import {
  OracleProvider,
  Blockchain,
  type PriceData,
  type ConfidenceInterval,
  type RedStoneTokenOnChainData,
} from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

const logger = createLogger('RedStoneClient');

const REDSTONE_CACHE_TTL = {
  PRICE: 10000,
};

const REDSTONE_API_CHAINS: readonly Blockchain[] = [
  Blockchain.ETHEREUM,
  Blockchain.ARBITRUM,
  Blockchain.OPTIMISM,
  Blockchain.POLYGON,
  Blockchain.AVALANCHE,
  Blockchain.BASE,
  Blockchain.BNB_CHAIN,
  Blockchain.FANTOM,
  Blockchain.LINEA,
  Blockchain.MANTLE,
  Blockchain.SCROLL,
  Blockchain.ZKSYNC,
];

const REDSTONE_MONAD_RELIABILITY = 0.9;

function buildRedStonePriceUrl(symbol: string): string {
  const url = new URL(
    '/v2/data-packages/latest-by-data-feeds/redstone-primary-prod',
    REDSTONE_AUTHENTICATED_GATEWAY_URL
  );
  url.searchParams.set('dataFeedIds', symbol);
  return url.toString();
}

interface RedStonePriceResponse {
  symbol: string;
  value: number;
  timestamp: number;
  provider?: string;
  permawireTx?: string;
  source?: {
    value: number;
    timestamp: number;
  }[];
  change24h?: number;
  change24hPercent?: number;
}

export class RedStoneClient extends BaseOracleClient {
  name = OracleProvider.REDSTONE;
  supportedChains = [...REDSTONE_API_CHAINS, Blockchain.MONAD];

  protected supportedSymbolsList = Array.from(
    new Set([
      ...redstoneSymbols,
      ...REDSTONE_MONAD_PRICE_FEEDS.map((feed) => feed.alias.split('/')[0]),
    ])
  );

  defaultUpdateIntervalMinutes = 10;
  private cache = new OracleCache();

  constructor() {
    super();
    this.cache.startCleanupInterval();
  }

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const spreadPercentage = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: roundTo(price - halfSpread, 4),
      ask: roundTo(price + halfSpread, 4),
      widthPercentage: roundTo(spreadPercentage, 4),
    };
  }

  private classifyError(error: unknown): string {
    if (error instanceof Error) {
      if (error instanceof AggregateError) {
        if (error.errors.some((nested) => this.isRateLimitError(nested))) {
          return 'RATE_LIMIT_ERROR';
        }
        const nestedCodes = error.errors.map((nested) => this.classifyError(nested));
        if (nestedCodes.includes('TIMEOUT_ERROR')) return 'TIMEOUT_ERROR';
        if (nestedCodes.includes('NETWORK_ERROR')) return 'NETWORK_ERROR';
        if (nestedCodes.includes('PARSE_ERROR')) return 'PARSE_ERROR';
      }
      const status =
        (error as Error & { status?: number; response?: { status?: number } }).status ??
        (error as Error & { response?: { status?: number } }).response?.status;
      if (
        status === 429 ||
        error.message.includes('HTTP 429') ||
        error.message.includes('rate limit')
      ) {
        return 'RATE_LIMIT_ERROR';
      }
      if (
        status === 504 ||
        error.message.toLowerCase().includes('timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNABORTED')
      ) {
        return 'TIMEOUT_ERROR';
      }
      if (
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('EAI_AGAIN') ||
        error.message.toLowerCase().includes('fetch failed') ||
        error.message.toLowerCase().includes('network')
      ) {
        return 'NETWORK_ERROR';
      }
      if (error.message.includes('parse') || error.message.includes('JSON')) {
        return 'PARSE_ERROR';
      }
      const cause = (error as Error & { cause?: unknown }).cause;
      if (cause !== undefined && cause !== error) return this.classifyError(cause);
    }
    return 'FETCH_ERROR';
  }

  private isRateLimitError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const status =
      (error as Error & { status?: number; response?: { status?: number } }).status ??
      (error as Error & { response?: { status?: number } }).response?.status;
    return (
      status === 429 ||
      error.message.includes('HTTP 429') ||
      error.message.toLowerCase().includes('rate limit') ||
      (error instanceof AggregateError &&
        error.errors.some((nested) => this.isRateLimitError(nested)))
    );
  }

  private async fetchRealPrice(symbol: string, signal?: AbortSignal): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    let attemptCount = 0;

    try {
      const result = await withOracleRetry(
        async () => {
          attemptCount++;
          if (signal?.aborted) {
            throw new OracleProviderError(
              'RedStone request cancelled',
              'redstone',
              'CANCELLED',
              { symbol, attemptCount },
              signal.reason instanceof Error ? signal.reason : undefined
            );
          }

          try {
            // The official SDK verifies each package signature against the
            // current redstone-primary-prod signer set and requires three
            // unique signers before exposing the median price.
            const snapshot = await fetchRedStoneFeedSnapshot(symbol);
            if (!snapshot) return null;

            return this.parsePriceResponse(
              {
                symbol: snapshot.dataFeedId,
                value: snapshot.value,
                timestamp: snapshot.timestampMilliseconds,
                provider: 'redstone-primary-prod',
              },
              symbol
            );
          } catch (error) {
            if (error instanceof OracleProviderError) throw error;
            const errorCode = this.classifyError(error);
            throw new OracleProviderError(
              `Failed to fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'redstone',
              errorCode,
              { symbol, attemptCount },
              error instanceof Error ? error : undefined
            );
          }
        },
        'fetchRealPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );

      if (result) {
        this.cache.set(cacheKey, result, REDSTONE_CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      if (error instanceof OracleProviderError) {
        throw error;
      }
      throw new OracleProviderError(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'redstone',
        this.classifyError(error),
        { symbol, attemptCount },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Confirm the feed RedStone answered with is the feed we asked for.
   *
   * The `?symbol=X` endpoint does not always resolve to exactly `X`. Observed
   * 2026-08-24 to 2026-08-26 (~45h): a request for `WBTC` came back as
   * `WBTC/BTC` (~1.0), `STETH` as `stETH/ETH` (~1.0) and `USDC` as `USDC/BRL`
   * (~5.17). The caller took `data[0]` unconditionally, so those cross-rate
   * values were persisted as if they were USD prices and skewed consensus for
   * the whole window without ever raising an error.
   *
   * RedStone symbols are case-sensitive, so the comparison is exact. A
   * case-insensitive fallback keeps a pure casing normalisation on their side
   * from breaking a feed that works today, but any wider difference is a
   * different asset and must not be stored.
   */
  private assertSymbolMatches(response: RedStonePriceResponse, symbol: string): void {
    const returned = response.symbol;

    if (typeof returned !== 'string' || returned.length === 0) {
      throw new OracleProviderError(
        `Missing symbol in response for ${symbol}`,
        'redstone',
        'PARSE_ERROR',
        { symbol, receivedSymbol: returned }
      );
    }

    if (returned === symbol) {
      return;
    }

    if (returned.toLowerCase() === symbol.toLowerCase()) {
      logger.warn('RedStone returned the requested symbol with different casing', {
        requested: symbol,
        received: returned,
      });
      return;
    }

    throw new OracleProviderError(
      `Symbol mismatch: requested ${symbol}, received ${returned}`,
      'redstone',
      'PARSE_ERROR',
      { symbol, receivedSymbol: returned }
    );
  }

  private parsePriceResponse(response: RedStonePriceResponse, symbol: string): PriceData {
    this.assertSymbolMatches(response, symbol);
    const price = response.value;
    // External API data is untrusted. A missing/non-finite `value` must be
    // rejected here rather than cached as NaN, which would otherwise poison
    // downstream deviation/accuracy math. The timestamp is already validated
    // by toMilliseconds; the price needs the same guard at this data boundary.
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      throw new OracleProviderError(
        `Invalid or missing price value for ${symbol}`,
        'redstone',
        'PARSE_ERROR',
        { symbol, value: price }
      );
    }
    const timestamp = toMilliseconds(response.timestamp);
    const confidenceInterval = this.generateConfidenceInterval(price, symbol);

    return {
      provider: this.name,
      // Preserve the exact requested casing — RedStone symbols are case-sensitive
      // (e.g. `etrUSD_FUNDAMENTAL`) and downstream grouping keys off the
      // requested symbol, so uppercasing here would corrupt mixed-case symbols.
      symbol,
      price,
      timestamp,
      decimals: 8,
      confidence: 0.97,
      confidenceSource: 'estimated',
      confidenceInterval,
      change24h: response.change24h ?? 0,
      change24hPercent: response.change24hPercent ?? 0,
      source: response.provider,
      ingestionTimestamp: Date.now(),
    };
  }

  /**
   * Monad uses a contract-backed path. RedStone's ordinary HTTP API must not
   * be used as evidence that a price was published to Monad.
   */
  private async getMonadPrice(symbol: string, signal?: AbortSignal): Promise<PriceData> {
    const feed = resolveRedStoneMonadFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, Blockchain.MONAD);

    const reading = await withOracleRetry(
      () => redStoneMonadOnChainService.getPrice(feed, signal),
      'redstone-monad:getPrice',
      ORACLE_RETRY_PRESETS.standard,
      signal
    );
    const dataAge = Math.max(0, Math.floor(Date.now() / 1000) - reading.updatedAt);
    return this.validatePriceData(
      {
        provider: this.name,
        chain: Blockchain.MONAD,
        symbol: feed.alias,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: reading.decimals,
        source: `RedStone Monad on-chain feed:${feed.feedName}`,
        priceId: feed.address,
        feedId: feed.address,
        roundId: reading.roundId.toString(),
        answeredInRound: reading.answeredInRound.toString(),
        startedAt: reading.startedAt,
        dataAge,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        // This new provider is visible during a shadow period but cannot make
        // a strict quorum pass until source-overlap review is explicitly done.
        countsTowardOracleQuorum: false,
        signalVector: buildSignalVector({
          dataAgeSeconds: dataAge,
          isOnChain: true,
          hasVerification: true,
          providerUptime: REDSTONE_MONAD_RELIABILITY * 100,
          hasConfidence: false,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'latestRoundData()+freshness-gate',
        }),
        verification: {
          ...buildEvmVerification(
            feed.address,
            REDSTONE_MONAD_CHAIN_ID,
            'latestRoundData()+decimals()+freshness-gate'
          ),
          feedHash: feed.address,
          rawValue: reading.rawAnswer.toString(),
          sourceTimestamp: reading.updatedAt,
          valueExponent: -reading.decimals,
          assetId: feed.feedName,
        },
      },
      'redstone-monad:getPrice'
    );
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    const monadFeed = resolveRedStoneMonadFeed(symbol);
    // Preserve the historical API default for cross-chain assets, but route an
    // asset that exists only in the Monad registry (for example MON) to its
    // contract-backed source even when a caller omits `chain`.
    const targetChain =
      chain ??
      (monadFeed !== null && !this.isApiSymbolSupported(symbol)
        ? Blockchain.MONAD
        : this.defaultChain);
    if (targetChain === Blockchain.MONAD) {
      try {
        return await this.getMonadPrice(symbol, options?.signal);
      } catch (error) {
        this.handleGetPriceError(error, 'RedStone on Monad', 'REDSTONE_PRICE_ERROR');
      }
    }

    try {
      const realPrice = await this.fetchRealPrice(symbol, options?.signal);

      if (realPrice) {
        // Central schema validation: the live-fetch path must reject untrusted
        // NaN/negative prices or non-positive/non-integer timestamps instead of
        // caching them. This is the canonical chokepoint every RedStone price
        // traverses before reaching the cache/downstream math.
        return this.validatePriceData(
          {
            ...realPrice,
            chain,
            verification: buildApiVerification(
              buildRedStonePriceUrl(symbol),
              'getPrice',
              'RedStone authenticated gateway; signer-verified'
            ),
          },
          'getPrice'
        );
      }

      throw this.createError(
        `No fresh signer-verified price data available for ${symbol} from RedStone gateway`,
        'FETCH_ERROR'
      );
    } catch (error) {
      this.handleGetPriceError(error, 'RedStone', 'REDSTONE_ERROR');
    }
  }

  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    const feeds = new Map<string, (typeof REDSTONE_MONAD_PRICE_FEEDS)[number]>();
    const failures = new Map<string, Error>();
    for (const request of requests) {
      const feed =
        request.chain === Blockchain.MONAD ? resolveRedStoneMonadFeed(request.symbol) : null;
      if (feed) feeds.set(feed.address.toLowerCase(), feed);
      else
        failures.set(
          request.id,
          new Error(`No reviewed RedStone Monad feed for ${request.symbol}`)
        );
    }
    if (feeds.size > 0) {
      try {
        await withOracleRetry(
          () => redStoneMonadOnChainService.getPrices([...feeds.values()], signal),
          'redstone-monad:snapshot-batch',
          ORACLE_RETRY_PRESETS.standard,
          signal
        );
      } catch {
        // getPrice below remains the individual safety net.
      }
    }
    return Promise.all(
      requests.map(async (request): Promise<SnapshotBatchPriceResult> => {
        const failure = failures.get(request.id);
        if (failure) return { id: request.id, price: null, error: failure };
        try {
          return {
            id: request.id,
            price: await this.getPrice(request.symbol, Blockchain.MONAD, { signal }),
            error: null,
          };
        } catch (error) {
          return {
            id: request.id,
            price: null,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      })
    );
  }

  clearCache(): void {
    this.cache.stopCleanupInterval();
    this.cache.clear();
    this.cache.startCleanupInterval();
  }

  /**
   * DB-first symbol support, overriding the base class's curated static-list
   * check. RedStone symbols are case-sensitive (e.g. `etrUSD_FUNDAMENTAL`),
   * and the active-feed registry is the authoritative source — discovery upserts
   * feeds (including mixed-case ones) that are absent from the all-uppercase
   * static list. Without this, `resolveProvidersForSymbol` would exclude
   * RedStone for any symbol not in the static list, so it would never be fetched
   * or counted as a provider in consensus / pre-trade quorum.
   *
   * Reads the warm in-memory feed cache synchronously (no async DB call, since
   * this is a sync method) and falls back to the curated static list — and its
   * chain check — when the cache is cold.
   */
  override isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    if (chain === Blockchain.MONAD) return resolveRedStoneMonadFeed(symbol) !== null;

    const apiSupportsSymbol = this.isApiSymbolSupported(symbol);
    if (chain === undefined) {
      return apiSupportsSymbol || resolveRedStoneMonadFeed(symbol) !== null;
    }
    return apiSupportsSymbol && REDSTONE_API_CHAINS.includes(chain);
  }

  override getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const chains: Blockchain[] = [];
    if (this.isApiSymbolSupported(symbol)) chains.push(...REDSTONE_API_CHAINS);
    if (resolveRedStoneMonadFeed(symbol)) chains.push(Blockchain.MONAD);
    return chains;
  }

  private isApiSymbolSupported(symbol: string): boolean {
    if (isSymbolActiveInCacheSync('redstone', symbol)) return true;
    const upperSymbol = symbol.toUpperCase();
    return redstoneSymbols.includes(upperSymbol as (typeof redstoneSymbols)[number]);
  }

  override destroy(): void {
    this.cache.destroy();
  }

  async isSymbolSupportedAsync(symbol: string): Promise<boolean> {
    return (
      resolveRedStoneMonadFeed(symbol) !== null || (await isRedStoneSymbolSupportedAsync(symbol))
    );
  }

  async getTokenOnChainData(symbol: string): Promise<RedStoneTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.cache.get<RedStoneTokenOnChainData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const priceData = await this.fetchRealPrice(symbol);
      if (!priceData) {
        return null;
      }

      const dataAge = resolveOracleAgeSeconds(priceData);

      const onChainData: RedStoneTokenOnChainData = {
        symbol,
        price: priceData.price,
        decimals: priceData.decimals || 8,
        bid: priceData.confidenceInterval?.bid || null,
        ask: priceData.confidenceInterval?.ask || null,
        spreadPercentage: priceData.confidenceInterval?.widthPercentage || null,
        supportedChainsCount: this.supportedChains.length,
        updateIntervalMinutes: this.defaultUpdateIntervalMinutes,
        provider: priceData.source || 'redstone',
        dataAge,
        lastUpdated: priceData.timestamp,
      };

      this.cache.set(cacheKey, onChainData, 60000);
      return onChainData;
    } catch (error) {
      logger.error(`Failed to get on-chain data for ${symbol}`, normalizeError(error));
      return null;
    }
  }
}

export type { RedStoneTokenOnChainData };
