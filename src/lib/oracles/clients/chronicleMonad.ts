import { BaseOracleClient } from '@/lib/oracles/base';
import {
  CHRONICLE_MONAD_CHAIN_ID,
  CHRONICLE_MONAD_PRICE_FEEDS,
  resolveChronicleMonadFeed,
} from '@/lib/oracles/constants/chronicleMonad';
import { chronicleMonadOnChainService } from '@/lib/oracles/services/chronicleMonadOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import {
  type SnapshotBatchPriceRequest,
  type SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

const CHRONICLE_MONAD_RELIABILITY = 0.9;

/**
 * Chronicle's direct Monad push feeds. The source is collected as an
 * independently-verifiable on-chain observation, but remains shadow-only until
 * its source-overlap and sustained comparison review permits strict quorum use.
 */
export class ChronicleMonadClient extends BaseOracleClient {
  name = OracleProvider.CHRONICLE;
  supportedChains = [Blockchain.MONAD];
  protected defaultChain = Blockchain.MONAD;
  protected supportedSymbolsList = CHRONICLE_MONAD_PRICE_FEEDS.map((feed) => feed.alias);

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);
    const targetChain = chain ?? this.defaultChain;
    if (targetChain !== Blockchain.MONAD) {
      throw this.createUnsupportedSymbolError(symbol, targetChain);
    }

    const feed = resolveChronicleMonadFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, targetChain);

    try {
      const reading = await withOracleRetry(
        () => chronicleMonadOnChainService.getPrice(feed, options?.signal),
        'chronicle-monad:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        options?.signal
      );
      const dataAge = Math.max(0, Math.floor(Date.now() / 1000) - reading.sourceTimestamp);
      const data: PriceData = {
        provider: this.name,
        chain: Blockchain.MONAD,
        symbol: feed.alias,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: reading.decimals,
        source: `Chronicle push feed on Monad:${feed.feedName}`,
        priceId: feed.address,
        feedId: feed.address,
        dataAge,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        countsTowardOracleQuorum: false,
        signalVector: buildSignalVector({
          dataAgeSeconds: dataAge,
          isOnChain: true,
          hasVerification: true,
          providerUptime: CHRONICLE_MONAD_RELIABILITY * 100,
          hasConfidence: false,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'readWithAge()+freshness-gate',
        }),
        verification: {
          ...buildEvmVerification(
            feed.address,
            CHRONICLE_MONAD_CHAIN_ID,
            'readWithAge()+freshness-gate'
          ),
          rawValue: reading.rawValue.toString(),
          sourceTimestamp: reading.sourceTimestamp,
          valueExponent: -reading.decimals,
          assetId: feed.feedName,
        },
      };
      return this.validatePriceData(data, 'chronicle-monad:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Chronicle push feed on Monad', 'CHRONICLE_ERROR');
    }
  }

  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    const feeds = new Map<string, (typeof CHRONICLE_MONAD_PRICE_FEEDS)[number]>();
    const failures = new Map<string, Error>();
    for (const request of requests) {
      const feed =
        request.chain === Blockchain.MONAD ? resolveChronicleMonadFeed(request.symbol) : null;
      if (feed) feeds.set(feed.address.toLowerCase(), feed);
      else
        failures.set(
          request.id,
          new Error(`No reviewed Chronicle Monad feed for ${request.symbol}`)
        );
    }
    if (feeds.size > 0) {
      try {
        await withOracleRetry(
          () => chronicleMonadOnChainService.getPrices([...feeds.values()], signal),
          'chronicle-monad:snapshot-batch',
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

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    return (
      (chain === undefined || chain === Blockchain.MONAD) &&
      resolveChronicleMonadFeed(symbol) !== null
    );
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    return resolveChronicleMonadFeed(symbol) ? [Blockchain.MONAD] : [];
  }
}
