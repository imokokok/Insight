import { BaseOracleClient } from '@/lib/oracles/base';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { API3_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import type { PriceData } from '@/types/oracle';
import { OracleProvider, Blockchain } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

export class API3Client extends BaseOracleClient {
  name = OracleProvider.API3;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.OPTIMISM,
  ];

  defaultUpdateIntervalMinutes = 1;

  private resolveTargetChain(symbol: string, chain?: Blockchain): Blockchain {
    if (chain) return chain;
    const supportedChains = this.getSupportedChainsForSymbol(symbol);
    return supportedChains[0] ?? Blockchain.ETHEREUM;
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    const targetChain = this.resolveTargetChain(symbol, chain);

    try {
      const api3Data = await withOracleRetry(
        async () => {
          if (options?.signal?.aborted) {
            throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
          }
          return api3NetworkService.getPrice(symbol, targetChain, options?.signal);
        },
        'api3:getPrice',
        // API3 makes 2 sequential eth_call requests (decimals + read), each
        // via RpcClientWithFallback iterating up to 3 endpoints (10s per
        // endpoint = 30s worst case per call). The standard 15s timeout
        // can't accommodate even one full endpoint iteration when endpoints
        // are slow. 30s gives one full iteration per call.
        { ...ORACLE_RETRY_PRESETS.standard, timeout: 30000 },
        options?.signal
      );

      if (!api3Data) {
        throw this.createError(
          `Price data not available for symbol: ${symbol} on ${targetChain}. The dAPI may not be activated or the symbol is not supported by API3.`,
          'API3_PRICE_NOT_AVAILABLE'
        );
      }

      if (!api3Data.price || api3Data.price <= 0) {
        throw this.createError(
          `Invalid price (0) for symbol: ${symbol} on ${targetChain}. The dAPI may not be activated or the proxy address is incorrect.`,
          'API3_PRICE_NOT_AVAILABLE'
        );
      }

      return {
        provider: OracleProvider.API3,
        symbol: symbol.toUpperCase(),
        price: api3Data.price,
        timestamp: api3Data.timestamp,
        decimals: api3Data.decimals,
        confidence: api3Data.confidence,
        chain: targetChain,
        source: api3Data.source,
        dataSource: api3Data.confidence < 0.9 ? 'fallback' : 'real',
        dapiName: api3Data.dapiName,
        proxyAddress: api3Data.proxyAddress,
        dataAge: api3Data.dataAge,
        ingestionTimestamp: Date.now(),
        metadataFallback: api3Data.confidence < 0.9 || undefined,
        failureMode: api3Data.confidence < 0.9 ? FailureMode.FALLBACK_METADATA : FailureMode.NONE,
        signalVector: buildSignalVector({
          dataAgeSeconds: api3Data.dataAge ?? 0,
          isOnChain: true,
          hasVerification: !!api3Data.proxyAddress,
          providerUptime: 98,
          hasConfidence: api3Data.confidence !== undefined,
          hasTimestamp: api3Data.timestamp > 0,
          hasDecimals: api3Data.decimals !== undefined,
          hasSource: !!api3Data.source,
          verificationMethod: 'readDataFeed',
        }),
        verification: api3Data.proxyAddress
          ? buildEvmVerification(
              api3Data.proxyAddress,
              BLOCKCHAIN_TO_CHAIN_ID[targetChain] || 1,
              'readDataFeed'
            )
          : undefined,
      };
    } catch (error) {
      this.handleGetPriceError(error, 'API3 oracle network', 'API3_PRICE_ERROR');
    }
  }

  getSupportedSymbols(): string[] {
    const allSymbols = new Set<string>();
    Object.values(API3_AVAILABLE_PAIRS).forEach((symbols) => {
      symbols.forEach((symbol) => allSymbols.add(symbol));
    });
    return Array.from(allSymbols);
  }

  getSupportedSymbolsForChain(chain: Blockchain): string[] {
    const chainKey = chain.toLowerCase();
    return API3_AVAILABLE_PAIRS[chainKey] || [];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();

    if (chain !== undefined) {
      const chainKey = chain.toLowerCase();
      const chainSymbols = API3_AVAILABLE_PAIRS[chainKey];
      if (!chainSymbols) return false;
      return chainSymbols.includes(upperSymbol);
    }

    return Object.values(API3_AVAILABLE_PAIRS).some((symbols) => symbols.includes(upperSymbol));
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const upperSymbol = symbol.toUpperCase();
    const supportedChains: Blockchain[] = [];

    for (const [chain, symbols] of Object.entries(API3_AVAILABLE_PAIRS)) {
      if (symbols.includes(upperSymbol)) {
        const blockchain = this.supportedChains.find(
          (c) => c.toLowerCase() === chain.toLowerCase()
        );
        if (blockchain) {
          supportedChains.push(blockchain);
        }
      }
    }

    return supportedChains;
  }
}
