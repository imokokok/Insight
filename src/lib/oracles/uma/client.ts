import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { coinGeckoMarketService } from '@/lib/services/marketData/coinGeckoMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from '../base';
import { umaSymbols } from '../supportedSymbols';
import { isUMASupportedOnChain } from '../umaDataSources';
import { umaOnChainService, type UMATokenData } from '../umaOnChainService';
import {
  umaSubgraphService,
  type SubgraphDispute,
  type SubgraphPriceRequest,
  type SubgraphVoter,
} from '../umaSubgraphService';

import {
  UMA_MOCK_CONFIG,
  SeededRandom,
  generateMockDisputes,
  generateMockEarningsTrends,
  generateMockDisputeTrends,
} from './mockDataConfig';

import type { OracleClientConfig } from '../base';
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
} from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let disputesCache: CacheEntry<DisputeData[]> | null = null;
let heatmapCache: CacheEntry<ValidatorPerformanceHeatmapData[]> | null = null;

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
  private useRealData: boolean;

  constructor(config?: OracleClientConfig & { useRealData?: boolean }) {
    super(config);
    const envUseRealData = process.env.NEXT_PUBLIC_USE_REAL_UMA_DATA === 'true';
    this.useRealData = config?.useRealData ?? envUseRealData ?? true;
  }

  private getChainId(chain?: Blockchain): number {
    if (!chain) return 1;
    return BLOCKCHAIN_TO_CHAIN_ID[chain] || 1;
  }

  private convertTokenDataToPriceData(tokenData: UMATokenData, chain?: Blockchain): PriceData {
    const symbol = 'UMA';
    const basePrice = UNIFIED_BASE_PRICES[symbol] || 2.5;
    // UMA token doesn't have a direct price feed, use base price with small variation
    const price = basePrice;
    const change24hPercent = 0;
    const change24h = 0;

    return {
      provider: this.name,
      chain: chain || Blockchain.ETHEREUM,
      symbol,
      price,
      timestamp: Date.now(),
      decimals: tokenData.decimals,
      confidence: 0.95,
      change24h: Number(change24h.toFixed(4)),
      change24hPercent: Number(change24hPercent.toFixed(2)),
    };
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    if (!symbol || symbol.trim() === '') {
      throw this.createError('Symbol is required', 'PRICE_FETCH_ERROR');
    }

    try {
      const chainId = this.getChainId(chain);

      if (this.useRealData && symbol.toUpperCase() === 'UMA' && isUMASupportedOnChain(chainId)) {
        try {
          const marketData = await coinGeckoMarketService.getTokenMarketData('uma');
          const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || marketData.current_price;
          const change24hPercent = marketData.price_change_percentage_24h || 0;
          const change24h = marketData.price_change_24h || 0;

          return {
            provider: this.name,
            chain: chain || Blockchain.ETHEREUM,
            symbol: symbol.toUpperCase(),
            price: marketData.current_price,
            timestamp: Date.now(),
            decimals: 18,
            confidence: 0.98,
            change24h: Number(change24h.toFixed(4)),
            change24hPercent: Number(change24hPercent.toFixed(2)),
          };
        } catch (coingeckoError) {
          console.warn('[UMAClient] CoinGecko fetch failed, trying on-chain data:', coingeckoError);
          const tokenData = await umaOnChainService.getTokenData(chainId);
          return this.convertTokenDataToPriceData(tokenData, chain);
        }
      }

      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
    } catch (error) {
      console.warn(
        `[UMAClient] Failed to fetch real data for ${symbol}, falling back to mock:`,
        error
      );

      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
    }
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

    try {
      const chainId = this.getChainId(chain);

      if (this.useRealData && symbol.toUpperCase() === 'UMA' && isUMASupportedOnChain(chainId)) {
        const tokenData = await umaOnChainService.getTokenData(chainId);
        const currentPrice = this.convertTokenDataToPriceData(tokenData, chain);

        // Generate historical data based on current token data
        const historicalData: PriceData[] = [];
        const now = Date.now();
        const dataPoints = period * 4;
        const interval = (period * 60 * 60 * 1000) / dataPoints;

        const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || currentPrice.price;
        const volatility = 0.02;
        let simulatedPrice = currentPrice.price * (0.95 + Math.random() * 0.1);

        for (let i = 0; i < dataPoints; i++) {
          const timestamp = now - (dataPoints - 1 - i) * interval;

          const randomWalk = (Math.random() - 0.5) * 2 * volatility;
          simulatedPrice = simulatedPrice * (1 + randomWalk);

          const maxPrice = currentPrice.price * 1.2;
          const minPrice = currentPrice.price * 0.8;
          simulatedPrice = Math.max(minPrice, Math.min(maxPrice, simulatedPrice));

          const change24hPercent = ((simulatedPrice - basePrice) / basePrice) * 100;
          const change24h = simulatedPrice - basePrice;

          historicalData.push({
            provider: this.name,
            chain: chain || Blockchain.ETHEREUM,
            symbol,
            price: Number(simulatedPrice.toFixed(4)),
            timestamp,
            decimals: currentPrice.decimals,
            confidence: 0.95,
            change24h: Number(change24h.toFixed(4)),
            change24hPercent: Number(change24hPercent.toFixed(2)),
          });
        }

        return historicalData;
      }

      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      console.warn(
        `[UMAClient] Failed to fetch historical data for ${symbol}, falling back to mock:`,
        error
      );

      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    }
  }

  async getValidators(): Promise<ValidatorData[]> {
    if (this.useRealData && umaSubgraphService.isConfigured()) {
      try {
        const voters = await umaSubgraphService.getVoters(50, 0);
        const tokenData = await umaOnChainService.getTokenData(1);
        const totalSupply = Number(tokenData.totalSupply) / Math.pow(10, tokenData.decimals);

        const validators: ValidatorData[] = voters.map((voter, index) => {
          const delegatedVotes = parseFloat(voter.delegatedVotes) / 1e18;
          const voteCount = voter.voteCount || 0;
          const totalRewards = parseFloat(voter.totalRewards) / 1e18;

          const types: Array<'institution' | 'independent' | 'community'> = [
            'institution',
            'independent',
            'community',
          ];
          const regions = ['North America', 'Europe', 'Asia', 'Other'];

          return {
            id: voter.id,
            name: `Voter ${voter.address.slice(0, 6)}...${voter.address.slice(-4)}`,
            type: types[index % 3],
            region: regions[index % 4],
            responseTime: 100 + (index % 5) * 15,
            successRate: 99.5 - (index % 3) * 0.2,
            reputation: Math.min(98, 85 + Math.floor(voteCount / 10)),
            staked: Math.min(delegatedVotes, totalSupply * 0.05),
            earnings: totalRewards,
            address: voter.address as `0x${string}`,
          };
        });

        if (validators.length > 0) {
          return validators;
        }
      } catch (error) {
        console.warn('[UMAClient] Failed to fetch validators from subgraph:', error);
      }
    }

    if (this.useRealData) {
      try {
        const tokenData = await umaOnChainService.getTokenData(1);
        const validators = UMA_MOCK_CONFIG.validators();
        const totalSupply = Number(tokenData.totalSupply) / Math.pow(10, tokenData.decimals);
        return validators.map((v) => ({
          ...v,
          staked: Math.min(v.staked, totalSupply * 0.01),
        }));
      } catch (error) {
        console.warn('[UMAClient] Failed to fetch validators with real data:', error);
      }
    }
    return UMA_MOCK_CONFIG.validators();
  }

  async getDisputes(): Promise<DisputeData[]> {
    const now = Date.now();
    if (disputesCache && now - disputesCache.timestamp < CACHE_TTL_MS) {
      return disputesCache.data;
    }

    if (this.useRealData && umaSubgraphService.isConfigured()) {
      try {
        const subgraphDisputes = await umaSubgraphService.getDisputes(100, 0);
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
            resolutionTime: d.resolutionTime ? parseInt(d.resolutionTime) - parseInt(d.disputeTime) : undefined,
            type,
            transactionHash: d.id,
            stakeAmount: Math.floor(bond),
            rewardAmount: Math.floor(disputeBond),
            totalValue: Math.floor(bond + disputeBond + reward),
          };
        });

        if (disputes.length > 0) {
          disputesCache = { data: disputes, timestamp: now };
          return disputes;
        }
      } catch (error) {
        console.warn('[UMAClient] Failed to fetch disputes from subgraph:', error);
      }
    }

    const data = generateMockDisputes(UMA_MOCK_CONFIG.seed);
    disputesCache = { data, timestamp: now };
    return data;
  }

  async getNetworkStats(): Promise<UMANetworkStats> {
    if (this.useRealData && umaSubgraphService.isConfigured()) {
      try {
        const [subgraphStats, tokenData, voters] = await Promise.all([
          umaSubgraphService.getNetworkStats(),
          umaOnChainService.getTokenData(1),
          umaSubgraphService.getVoters(100, 0),
        ]);

        const totalSupply = Number(tokenData.totalSupply) / Math.pow(10, tokenData.decimals);
        const totalDelegatedVotes = parseFloat(subgraphStats.totalDelegatedVotes) / 1e18;
        const activeVoters = voters.filter((v) => parseFloat(v.delegatedVotes) > 0).length;

        const resolvedRate =
          subgraphStats.totalDisputes > 0
            ? (subgraphStats.resolvedDisputes / subgraphStats.totalDisputes) * 100
            : 78;

        return {
          activeValidators: activeVoters || subgraphStats.totalTokenHolders,
          validatorUptime: 99.5,
          avgResponseTime: 180,
          updateFrequency: 60,
          totalStaked: Math.floor(totalDelegatedVotes || totalSupply * 0.25),
          dataSources: subgraphStats.totalPriceRequests,
          totalDisputes: subgraphStats.totalDisputes,
          disputeSuccessRate: Math.round(resolvedRate),
          avgResolutionTime: 4.2,
          activeDisputes: subgraphStats.activeDisputes,
        };
      } catch (error) {
        console.warn('[UMAClient] Failed to fetch network stats from subgraph:', error);
      }
    }

    if (this.useRealData) {
      try {
        const chainId = 1;
        const tokenData = await umaOnChainService.getTokenData(chainId);
        const onChainStats = await umaOnChainService.getNetworkStats(chainId);

        const totalSupply = Number(tokenData.totalSupply) / Math.pow(10, tokenData.decimals);

        return {
          activeValidators: 850,
          validatorUptime: 99.5,
          avgResponseTime: 180,
          updateFrequency: 60,
          totalStaked: Math.floor(totalSupply * 0.25),
          dataSources: 320,
          totalDisputes: 1250 + onChainStats.totalAssertions,
          disputeSuccessRate: 78,
          avgResolutionTime: 4.2,
          activeDisputes: 23 + onChainStats.activeAssertions,
        };
      } catch (error) {
        console.warn('[UMAClient] Failed to fetch network stats with real data:', error);
      }
    }
    return UMA_MOCK_CONFIG.networkStats();
  }

  async getVerificationActivity(): Promise<VerificationActivity> {
    const hourly = UMA_MOCK_CONFIG.verificationActivity.hourly;
    const total = hourly.reduce((a, b) => a + b, 0);
    const peakRequests = Math.max(...hourly);
    const peakHour = hourly.indexOf(peakRequests);

    return {
      hourly,
      total,
      peakHour,
      avgPerHour: Math.round(total / 24),
      peakRequests,
    };
  }

  async getDisputeTrends(): Promise<{ date: string; filed: number; resolved: number }[]> {
    return generateMockDisputeTrends(UMA_MOCK_CONFIG.seed);
  }

  async getEarningsTrends(): Promise<{ day: string; daily: number; cumulative: number }[]> {
    return generateMockEarningsTrends(UMA_MOCK_CONFIG.seed);
  }

  async getValidatorPerformanceHeatmap(): Promise<ValidatorPerformanceHeatmapData[]> {
    const now = Date.now();
    if (heatmapCache && now - heatmapCache.timestamp < CACHE_TTL_MS) {
      return heatmapCache.data;
    }
    const validators = await this.getValidators();
    const heatmapData: ValidatorPerformanceHeatmapData[] = [];
    const rng = new SeededRandom(UMA_MOCK_CONFIG.seed + 1000);

    for (const validator of validators.slice(0, 8)) {
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const baseResponseTime = validator.responseTime;
        const variation = Math.sin((hour / 24) * Math.PI * 2) * 20 + rng.range(-5, 5);
        const responseTime = Math.max(50, baseResponseTime + variation);

        const baseSuccessRate = validator.successRate;
        const successVariation = Math.cos((hour / 24) * Math.PI * 2) * 0.3 + rng.range(-0.1, 0.1);
        const successRate = Math.min(100, Math.max(95, baseSuccessRate + successVariation));

        hourlyData.push({
          hour,
          responseTime: Math.round(responseTime),
          successRate: parseFloat(successRate.toFixed(2)),
        });
      }

      heatmapData.push({
        validatorId: validator.id,
        validatorName: validator.name,
        hourlyData,
      });
    }

    heatmapCache = { data: heatmapData, timestamp: now };
    return heatmapData;
  }

  async getValidatorPerformanceHeatmapByDays(
    days: number = 7
  ): Promise<ValidatorPerformanceHeatmapDataByDay[]> {
    const validators = await this.getValidators();
    const heatmapData: ValidatorPerformanceHeatmapDataByDay[] = [];
    const rng = new SeededRandom(UMA_MOCK_CONFIG.seed + 2000);
    const now = new Date();

    for (const validator of validators.slice(0, 8)) {
      const dailyData = [];

      for (let dayIndex = 0; dayIndex < days; dayIndex++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (days - 1 - dayIndex));
        const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

        const baseResponseTime = validator.responseTime;
        const dayVariation = Math.sin((dayIndex / days) * Math.PI) * 15 + rng.range(-5, 5);
        const avgResponseTime = Math.max(50, baseResponseTime + dayVariation);

        const baseSuccessRate = validator.successRate;
        const successVariation =
          Math.cos((dayIndex / days) * Math.PI) * 0.2 + rng.range(-0.075, 0.075);
        const avgSuccessRate = Math.min(100, Math.max(95, baseSuccessRate + successVariation));

        dailyData.push({
          date: dateStr,
          dayIndex,
          avgResponseTime: Math.round(avgResponseTime),
          avgSuccessRate: parseFloat(avgSuccessRate.toFixed(2)),
        });
      }

      heatmapData.push({
        validatorId: validator.id,
        validatorName: validator.name,
        dailyData,
      });
    }

    return heatmapData;
  }

  async getDisputeEfficiencyStats(): Promise<DisputeEfficiencyStats> {
    const disputes = await this.getDisputes();
    const resolvedDisputes = disputes.filter((d) => d.status === 'resolved' && d.resolutionTime);

    const resolutionTimes = resolvedDisputes.map((d) => d.resolutionTime!);

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
    const medianResolutionTime =
      sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : 0;

    const variance =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + Math.pow(time - avgResolutionTime, 2), 0) /
          resolutionTimes.length
        : 0;
    const stdDeviation = Math.sqrt(variance);

    const rng = new SeededRandom(UMA_MOCK_CONFIG.seed + 3000);
    const successRateTrend = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      successRateTrend.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        rate: 70 + rng.range(0, 20),
      });
    }

    const distribution = { '0-2h': 0, '2-6h': 0, '6-12h': 0, '12-24h': 0, '24-48h': 0, '48h+': 0 };
    for (const time of resolutionTimes) {
      if (time <= 2) distribution['0-2h']++;
      else if (time <= 6) distribution['2-6h']++;
      else if (time <= 12) distribution['6-12h']++;
      else if (time <= 24) distribution['12-24h']++;
      else if (time <= 48) distribution['24-48h']++;
      else distribution['48h+']++;
    }

    const resolutionTimeDistribution = [
      { range: '0-2h', count: distribution['0-2h'] },
      { range: '2-6h', count: distribution['2-6h'] },
      { range: '6-12h', count: distribution['6-12h'] },
      { range: '12-24h', count: distribution['12-24h'] },
      { range: '24-48h', count: distribution['24-48h'] },
      { range: '48h+', count: distribution['48h+'] },
    ];

    return {
      avgResolutionTime,
      medianResolutionTime,
      stdDeviation,
      successRateTrend,
      resolutionTimeDistribution,
    };
  }

  async getDataQualityScore(): Promise<DataQualityScore> {
    const networkStats = await this.getNetworkStats();
    const rng = new SeededRandom(UMA_MOCK_CONFIG.seed + 4000);

    const networkHealthScore = Math.min(
      100,
      (networkStats.validatorUptime / 100) * 50 +
        (networkStats.activeValidators / 1000) * 25 +
        (networkStats.disputeSuccessRate / 100) * 25
    );

    const dataIntegrityScore = 85 + rng.range(0, 10);

    const responseTimeScore = Math.max(0, 100 - (networkStats.avgResponseTime - 100) / 2);

    const validatorActivityScore = Math.min(
      100,
      (networkStats.activeValidators / 850) * 70 + (networkStats.totalStaked / 30000000) * 30
    );

    const overallScore =
      networkHealthScore * 0.3 +
      dataIntegrityScore * 0.25 +
      responseTimeScore * 0.25 +
      validatorActivityScore * 0.2;

    const getTrend = (): 'up' | 'down' | 'stable' => {
      const rand = rng.next();
      return rand > 0.6 ? 'up' : rand > 0.3 ? 'stable' : 'down';
    };

    return {
      overallScore: parseFloat(overallScore.toFixed(1)),
      networkHealth: {
        score: parseFloat(networkHealthScore.toFixed(1)),
        trend: getTrend(),
      },
      dataIntegrity: {
        score: parseFloat(dataIntegrityScore.toFixed(1)),
        trend: getTrend(),
      },
      responseTime: {
        score: parseFloat(responseTimeScore.toFixed(1)),
        trend: getTrend(),
      },
      validatorActivity: {
        score: parseFloat(validatorActivityScore.toFixed(1)),
        trend: getTrend(),
      },
    };
  }

  async getValidatorHistory(
    validatorId: string,
    days: number = 30
  ): Promise<ValidatorHistoryData[]> {
    const validators = await this.getValidators();
    const validator = validators.find((v) => v.id === validatorId);

    const baseSuccessRate = validator?.successRate ?? 99.0;
    const baseResponseTime = validator?.responseTime ?? 150;
    const baseReputation = validator?.reputation ?? 85;

    const rng = new SeededRandom(UMA_MOCK_CONFIG.seed + parseInt(validatorId) * 100);
    const history: ValidatorHistoryData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

      const trendFactor = Math.sin(((days - i) / days) * Math.PI) * 2;
      const randomVariation = rng.range(-1, 1);

      const successRate = Math.min(
        100,
        Math.max(95, baseSuccessRate + trendFactor + randomVariation)
      );

      const responseTimeVariation =
        Math.cos(((days - i) / days) * Math.PI) * 20 + rng.range(-15, 15);
      const responseTime = Math.max(50, Math.round(baseResponseTime + responseTimeVariation));

      const reputationTrend = ((days - i) / days) * 3;
      const reputationVariation = rng.range(-2, 2);
      const reputation = Math.min(
        100,
        Math.max(70, Math.round(baseReputation + reputationTrend + reputationVariation))
      );

      history.push({
        date: dateStr,
        successRate: parseFloat(successRate.toFixed(2)),
        responseTime,
        reputation,
      });
    }

    return history;
  }

  async calculateStakingRewards(
    amount: number,
    validatorType: 'institution' | 'independent' | 'community',
    disputeFrequency: 'low' | 'medium' | 'high'
  ): Promise<StakingCalculation> {
    if (!amount || amount <= 0) {
      throw this.createError('Amount must be greater than 0', 'STAKING_AMOUNT_ERROR');
    }

    const baseAprMap = {
      institution: 0.08,
      independent: 0.1,
      community: 0.12,
    };

    const disputeBonusMap = {
      low: 0,
      medium: 0.02,
      high: 0.05,
    };

    const baseApr = baseAprMap[validatorType];
    const disputeBonus = disputeBonusMap[disputeFrequency];
    const totalApr = baseApr + disputeBonus;

    const yearlyReward = amount * totalApr;
    const monthlyReward = yearlyReward / 12;
    const dailyReward = yearlyReward / 365;

    return {
      dailyReward: parseFloat(dailyReward.toFixed(4)),
      monthlyReward: parseFloat(monthlyReward.toFixed(2)),
      yearlyReward: parseFloat(yearlyReward.toFixed(2)),
      apr: parseFloat((totalApr * 100).toFixed(2)),
    };
  }

  async getDisputesWithType(): Promise<DisputeData[]> {
    return this.getDisputes();
  }

  async getValidatorEarningsAttribution(
    validatorId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<ValidatorEarningsAttribution> {
    const validators = await this.getValidators();
    const validator = validators.find((v) => v.id === validatorId);

    if (!validator) {
      const availableIds = validators.map((v) => v.id).join(', ');
      throw this.createError(
        `验证者不存在: ID "${validatorId}" 未找到。可用的验证者 ID: ${availableIds}`,
        'VALIDATOR_NOT_FOUND'
      );
    }

    const rng = new SeededRandom(UMA_MOCK_CONFIG.seed + parseInt(validatorId) * 200);

    const periodMultiplier = {
      daily: 1 / 30,
      weekly: 7 / 30,
      monthly: 1,
      yearly: 12,
    }[period];

    const totalEarnings = validator.earnings * periodMultiplier;

    const baseRatio = 0.6 + rng.range(0, 0.15);
    const disputeRatio = 0.15 + rng.range(0, 0.15);
    const otherRatio = 1 - baseRatio - disputeRatio;

    const baseAmount = totalEarnings * baseRatio;
    const disputeAmount = totalEarnings * disputeRatio;
    const otherAmount = totalEarnings * otherRatio;

    const getTrend = (): 'up' | 'down' | 'stable' => {
      const rand = rng.next();
      return rand > 0.5 ? 'up' : rand > 0.25 ? 'stable' : 'down';
    };

    const sources: EarningsSourceBreakdown[] = [
      {
        type: 'base',
        amount: baseAmount,
        percentage: baseRatio * 100,
        trend: getTrend(),
        trendValue: parseFloat(rng.range(-3, 7).toFixed(2)),
      },
      {
        type: 'dispute',
        amount: disputeAmount,
        percentage: disputeRatio * 100,
        trend: getTrend(),
        trendValue: parseFloat(rng.range(-5, 10).toFixed(2)),
      },
      {
        type: 'other',
        amount: otherAmount,
        percentage: otherRatio * 100,
        trend: getTrend(),
        trendValue: parseFloat(rng.range(-4, 4).toFixed(2)),
      },
    ];

    const earningsPerStaked = totalEarnings / validator.staked;
    const roi =
      (totalEarnings / validator.staked) *
      100 *
      (period === 'yearly' ? 1 : period === 'monthly' ? 12 : period === 'weekly' ? 52 : 365);
    const yieldEfficiency = Math.min(100, (earningsPerStaked / 0.02) * 100);

    const networkAvgEarningsPerStaked =
      validators.reduce((sum, v) => sum + v.earnings / v.staked, 0) / validators.length;
    const comparisonToNetwork =
      ((earningsPerStaked - networkAvgEarningsPerStaked) / networkAvgEarningsPerStaked) * 100;

    const history: ValidatorEarningsAttribution['history'] = [];
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dailyBase = (baseAmount / days) * rng.range(0.9, 1.1);
      const dailyDispute = (disputeAmount / days) * rng.range(0.5, 2.0);
      const dailyOther = (otherAmount / days) * rng.range(0.8, 1.2);

      history.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        total: dailyBase + dailyDispute + dailyOther,
        base: dailyBase,
        dispute: dailyDispute,
        other: dailyOther,
      });
    }

    return {
      validatorId,
      validatorName: validator.name,
      totalEarnings,
      period,
      sources,
      efficiency: {
        earningsPerStaked: parseFloat(earningsPerStaked.toFixed(6)),
        roi: parseFloat(roi.toFixed(2)),
        yieldEfficiency: parseFloat(yieldEfficiency.toFixed(2)),
        comparisonToNetwork: parseFloat(comparisonToNetwork.toFixed(2)),
      },
      history,
    };
  }

  async getNetworkEarningsAttribution(): Promise<NetworkEarningsAttribution> {
    const validators = await this.getValidators();

    const totalNetworkEarnings = validators.reduce((sum, v) => sum + v.earnings, 0);
    const averageEarningsPerValidator = totalNetworkEarnings / validators.length;

    const totalStaked = validators.reduce((sum, v) => sum + v.staked, 0);
    const avgEarningsPerStaked = totalNetworkEarnings / totalStaked;
    const avgRoi = (averageEarningsPerValidator / (totalStaked / validators.length)) * 12 * 100;
    const avgYieldEfficiency = Math.min(100, (avgEarningsPerStaked / 0.02) * 100);

    const baseRatio = 0.65;
    const disputeRatio = 0.22;
    const otherRatio = 0.13;

    const performers = validators
      .map((v) => ({
        validatorId: v.id,
        validatorName: v.name,
        earningsPerStaked: v.earnings / v.staked,
      }))
      .sort((a, b) => b.earningsPerStaked - a.earningsPerStaked)
      .slice(0, 5)
      .map((p, index) => ({
        ...p,
        earningsPerStaked: parseFloat(p.earningsPerStaked.toFixed(6)),
        efficiencyRank: index + 1,
      }));

    return {
      totalNetworkEarnings,
      averageEarningsPerValidator,
      networkEfficiency: {
        avgEarningsPerStaked: parseFloat(avgEarningsPerStaked.toFixed(6)),
        avgRoi: parseFloat(avgRoi.toFixed(2)),
        avgYieldEfficiency: parseFloat(avgYieldEfficiency.toFixed(2)),
      },
      sourceDistribution: {
        base: baseRatio * 100,
        dispute: disputeRatio * 100,
        other: otherRatio * 100,
      },
      topPerformers: performers,
    };
  }

  async getValidatorsEarningsAttribution(
    validatorIds?: string[],
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<ValidatorEarningsAttribution[]> {
    const validators = await this.getValidators();
    const targetIds = validatorIds || validators.map((v) => v.id);

    const attributions = await Promise.all(
      targetIds.map((id) => this.getValidatorEarningsAttribution(id, period))
    );

    return attributions;
  }

  async getDisputeAmountDistributionStats(): Promise<DisputeAmountDistributionStats> {
    const disputes = await this.getDisputes();
    const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');

    if (disputes.length === 0) {
      return {
        avgStakeAmount: 0,
        avgRewardAmount: 0,
        avgTotalValue: 0,
        medianStakeAmount: 0,
        medianRewardAmount: 0,
        totalStakeAmount: 0,
        totalRewardAmount: 0,
        amountRanges: [],
        efficiency: {
          avgRewardToStakeRatio: 0,
          avgRoi: 0,
          highEfficiencyCount: 0,
          lowEfficiencyCount: 0,
        },
        amountTrends: [],
      };
    }

    const stakeAmounts = disputes.map((d) => d.stakeAmount);
    const rewardAmounts = resolvedDisputes.map((d) => d.rewardAmount);
    const totalValues = disputes.map((d) => d.totalValue);

    const avgStakeAmount = stakeAmounts.reduce((a, b) => a + b, 0) / stakeAmounts.length;
    const avgRewardAmount =
      rewardAmounts.length > 0
        ? rewardAmounts.reduce((a, b) => a + b, 0) / rewardAmounts.length
        : 0;
    const avgTotalValue = totalValues.reduce((a, b) => a + b, 0) / totalValues.length;

    const sortedStakes = [...stakeAmounts].sort((a, b) => a - b);
    const sortedRewards = [...rewardAmounts].sort((a, b) => a - b);
    const medianStakeAmount = sortedStakes[Math.floor(sortedStakes.length / 2)];
    const medianRewardAmount =
      sortedRewards.length > 0 ? sortedRewards[Math.floor(sortedRewards.length / 2)] : 0;

    const totalStakeAmount = stakeAmounts.reduce((a, b) => a + b, 0);
    const totalRewardAmount = rewardAmounts.reduce((a, b) => a + b, 0);

    const ranges = [
      { min: 0, max: 10000, label: '<10K' },
      { min: 10000, max: 20000, label: '10K-20K' },
      { min: 20000, max: 30000, label: '20K-30K' },
      { min: 30000, max: 40000, label: '30K-40K' },
      { min: 40000, max: 50000, label: '40K-50K' },
      { min: 50000, max: Infinity, label: '50K+' },
    ];

    const amountRanges = ranges.map((range) => {
      const rangeDisputes = disputes.filter(
        (d) => d.stakeAmount >= range.min && d.stakeAmount < range.max
      );
      const rangeResolved = rangeDisputes.filter((d) => d.status === 'resolved');
      const avgReward =
        rangeResolved.length > 0
          ? rangeResolved.reduce((sum, d) => sum + d.rewardAmount, 0) / rangeResolved.length
          : 0;
      const totalStake = rangeDisputes.reduce((sum, d) => sum + d.stakeAmount, 0);
      const totalReward = rangeResolved.reduce((sum, d) => sum + d.rewardAmount, 0);
      const roi = totalStake > 0 ? (totalReward / totalStake) * 100 : 0;

      return {
        range: range.label,
        min: range.min,
        max: range.max,
        count: rangeDisputes.length,
        avgReward,
        roi,
      };
    });

    const rewardToStakeRatios = resolvedDisputes.map((d) =>
      d.stakeAmount > 0 ? d.rewardAmount / d.stakeAmount : 0
    );
    const avgRewardToStakeRatio =
      rewardToStakeRatios.length > 0
        ? rewardToStakeRatios.reduce((a, b) => a + b, 0) / rewardToStakeRatios.length
        : 0;
    const avgRoi = avgRewardToStakeRatio * 100;

    const highEfficiencyCount = resolvedDisputes.filter((d) => {
      const roi = d.stakeAmount > 0 ? (d.rewardAmount / d.stakeAmount) * 100 : 0;
      return roi > 50;
    }).length;

    const lowEfficiencyCount = resolvedDisputes.filter((d) => {
      const roi = d.stakeAmount > 0 ? (d.rewardAmount / d.stakeAmount) * 100 : 0;
      return roi < 10;
    }).length;

    const amountTrends: DisputeAmountDistributionStats['amountTrends'] = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

      const dayDisputes = disputes.filter((d) => {
        const disputeDate = new Date(d.timestamp);
        return (
          disputeDate.getDate() === date.getDate() && disputeDate.getMonth() === date.getMonth()
        );
      });

      const dayResolved = dayDisputes.filter((d) => d.status === 'resolved');

      amountTrends.push({
        date: dateStr,
        avgStake:
          dayDisputes.length > 0
            ? dayDisputes.reduce((sum, d) => sum + d.stakeAmount, 0) / dayDisputes.length
            : 0,
        avgReward:
          dayResolved.length > 0
            ? dayResolved.reduce((sum, d) => sum + d.rewardAmount, 0) / dayResolved.length
            : 0,
        totalValue: dayDisputes.reduce((sum, d) => sum + d.totalValue, 0),
        disputeCount: dayDisputes.length,
      });
    }

    return {
      avgStakeAmount: parseFloat(avgStakeAmount.toFixed(2)),
      avgRewardAmount: parseFloat(avgRewardAmount.toFixed(2)),
      avgTotalValue: parseFloat(avgTotalValue.toFixed(2)),
      medianStakeAmount,
      medianRewardAmount,
      totalStakeAmount,
      totalRewardAmount,
      amountRanges,
      efficiency: {
        avgRewardToStakeRatio: parseFloat(avgRewardToStakeRatio.toFixed(4)),
        avgRoi: parseFloat(avgRoi.toFixed(2)),
        highEfficiencyCount,
        lowEfficiencyCount,
      },
      amountTrends,
    };
  }

  // Additional helper methods for real data
  isPriceFeedSupported(symbol: string, _chain?: Blockchain): boolean {
    // UMA only supports UMA token price directly
    return symbol.toUpperCase() === 'UMA';
  }

  getSupportedSymbols(): string[] {
    return [...umaSymbols];
  }

  getSupportedChainIds(symbol: string): number[] {
    if (symbol.toUpperCase() !== 'UMA') return [];
    return [1, 137, 42161, 10, 8453];
  }
}
