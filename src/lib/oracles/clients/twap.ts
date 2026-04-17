import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import {
  TWAP_POOL_ADDRESSES,
  BLOCKCHAIN_TO_CHAIN_ID,
  twapSymbols,
} from '@/lib/oracles/constants/twapConstants';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, OracleError } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const _logger = createLogger('TWAPClient');

const TWAP_QUALITY_CONFIG = {
  chainReliability: {
    [Blockchain.ETHEREUM]: 0.99,
    [Blockchain.ARBITRUM]: 0.98,
    [Blockchain.OPTIMISM]: 0.98,
    [Blockchain.POLYGON]: 0.97,
    [Blockchain.BASE]: 0.97,
    [Blockchain.BNB_CHAIN]: 0.95,
  } as Record<string, number>,
  defaultConfidence: 0.95,
  minConfidence: 0.85,
};

export class TWAPClient extends BaseOracleClient {
  name = OracleProvider.TWAP;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
  ];
  defaultUpdateIntervalMinutes = 1;
  private useRealData: boolean;

  constructor(config?: OracleClientConfig & { useRealData?: boolean }) {
    super(config);
    this.useRealData = config?.useRealData ?? true;
  }

  private getChainId(chain?: Blockchain): number {
    return BLOCKCHAIN_TO_CHAIN_ID[chain || Blockchain.ETHEREUM] || 1;
  }

  protected getHistoricalPriceConfidence(chain?: Blockchain): number {
    const chainRel = TWAP_QUALITY_CONFIG.chainReliability[chain || Blockchain.ETHEREUM] || 0.95;
    return Math.min(0.99, Math.max(TWAP_QUALITY_CONFIG.minConfidence, chainRel));
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();
    const chainId = this.getChainId(chain);

    if (!this.isSymbolSupported(upperSymbol, chain)) {
      throw this.createUnsupportedSymbolError(upperSymbol, chain);
    }

    if (!this.useRealData) {
      throw this.createError(
        'Real TWAP data is required but useRealData is disabled',
        'REAL_DATA_NOT_AVAILABLE'
      );
    }

    try {
      const twapData = await withOracleRetry(
        () => twapOnChainService.getTwapPrice(upperSymbol, chainId, 1800, options?.signal),
        `twap-getPrice-${upperSymbol}`,
        { ...ORACLE_RETRY_PRESETS.standard, timeout: 15000 }
      );

      if (!twapData.twapPrice || twapData.twapPrice <= 0) {
        throw this.createNoDataError(upperSymbol, chain, 'TWAP price is zero or negative');
      }

      if (!Number.isFinite(twapData.twapPrice)) {
        throw this.createNoDataError(upperSymbol, chain, 'TWAP price is not a finite number');
      }

      return {
        provider: OracleProvider.TWAP,
        symbol: upperSymbol,
        price: twapData.twapPrice,
        timestamp: twapData.timestamp,
        chain: chain || Blockchain.ETHEREUM,
        decimals: 8,
        confidence: twapData.confidence,
        source: 'twap-oracle',
        dataSource: 'real',
        poolAddress: twapData.poolAddress,
        feeTier: twapData.feeTier,
        sqrtPriceX96: twapData.sqrtPriceX96.toString(),
        tick: twapData.tick,
        twapInterval: twapData.twapInterval,
        twapPrice: twapData.twapPrice,
        spotPrice: twapData.spotPrice,
        liquidity: twapData.liquidity.toString(),
      };
    } catch (error) {
      if (error instanceof OracleError) throw error;
      throw this.createProviderError(
        `Failed to fetch TWAP price for ${upperSymbol}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
        { retryable: true, code: 'TWAP_ERROR' }
      );
    }
  }

  getSupportedSymbols(): string[] {
    return [...twapSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();
    if (!twapSymbols.includes(upperSymbol as (typeof twapSymbols)[number])) return false;
    if (chain !== undefined) {
      const chainId = this.getChainId(chain);
      const poolConfig = TWAP_POOL_ADDRESSES[upperSymbol];
      return !!poolConfig && !!poolConfig[chainId];
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const upperSymbol = symbol.toUpperCase();
    const poolConfig = TWAP_POOL_ADDRESSES[upperSymbol];
    if (!poolConfig) return [];
    return this.supportedChains.filter((chain) => {
      const chainId = this.getChainId(chain);
      return !!poolConfig[chainId];
    });
  }
}
