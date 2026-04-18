import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { isPriceFeedSupported } from '@/lib/oracles/services/chainlinkDataSources';
import {
  chainlinkOnChainService,
  type ChainlinkPriceData,
} from '@/lib/oracles/services/chainlinkOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, OracleError } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

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
  } as Record<Blockchain, number>,
  defaultConfidence: 0.98,
  minConfidence: 0.9,
};

const BLOCKCHAIN_TO_CHAIN_ID: Record<Blockchain, number> = {
  [Blockchain.ETHEREUM]: 1,
  [Blockchain.ARBITRUM]: 42161,
  [Blockchain.OPTIMISM]: 10,
  [Blockchain.POLYGON]: 137,
  [Blockchain.AVALANCHE]: 43114,
  [Blockchain.BNB_CHAIN]: 56,
  [Blockchain.BASE]: 8453,
  [Blockchain.SOLANA]: 0,
  [Blockchain.FANTOM]: 250,
  [Blockchain.CRONOS]: 25,
  [Blockchain.JUNO]: 0,
  [Blockchain.COSMOS]: 0,
  [Blockchain.OSMOSIS]: 0,
  [Blockchain.SCROLL]: 534352,
  [Blockchain.ZKSYNC]: 324,
  [Blockchain.APTOS]: 0,
  [Blockchain.SUI]: 0,
  [Blockchain.GNOSIS]: 100,
  [Blockchain.MANTLE]: 5000,
  [Blockchain.LINEA]: 59144,
  [Blockchain.CELESTIA]: 0,
  [Blockchain.INJECTIVE]: 0,
  [Blockchain.SEI]: 0,
  [Blockchain.TRON]: 0,
  [Blockchain.TON]: 0,
  [Blockchain.NEAR]: 0,
  [Blockchain.AURORA]: 1313161554,
  [Blockchain.CELO]: 42220,
  [Blockchain.STARKNET]: 0,
  [Blockchain.BLAST]: 81457,
  [Blockchain.CARDANO]: 0,
  [Blockchain.POLKADOT]: 0,
  [Blockchain.KAVA]: 2222,
  [Blockchain.MOONBEAM]: 1284,
  [Blockchain.MOONRIVER]: 1285,
  [Blockchain.METIS]: 1088,
  [Blockchain.STARKEX]: 0,
  [Blockchain.STELLAR]: 0,
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
  protected historicalPriceConfidence = 0.98;
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
      CHAINLINK_QUALITY_CONFIG.chainReliability[targetChain] ||
      CHAINLINK_QUALITY_CONFIG.defaultConfidence;

    const baseConfidence = CHAINLINK_QUALITY_CONFIG.defaultConfidence;
    const adjustedConfidence = Math.min(
      baseConfidence,
      Math.max(CHAINLINK_QUALITY_CONFIG.minConfidence, chainReliability * baseConfidence)
    );

    return Number(adjustedConfidence.toFixed(4));
  }

  protected onHistoricalDataError(symbol: string, error: unknown): PriceData[] {
    if (error instanceof OracleError) throw error;
    logger.error(
      `Failed to fetch historical prices for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw this.createError(
      error instanceof Error ? error.message : 'Failed to fetch historical prices from Chainlink',
      'CHAINLINK_HISTORICAL_ERROR'
    );
  }

  private convertToPriceData(chainlinkData: ChainlinkPriceData, chain?: Blockchain): PriceData {
    const confidence = this.calculateConfidence(chain);

    if (!chainlinkData.price || chainlinkData.price <= 0) {
      throw this.createError(
        `Invalid price (0 or negative) for ${chainlinkData.symbol} on ${chain || 'unknown chain'}`,
        'REAL_DATA_NOT_AVAILABLE'
      );
    }

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
      ...(chainlinkData.roundId !== undefined && {
        roundId: chainlinkData.roundId.toString(),
        answeredInRound: chainlinkData.answeredInRound.toString(),
        version: chainlinkData.version?.toString(),
        startedAt: chainlinkData.startedAt,
      }),
    };
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    if (options?.signal?.aborted) {
      throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
    }

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
        if (error instanceof OracleError) throw error;
        throw this.createError(
          error instanceof Error ? error.message : 'Failed to fetch price from Chainlink',
          'CHAINLINK_ERROR'
        );
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
    return this.isPriceFeedSupported(symbol, chain);
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
