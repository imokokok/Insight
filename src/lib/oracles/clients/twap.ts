import { BaseOracleClient } from '@/lib/oracles/base';
import {
  TWAP_POOL_ADDRESSES,
  BLOCKCHAIN_TO_CHAIN_ID,
  twapSymbols,
} from '@/lib/oracles/constants/twapConstants';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import {
  type SnapshotBatchPriceRequest,
  type SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { OracleProvider, Blockchain, OracleServiceError } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

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
  private getChainId(chain?: Blockchain): number {
    return BLOCKCHAIN_TO_CHAIN_ID[chain || Blockchain.ETHEREUM] || 1;
  }

  private toPriceData(
    symbol: string,
    chain: Blockchain | undefined,
    twapData: Awaited<ReturnType<typeof twapOnChainService.getTwapPrice>>,
    context: string
  ): PriceData {
    if (!twapData.twapPrice || twapData.twapPrice <= 0) {
      throw this.createNoDataError(symbol, chain, 'TWAP price is zero or negative');
    }
    if (!Number.isFinite(twapData.twapPrice)) {
      throw this.createNoDataError(symbol, chain, 'TWAP price is not a finite number');
    }
    const chainId = this.getChainId(chain);
    return this.validatePriceData(
      {
        provider: OracleProvider.TWAP,
        symbol,
        price: twapData.twapPrice,
        timestamp: twapData.timestamp,
        chain: chain || Blockchain.ETHEREUM,
        decimals: 8,
        confidence: twapData.confidence,
        source: 'twap-oracle',
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        poolAddress: twapData.poolAddress,
        feeTier: twapData.feeTier,
        sqrtPriceX96: twapData.sqrtPriceX96.toString(),
        tick: twapData.tick,
        twapInterval: twapData.twapInterval,
        twapPrice: twapData.twapPrice,
        spotPrice: twapData.spotPrice,
        liquidity: twapData.liquidity.toString(),
        verification: twapData.poolAddress
          ? buildEvmVerification(twapData.poolAddress, chainId, 'observe')
          : undefined,
      },
      context
    );
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

    try {
      const twapData = await withOracleRetry(
        () => twapOnChainService.getTwapPrice(upperSymbol, chainId, 1800, options?.signal),
        `twap-getPrice-${upperSymbol}`,
        { ...ORACLE_RETRY_PRESETS.standard, timeout: 15000 }
      );

      return this.toPriceData(upperSymbol, chain, twapData, 'getPrice');
    } catch (error) {
      if (error instanceof OracleServiceError) throw error;
      throw this.createProviderError(
        `Failed to fetch TWAP price for ${upperSymbol}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
        { retryable: true, code: 'TWAP_ERROR' }
      );
    }
  }

  /** See ChainlinkClient's equivalent: collector-only, with normal reads as fallback. */
  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    if (requests.length === 0) return [];
    const raw = await twapOnChainService.getSnapshotPricesBatch(
      requests.map((request) => ({
        id: request.id,
        symbol: request.symbol.toUpperCase(),
        chainId: this.getChainId(request.chain),
      })),
      signal
    );
    const requestsById = new Map(requests.map((request) => [request.id, request]));
    return Promise.all(
      raw.map(async (result): Promise<SnapshotBatchPriceResult> => {
        const request = requestsById.get(result.id);
        if (!request)
          return { id: result.id, price: null, error: new Error('Unknown TWAP batch request') };
        if (result.data && !result.error) {
          try {
            return {
              id: result.id,
              price: this.toPriceData(
                request.symbol.toUpperCase(),
                request.chain,
                result.data,
                'snapshot-batch'
              ),
              error: null,
            };
          } catch (error) {
            return {
              id: result.id,
              price: null,
              error: error instanceof Error ? error : new Error(String(error)),
            };
          }
        }
        try {
          return {
            id: result.id,
            price: await this.getPrice(request.symbol, request.chain, { signal }),
            error: null,
          };
        } catch (error) {
          return {
            id: result.id,
            price: null,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      })
    );
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
