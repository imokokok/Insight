import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { umaSymbols } from '@/lib/oracles/supportedSymbols';
import type { UMATokenData } from '@/lib/oracles/umaOnChainService';
import { umaSubgraphService } from '@/lib/oracles/umaSubgraphService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';
import type {
  ValidatorData,
  DisputeData,
  UMANetworkStats,
  VerificationActivity,
  ValidatorPerformanceHeatmapData,
  ValidatorPerformanceHeatmapDataByDay,
  DisputeEfficiencyStats,
  DataQualityScore,
  ValidatorHistoryData,
  StakingCalculation,
  ValidatorEarningsAttribution,
  NetworkEarningsAttribution,
  EarningsSourceBreakdown,
  DisputeAmountDistributionStats,
} from '@/types/oracle/uma';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let disputesCache: CacheEntry<DisputeData[]> | null = null;

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
};

export class UMAClient extends BaseOracleClient {
  name = OracleProvider.UMA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.POLYGON,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 120;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private getChainId(chain?: Blockchain): number {
    if (!chain) return 1;
    return BLOCKCHAIN_TO_CHAIN_ID[chain] || 1;
  }

  private convertTokenDataToPriceData(tokenData: UMATokenData, chain?: Blockchain): PriceData {
    const price = Number(tokenData.priceUsd);
    const change24hPercent = Number(tokenData.priceChange24hPercent) || 0;
    const change24h = price * (change24hPercent / 100);

    return {
      provider: this.name,
      chain: chain || Blockchain.ETHEREUM,
      symbol: 'UMA',
      price,
      timestamp: Date.now(),
      decimals: tokenData.decimals || 18,
      confidence: 0.95,
      change24h,
      change24hPercent,
      source: 'on-chain',
    };
  }

  /**
   * 获取代币价格
   * 当查询 UMA 代币价格时，直接使用 Binance API，不尝试调用自己预言机的 API
   * 其他代币抛出错误
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    if (!symbol || symbol.trim() === '') {
      throw this.createError('Symbol is required', 'PRICE_FETCH_ERROR');
    }

    const upperSymbol = symbol.toUpperCase();

    // 当查询自己预言机的代币 (UMA) 时，直接使用 Binance API
    if (upperSymbol === 'UMA') {
      try {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: this.name,
            symbol: upperSymbol,
            price: marketData.currentPrice,
            timestamp: new Date(marketData.lastUpdated).getTime(),
            decimals: 18,
            confidence: 0.95,
            change24h: marketData.priceChange24h,
            change24hPercent: marketData.priceChangePercentage24h,
            chain,
            source: 'binance-api',
          };
        }
      } catch (error) {
        console.error(`[UMAClient] Failed to fetch UMA price from Binance:`, error);
      }
    }

    throw this.createError(
      `Symbol ${symbol} is not supported by UMA on-chain service. Only UMA token is supported.`,
      'UMA_SYMBOL_NOT_SUPPORTED'
    );
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    if (!symbol || symbol.trim() === '') {
      throw this.createError('Symbol is required', 'PRICE_FETCH_ERROR');
    }
    if (!period || period <= 0) {
      throw this.createError('Period must be greater than 0', 'HISTORICAL_PRICE_ERROR');
    }

    throw this.createError(
      'Historical prices are not available from UMA on-chain service. Please use a market data provider.',
      'UMA_HISTORICAL_PRICES_NOT_AVAILABLE'
    );
  }

  async getValidators(): Promise<ValidatorData[]> {
    if (!umaSubgraphService.isConfigured()) {
      throw this.createError(
        'UMA subgraph service is not configured. Please set the subgraph URL.',
        'UMA_SUBGRAPH_NOT_CONFIGURED'
      );
    }

    try {
      const voters = await umaSubgraphService.getVoters(50, 0);
      if (voters.length === 0) {
        throw this.createError('No validators found in UMA subgraph', 'UMA_NO_VALIDATORS');
      }
      return voters.map((voter, index) => ({
        id: voter.id,
        address: voter.id,
        name: `Validator ${index + 1}`,
        type: 'independent' as const,
        region: 'Unknown',
        responseTime: 0,
        successRate: 100,
        reputation: 50,
        staked: Math.floor(parseFloat(voter.delegatedVotes) / 1e18),
        earnings: 0,
      }));
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch validators from UMA subgraph',
        'UMA_VALIDATORS_ERROR'
      );
    }
  }

  async getDisputes(): Promise<DisputeData[]> {
    const now = Date.now();
    if (disputesCache && now - disputesCache.timestamp < CACHE_TTL_MS) {
      return disputesCache.data;
    }

    if (!umaSubgraphService.isConfigured()) {
      throw this.createError(
        'UMA subgraph service is not configured. Please set the subgraph URL.',
        'UMA_SUBGRAPH_NOT_CONFIGURED'
      );
    }

    try {
      const subgraphDisputes = await umaSubgraphService.getDisputes(100, 0);
      if (subgraphDisputes.length === 0) {
        throw this.createError('No disputes found in UMA subgraph', 'UMA_NO_DISPUTES');
      }

      const disputes: DisputeData[] = subgraphDisputes.map((d) => {
        const bond = parseFloat(d.request.bond) / 1e18;
        const reward = parseFloat(d.request.reward) / 1e18;
        const disputeBond = parseFloat(d.disputeBond) / 1e18;

        const status: DisputeData['status'] = d.resolved
          ? 'resolved'
          : d.request.isDisputed
            ? 'active'
            : 'rejected';

        const identifier = d.request.identifier || 'unknown';
        let type: DisputeData['type'] = 'other';
        if (identifier.toLowerCase().includes('price')) {
          type = 'price';
        } else if (identifier.toLowerCase().includes('state')) {
          type = 'state';
        } else if (
          identifier.toLowerCase().includes('liquidation') ||
          identifier.toLowerCase().includes('default')
        ) {
          type = 'liquidation';
        }

        return {
          id: d.id,
          timestamp: parseInt(d.disputeTime) * 1000,
          status,
          reward: Math.floor(reward),
          resolutionTime: d.resolutionTime
            ? parseInt(d.resolutionTime) - parseInt(d.disputeTime)
            : undefined,
          type,
          transactionHash: d.id,
          stakeAmount: Math.floor(bond),
          rewardAmount: Math.floor(disputeBond),
          totalValue: Math.floor(bond + disputeBond + reward),
        };
      });

      disputesCache = { data: disputes, timestamp: now };
      return disputes;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch disputes from UMA subgraph',
        'UMA_DISPUTES_ERROR'
      );
    }
  }

  async getDisputeTrends(): Promise<
    { date: string; count: number; type: string; filed: number; resolved: number }[]
  > {
    throw this.createError(
      'Dispute trends are not available from UMA on-chain service.',
      'UMA_DISPUTE_TRENDS_NOT_AVAILABLE'
    );
  }

  async getEarningsTrends(): Promise<{ day: string; daily: number; cumulative: number }[]> {
    throw this.createError(
      'Earnings trends are not available from UMA on-chain service.',
      'UMA_EARNINGS_TRENDS_NOT_AVAILABLE'
    );
  }

  async getNetworkStats(): Promise<UMANetworkStats> {
    throw this.createError(
      'Network stats are not available from UMA on-chain service.',
      'UMA_NETWORK_STATS_NOT_AVAILABLE'
    );
  }

  async getVerificationActivity(): Promise<VerificationActivity> {
    throw this.createError(
      'Verification activity is not available from UMA on-chain service.',
      'UMA_VERIFICATION_ACTIVITY_NOT_AVAILABLE'
    );
  }

  async getValidatorPerformanceHeatmap(): Promise<ValidatorPerformanceHeatmapData[]> {
    throw this.createError(
      'Validator performance heatmap is not available from UMA on-chain service.',
      'UMA_VALIDATOR_PERFORMANCE_HEATMAP_NOT_AVAILABLE'
    );
  }

  async getValidatorPerformanceHeatmapByDay(): Promise<ValidatorPerformanceHeatmapDataByDay[]> {
    throw this.createError(
      'Validator performance heatmap by day is not available from UMA on-chain service.',
      'UMA_VALIDATOR_PERFORMANCE_HEATMAP_BY_DAY_NOT_AVAILABLE'
    );
  }

  async getDisputeEfficiencyStats(): Promise<DisputeEfficiencyStats> {
    throw this.createError(
      'Dispute efficiency stats are not available from UMA on-chain service.',
      'UMA_DISPUTE_EFFICIENCY_STATS_NOT_AVAILABLE'
    );
  }

  async getDataQualityScore(): Promise<DataQualityScore> {
    throw this.createError(
      'Data quality score is not available from UMA on-chain service.',
      'UMA_DATA_QUALITY_SCORE_NOT_AVAILABLE'
    );
  }

  async getValidatorHistory(_validatorId: string, _days?: number): Promise<ValidatorHistoryData[]> {
    throw this.createError(
      'Validator history is not available from UMA on-chain service.',
      'UMA_VALIDATOR_HISTORY_NOT_AVAILABLE'
    );
  }

  async calculateStaking(_amount: number, _duration: number): Promise<StakingCalculation> {
    throw this.createError(
      'Staking calculation is not available from UMA on-chain service.',
      'UMA_STAKING_CALCULATION_NOT_AVAILABLE'
    );
  }

  async calculateStakingRewards(
    _stakeAmount: number,
    _validatorType: string,
    _disputeFrequency: string
  ): Promise<StakingCalculation> {
    throw this.createError(
      'Staking rewards calculation is not available from UMA on-chain service.',
      'UMA_STAKING_REWARDS_CALCULATION_NOT_AVAILABLE'
    );
  }

  async getValidatorEarningsAttribution(
    _validatorId: string
  ): Promise<ValidatorEarningsAttribution> {
    throw this.createError(
      'Validator earnings attribution is not available from UMA on-chain service.',
      'UMA_VALIDATOR_EARNINGS_ATTRIBUTION_NOT_AVAILABLE'
    );
  }

  async getNetworkEarningsAttribution(): Promise<NetworkEarningsAttribution> {
    throw this.createError(
      'Network earnings attribution is not available from UMA on-chain service.',
      'UMA_NETWORK_EARNINGS_ATTRIBUTION_NOT_AVAILABLE'
    );
  }

  async getEarningsSourceBreakdown(): Promise<EarningsSourceBreakdown> {
    throw this.createError(
      'Earnings source breakdown is not available from UMA on-chain service.',
      'UMA_EARNINGS_SOURCE_BREAKDOWN_NOT_AVAILABLE'
    );
  }

  async getDisputeAmountDistribution(): Promise<DisputeAmountDistributionStats> {
    throw this.createError(
      'Dispute amount distribution is not available from UMA on-chain service.',
      'UMA_DISPUTE_AMOUNT_DISTRIBUTION_NOT_AVAILABLE'
    );
  }

  getSupportedSymbols(): string[] {
    return [...umaSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = umaSymbols.includes(symbol.toUpperCase() as (typeof umaSymbols)[number]);
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }
}
