import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import {
  isPriceFeedSupported,
  getChainlinkPriceFeed,
} from '@/lib/oracles/services/chainlinkDataSources';
import {
  chainlinkOnChainService,
  type ChainlinkPriceData,
} from '@/lib/oracles/services/chainlinkOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

const logger = createLogger('ChainlinkClient');

const CHAINLINK_QUALITY_CONFIG = {
  chainReliability: {
    [Blockchain.ETHEREUM]: 0.99,
    [Blockchain.ARBITRUM]: 0.98,
    [Blockchain.OPTIMISM]: 0.98,
    [Blockchain.POLYGON]: 0.97,
    [Blockchain.AVALANCHE]: 0.96,
    [Blockchain.BNB_CHAIN]: 0.95,
    [Blockchain.BASE]: 0.97,
    [Blockchain.SOLANA]: 0.0,
    [Blockchain.FANTOM]: 0.94,
    [Blockchain.CRONOS]: 0.93,
    [Blockchain.JUNO]: 0.0,
    [Blockchain.COSMOS]: 0.0,
    [Blockchain.OSMOSIS]: 0.0,
    [Blockchain.SCROLL]: 0.95,
    [Blockchain.ZKSYNC]: 0.96,
    [Blockchain.APTOS]: 0.0,
    [Blockchain.SUI]: 0.0,
    [Blockchain.GNOSIS]: 0.94,
    [Blockchain.MANTLE]: 0.95,
    [Blockchain.LINEA]: 0.95,
    [Blockchain.CELESTIA]: 0.0,
    [Blockchain.INJECTIVE]: 0.0,
    [Blockchain.SEI]: 0.0,
    [Blockchain.TRON]: 0.0,
    [Blockchain.TON]: 0.0,
    [Blockchain.NEAR]: 0.0,
    [Blockchain.AURORA]: 0.93,
    [Blockchain.CELO]: 0.94,
    [Blockchain.STARKNET]: 0.0,
    [Blockchain.BLAST]: 0.95,
    [Blockchain.CARDANO]: 0.0,
    [Blockchain.POLKADOT]: 0.0,
    [Blockchain.KAVA]: 0.93,
    [Blockchain.MOONBEAM]: 0.92,
    [Blockchain.MOONRIVER]: 0.91,
    [Blockchain.METIS]: 0.93,
    [Blockchain.STARKEX]: 0.0,
    [Blockchain.STELLAR]: 0.0,
    [Blockchain.FLARE]: 0.0,
  } as Record<Blockchain, number>,
  defaultConfidence: 0.98,
  minConfidence: 0.9,
};

export class ChainlinkClient extends BaseOracleClient {
  name = OracleProvider.CHAINLINK;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 60;
  private useRealData: boolean;

  constructor(config?: OracleClientConfig & { useRealData?: boolean }) {
    super(config);
    this.useRealData = config?.useRealData ?? true;
  }

  private getChainId(chain?: Blockchain): number {
    if (!chain) return 1;
    const chainId = BLOCKCHAIN_TO_CHAIN_ID[chain];
    if (!chainId || chainId === 0) {
      throw this.createError(
        `Chain '${chain}' is not supported by Chainlink`,
        'SYMBOL_NOT_SUPPORTED',
        { retryable: false, details: { chain, supportedChains: this.supportedChains } }
      );
    }
    return chainId;
  }

  private calculateConfidence(chain?: Blockchain): number {
    const targetChain = chain || Blockchain.ETHEREUM;
    const chainReliability =
      CHAINLINK_QUALITY_CONFIG.chainReliability[targetChain] ??
      CHAINLINK_QUALITY_CONFIG.defaultConfidence;

    const baseConfidence = CHAINLINK_QUALITY_CONFIG.defaultConfidence;
    const adjustedConfidence = Math.max(
      CHAINLINK_QUALITY_CONFIG.minConfidence,
      chainReliability * baseConfidence
    );

    return Number(adjustedConfidence.toFixed(4));
  }

  private convertToPriceData(chainlinkData: ChainlinkPriceData, chain?: Blockchain): PriceData {
    let confidence = this.calculateConfidence(chain);

    if (chainlinkData.decimalsIsFallback) {
      confidence = Math.min(confidence, 0.45);
    }

    if (!chainlinkData.price || chainlinkData.price <= 0) {
      throw this.createError(
        `Invalid price (0 or negative) for ${chainlinkData.symbol} on ${chain || 'unknown chain'}`,
        'REAL_DATA_NOT_AVAILABLE'
      );
    }

    const roundId = chainlinkData.roundId?.toString();
    const answeredInRound = chainlinkData.answeredInRound?.toString();
    const version = chainlinkData.version?.toString();
    const startedAt = chainlinkData.startedAt;

    const chainId = this.getChainId(chain);
    const feed = getChainlinkPriceFeed(chainlinkData.symbol, chainId);

    logger.debug('Converting Chainlink data to PriceData', {
      symbol: chainlinkData.symbol,
      roundId,
      answeredInRound,
      version,
      startedAt,
      hasRoundId: !!roundId,
      hasAnsweredInRound: !!answeredInRound,
    });

    return {
      provider: this.name,
      chain: chain || Blockchain.ETHEREUM,
      symbol: chainlinkData.symbol,
      price: chainlinkData.price,
      timestamp: chainlinkData.timestamp,
      decimals: chainlinkData.decimals,
      confidence,
      change24h: 0,
      change24hPercent: 0,
      source: chainlinkData.description || `Chainlink:${chainlinkData.symbol}`,
      roundId: roundId || undefined,
      answeredInRound: answeredInRound || undefined,
      version: version || undefined,
      startedAt: startedAt || undefined,
      ingestionTimestamp: Date.now(),
      metadataFallback: chainlinkData.decimalsIsFallback || undefined,
      failureMode: chainlinkData.decimalsIsFallback
        ? FailureMode.FALLBACK_METADATA
        : FailureMode.NONE,
      signalVector: buildSignalVector({
        dataAgeSeconds: chainlinkData.timestamp
          ? Math.floor((Date.now() - chainlinkData.timestamp) / 1000)
          : 0,
        isOnChain: true,
        hasVerification: !!feed,
        providerUptime:
          (CHAINLINK_QUALITY_CONFIG.chainReliability[chain || Blockchain.ETHEREUM] ?? 0.98) * 100,
        hasConfidence: true,
        hasTimestamp: chainlinkData.timestamp > 0,
        hasDecimals: chainlinkData.decimals !== undefined,
        hasSource: !!chainlinkData.description,
        verificationMethod: 'latestRoundData',
      }),
      verification: feed
        ? buildEvmVerification(feed.address, chainId, 'latestRoundData')
        : undefined,
    };
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    const chainId = this.getChainId(chain);

    if (this.useRealData && this.isPriceFeedSupported(symbol, chain)) {
      try {
        const realData = await withOracleRetry(
          async () => {
            if (options?.signal?.aborted) {
              throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
            }
            return chainlinkOnChainService.getPrice(symbol, chainId, options?.signal);
          },
          'chainlink:getPrice',
          ORACLE_RETRY_PRESETS.standard
        );

        if (!realData) {
          throw this.createError(
            `Invalid price data from Chainlink for ${symbol} on ${chain}. The price feed may be stale or return zero.`,
            'REAL_DATA_NOT_AVAILABLE'
          );
        }
        return this.convertToPriceData(realData, chain);
      } catch (error) {
        this.handleGetPriceError(error, 'Chainlink', 'CHAINLINK_PRICE_ERROR');
      }
    }

    throw this.createError(
      `No price data available for ${symbol}. Real data is not enabled or price feed is not supported on this chain.`,
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  private isPriceFeedSupported(symbol: string, chain?: Blockchain): boolean {
    const chainId = this.getChainId(chain);
    return isPriceFeedSupported(symbol, chainId);
  }

  getSupportedSymbols(): string[] {
    return chainlinkOnChainService.getSupportedSymbols();
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    try {
      return this.isPriceFeedSupported(symbol, chain);
    } catch {
      return false;
    }
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const chainIds = chainlinkOnChainService.getSupportedChainIds(symbol);
    const chains: Blockchain[] = [];

    for (const [blockchain, chainId] of Object.entries(BLOCKCHAIN_TO_CHAIN_ID)) {
      if (chainIds.includes(chainId)) {
        chains.push(blockchain as Blockchain);
      }
    }

    return chains;
  }

  getSupportedSymbolsForChain(chain: Blockchain): string[] {
    const chainId = this.getChainId(chain);
    const allSymbols = this.getSupportedSymbols();
    return allSymbols.filter((symbol) => isPriceFeedSupported(symbol, chainId));
  }
}
