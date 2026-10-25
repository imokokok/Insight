import { BaseOracleClient } from '@/lib/oracles/base';
import {
  STORK_MONAD_CHAIN_ID,
  STORK_MONAD_CONTRACT_ADDRESS,
  STORK_MONAD_PUSHED_FEEDS,
  resolveStorkMonadFeed,
} from '@/lib/oracles/constants/storkMonad';
import { storkMonadOnChainService } from '@/lib/oracles/services/storkMonadOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import {
  type SnapshotBatchPriceRequest,
  type SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

const STORK_MONAD_RELIABILITY = 0.9;

/**
 * Monad pushed-feed integration. It is deliberately observation-only until a
 * sustained live comparison and source-overlap review approve it for quorum.
 */
export class StorkMonadClient extends BaseOracleClient {
  name = OracleProvider.STORK;
  supportedChains = [Blockchain.MONAD];
  protected defaultChain = Blockchain.MONAD;
  protected supportedSymbolsList = STORK_MONAD_PUSHED_FEEDS.map((feed) => feed.alias);

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

    const feed = resolveStorkMonadFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, targetChain);

    try {
      const reading = await withOracleRetry(
        () => storkMonadOnChainService.getPrice(feed, options?.signal),
        'stork-monad:getPrice',
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
        decimals: 18,
        // Stork's safe EVM getter attests timestamp/value freshness but does
        // not publish a statistical interval. Do not manufacture a confidence
        // number that downstream quality metrics could mistake for evidence.
        source: `Stork pushed feed on Monad:${feed.assetId}`,
        priceId: reading.encodedAssetId,
        feedId: reading.encodedAssetId,
        dataAge,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        // This remains visible and monitored, but it must not manufacture a
        // third strict-quorum participant before its source-overlap review and
        // shadow period are explicitly approved.
        countsTowardOracleQuorum: false,
        signalVector: buildSignalVector({
          dataAgeSeconds: dataAge,
          isOnChain: true,
          hasVerification: true,
          providerUptime: STORK_MONAD_RELIABILITY * 100,
          hasConfidence: false,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'getTemporalNumericValueV1(bytes32)+freshness-gate',
        }),
        verification: {
          ...buildEvmVerification(
            STORK_MONAD_CONTRACT_ADDRESS,
            STORK_MONAD_CHAIN_ID,
            'getTemporalNumericValueV1(bytes32)+freshness-gate'
          ),
          feedHash: reading.encodedAssetId,
          rawValue: reading.quantizedValue.toString(),
          sourceTimestamp: reading.sourceTimestamp,
          sourceTimestampNs: reading.timestampNs.toString(),
          valueExponent: -18,
          assetId: reading.assetId,
        },
      };
      return this.validatePriceData(data, 'stork-monad:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Stork pushed feed on Monad', 'STORK_PRICE_ERROR');
    }
  }

  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    const feeds = new Map<string, (typeof STORK_MONAD_PUSHED_FEEDS)[number]>();
    const failures = new Map<string, Error>();
    for (const request of requests) {
      const feed =
        request.chain === Blockchain.MONAD ? resolveStorkMonadFeed(request.symbol) : null;
      if (feed) feeds.set(feed.encodedAssetId.toLowerCase(), feed);
      else
        failures.set(request.id, new Error(`No reviewed Stork Monad feed for ${request.symbol}`));
    }
    if (feeds.size > 0) {
      try {
        await withOracleRetry(
          () => storkMonadOnChainService.getPrices([...feeds.values()], signal),
          'stork-monad:snapshot-batch',
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
      (chain === undefined || chain === Blockchain.MONAD) && resolveStorkMonadFeed(symbol) !== null
    );
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    return resolveStorkMonadFeed(symbol) ? [Blockchain.MONAD] : [];
  }
}
