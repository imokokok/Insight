import { BaseOracleClient } from '@/lib/oracles/base';
import {
  PYTH_HYPEREVM_CHAIN_ID,
  PYTH_HYPEREVM_CORE_ADDRESS,
  PYTH_HYPEREVM_SPONSORED_FEEDS,
  resolvePythHyperEvmFeed,
} from '@/lib/oracles/constants/pythHyperEvm';
import {
  PYTH_MONAD_CHAIN_ID,
  PYTH_MONAD_CORE_ADDRESS,
  PYTH_MONAD_SPONSORED_FEEDS,
  resolvePythMonadFeed,
} from '@/lib/oracles/constants/pythMonad';
import {
  PYTH_SOLANA_SPONSORED_FEEDS,
  resolvePythSolanaFeed,
} from '@/lib/oracles/constants/pythSolana';
import { pythHyperEvmOnChainService } from '@/lib/oracles/services/pythHyperEvmOnChainService';
import { pythMonadOnChainService } from '@/lib/oracles/services/pythMonadOnChainService';
import { pythSolanaOnChainService } from '@/lib/oracles/services/pythSolanaOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import {
  type SnapshotBatchPriceRequest,
  type SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { roundTo } from '@/lib/utils/format';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

const PYTH_RELIABILITY = 0.93;

function confidenceScore(confidenceRatio: number): number {
  // Pyth's `conf` is an absolute interval, not a probability. This is an
  // explicitly calculated quality signal that falls as the interval widens.
  return roundTo(Math.max(0, Math.min(1, 1 - confidenceRatio * 20)), 4);
}

function solanaVerification(
  reading: Awaited<ReturnType<typeof pythSolanaOnChainService.getPrice>>
) {
  return {
    type: 'on-chain' as const,
    // This is the concrete, derived price-feed account, not a generic HTTP source.
    contractAddress: reading.accountAddress,
    chainId: 0,
    explorerUrl: `https://solscan.io/account/${reading.accountAddress}`,
    method: 'getMultipleAccounts(base64)+PriceUpdateV2+PDA/owner/feed/freshness gates',
    blockNumber: reading.observationSlot,
    feedHash: reading.feedId,
    rawValue: reading.price.toString(),
    sourceTimestamp: reading.publishTime,
    valueExponent: reading.exponent,
    rawConfidence: reading.conf,
    assetId: reading.accountDataHash,
  };
}

/** Native Pyth Core reader for the reviewed Monad and Solana sponsored registries. */
export class PythClient extends BaseOracleClient {
  name = OracleProvider.PYTH;
  supportedChains = [Blockchain.MONAD, Blockchain.SOLANA];
  protected defaultChain = Blockchain.MONAD;
  protected supportedSymbolsList = [
    ...new Set([
      ...PYTH_MONAD_SPONSORED_FEEDS.map((feed) => feed.alias),
      ...PYTH_SOLANA_SPONSORED_FEEDS.map((feed) => feed.alias),
    ]),
  ];

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);
    const targetChain = chain ?? this.defaultChain;
    if (targetChain === Blockchain.MONAD) return this.getMonadPrice(symbol, options?.signal);
    if (targetChain === Blockchain.SOLANA) return this.getSolanaPrice(symbol, options?.signal);
    throw this.createUnsupportedSymbolError(symbol, targetChain);
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    if (chain === Blockchain.MONAD) return resolvePythMonadFeed(symbol) !== null;
    if (chain === Blockchain.SOLANA) return resolvePythSolanaFeed(symbol) !== null;
    return resolvePythMonadFeed(symbol) !== null || resolvePythSolanaFeed(symbol) !== null;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const chains: Blockchain[] = [];
    if (resolvePythMonadFeed(symbol)) chains.push(Blockchain.MONAD);
    if (resolvePythSolanaFeed(symbol)) chains.push(Blockchain.SOLANA);
    return chains;
  }

  /**
   * Collector-only batch path for the reviewed Monad and Solana registries.
   * Successful batch observations retain every normal decoder and validation
   * gate; only missing or rejected entries retry through the single-feed path.
   */
  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    if (requests.length === 0) return [];
    const failures = new Map<string, Error>();
    const monad = new Map<string, (typeof PYTH_MONAD_SPONSORED_FEEDS)[number]>();
    const solana = new Map<string, (typeof PYTH_SOLANA_SPONSORED_FEEDS)[number]>();

    for (const request of requests) {
      if (request.chain === Blockchain.MONAD) {
        const feed = resolvePythMonadFeed(request.symbol);
        if (feed) monad.set(request.id, feed);
        else
          failures.set(request.id, new Error(`No reviewed Pyth Monad feed for ${request.symbol}`));
      } else if (request.chain === Blockchain.SOLANA) {
        const feed = resolvePythSolanaFeed(request.symbol);
        if (feed) solana.set(request.id, feed);
        else
          failures.set(request.id, new Error(`No reviewed Pyth Solana feed for ${request.symbol}`));
      } else {
        failures.set(
          request.id,
          new Error(`Pyth snapshot batch does not support ${request.chain}`)
        );
      }
    }

    if (monad.size > 0) {
      try {
        await withOracleRetry(
          () => pythMonadOnChainService.getPrices([...monad.values()], signal),
          'pyth-monad:snapshot-batch',
          ORACLE_RETRY_PRESETS.standard,
          signal
        );
      } catch {
        // Each request below uses the established individual retry path.
      }
    }

    const solanaReadings = new Map<
      string,
      Awaited<ReturnType<typeof pythSolanaOnChainService.getPrice>>
    >();
    if (solana.size > 0) {
      try {
        const feeds = [...solana.values()];
        for (let offset = 0; offset < feeds.length; offset += 100) {
          const readings = await withOracleRetry(
            () => pythSolanaOnChainService.getPrices(feeds.slice(offset, offset + 100), signal),
            'pyth-solana:snapshot-batch',
            ORACLE_RETRY_PRESETS.standard,
            signal
          );
          for (const reading of readings) solanaReadings.set(reading.feedId.slice(2), reading);
        }
      } catch {
        // A fallback per request preserves current availability semantics.
      }
    }

    return Promise.all(
      requests.map(async (request): Promise<SnapshotBatchPriceResult> => {
        const initialFailure = failures.get(request.id);
        if (initialFailure) return { id: request.id, price: null, error: initialFailure };
        try {
          if (request.chain === Blockchain.SOLANA) {
            const feed = solana.get(request.id)!;
            const reading = solanaReadings.get(feed.id);
            return {
              id: request.id,
              price: reading
                ? this.toSolanaPriceData(reading)
                : await this.getSolanaPrice(request.symbol, signal),
              error: null,
            };
          }
          return {
            id: request.id,
            // getPrices() primed the short, freshness-bounded Monad cache;
            // this preserves the existing conversion and validation boundary.
            price: await this.getMonadPrice(request.symbol, signal),
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

  private async getMonadPrice(symbol: string, signal?: AbortSignal): Promise<PriceData> {
    const feed = resolvePythMonadFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, Blockchain.MONAD);
    try {
      const reading = await withOracleRetry(
        () => pythMonadOnChainService.getPrice(feed, signal),
        'pyth-monad:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );
      const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000) - reading.publishTime);
      const data: PriceData = {
        provider: this.name,
        chain: Blockchain.MONAD,
        symbol: feed.alias,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: Math.max(0, -reading.exponent),
        confidence: confidenceScore(reading.confidenceRatio),
        confidenceSource: 'calculated',
        confidenceInterval: {
          bid: reading.price - reading.conf,
          ask: reading.price + reading.conf,
          widthPercentage: reading.confidenceRatio * 200,
        },
        source: `Pyth Core Monad:${feed.alias}`,
        priceId: reading.feedId,
        feedId: reading.feedId,
        exponent: reading.exponent,
        conf: reading.conf,
        publishTime: reading.publishTime,
        dataAge: ageSeconds,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        signalVector: buildSignalVector({
          dataAgeSeconds: ageSeconds,
          isOnChain: true,
          hasVerification: true,
          providerUptime: PYTH_RELIABILITY * 100,
          hasConfidence: true,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'getPriceUnsafe+freshness-gate',
        }),
        verification: {
          ...buildEvmVerification(
            PYTH_MONAD_CORE_ADDRESS,
            PYTH_MONAD_CHAIN_ID,
            'getPriceUnsafe(bytes32)+freshness-gate'
          ),
          feedHash: reading.feedId,
          rawValue: reading.price.toString(),
          sourceTimestamp: reading.publishTime,
          valueExponent: reading.exponent,
          rawConfidence: reading.conf,
        },
      };
      return this.validatePriceData(data, 'pyth-monad:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Pyth Core on Monad', 'PYTH_PRICE_ERROR');
    }
  }

  private async getSolanaPrice(symbol: string, signal?: AbortSignal): Promise<PriceData> {
    const feed = resolvePythSolanaFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, Blockchain.SOLANA);
    try {
      const reading = await withOracleRetry(
        () => pythSolanaOnChainService.getPrice(feed, signal),
        'pyth-solana:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );
      return this.toSolanaPriceData(reading);
    } catch (error) {
      this.handleGetPriceError(error, 'Pyth Core on Solana', 'PYTH_PRICE_ERROR');
    }
  }

  private toSolanaPriceData(
    reading: Awaited<ReturnType<typeof pythSolanaOnChainService.getPrice>>
  ): PriceData {
    const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000) - reading.publishTime);
    const data: PriceData = {
      provider: this.name,
      chain: Blockchain.SOLANA,
      symbol: reading.symbol,
      price: reading.price,
      timestamp: reading.timestamp,
      decimals: Math.max(0, -reading.exponent),
      confidence: confidenceScore(reading.confidenceRatio),
      confidenceSource: 'calculated',
      confidenceInterval: {
        bid: reading.price - reading.conf,
        ask: reading.price + reading.conf,
        widthPercentage: reading.confidenceRatio * 200,
      },
      source: `Pyth Core Solana:${reading.symbol}`,
      priceId: reading.feedId,
      feedId: reading.feedId,
      exponent: reading.exponent,
      conf: reading.conf,
      publishTime: reading.publishTime,
      dataAge: ageSeconds,
      dataSource: 'real',
      ingestionTimestamp: Date.now(),
      failureMode: FailureMode.NONE,
      signalVector: buildSignalVector({
        dataAgeSeconds: ageSeconds,
        isOnChain: true,
        hasVerification: true,
        providerUptime: PYTH_RELIABILITY * 100,
        hasConfidence: true,
        hasTimestamp: true,
        hasDecimals: true,
        hasSource: true,
        verificationMethod: 'getMultipleAccounts+PDA/owner/feed/freshness gates',
      }),
      verification: solanaVerification(reading),
    };
    return this.validatePriceData(data, 'pyth-solana:getPrice');
  }
}

/** Production Pyth client that adds HyperEVM while retaining Monad and Solana paths. */
export class PythMultiChainClient extends PythClient {
  supportedChains = [Blockchain.MONAD, Blockchain.SOLANA, Blockchain.HYPEREVM];
  protected supportedSymbolsList = [
    ...new Set([
      ...PYTH_MONAD_SPONSORED_FEEDS.map((feed) => feed.alias),
      ...PYTH_SOLANA_SPONSORED_FEEDS.map((feed) => feed.alias),
      ...PYTH_HYPEREVM_SPONSORED_FEEDS.map((feed) => feed.alias),
    ]),
  ];

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    if (chain !== Blockchain.HYPEREVM) return super.getPrice(symbol, chain, options);
    this.validateGetPriceParams(symbol, options);
    const feed = resolvePythHyperEvmFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, chain);
    try {
      const reading = await withOracleRetry(
        () => pythHyperEvmOnChainService.getPrice(feed, options?.signal),
        'pyth-hyperevm:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        options?.signal
      );
      const dataAge = Math.max(0, Math.floor(Date.now() / 1000) - reading.publishTime);
      const data: PriceData = {
        provider: this.name,
        chain: Blockchain.HYPEREVM,
        symbol: feed.alias,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: Math.max(0, -reading.exponent),
        confidence: confidenceScore(reading.confidenceRatio),
        confidenceSource: 'calculated',
        confidenceInterval: {
          bid: reading.price - reading.confidence,
          ask: reading.price + reading.confidence,
          widthPercentage: reading.confidenceRatio * 200,
        },
        source: `Pyth Core HyperEVM:${feed.alias}`,
        priceId: reading.feedId,
        feedId: reading.feedId,
        exponent: reading.exponent,
        conf: reading.confidence,
        publishTime: reading.publishTime,
        dataAge,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        countsTowardOracleQuorum: false,
        signalVector: buildSignalVector({
          dataAgeSeconds: dataAge,
          isOnChain: true,
          hasVerification: true,
          providerUptime: PYTH_RELIABILITY * 100,
          hasConfidence: true,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'getPriceUnsafe+freshness-and-confidence-gates',
        }),
        verification: {
          ...buildEvmVerification(
            PYTH_HYPEREVM_CORE_ADDRESS,
            PYTH_HYPEREVM_CHAIN_ID,
            'getPriceUnsafe(bytes32)+freshness-and-confidence-gates'
          ),
          feedHash: reading.feedId,
          rawValue: reading.rawPrice,
          sourceTimestamp: reading.publishTime,
          valueExponent: reading.exponent,
          rawConfidenceRaw: reading.rawConfidence,
          maxStalenessSeconds: reading.maxAgeSeconds,
          priceDeviationPercent: feed.priceDeviationPercent,
          quoteType: feed.quoteType,
        },
      };
      return this.validatePriceData(data, 'pyth-hyperevm:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Pyth Core on HyperEVM', 'PYTH_PRICE_ERROR');
    }
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    if (chain === Blockchain.HYPEREVM) return resolvePythHyperEvmFeed(symbol) !== null;
    if (chain === undefined && resolvePythHyperEvmFeed(symbol)) return true;
    return super.isSymbolSupported(symbol, chain);
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const chains = super.getSupportedChainsForSymbol(symbol);
    if (resolvePythHyperEvmFeed(symbol)) chains.push(Blockchain.HYPEREVM);
    return chains;
  }

  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    const standardRequests = requests.filter((request) => request.chain !== Blockchain.HYPEREVM);
    const hyperRequests = requests.filter((request) => request.chain === Blockchain.HYPEREVM);
    const results = new Map(
      (await super.getSnapshotPricesBatch(standardRequests, signal)).map((result) => [
        result.id,
        result,
      ])
    );
    const feedsByRequest = new Map(
      hyperRequests.map((request) => [request.id, resolvePythHyperEvmFeed(request.symbol)])
    );
    const feeds = [
      ...new Map(
        [...feedsByRequest.values()]
          .filter((feed): feed is NonNullable<typeof feed> => feed !== null)
          .map((feed) => [feed.alias, feed])
      ).values(),
    ];
    const readings = await pythHyperEvmOnChainService.getPrices(feeds, signal);
    const readingsByAlias = new Map(readings.map((reading) => [reading.alias, reading]));

    await Promise.all(
      hyperRequests.map(async (request) => {
        const feed = feedsByRequest.get(request.id);
        if (!feed) {
          results.set(request.id, {
            id: request.id,
            price: null,
            error: new Error(`No reviewed Pyth HyperEVM feed for ${request.symbol}`),
          });
          return;
        }
        try {
          // The batch read primes the freshness-bounded cache. The common
          // converter still validates and emits the same evidence fields.
          const reading = readingsByAlias.get(feed.alias);
          const price = reading
            ? await this.getPrice(feed.alias, Blockchain.HYPEREVM, { signal })
            : await this.getPrice(request.symbol, Blockchain.HYPEREVM, { signal });
          results.set(request.id, { id: request.id, price, error: null });
        } catch (error) {
          results.set(request.id, {
            id: request.id,
            price: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      })
    );

    return requests.map(
      (request) =>
        results.get(request.id) ?? {
          id: request.id,
          price: null,
          error: new Error('Pyth batch request was not resolved'),
        }
    );
  }
}
