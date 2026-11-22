import {
  STORK_OTHER_EVM_CONTRACTS,
  STORK_OTHER_EVM_PUSHED_FEEDS,
  resolveStorkOtherEvmFeed,
} from '@/lib/oracles/constants/storkOtherEvm';
import { storkOtherEvmOnChainService } from '@/lib/oracles/services/storkOtherEvmOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import {
  type SnapshotBatchPriceRequest,
  type SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { Blockchain, type PriceData } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

import { STORK_MONAD_PUSHED_FEEDS } from '../constants/storkMonad';

import { StorkMonadClient } from './storkMonad';

const STORK_RELIABILITY = 0.9;

/** Adds the reviewed BNB, Base and HyperEVM pushed feeds without changing Monad routing. */
export class StorkEvmClient extends StorkMonadClient {
  override supportedChains = [
    Blockchain.MONAD,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.HYPEREVM,
  ];
  protected override supportedSymbolsList = [
    ...STORK_MONAD_PUSHED_FEEDS.map((feed) => feed.alias),
    ...STORK_OTHER_EVM_PUSHED_FEEDS.map((feed) => feed.alias),
  ];

  override async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    const targetChain = chain ?? Blockchain.MONAD;
    if (targetChain === Blockchain.MONAD) return super.getPrice(symbol, targetChain, options);
    this.validateGetPriceParams(symbol, options);
    const feed = resolveStorkOtherEvmFeed(symbol, targetChain);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, targetChain);

    try {
      const reading = await withOracleRetry(
        () => storkOtherEvmOnChainService.getPrice(feed, options?.signal),
        'stork-evm:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        options?.signal
      );
      const contract = STORK_OTHER_EVM_CONTRACTS[targetChain];
      if (!contract) throw new Error(`Missing reviewed Stork contract for ${targetChain}`);
      const dataAge = Math.max(0, Math.floor(Date.now() / 1000) - reading.sourceTimestamp);
      const data: PriceData = {
        provider: this.name,
        chain: targetChain,
        symbol: feed.alias,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: 18,
        source: `Stork pushed feed on ${targetChain}:${feed.assetId}`,
        priceId: reading.encodedAssetId,
        feedId: reading.encodedAssetId,
        dataAge,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        countsTowardOracleQuorum: false,
        signalVector: buildSignalVector({
          dataAgeSeconds: dataAge,
          isOnChain: true,
          hasVerification: true,
          providerUptime: STORK_RELIABILITY * 100,
          hasConfidence: false,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'getTemporalNumericValueV1(bytes32)+freshness-gate',
        }),
        verification: {
          ...buildEvmVerification(
            contract.address,
            contract.chainId,
            'getTemporalNumericValueV1(bytes32)+freshness-gate'
          ),
          feedHash: reading.encodedAssetId,
          rawValue: reading.quantizedValue.toString(),
          sourceTimestamp: reading.sourceTimestamp,
          sourceTimestampNs: reading.timestampNs.toString(),
          valueExponent: -18,
          assetId: feed.assetId,
          maxStalenessSeconds: feed.maxStalenessSeconds,
          priceDeviationPercent: feed.priceDeviationPercent,
          quoteType: 'reference-rate',
          quorumStatus: 'shadow-only-reference-rate',
        },
      };
      return this.validatePriceData(data, 'stork-evm:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Stork pushed EVM feed', 'STORK_PRICE_ERROR');
    }
  }

  override async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    const monadRequests = requests.filter((request) => request.chain === Blockchain.MONAD);
    const otherRequests = requests.filter((request) => request.chain !== Blockchain.MONAD);
    const results = new Map(
      (await super.getSnapshotPricesBatch(monadRequests, signal)).map((result) => [
        result.id,
        result,
      ])
    );
    await Promise.all(
      otherRequests.map(async (request) => {
        try {
          const price = await this.getPrice(request.symbol, request.chain, { signal });
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
          error: new Error(`Stork snapshot request was not resolved: ${request.symbol}`),
        }
    );
  }

  override isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    if (chain === undefined) {
      return (
        super.isSymbolSupported(symbol) ||
        STORK_OTHER_EVM_PUSHED_FEEDS.some(
          (feed) => feed.alias.toUpperCase() === symbol.trim().toUpperCase()
        )
      );
    }
    return chain === Blockchain.MONAD
      ? super.isSymbolSupported(symbol, chain)
      : resolveStorkOtherEvmFeed(symbol, chain) !== null;
  }

  override getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const normalized = symbol.trim().toUpperCase();
    return [
      ...(super.getSupportedChainsForSymbol(normalized).includes(Blockchain.MONAD)
        ? [Blockchain.MONAD]
        : []),
      ...new Set(
        STORK_OTHER_EVM_PUSHED_FEEDS.filter((feed) => feed.alias.toUpperCase() === normalized).map(
          (feed) => feed.chain
        )
      ),
    ];
  }
}
