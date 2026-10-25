import { BaseOracleClient } from '@/lib/oracles/base';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import {
  isPriceFeedSupported as isPriceFeedSupportedSync,
  getChainlinkPriceFeed,
} from '@/lib/oracles/services/chainlinkDataSources';
import {
  chainlinkOnChainService,
  type ChainlinkPriceData,
} from '@/lib/oracles/services/chainlinkOnChainService';
import { chainlinkSolanaOnChainService } from '@/lib/oracles/services/chainlinkSolanaOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import {
  type SnapshotBatchPriceRequest,
  type SnapshotBatchPriceResult,
} from '@/lib/oracles/utils/snapshotBatch';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { roundTo } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';
import { FailureMode, buildSignalVector } from '@/types/oracle/signals';

const logger = createLogger('ChainlinkClient');

const ETHEREUM_CHAIN_ID = BLOCKCHAIN_TO_CHAIN_ID[Blockchain.ETHEREUM];

const CHAINLINK_QUALITY_CONFIG = {
  chainReliability: {
    [Blockchain.ETHEREUM]: 0.99,
    [Blockchain.ARBITRUM]: 0.98,
    [Blockchain.OPTIMISM]: 0.98,
    [Blockchain.POLYGON]: 0.97,
    [Blockchain.AVALANCHE]: 0.96,
    [Blockchain.BNB_CHAIN]: 0.95,
    [Blockchain.BASE]: 0.97,
    [Blockchain.SOLANA]: 0.97,
    [Blockchain.FANTOM]: 0.94,
    [Blockchain.CRONOS]: 0.93,
    [Blockchain.JUNO]: 0.0,
    [Blockchain.COSMOS]: 0.0,
    [Blockchain.OSMOSIS]: 0.0,
    [Blockchain.APTOS]: 0.0,
    [Blockchain.SUI]: 0.0,
    [Blockchain.GNOSIS]: 0.94,
    [Blockchain.MANTLE]: 0.95,
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
    [Blockchain.SUPRA_CHAIN]: 0.0,
    [Blockchain.BANDCHAIN]: 0.0,
    // New chain (mainnet 2025-11, feeds since 2025-11-24). Conservative
    // reliability until an observed track record justifies raising it.
    [Blockchain.MONAD]: 0.93,
  } as Record<Blockchain, number>,
  defaultConfidence: 0.98,
  minConfidence: 0.9,
};

export class ChainlinkClient extends BaseOracleClient {
  name = OracleProvider.CHAINLINK;
  // Chains ChainlinkClient can actually serve. This MUST stay in sync with
  // CHAINLINK_RPC_CONFIG (rpcConfig.ts): a chain only works here if it has an
  // RPC endpoint and a deployed Feed Registry. Solana is the one non-EVM
  // exception: its OCR2 Transmissions accounts are read by the dedicated native
  // reader below, with owner/layout/pair/freshness validation. Starknet is
  // excluded because the EVM Feed Registry/aggregator path cannot query it.
  // Scroll/zkSync Era/Linea are intentionally NOT listed: Chainlink does
  // not deploy a Feed Registry on those L2s (the on-chain registry is Mainnet-
  // only), and our CHAINLINK_PRICE_FEEDS fallback only covers the 7 chains
  // below — so any feed request to them would fail regardless.
  // NOTE: do NOT derive this from CHAINLINK_RPC_CONFIG at class-field init —
  // that import is circular (chainlinkDataSources → cache → supabase/server →
  // back to this client) and leaves the binding undefined under Jest/CJS,
  // throwing "Cannot convert undefined or null to object". Keep it explicit.
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.SOLANA,
    // Monad: catalog-resolved proxy reads over the official public RPC. Unlike
    // the chains above there is no Feed Registry on Monad — resolution relies
    // on the committed catalog (network "143") and feedAddressOverride paths.
    Blockchain.MONAD,
  ];

  private useRealData: boolean;

  constructor(config?: { useRealData?: boolean }) {
    super();
    this.useRealData = config?.useRealData ?? true;
  }

  private getChainId(chain?: Blockchain): number {
    if (!chain) return ETHEREUM_CHAIN_ID;
    if (chain === Blockchain.SOLANA) return BLOCKCHAIN_TO_CHAIN_ID[Blockchain.SOLANA];
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

    return roundTo(adjustedConfidence, 4);
  }

  private convertToPriceData(
    chainlinkData: ChainlinkPriceData,
    chain?: Blockchain,
    verificationFeedAddress?: `0x${string}`
  ): PriceData {
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
    const feed = verificationFeedAddress
      ? { address: verificationFeedAddress }
      : getChainlinkPriceFeed(chainlinkData.symbol, chainId);

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

    const targetChain = chain ?? Blockchain.ETHEREUM;
    if (targetChain === Blockchain.SOLANA) {
      return this.getSolanaPrice(symbol, options?.signal);
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
          // Chainlink makes 4 parallel eth_call requests via
          // RpcClientWithFallback, which iterates up to 3 endpoints per call
          // (10s per endpoint = 30s worst case). The standard 15s timeout
          // can't accommodate a full endpoint iteration when multiple
          // endpoints are slow, causing all 3 retry attempts to fail without
          // ever completing the iteration. 30s gives one full iteration.
          { ...ORACLE_RETRY_PRESETS.standard, timeout: 30000 },
          options?.signal
        );

        if (!realData) {
          throw this.createError(
            `Invalid price data from Chainlink for ${symbol} on ${chain}. The price feed may be stale or return zero.`,
            'REAL_DATA_NOT_AVAILABLE'
          );
        }
        // Central schema validation: Chainlink's on-chain feed is untrusted;
        // reject NaN/negative prices or bad timestamps before caching.
        return this.validatePriceData(this.convertToPriceData(realData, chain), 'getPrice');
      } catch (error) {
        this.handleGetPriceError(error, 'Chainlink', 'CHAINLINK_PRICE_ERROR');
      }
    }

    throw this.createError(
      `No price data available for ${symbol}. Real data is not enabled or price feed is not supported on this chain.`,
      'REAL_DATA_NOT_AVAILABLE'
    );
  }

  /**
   * Snapshot-collector fast path. It is intentionally not part of the normal
   * request API: only a registry-authenticated background batch may coalesce
   * reads. Any aggregate or sub-result problem falls back to the established
   * single-price method with its retry and validation behaviour.
   */
  async getSnapshotPricesBatch(
    requests: readonly SnapshotBatchPriceRequest[],
    signal?: AbortSignal
  ): Promise<SnapshotBatchPriceResult[]> {
    if (requests.length === 0) return [];
    const raw = await chainlinkOnChainService.getSnapshotPricesBatch(
      requests.map((request) => ({
        id: request.id,
        symbol: request.symbol,
        chainId: this.getChainId(request.chain),
        feedAddressOverride: request.feedAddress,
      })),
      signal
    );
    const requestsById = new Map(requests.map((request) => [request.id, request]));
    return Promise.all(
      raw.map(async (result): Promise<SnapshotBatchPriceResult> => {
        const request = requestsById.get(result.id);
        if (!request) {
          return {
            id: result.id,
            price: null,
            error: new Error('Unknown Chainlink batch request'),
          };
        }
        if (result.data && !result.error) {
          try {
            return {
              id: result.id,
              price: this.validatePriceData(
                this.convertToPriceData(result.data, request.chain, request.feedAddress),
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
          // A Multicall response is an optimization, never a new dependency.
          // The established path remains the safety net for an outer failure,
          // a failed subcall, malformed ABI output, or a phase transition.
          const fallbackData = await withOracleRetry(
            () =>
              chainlinkOnChainService.getPrice(
                request.symbol,
                this.getChainId(request.chain),
                signal,
                request.feedAddress
              ),
            'chainlink:snapshot-batch-fallback',
            { ...ORACLE_RETRY_PRESETS.standard, timeout: 30000 },
            signal
          );
          if (!fallbackData) {
            throw this.createNoDataError(
              request.symbol,
              request.chain,
              'Chainlink Multicall fallback returned no price'
            );
          }
          return {
            id: result.id,
            price: this.validatePriceData(
              this.convertToPriceData(fallbackData, request.chain, request.feedAddress),
              'snapshot-batch-fallback'
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
      })
    );
  }

  private isPriceFeedSupported(symbol: string, chain?: Blockchain): boolean {
    // Solana's roster is the official live Reference Data Directory rather
    // than an EVM catalog. Registry-gated callers load the row before this
    // fallback is consulted; a direct getPrice performs its own directory and
    // account validation below.
    if (chain === Blockchain.SOLANA) return false;
    const chainId = this.getChainId(chain);
    return isPriceFeedSupportedSync(symbol, chainId);
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
    if (chain === Blockchain.SOLANA) return [];
    const chainId = this.getChainId(chain);
    const allSymbols = this.getSupportedSymbols();
    return allSymbols.filter((symbol) => isPriceFeedSupportedSync(symbol, chainId));
  }

  private async getSolanaPrice(symbol: string, signal?: AbortSignal): Promise<PriceData> {
    try {
      const reading = await withOracleRetry(
        () => chainlinkSolanaOnChainService.getPrice(symbol, signal),
        'chainlink-solana:getPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );
      const ageSeconds = Math.max(
        0,
        Math.floor(Date.now() / 1000) - Math.floor(reading.timestamp / 1000)
      );
      const data: PriceData = {
        provider: this.name,
        chain: Blockchain.SOLANA,
        symbol: reading.symbol,
        price: reading.price,
        timestamp: reading.timestamp,
        decimals: reading.decimals,
        confidence: this.calculateConfidence(Blockchain.SOLANA),
        confidenceSource: 'estimated',
        change24h: 0,
        change24hPercent: 0,
        source: `Chainlink OCR2 Solana:${reading.description}`,
        roundId: reading.roundId,
        answeredInRound: reading.roundId,
        startedAt: reading.timestamp,
        dataAge: ageSeconds,
        dataSource: 'real',
        ingestionTimestamp: Date.now(),
        failureMode: FailureMode.NONE,
        signalVector: buildSignalVector({
          dataAgeSeconds: ageSeconds,
          isOnChain: true,
          hasVerification: true,
          providerUptime: CHAINLINK_QUALITY_CONFIG.chainReliability[Blockchain.SOLANA] * 100,
          hasConfidence: true,
          hasTimestamp: true,
          hasDecimals: true,
          hasSource: true,
          verificationMethod: 'getMultipleAccounts+OCR2-owner/layout/pair/heartbeat gates',
        }),
        verification: {
          type: 'on-chain',
          contractAddress: reading.accountAddress,
          chainId: BLOCKCHAIN_TO_CHAIN_ID[Blockchain.SOLANA],
          explorerUrl: `https://solscan.io/account/${reading.accountAddress}`,
          method: 'getMultipleAccounts(base64)+OCR2-Transmissions/owner/pair/heartbeat gates',
          blockNumber: reading.observationSlot,
          rawValue: reading.answer,
          sourceTimestamp: Math.floor(reading.timestamp / 1000),
          valueExponent: -reading.decimals,
          assetId: reading.accountDataHash,
        },
      };
      return this.validatePriceData(data, 'chainlink-solana:getPrice');
    } catch (error) {
      this.handleGetPriceError(error, 'Chainlink on Solana', 'CHAINLINK_PRICE_ERROR');
    }
  }
}
