import { BaseOracleClient } from '@/lib/oracles/base';
import {
  STORK_MONAD_CHAIN_ID,
  STORK_MONAD_CONTRACT_ADDRESS,
  STORK_MONAD_PUSHED_FEEDS,
  resolveStorkMonadFeed,
} from '@/lib/oracles/constants/storkMonad';
import {
  STORK_OTHER_EVM_CONTRACTS,
  STORK_OTHER_EVM_PUSHED_FEEDS,
  resolveStorkOtherEvmFeed,
} from '@/lib/oracles/constants/storkOtherEvm';
import { storkMonadOnChainService } from '@/lib/oracles/services/storkMonadOnChainService';
import { storkOtherEvmOnChainService } from '@/lib/oracles/services/storkOtherEvmOnChainService';
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
  supportedChains = [Blockchain.MONAD, Blockchain.BNB_CHAIN, Blockchain.BASE, Blockchain.HYPEREVM];
  protected defaultChain = Blockchain.MONAD;
  protected supportedSymbolsList = [
    ...STORK_MONAD_PUSHED_FEEDS.map((feed) => feed.alias),
    ...STORK_OTHER_EVM_PUSHED_FEEDS.map((feed) => feed.alias),
  ];

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);
    const targetChain = chain ?? this.defaultChain;
    const isMonad = targetChain === Blockchain.MONAD;
    const feed = isMonad ? resolveStorkMonadFeed(symbol) : null;
    const otherFeed = isMonad ? null : resolveStorkOtherEvmFeed(symbol, targetChain);
    if (!feed && !otherFeed) throw this.createUnsupportedSymbolError(symbol, targetChain);

    try {
      const reading = feed
        ? await withOracleRetry(
            () => storkMonadOnChainService.getPrice(feed, options?.signal),
            'stork-monad:getPrice',
            ORACLE_RETRY_PRESETS.standard,
            options?.signal
          )
        : await withOracleRetry(
            () => storkOtherEvmOnChainService.getPrice(otherFeed!, options?.signal),
            'stork-evm:getPrice',
            ORACLE_RETRY_PRESETS.standard,
            options?.signal
          );
      const alias = feed?.alias ?? otherFeed!.alias;
      const assetId = feed?.assetId ?? otherFeed!.assetId;
      const encodedAssetId = reading.encodedAssetId;
      const maxStalenessSeconds = feed?.maxStalenessSeconds ?? otherFeed!.maxStalenessSeconds;
      const deviationPercent = feed?.priceDeviationPercent ?? otherFeed!.priceDeviationPercent;
      const contractAddress = feed
        ? STORK_MONAD_CONTRACT_ADDRESS
        : STORK_OTHER_EVM_CONTRACTS[targetChain]!.address;
      const chainId = feed ? STORK_MONAD_CHAIN_ID : otherFeed!.chainId;
      const dataAge = Math.max(0, Math.floor(Date.now() / 1000) - reading.sourceTimestamp);
      const data: PriceData = {
        provider: this.name,
        chain: targetChain,
        symbol: alias,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: 18,
        // Stork's safe EVM getter attests timestamp/value freshness but does
        // not publish a statistical interval. Do not manufacture a confidence
        // number that downstream quality metrics could mistake for evidence.
        source: `Stork pushed feed on ${targetChain}:${assetId}`,
        priceId: encodedAssetId,
        feedId: encodedAssetId,
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
            contractAddress,
            chainId,
            'getTemporalNumericValueV1(bytes32)+freshness-gate'
          ),
          feedHash: encodedAssetId,
          rawValue: reading.quantizedValue.toString(),
          sourceTimestamp: reading.sourceTimestamp,
          sourceTimestampNs: reading.timestampNs.toString(),
          valueExponent: -18,
          assetId,
          maxStalenessSeconds,
          priceDeviationPercent: deviationPercent,
          quoteType: feed?.alias.endsWith('.RR') ? 'reference-rate' : 'price',
          quorumStatus: 'shadow-only-pending-direct-price-and-source-review',
        },
      };
      return this.validatePriceData(data, 'stork-monad:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Stork pushed EVM feed', 'STORK_PRICE_ERROR');
    }
  }

  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    const feeds = new Map<string, (typeof STORK_MONAD_PUSHED_FEEDS)[number]>();
    for (const request of requests) {
      const feed =
        request.chain === Blockchain.MONAD ? resolveStorkMonadFeed(request.symbol) : null;
      if (feed) feeds.set(feed.encodedAssetId.toLowerCase(), feed);
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
        try {
          const price = await this.getPrice(request.symbol, request.chain, { signal });
          return { id: request.id, price, error: null };
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
    if (chain === undefined) {
      return (
        resolveStorkMonadFeed(symbol) !== null ||
        STORK_OTHER_EVM_PUSHED_FEEDS.some(
          (feed) => feed.alias.toUpperCase() === symbol.trim().toUpperCase()
        )
      );
    }
    return chain === Blockchain.MONAD
      ? resolveStorkMonadFeed(symbol) !== null
      : resolveStorkOtherEvmFeed(symbol, chain) !== null;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const normalized = symbol.trim().toUpperCase();
    return [
      ...(resolveStorkMonadFeed(normalized) ? [Blockchain.MONAD] : []),
      ...new Set(
        STORK_OTHER_EVM_PUSHED_FEEDS.filter((feed) => feed.alias.toUpperCase() === normalized).map(
          (feed) => feed.chain
        )
      ),
    ];
  }
}
