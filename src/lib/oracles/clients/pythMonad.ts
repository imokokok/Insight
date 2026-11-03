import { BaseOracleClient } from '@/lib/oracles/base';
import {
  PYTH_MONAD_CHAIN_ID,
  PYTH_MONAD_CORE_ADDRESS,
  PYTH_MONAD_SPONSORED_FEEDS,
  resolvePythMonadFeed,
} from '@/lib/oracles/constants/pythMonad';
import { pythMonadOnChainService } from '@/lib/oracles/services/pythMonadOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { roundTo } from '@/lib/utils/format';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

const PYTH_MONAD_RELIABILITY = 0.93;

function confidenceScore(confidenceRatio: number): number {
  // Pyth's `conf` is an absolute interval, not a probability. This is an
  // explicitly calculated quality signal that falls as the interval widens.
  return roundTo(Math.max(0, Math.min(1, 1 - confidenceRatio * 20)), 4);
}

export class PythMonadClient extends BaseOracleClient {
  name = OracleProvider.PYTH;
  supportedChains = [Blockchain.MONAD];
  protected defaultChain = Blockchain.MONAD;
  protected supportedSymbolsList = PYTH_MONAD_SPONSORED_FEEDS.map((feed) => feed.alias);

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);
    const targetChain = chain ?? this.defaultChain;
    if (targetChain !== Blockchain.MONAD)
      throw this.createUnsupportedSymbolError(symbol, targetChain);

    const feed = resolvePythMonadFeed(symbol);
    if (!feed) throw this.createUnsupportedSymbolError(symbol, targetChain);

    try {
      const reading = await withOracleRetry(
        () => pythMonadOnChainService.getPrice(feed, options?.signal),
        'pyth-monad:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        options?.signal
      );
      const intervalWidthPercentage = reading.confidenceRatio * 200;
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
          widthPercentage: intervalWidthPercentage,
        },
        source: `Pyth Core Monad:${feed.alias}`,
        priceId: reading.feedId,
        feedId: reading.feedId,
        exponent: reading.exponent,
        conf: reading.conf,
        publishTime: reading.publishTime,
        dataAge: Math.max(0, Math.floor(Date.now() / 1000) - reading.publishTime),
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        signalVector: buildSignalVector({
          dataAgeSeconds: Math.max(0, Math.floor(Date.now() / 1000) - reading.publishTime),
          isOnChain: true,
          hasVerification: true,
          providerUptime: PYTH_MONAD_RELIABILITY * 100,
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

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    return (
      (chain === undefined || chain === Blockchain.MONAD) && resolvePythMonadFeed(symbol) !== null
    );
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    return resolvePythMonadFeed(symbol) ? [Blockchain.MONAD] : [];
  }
}
