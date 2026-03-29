import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';

import type { OracleClientConfig } from './base';

export interface BandProtocolMarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  stakingRatio: number;
  stakingApr: number;
  timestamp: number;
}

export interface ValidatorInfo {
  operatorAddress: string;
  moniker: string;
  identity: string;
  website: string;
  details: string;
  tokens: number;
  delegatorShares: number;
  commissionRate: number;
  maxCommissionRate: number;
  maxCommissionChangeRate: number;
  uptime: number;
  jailed: boolean;
  rank: number;
}

export interface BandNetworkStats {
  activeValidators: number;
  totalValidators: number;
  bondedTokens: number;
  totalSupply: number;
  stakingRatio: number;
  blockTime: number;
  latestBlockHeight: number;
  inflationRate: number;
  communityPool: number;
  timestamp: number;
}

export interface ChainDataRequest {
  chainName: string;
  chainId: string;
  requestCount24h: number;
  requestCount7d: number;
  requestCount30d: number;
  avgGasCost: number;
  supportedSymbols: string[];
}

export interface IBCRelayer {
  address: string;
  moniker: string;
  transferCount: number;
  successRate: number;
}

export interface IBCConnection {
  chainName: string;
  chainId: string;
  channelId: string;
  connectionId: string;
  status: 'active' | 'inactive';
  transfers24h: number;
  transfers7d: number;
  totalTransfers: number;
  successRate: number;
  relayers: IBCRelayer[];
  lastActivity: number;
}

export interface IBCTransferStats {
  totalTransfers24h: number;
  totalTransfers7d: number;
  totalTransfers30d: number;
  successRate: number;
  activeChannels: number;
  activeRelayers: number;
}

export interface IBCTransferTrend {
  timestamp: number;
  transfers: number;
  successRate: number;
}

export interface StakingInfo {
  totalStaked: number;
  stakingRatio: number;
  stakingAPR: number;
  unbondingPeriod: number;
  minStake: number;
  slashingRate: number;
  communityPool: number;
  inflation: number;
}

export interface StakingDistribution {
  range: string;
  count: number;
  percentage: number;
  totalStake: number;
}

export interface StakingReward {
  principal: number;
  duration: number;
  estimatedReward: number;
  apy: number;
}

export type ProposalStatus = 'deposit' | 'voting' | 'passed' | 'rejected' | 'failed';
export type VoteOption = 'yes' | 'no' | 'abstain' | 'no_with_veto';

export interface GovernanceProposal {
  id: number;
  title: string;
  description: string;
  type: string;
  status: ProposalStatus;
  submitTime: number;
  depositEndTime: number;
  votingEndTime: number;
  proposer: string;
  totalDeposit: number;
  votes: {
    yes: number;
    no: number;
    abstain: number;
    noWithVeto: number;
  };
}

export interface GovernanceParams {
  minDeposit: number;
  maxDepositPeriod: number;
  votingPeriod: number;
  quorum: number;
  threshold: number;
  vetoThreshold: number;
}

export interface CrossChainStats {
  totalRequests24h: number;
  totalRequests7d: number;
  totalRequests30d: number;
  chains: ChainDataRequest[];
  timestamp: number;
}

export type TrendPeriod = '7d' | '30d' | '90d';

export interface CrossChainTrend {
  date: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  avgLatency: number;
}

export interface CrossChainComparison {
  period: TrendPeriod;
  currentTotal: number;
  previousTotal: number;
  changeAmount: number;
  changePercent: number;
  avgLatencyChange: number;
  successRateChange: number;
}

export interface RiskMetrics {
  decentralizationScore: number;
  securityScore: number;
  reliabilityScore: number;
  transparencyScore: number;
  overallScore: number;
  giniCoefficient: number;
  nakamotoCoefficient: number;
  top10ValidatorsShare: number;
}

export interface RiskTrendData {
  date: string;
  score: number;
  decentralization: number;
  security: number;
  reliability: number;
}

export interface RiskEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'error' | 'info';
  source: string;
}

export interface BandCrossChainSnapshot {
  timestamp: number;
  prices: Map<string, number>;
  deviations: Map<string, number>;
  avgLatency: number;
  maxDeviation: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface CrossChainPriceComparison {
  chain: string;
  chainId: string;
  currentPrice: number;
  historicalPrice: number;
  priceChange: number;
  priceChangePercent: number;
  currentDeviation: number;
  historicalDeviation: number;
  deviationChange: number;
  currentLatency: number;
  historicalLatency: number;
  latencyChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  ma7?: number;
  ma20?: number;
  stdDev1Upper?: number;
  stdDev1Lower?: number;
  stdDev2Upper?: number;
  stdDev2Lower?: number;
}

export interface TechnicalIndicators {
  ma7: number[];
  ma20: number[];
  stdDev1Upper: number[];
  stdDev1Lower: number[];
  stdDev2Upper: number[];
  stdDev2Lower: number[];
}

export function calculateMovingAverage(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(prices[i]);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((acc, p) => acc + p, 0);
      result.push(sum / period);
    }
  }
  return result;
}

export function calculateStandardDeviation(prices: number[]): {
  mean: number;
  stdDev: number;
  upper1: number;
  lower1: number;
  upper2: number;
  lower2: number;
} {
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    stdDev,
    upper1: mean + stdDev,
    lower1: mean - stdDev,
    upper2: mean + 2 * stdDev,
    lower2: mean - 2 * stdDev,
  };
}

export function calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
  const ma7 = calculateMovingAverage(prices, 7);
  const ma20 = calculateMovingAverage(prices, 20);

  const stdDevResult = calculateStandardDeviation(prices);

  return {
    ma7,
    ma20,
    stdDev1Upper: prices.map(() => stdDevResult.upper1),
    stdDev1Lower: prices.map(() => stdDevResult.lower1),
    stdDev2Upper: prices.map(() => stdDevResult.upper2),
    stdDev2Lower: prices.map(() => stdDevResult.lower2),
  };
}

export interface ValidatorHistory {
  timestamp: number;
  uptime: number;
  stakedAmount: number;
  commissionRate: number;
}

export type HistoryPeriod = 7 | 30 | 90;

export const enum EventType {
  DELEGATION = 'DELEGATION',
  UNDELEGATION = 'UNDELEGATION',
  COMMISSION_CHANGE = 'COMMISSION_CHANGE',
  JAILED = 'JAILED',
  UNJAILED = 'UNJAILED',
}

export const EVENT_TYPE_VALUES: readonly EventType[] = [
  EventType.DELEGATION,
  EventType.UNDELEGATION,
  EventType.COMMISSION_CHANGE,
  EventType.JAILED,
  EventType.UNJAILED,
] as const;

export interface ChainEvent {
  id: string;
  type: EventType;
  validator: string;
  validatorAddress: string;
  amount: number;
  timestamp: number;
  description: string;
  txHash: string;
}

export type OracleScriptCategory = 'price' | 'sports' | 'random' | 'custom';

export interface OracleScript {
  id: number;
  name: string;
  description: string;
  owner: string;
  schema: string;
  code: string;
  callCount: number;
  successRate: number;
  avgResponseTime: number;
  category: OracleScriptCategory;
  lastUpdated: number;
}

export type DataSourceCategory =
  | 'crypto'
  | 'forex'
  | 'commodities'
  | 'sports'
  | 'random'
  | 'equities'
  | 'stablecoin';

export interface DataSource {
  id: number;
  name: string;
  symbol: string;
  description: string;
  owner: string;
  provider: string;
  status: 'active' | 'inactive';
  lastUpdated: number;
  reliability: number;
  category: DataSourceCategory;
  updateFrequency: string;
  deviationThreshold: string;
  totalRequests: number;
  price?: number;
  change24h?: number;
}

export interface PriceFeed {
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  lastUpdated: number;
  dataSource: string;
  confidence: number;
  category: DataSourceCategory;
}

export interface DataSourceListResponse {
  dataSources: DataSource[];
  total: number;
  hasMore: boolean;
}

export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.COSMOS,
    Blockchain.OSMOSIS,
    Blockchain.JUNO,
  ];

  defaultUpdateIntervalMinutes = 30;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Band Protocol',
        'BAND_PROTOCOL_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical prices from Band Protocol',
        'BAND_PROTOCOL_HISTORICAL_ERROR'
      );
    }
  }

  async getDataSourceList(page: number = 1, limit: number = 20): Promise<DataSourceListResponse> {
    try {
      const allDataSources = await this.generateAllDataSources();
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedSources = allDataSources.slice(start, end);

      return {
        dataSources: paginatedSources,
        total: allDataSources.length,
        hasMore: end < allDataSources.length,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch data sources',
        'DATA_SOURCES_ERROR'
      );
    }
  }

  async getPriceFeeds(): Promise<PriceFeed[]> {
    try {
      const dataSources = await this.generateAllDataSources();
      return dataSources
        .filter((ds) => ds.price !== undefined)
        .map((ds) => ({
          symbol: ds.symbol,
          price: ds.price!,
          change24h: ds.change24h!,
          change24hPercent:
            ds.change24h !== undefined && ds.price !== undefined
              ? (ds.change24h / ds.price) * 100
              : 0,
          lastUpdated: ds.lastUpdated,
          dataSource: ds.provider,
          confidence: ds.reliability / 100,
          category: ds.category,
        }));
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price feeds',
        'PRICE_FEEDS_ERROR'
      );
    }
  }

  private async generateAllDataSources(): Promise<DataSource[]> {
    const dataSources: DataSource[] = [];
    const now = Date.now();

    const cryptoFeeds = [
      { symbol: 'BTC', name: 'Bitcoin', basePrice: 67842.35 },
      { symbol: 'ETH', name: 'Ethereum', basePrice: 3456.78 },
      { symbol: 'ATOM', name: 'Cosmos', basePrice: 8.45 },
      { symbol: 'OSMO', name: 'Osmosis', basePrice: 0.85 },
      { symbol: 'SOL', name: 'Solana', basePrice: 145.23 },
      { symbol: 'MATIC', name: 'Polygon', basePrice: 0.72 },
      { symbol: 'AVAX', name: 'Avalanche', basePrice: 35.67 },
      { symbol: 'LINK', name: 'Chainlink', basePrice: 14.89 },
      { symbol: 'DOT', name: 'Polkadot', basePrice: 7.12 },
      { symbol: 'UNI', name: 'Uniswap', basePrice: 9.34 },
      { symbol: 'ARB', name: 'Arbitrum', basePrice: 1.12 },
      { symbol: 'OP', name: 'Optimism', basePrice: 2.45 },
      { symbol: 'INJ', name: 'Injective', basePrice: 25.67 },
      { symbol: 'SEI', name: 'Sei', basePrice: 0.45 },
      { symbol: 'TIA', name: 'Celestia', basePrice: 12.34 },
      { symbol: 'BNB', name: 'BNB', basePrice: 587.23 },
      { symbol: 'XRP', name: 'Ripple', basePrice: 0.52 },
      { symbol: 'DOGE', name: 'Dogecoin', basePrice: 0.12 },
      { symbol: 'ADA', name: 'Cardano', basePrice: 0.45 },
      { symbol: 'NEAR', name: 'NEAR Protocol', basePrice: 5.67 },
    ];

    const stablecoinFeeds = [
      { symbol: 'USDC', name: 'USD Coin', basePrice: 1.0001 },
      { symbol: 'USDT', name: 'Tether', basePrice: 1.0002 },
      { symbol: 'DAI', name: 'Dai', basePrice: 0.9998 },
      { symbol: 'BUSD', name: 'Binance USD', basePrice: 1.0001 },
      { symbol: 'FRAX', name: 'Frax', basePrice: 0.9999 },
    ];

    const forexFeeds = [
      { symbol: 'EUR', name: 'Euro', basePrice: 1.0876 },
      { symbol: 'GBP', name: 'British Pound', basePrice: 1.2634 },
      { symbol: 'JPY', name: 'Japanese Yen', basePrice: 0.0067 },
      { symbol: 'CHF', name: 'Swiss Franc', basePrice: 1.1234 },
      { symbol: 'AUD', name: 'Australian Dollar', basePrice: 0.6543 },
    ];

    const commodityFeeds = [
      { symbol: 'XAU', name: 'Gold', basePrice: 2234.56 },
      { symbol: 'XAG', name: 'Silver', basePrice: 25.67 },
      { symbol: 'XBR', name: 'Brent Crude Oil', basePrice: 85.34 },
      { symbol: 'XTI', name: 'WTI Crude Oil', basePrice: 78.92 },
      { symbol: 'NG', name: 'Natural Gas', basePrice: 1.78 },
    ];

    const equityFeeds = [
      { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 178.45 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 156.78 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 423.56 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 178.23 },
      { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 245.67 },
    ];

    const providers = [
      'CoinGecko',
      'CoinMarketCap',
      'Binance',
      'Coinbase',
      'Kraken',
      'CryptoCompare',
      'Amberdata',
      'BraveNewCoin',
      'Kaiko',
      'Nomics',
    ];

    let id = 1;

    const generateDataSource = (
      feed: { symbol: string; name: string; basePrice: number },
      category: DataSourceCategory,
      updateFreq: string,
      deviation: string
    ): DataSource => {
      const priceChange = (Math.random() - 0.5) * feed.basePrice * 0.1;
      const currentPrice = feed.basePrice + priceChange;
      const reliability = 95 + Math.random() * 4.99;
      const totalRequests = Math.floor(Math.random() * 2000000) + 100000;

      return {
        id: id++,
        name: `${feed.symbol}/USD`,
        symbol: feed.symbol,
        description: `${feed.name} price feed in USD`,
        owner: `band1${this.generateRandomAddress()}`,
        provider: providers[Math.floor(Math.random() * providers.length)],
        status: Math.random() > 0.05 ? 'active' : 'inactive',
        lastUpdated: now - Math.floor(Math.random() * 60000),
        reliability: Number(reliability.toFixed(2)),
        category,
        updateFrequency: updateFreq,
        deviationThreshold: deviation,
        totalRequests,
        price: Number(currentPrice.toFixed(4)),
        change24h: Number(priceChange.toFixed(4)),
      };
    };

    cryptoFeeds.forEach((feed) => {
      dataSources.push(generateDataSource(feed, 'crypto', '30s', '0.5%'));
    });

    stablecoinFeeds.forEach((feed) => {
      dataSources.push(generateDataSource(feed, 'stablecoin', '300s', '0.1%'));
    });

    forexFeeds.forEach((feed) => {
      dataSources.push(generateDataSource(feed, 'forex', '300s', '0.2%'));
    });

    commodityFeeds.forEach((feed) => {
      dataSources.push(generateDataSource(feed, 'commodities', '600s', '0.5%'));
    });

    equityFeeds.forEach((feed) => {
      dataSources.push(generateDataSource(feed, 'equities', '900s', '0.3%'));
    });

    const sportsFeeds = [
      { symbol: 'NBA_SCORES', name: 'NBA Game Scores', basePrice: 0 },
      { symbol: 'NFL_SCORES', name: 'NFL Game Scores', basePrice: 0 },
      { symbol: 'SOCCER_ODDS', name: 'Soccer Match Odds', basePrice: 0 },
    ];

    sportsFeeds.forEach((feed) => {
      dataSources.push({
        id: id++,
        name: feed.name,
        symbol: feed.symbol,
        description: `${feed.name} data feed`,
        owner: `band1${this.generateRandomAddress()}`,
        provider: providers[Math.floor(Math.random() * providers.length)],
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        lastUpdated: now - Math.floor(Math.random() * 3600000),
        reliability: Number((98 + Math.random() * 1.99).toFixed(2)),
        category: 'sports',
        updateFrequency: '60s',
        deviationThreshold: 'N/A',
        totalRequests: Math.floor(Math.random() * 500000) + 50000,
      });
    });

    const randomFeeds = [
      { symbol: 'VRF_256', name: 'VRF Random 256-bit', basePrice: 0 },
      { symbol: 'VRF_64', name: 'VRF Random 64-bit', basePrice: 0 },
    ];

    randomFeeds.forEach((feed) => {
      dataSources.push({
        id: id++,
        name: feed.name,
        symbol: feed.symbol,
        description: `${feed.name} verifiable randomness`,
        owner: `band1${this.generateRandomAddress()}`,
        provider: 'Band VRF',
        status: 'active',
        lastUpdated: now - Math.floor(Math.random() * 10000),
        reliability: 99.99,
        category: 'random',
        updateFrequency: 'on-demand',
        deviationThreshold: 'N/A',
        totalRequests: Math.floor(Math.random() * 1000000) + 200000,
      });
    });

    return dataSources;
  }

  async getBandMarketData(): Promise<BandProtocolMarketData> {
    try {
      const basePrice = UNIFIED_BASE_PRICES.BAND || 2.5;
      const priceChange = (Math.random() - 0.5) * 0.5;
      const priceChangePercentage = (priceChange / basePrice) * 100;
      const currentPrice = basePrice + priceChange;
      const circulatingSupply = 145_000_000 + Math.random() * 5_000_000;
      const totalSupply = 165_000_000 + Math.random() * 5_000_000;

      return {
        symbol: 'BAND',
        price: Number(currentPrice.toFixed(4)),
        priceChange24h: Number(priceChange.toFixed(4)),
        priceChangePercentage24h: Number(priceChangePercentage.toFixed(2)),
        marketCap: Number((currentPrice * circulatingSupply).toFixed(2)),
        volume24h: Number((currentPrice * circulatingSupply * 0.05).toFixed(2)),
        circulatingSupply: Number(circulatingSupply.toFixed(2)),
        totalSupply: Number(totalSupply.toFixed(2)),
        maxSupply: 250_000_000,
        stakingRatio: Number((((circulatingSupply * 0.65) / circulatingSupply) * 100).toFixed(2)),
        stakingApr: Number((8 + Math.random() * 4).toFixed(2)),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch BAND market data',
        'BAND_MARKET_DATA_ERROR'
      );
    }
  }

  async getValidators(limit: number = 50): Promise<ValidatorInfo[]> {
    try {
      const validators: ValidatorInfo[] = [];
      const validatorNames = [
        'Band Foundation',
        'Cosmostation',
        'Stake.fish',
        'Figment',
        'Blockdaemon',
        'Everstake',
        'InfStones',
        'Staked',
        'Chorus One',
        'Dokia Capital',
        'P2P Validator',
        'SNZ Pool',
        'HashQuark',
        'Certus One',
        'B-Harvest',
        'StakeWith.Us',
        'Forbole',
        'Simply Staking',
        'Smart Stake',
        'KingNodes',
        'ChainLayer',
        'BlockNgine',
        'Stakin',
        'Lavender.Five',
        '0base.vc',
        'Masternode24',
        'Stakewolle',
        'Crosnest',
        'AutoStake',
        'Nodes.Guru',
        'Polkachu',
        'Imperator.co',
        'StakeLab',
        'Kollider',
        'NodeStake',
        'Stakely',
        'Staking4All',
        'Citadel.one',
        'Kleomedes',
        'Golden Ratio Staking',
        'Disperze',
        'Tessellated',
        'Notional',
        'Strangelove',
        'SG-1',
        'Oni',
        'WhisperNode',
        'Cosmos Spaces',
        'Validatrium',
        'Staking Fund',
        'Moonlet',
      ];

      const totalTokens = 85_000_000 + Math.random() * 10_000_000;

      for (let i = 0; i < Math.min(limit, validatorNames.length); i++) {
        const tokens =
          i === 0 ? totalTokens * 0.08 : totalTokens * (0.05 / (i + 1) + Math.random() * 0.01);

        validators.push({
          operatorAddress: `bandvaloper1${this.generateRandomAddress()}`,
          moniker: validatorNames[i],
          identity: this.generateRandomHex(16),
          website:
            i < 10 ? `https://${validatorNames[i].toLowerCase().replace(/\s+/g, '')}.com` : '',
          details: `Professional validator ${validatorNames[i]} securing Band Protocol network`,
          tokens: Number(tokens.toFixed(2)),
          delegatorShares: Number(tokens.toFixed(2)),
          commissionRate: Number((0.05 + Math.random() * 0.15).toFixed(4)),
          maxCommissionRate: Number((0.15 + Math.random() * 0.1).toFixed(4)),
          maxCommissionChangeRate: Number((0.01 + Math.random() * 0.02).toFixed(4)),
          uptime: Number((99.5 + Math.random() * 0.48).toFixed(2)),
          jailed: false,
          rank: i + 1,
        });
      }

      return validators;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch validators',
        'VALIDATORS_ERROR'
      );
    }
  }

  async getNetworkStats(): Promise<BandNetworkStats> {
    try {
      const totalValidators = 72 + Math.floor(Math.random() * 15);
      const activeValidators = 65 + Math.floor(Math.random() * 10);
      const bondedTokens = 85_000_000 + Math.random() * 10_000_000;
      const totalSupply = 165_000_000 + Math.random() * 5_000_000;

      return {
        activeValidators,
        totalValidators,
        bondedTokens: Number(bondedTokens.toFixed(2)),
        totalSupply: Number(totalSupply.toFixed(2)),
        stakingRatio: Number(((bondedTokens / totalSupply) * 100).toFixed(2)),
        blockTime: Number((2.8 + Math.random() * 0.4).toFixed(2)),
        latestBlockHeight: 15_000_000 + Math.floor(Math.random() * 1_000_000),
        inflationRate: Number((7 + Math.random() * 3).toFixed(2)),
        communityPool: Number((500_000 + Math.random() * 100_000).toFixed(2)),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch network stats',
        'NETWORK_STATS_ERROR'
      );
    }
  }

  async getCrossChainStats(): Promise<CrossChainStats> {
    try {
      const chains: ChainDataRequest[] = [
        {
          chainName: 'Cosmos Hub',
          chainId: 'cosmoshub-4',
          requestCount24h: 1500 + Math.floor(Math.random() * 500),
          requestCount7d: 10000 + Math.floor(Math.random() * 3000),
          requestCount30d: 45000 + Math.floor(Math.random() * 15000),
          avgGasCost: 0.0025 + Math.random() * 0.001,
          supportedSymbols: ['ATOM', 'OSMO', 'JUNO', 'STARS'],
        },
        {
          chainName: 'Osmosis',
          chainId: 'osmosis-1',
          requestCount24h: 2000 + Math.floor(Math.random() * 800),
          requestCount7d: 14000 + Math.floor(Math.random() * 5000),
          requestCount30d: 60000 + Math.floor(Math.random() * 20000),
          avgGasCost: 0.003 + Math.random() * 0.0015,
          supportedSymbols: ['OSMO', 'ATOM', 'USDC', 'WBTC'],
        },
        {
          chainName: 'Ethereum',
          chainId: '1',
          requestCount24h: 3000 + Math.floor(Math.random() * 1000),
          requestCount7d: 21000 + Math.floor(Math.random() * 7000),
          requestCount30d: 90000 + Math.floor(Math.random() * 30000),
          avgGasCost: 0.005 + Math.random() * 0.002,
          supportedSymbols: ['ETH', 'USDC', 'USDT', 'WBTC', 'DAI'],
        },
        {
          chainName: 'Polygon',
          chainId: '137',
          requestCount24h: 1200 + Math.floor(Math.random() * 400),
          requestCount7d: 8400 + Math.floor(Math.random() * 2800),
          requestCount30d: 36000 + Math.floor(Math.random() * 12000),
          avgGasCost: 0.001 + Math.random() * 0.0005,
          supportedSymbols: ['MATIC', 'USDC', 'USDT', 'WETH'],
        },
        {
          chainName: 'Avalanche',
          chainId: '43114',
          requestCount24h: 800 + Math.floor(Math.random() * 300),
          requestCount7d: 5600 + Math.floor(Math.random() * 2100),
          requestCount30d: 24000 + Math.floor(Math.random() * 9000),
          avgGasCost: 0.0015 + Math.random() * 0.0007,
          supportedSymbols: ['AVAX', 'USDC', 'USDT', 'BTC.b'],
        },
        {
          chainName: 'Fantom',
          chainId: '250',
          requestCount24h: 600 + Math.floor(Math.random() * 200),
          requestCount7d: 4200 + Math.floor(Math.random() * 1400),
          requestCount30d: 18000 + Math.floor(Math.random() * 6000),
          avgGasCost: 0.0012 + Math.random() * 0.0006,
          supportedSymbols: ['FTM', 'USDC', 'USDT', 'WETH'],
        },
        {
          chainName: 'Cronos',
          chainId: '25',
          requestCount24h: 400 + Math.floor(Math.random() * 150),
          requestCount7d: 2800 + Math.floor(Math.random() * 1050),
          requestCount30d: 12000 + Math.floor(Math.random() * 4500),
          avgGasCost: 0.001 + Math.random() * 0.0005,
          supportedSymbols: ['CRO', 'USDC', 'USDT', 'WBTC'],
        },
        {
          chainName: 'Juno',
          chainId: 'juno-1',
          requestCount24h: 300 + Math.floor(Math.random() * 100),
          requestCount7d: 2100 + Math.floor(Math.random() * 700),
          requestCount30d: 9000 + Math.floor(Math.random() * 3000),
          avgGasCost: 0.002 + Math.random() * 0.0008,
          supportedSymbols: ['JUNO', 'ATOM', 'OSMO', 'STARS'],
        },
      ];

      const totalRequests24h = chains.reduce((sum, chain) => sum + chain.requestCount24h, 0);
      const totalRequests7d = chains.reduce((sum, chain) => sum + chain.requestCount7d, 0);
      const totalRequests30d = chains.reduce((sum, chain) => sum + chain.requestCount30d, 0);

      return {
        totalRequests24h,
        totalRequests7d,
        totalRequests30d,
        chains,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch cross-chain stats',
        'CROSS_CHAIN_STATS_ERROR'
      );
    }
  }

  async getCrossChainTrend(period: TrendPeriod = '7d'): Promise<CrossChainTrend[]> {
    try {
      const trends: CrossChainTrend[] = [];
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;

      const periodDays: Record<TrendPeriod, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const days = periodDays[period];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * dayMs);
        const dateStr = date.toISOString().split('T')[0];

        const baseRequests = 9800 + Math.floor(Math.random() * 4000);
        const trend = Math.sin(i / 3) * 800;
        const requestCount = Math.floor(baseRequests + trend + (Math.random() - 0.5) * 1000);

        const successRate = 0.97 + Math.random() * 0.025;
        const successCount = Math.floor(requestCount * successRate);
        const failureCount = requestCount - successCount;

        const avgLatency = 150 + Math.floor(Math.random() * 100);

        trends.push({
          date: dateStr,
          requestCount,
          successCount,
          failureCount,
          avgLatency,
        });
      }

      return trends;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch cross-chain trend',
        'CROSS_CHAIN_TREND_ERROR'
      );
    }
  }

  async getCrossChainComparison(period: TrendPeriod = '7d'): Promise<CrossChainComparison> {
    try {
      const trends = await this.getCrossChainTrend(period);

      const periodDays: Record<TrendPeriod, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const days = periodDays[period];
      const halfDays = Math.floor(days / 2);

      const currentPeriod = trends.slice(halfDays);
      const previousPeriod = trends.slice(0, halfDays);

      const currentTotal = currentPeriod.reduce((sum, t) => sum + t.requestCount, 0);
      const previousTotal = previousPeriod.reduce((sum, t) => sum + t.requestCount, 0);

      const changeAmount = currentTotal - previousTotal;
      const changePercent = previousTotal > 0 ? (changeAmount / previousTotal) * 100 : 0;

      const currentAvgLatency =
        currentPeriod.reduce((sum, t) => sum + t.avgLatency, 0) / currentPeriod.length;
      const previousAvgLatency =
        previousPeriod.reduce((sum, t) => sum + t.avgLatency, 0) / previousPeriod.length;
      const avgLatencyChange = currentAvgLatency - previousAvgLatency;

      const currentSuccessRate =
        currentPeriod.reduce((sum, t) => sum + t.successCount, 0) /
        currentPeriod.reduce((sum, t) => sum + t.requestCount, 0);
      const previousSuccessRate =
        previousPeriod.reduce((sum, t) => sum + t.successCount, 0) /
        previousPeriod.reduce((sum, t) => sum + t.requestCount, 0);
      const successRateChange = (currentSuccessRate - previousSuccessRate) * 100;

      return {
        period,
        currentTotal,
        previousTotal,
        changeAmount,
        changePercent,
        avgLatencyChange,
        successRateChange,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch cross-chain comparison',
        'CROSS_CHAIN_COMPARISON_DATA_ERROR'
      );
    }
  }

  async getHistoricalBandPrices(
    period: '1d' | '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<HistoricalPricePoint[]> {
    try {
      const basePrice = UNIFIED_BASE_PRICES.BAND || 2.5;
      const prices: HistoricalPricePoint[] = [];

      const periodConfig: Record<string, { points: number; intervalHours: number }> = {
        '1d': { points: 24, intervalHours: 1 },
        '7d': { points: 84, intervalHours: 2 },
        '30d': { points: 120, intervalHours: 6 },
        '90d': { points: 90, intervalHours: 24 },
        '1y': { points: 365, intervalHours: 24 },
      };

      const config = periodConfig[period];
      const now = Date.now();
      const intervalMs = config.intervalHours * 60 * 60 * 1000;

      for (let i = 0; i < config.points; i++) {
        const timestamp = now - (config.points - 1 - i) * intervalMs;
        const volatility = 0.03;
        const trend = Math.sin(i / 10) * 0.1;
        const randomChange = (Math.random() - 0.5) * 2 * volatility;
        const price = basePrice * (1 + trend + randomChange);
        const open = price * (1 + (Math.random() - 0.5) * 0.02);
        const close = price;
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);

        prices.push({
          timestamp,
          price: Number(price.toFixed(4)),
          volume: Number((100000 + Math.random() * 500000).toFixed(2)),
          high: Number(high.toFixed(4)),
          low: Number(low.toFixed(4)),
          open: Number(open.toFixed(4)),
          close: Number(close.toFixed(4)),
        });
      }

      const priceValues = prices.map((p) => p.price);
      const indicators = calculateTechnicalIndicators(priceValues);

      return prices.map((point, index) => ({
        ...point,
        ma7: indicators.ma7[index],
        ma20: indicators.ma20[index],
        stdDev1Upper: indicators.stdDev1Upper[index],
        stdDev1Lower: indicators.stdDev1Lower[index],
        stdDev2Upper: indicators.stdDev2Upper[index],
        stdDev2Lower: indicators.stdDev2Lower[index],
      }));
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical BAND prices',
        'HISTORICAL_BAND_PRICES_ERROR'
      );
    }
  }

  private generateRandomAddress(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 39; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getValidatorHistory(
    validatorAddress: string,
    period: HistoryPeriod = 30
  ): Promise<ValidatorHistory[]> {
    try {
      const history: ValidatorHistory[] = [];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      const baseUptime = 99.5 + Math.random() * 0.48;
      const baseStakedAmount = 1000000 + Math.random() * 5000000;
      const baseCommissionRate = 0.05 + Math.random() * 0.15;

      for (let i = 0; i < period; i++) {
        const timestamp = now - (period - 1 - i) * dayMs;

        const uptimeVariation = (Math.random() - 0.5) * 0.5;
        const uptime = Math.min(100, Math.max(95, baseUptime + uptimeVariation));

        const stakeVariation = (Math.random() - 0.5) * 0.1;
        const stakedAmount = baseStakedAmount * (1 + stakeVariation);

        const commissionVariation = (Math.random() - 0.5) * 0.02;
        const commissionRate = Math.min(
          0.3,
          Math.max(0.01, baseCommissionRate + commissionVariation)
        );

        history.push({
          timestamp,
          uptime: Number(uptime.toFixed(2)),
          stakedAmount: Number(stakedAmount.toFixed(2)),
          commissionRate: Number(commissionRate.toFixed(4)),
        });
      }

      return history;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch validator history',
        'VALIDATOR_HISTORY_ERROR'
      );
    }
  }

  async getCrossChainSnapshot(timestamp: number): Promise<BandCrossChainSnapshot> {
    try {
      const prices = new Map<string, number>();
      const deviations = new Map<string, number>();

      const basePrices: Record<string, number> = {
        'BTC/USD': 67842.35,
        'ETH/USD': 3456.78,
        'USDC/USD': 1.0001,
      };

      const chains = ['Cosmos Hub', 'Osmosis', 'Ethereum', 'Polygon', 'Avalanche', 'Fantom'];

      const now = Date.now();
      const hoursAgo = (now - timestamp) / (1000 * 60 * 60);
      const timeFactor = Math.max(0, Math.min(1, hoursAgo / (24 * 30)));

      let totalLatency = 0;
      let maxDeviation = 0;

      chains.forEach((chain, index) => {
        Object.entries(basePrices).forEach(([symbol, basePrice]) => {
          const key = `${chain}:${symbol}`;
          const volatility = 0.02 * timeFactor;
          const randomChange = (Math.random() - 0.5) * 2 * volatility;
          const price = basePrice * (1 + randomChange);
          prices.set(key, Number(price.toFixed(4)));

          if (index > 0) {
            const deviationFactor = (Math.random() - 0.5) * 0.8 * (1 - timeFactor * 0.3);
            deviations.set(key, Number(deviationFactor.toFixed(4)));
            maxDeviation = Math.max(maxDeviation, Math.abs(deviationFactor));
          }
        });

        totalLatency += Math.floor(Math.random() * 100 + 50);
      });

      const avgLatency = Math.round(totalLatency / chains.length);

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (maxDeviation >= 0.5) {
        status = 'critical';
      } else if (maxDeviation >= 0.1) {
        status = 'warning';
      }

      return {
        timestamp,
        prices,
        deviations,
        avgLatency,
        maxDeviation,
        status,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch cross-chain snapshot',
        'CROSS_CHAIN_SNAPSHOT_ERROR'
      );
    }
  }

  getAvailableSnapshotDates(): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    return dates;
  }

  async compareWithHistorical(
    currentData: Map<string, { price: number; deviation: number; latency: number }>,
    historicalTimestamp: number
  ): Promise<CrossChainPriceComparison[]> {
    try {
      const snapshot = await this.getCrossChainSnapshot(historicalTimestamp);
      const comparisons: CrossChainPriceComparison[] = [];

      const chains = [
        { name: 'Cosmos Hub', chainId: 'cosmoshub-4' },
        { name: 'Osmosis', chainId: 'osmosis-1' },
        { name: 'Ethereum', chainId: '1' },
        { name: 'Polygon', chainId: '137' },
        { name: 'Avalanche', chainId: '43114' },
        { name: 'Fantom', chainId: '250' },
      ];

      chains.forEach((chain) => {
        const current = currentData.get(chain.name);
        if (!current) return;

        const historicalPrice = snapshot.prices.get(`${chain.name}:BTC/USD`) || current.price;
        const historicalDeviation = snapshot.deviations.get(`${chain.name}:BTC/USD`) || 0;
        const historicalLatency = snapshot.avgLatency;

        const priceChange = current.price - historicalPrice;
        const priceChangePercent =
          historicalPrice !== 0 ? (priceChange / historicalPrice) * 100 : 0;

        const deviationChange = current.deviation - historicalDeviation;
        const latencyChange = current.latency - historicalLatency;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (priceChangePercent > 0.5) {
          trend = 'up';
        } else if (priceChangePercent < -0.5) {
          trend = 'down';
        }

        comparisons.push({
          chain: chain.name,
          chainId: chain.chainId,
          currentPrice: current.price,
          historicalPrice,
          priceChange,
          priceChangePercent,
          currentDeviation: current.deviation,
          historicalDeviation,
          deviationChange,
          currentLatency: current.latency,
          historicalLatency,
          latencyChange,
          trend,
        });
      });

      return comparisons;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to compare with historical data',
        'CROSS_CHAIN_COMPARISON_ERROR'
      );
    }
  }

  async getChainEvents(limit: number = 20, type?: EventType): Promise<ChainEvent[]> {
    try {
      const events: ChainEvent[] = [];
      const validatorNames = [
        'Band Foundation',
        'Cosmostation',
        'Stake.fish',
        'Figment',
        'Blockdaemon',
        'Everstake',
        'InfStones',
        'Staked',
        'Chorus One',
        'Dokia Capital',
      ];

      const eventTemplates: Record<
        EventType,
        { description: string; minAmount: number; maxAmount: number }
      > = {
        [EventType.DELEGATION]: {
          description: 'Delegated to validator',
          minAmount: 1000,
          maxAmount: 50000,
        },
        [EventType.UNDELEGATION]: {
          description: 'Undelegated from validator',
          minAmount: 500,
          maxAmount: 30000,
        },
        [EventType.COMMISSION_CHANGE]: {
          description: 'Commission rate updated',
          minAmount: 0,
          maxAmount: 0,
        },
        [EventType.JAILED]: {
          description: 'Validator jailed for downtime',
          minAmount: 0,
          maxAmount: 0,
        },
        [EventType.UNJAILED]: {
          description: 'Validator unjailed',
          minAmount: 0,
          maxAmount: 0,
        },
      };

      const now = Date.now();

      for (let i = 0; i < limit; i++) {
        const eventTypes = type ? [type] : EVENT_TYPE_VALUES;
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const template = eventTemplates[eventType];
        const validator = validatorNames[Math.floor(Math.random() * validatorNames.length)];

        const timestamp = now - Math.floor(Math.random() * 24 * 60 * 60 * 1000);
        const amount =
          template.minAmount === template.maxAmount
            ? 0
            : template.minAmount + Math.random() * (template.maxAmount - template.minAmount);

        events.push({
          id: `evt-${this.generateRandomHex(12)}`,
          type: eventType,
          validator,
          validatorAddress: `bandvaloper1${this.generateRandomAddress()}`,
          amount: Number(amount.toFixed(2)),
          timestamp,
          description: template.description,
          txHash: `0x${this.generateRandomHex(64)}`,
        });
      }

      return events.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch chain events',
        'CHAIN_EVENTS_ERROR'
      );
    }
  }

  async getOracleScripts(): Promise<OracleScript[]> {
    try {
      const scripts: OracleScript[] = [];
      const scriptTemplates = [
        {
          name: 'Crypto Price Feed',
          description: 'Retrieves real-time cryptocurrency prices from multiple exchanges',
          category: 'price' as OracleScriptCategory,
          baseCalls: 150000,
        },
        {
          name: 'Stock Price Oracle',
          description: 'Fetches stock market prices from major exchanges',
          category: 'price' as OracleScriptCategory,
          baseCalls: 85000,
        },
        {
          name: 'Forex Rates',
          description: 'Provides foreign exchange rates for major currency pairs',
          category: 'price' as OracleScriptCategory,
          baseCalls: 62000,
        },
        {
          name: 'Commodity Prices',
          description: 'Real-time commodity prices including gold, silver, and oil',
          category: 'price' as OracleScriptCategory,
          baseCalls: 45000,
        },
        {
          name: 'Sports Scores',
          description: 'Live sports scores and results from major leagues',
          category: 'sports' as OracleScriptCategory,
          baseCalls: 38000,
        },
        {
          name: 'Match Results',
          description: 'Historical and live match results for betting applications',
          category: 'sports' as OracleScriptCategory,
          baseCalls: 28000,
        },
        {
          name: 'VRF Random Number',
          description: 'Verifiable random number generation for gaming and lotteries',
          category: 'random' as OracleScriptCategory,
          baseCalls: 95000,
        },
        {
          name: 'Secure Randomness',
          description: 'Cryptographically secure random number generation',
          category: 'random' as OracleScriptCategory,
          baseCalls: 72000,
        },
        {
          name: 'Weather Data',
          description: 'Weather information from global meteorological services',
          category: 'custom' as OracleScriptCategory,
          baseCalls: 22000,
        },
        {
          name: 'NFT Price Oracle',
          description: 'NFT collection valuations and market data',
          category: 'custom' as OracleScriptCategory,
          baseCalls: 35000,
        },
        {
          name: 'DeFi TVL Feed',
          description: 'Total Value Locked data for DeFi protocols',
          category: 'custom' as OracleScriptCategory,
          baseCalls: 48000,
        },
        {
          name: 'Gas Price Oracle',
          description: 'Real-time gas price estimates across multiple chains',
          category: 'custom' as OracleScriptCategory,
          baseCalls: 110000,
        },
      ];

      for (let i = 0; i < scriptTemplates.length; i++) {
        const template = scriptTemplates[i];
        const callCount = template.baseCalls + Math.floor(Math.random() * 20000);
        const successRate = 95 + Math.random() * 4.99;
        const avgResponseTime = 200 + Math.floor(Math.random() * 800);

        scripts.push({
          id: i + 1,
          name: template.name,
          description: template.description,
          owner: `band1${this.generateRandomAddress()}`,
          schema: `{"input": "symbol", "output": "price"}`,
          code: `// Oracle Script: ${template.name}\n// Execute data request...\nreturn fetchPrice(symbol);`,
          callCount,
          successRate: Number(successRate.toFixed(2)),
          avgResponseTime,
          category: template.category,
          lastUpdated: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
        });
      }

      return scripts;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch oracle scripts',
        'ORACLE_SCRIPTS_ERROR'
      );
    }
  }

  async getOracleScriptById(id: number): Promise<OracleScript | null> {
    try {
      const scripts = await this.getOracleScripts();
      return scripts.find((s) => s.id === id) || null;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch oracle script',
        'ORACLE_SCRIPT_ERROR'
      );
    }
  }

  async getIBCConnections(): Promise<IBCConnection[]> {
    try {
      const connections: IBCConnection[] = [];
      const chainConfigs = [
        {
          name: 'Cosmos Hub',
          chainId: 'cosmoshub-4',
          channelId: 'channel-0',
          connectionId: 'connection-0',
        },
        {
          name: 'Osmosis',
          chainId: 'osmosis-1',
          channelId: 'channel-1',
          connectionId: 'connection-1',
        },
        { name: 'Juno', chainId: 'juno-1', channelId: 'channel-2', connectionId: 'connection-2' },
        {
          name: 'Stargaze',
          chainId: 'stargaze-1',
          channelId: 'channel-3',
          connectionId: 'connection-3',
        },
        {
          name: 'Stride',
          chainId: 'stride-1',
          channelId: 'channel-4',
          connectionId: 'connection-4',
        },
        {
          name: 'Axelar',
          chainId: 'axelar-dojo-1',
          channelId: 'channel-5',
          connectionId: 'connection-5',
        },
        {
          name: 'Injective',
          chainId: 'injective-1',
          channelId: 'channel-6',
          connectionId: 'connection-6',
        },
        {
          name: 'Persistence',
          chainId: 'core-1',
          channelId: 'channel-7',
          connectionId: 'connection-7',
        },
        {
          name: 'Crescent',
          chainId: 'crescent-1',
          channelId: 'channel-8',
          connectionId: 'connection-8',
        },
        {
          name: 'Kujira',
          chainId: 'kaiyo-1',
          channelId: 'channel-9',
          connectionId: 'connection-9',
        },
        {
          name: 'Neutron',
          chainId: 'neutron-1',
          channelId: 'channel-10',
          connectionId: 'connection-10',
        },
        {
          name: 'Celestia',
          chainId: 'celestia-1',
          channelId: 'channel-11',
          connectionId: 'connection-11',
        },
      ];

      const relayerNames = ['Stride Rly', 'Cosmos Rly', 'IBC Go', 'Hermes', 'TsRelayer', 'Polymer'];

      const now = Date.now();

      for (const config of chainConfigs) {
        const isActive = Math.random() > 0.15;
        const transfers24h = isActive
          ? Math.floor(Math.random() * 500 + 100)
          : Math.floor(Math.random() * 50);
        const transfers7d = transfers24h * 7 + Math.floor(Math.random() * 500);
        const totalTransfers = transfers7d * 4 + Math.floor(Math.random() * 5000);
        const successRate = isActive ? 98 + Math.random() * 1.9 : 85 + Math.random() * 10;

        const relayerCount = Math.floor(Math.random() * 3) + 1;
        const relayers: IBCRelayer[] = [];

        for (let i = 0; i < relayerCount; i++) {
          const relayerName = relayerNames[Math.floor(Math.random() * relayerNames.length)];
          relayers.push({
            address: `band1${this.generateRandomAddress()}`,
            moniker: relayerName,
            transferCount: Math.floor(Math.random() * transfers24h * 0.6 + transfers24h * 0.2),
            successRate: 95 + Math.random() * 4.9,
          });
        }

        connections.push({
          chainName: config.name,
          chainId: config.chainId,
          channelId: config.channelId,
          connectionId: config.connectionId,
          status: isActive ? 'active' : 'inactive',
          transfers24h,
          transfers7d,
          totalTransfers,
          successRate: Number(successRate.toFixed(2)),
          relayers,
          lastActivity: isActive
            ? now - Math.floor(Math.random() * 3600000)
            : now - Math.floor(Math.random() * 86400000 * 7),
        });
      }

      return connections;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch IBC connections',
        'IBC_CONNECTIONS_ERROR'
      );
    }
  }

  async getIBCTransferStats(): Promise<IBCTransferStats> {
    try {
      const connections = await this.getIBCConnections();
      const activeConnections = connections.filter((c) => c.status === 'active');

      const totalTransfers24h = connections.reduce((sum, c) => sum + c.transfers24h, 0);
      const totalTransfers7d = connections.reduce((sum, c) => sum + c.transfers7d, 0);
      const totalTransfers30d = totalTransfers7d * 4 + Math.floor(Math.random() * 10000);
      const avgSuccessRate =
        connections.reduce((sum, c) => sum + c.successRate, 0) / connections.length;
      const activeRelayers = connections.reduce((sum, c) => sum + c.relayers.length, 0);

      return {
        totalTransfers24h,
        totalTransfers7d,
        totalTransfers30d,
        successRate: Number(avgSuccessRate.toFixed(2)),
        activeChannels: activeConnections.length,
        activeRelayers,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch IBC transfer stats',
        'IBC_TRANSFER_STATS_ERROR'
      );
    }
  }

  async getIBCTransferTrends(days: number = 7): Promise<IBCTransferTrend[]> {
    try {
      const trends: IBCTransferTrend[] = [];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      for (let i = days - 1; i >= 0; i--) {
        const timestamp = now - i * dayMs;
        const baseTransfers = 3000 + Math.floor(Math.random() * 1000);
        const trend = Math.sin(i / 2) * 500;
        const transfers = Math.floor(baseTransfers + trend + (Math.random() - 0.5) * 500);
        const successRate = 97 + Math.random() * 2.5;

        trends.push({
          timestamp,
          transfers,
          successRate: Number(successRate.toFixed(2)),
        });
      }

      return trends;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch IBC transfer trends',
        'IBC_TRANSFER_TRENDS_ERROR'
      );
    }
  }

  async getStakingInfo(): Promise<StakingInfo> {
    try {
      const networkStats = await this.getNetworkStats();
      const marketData = await this.getBandMarketData();

      return {
        totalStaked: networkStats.bondedTokens,
        stakingRatio: networkStats.stakingRatio,
        stakingAPR: marketData.stakingApr,
        unbondingPeriod: 21,
        minStake: 100,
        slashingRate: 0.05,
        communityPool: networkStats.communityPool,
        inflation: networkStats.inflationRate,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch staking info',
        'STAKING_INFO_ERROR'
      );
    }
  }

  async getStakingDistribution(): Promise<StakingDistribution[]> {
    try {
      const validators = await this.getValidators(50);
      const totalStake = validators.reduce((sum, v) => sum + v.tokens, 0);

      const ranges = [
        { range: '0 - 100', min: 0, max: 100 },
        { range: '100 - 1K', min: 100, max: 1000 },
        { range: '1K - 10K', min: 1000, max: 10000 },
        { range: '10K - 100K', min: 10000, max: 100000 },
        { range: '100K - 1M', min: 100000, max: 1000000 },
        { range: '1M+', min: 1000000, max: Infinity },
      ];

      const distribution: StakingDistribution[] = ranges.map((r) => {
        const count = validators.filter((v) => v.tokens >= r.min && v.tokens < r.max).length;
        const totalStakeInRange = validators
          .filter((v) => v.tokens >= r.min && v.tokens < r.max)
          .reduce((sum, v) => sum + v.tokens, 0);
        const percentage = totalStake > 0 ? (totalStakeInRange / totalStake) * 100 : 0;

        return {
          range: r.range,
          count,
          percentage: Number(percentage.toFixed(2)),
          totalStake: Number(totalStakeInRange.toFixed(2)),
        };
      });

      return distribution;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch staking distribution',
        'STAKING_DISTRIBUTION_ERROR'
      );
    }
  }

  calculateStakingReward(amount: number, durationDays: number): StakingReward {
    const apr = 10 + Math.random() * 4;
    const dailyRate = apr / 100 / 365;
    const estimatedReward = amount * dailyRate * durationDays;
    const apy = (Math.pow(1 + apr / 100 / 365, 365) - 1) * 100;

    return {
      principal: amount,
      duration: durationDays,
      estimatedReward: Number(estimatedReward.toFixed(4)),
      apy: Number(apy.toFixed(2)),
    };
  }

  async getRiskMetrics(): Promise<RiskMetrics> {
    try {
      const validators = await this.getValidators(50);
      const networkStats = await this.getNetworkStats();

      const totalStake = validators.reduce((sum, v) => sum + v.tokens, 0);
      const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);

      const stakes = sortedValidators.map((v) => v.tokens);
      const giniCoefficient = this.calculateGiniCoefficient(stakes);

      const top10Stake = sortedValidators.slice(0, 10).reduce((sum, v) => sum + v.tokens, 0);
      const top10ValidatorsShare = (top10Stake / totalStake) * 100;

      const nakamotoCoefficient = this.calculateNakamotoCoefficient(sortedValidators, totalStake);

      const avgUptime =
        validators.reduce((sum, v) => sum + v.uptime, 0) / validators.length;
      const avgCommission =
        validators.reduce((sum, v) => sum + v.commissionRate, 0) / validators.length;

      const decentralizationScore = Math.max(
        0,
        Math.min(100, 100 - giniCoefficient * 100 - (top10ValidatorsShare - 33) * 0.5)
      );

      const securityScore = Math.max(
        0,
        Math.min(100, 70 + networkStats.activeValidators * 0.3 + (100 - top10ValidatorsShare) * 0.3)
      );

      const reliabilityScore = Math.max(0, Math.min(100, avgUptime));

      const transparencyScore = 75 + Math.random() * 10;

      const overallScore =
        (decentralizationScore * 0.3 + securityScore * 0.3 + reliabilityScore * 0.25 + transparencyScore * 0.15);

      return {
        decentralizationScore: Number(decentralizationScore.toFixed(1)),
        securityScore: Number(securityScore.toFixed(1)),
        reliabilityScore: Number(reliabilityScore.toFixed(1)),
        transparencyScore: Number(transparencyScore.toFixed(1)),
        overallScore: Number(overallScore.toFixed(1)),
        giniCoefficient: Number(giniCoefficient.toFixed(3)),
        nakamotoCoefficient,
        top10ValidatorsShare: Number(top10ValidatorsShare.toFixed(1)),
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch risk metrics',
        'RISK_METRICS_ERROR'
      );
    }
  }

  async getRiskTrendData(days: number = 30): Promise<RiskTrendData[]> {
    try {
      const trends: RiskTrendData[] = [];
      const now = new Date();

      const baseDecentralization = 72;
      const baseSecurity = 78;
      const baseReliability = 94;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayVariation = Math.sin(i / 5) * 3 + (Math.random() - 0.5) * 4;
        const decentralization = Math.max(60, Math.min(85, baseDecentralization + dayVariation));
        const security = Math.max(70, Math.min(90, baseSecurity + dayVariation * 0.8));
        const reliability = Math.max(90, Math.min(99, baseReliability + dayVariation * 0.3));

        const score = decentralization * 0.3 + security * 0.3 + reliability * 0.25 + 75 * 0.15;

        trends.push({
          date: dateStr,
          score: Number(score.toFixed(1)),
          decentralization: Number(decentralization.toFixed(1)),
          security: Number(security.toFixed(1)),
          reliability: Number(reliability.toFixed(1)),
        });
      }

      return trends;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch risk trend data',
        'RISK_TREND_ERROR'
      );
    }
  }

  async getSecurityAuditEvents(): Promise<RiskEvent[]> {
    try {
      const events: RiskEvent[] = [
        {
          id: 'audit-2024-q1',
          date: '2024-02-20T10:30:00',
          title: 'Security Audit Completed',
          description:
            'Band Protocol core contracts passed joint security audit by CertiK and PeckShield with no critical vulnerabilities found.',
          type: 'success',
          source: 'https://www.certik.com/projects/bandprotocol',
        },
        {
          id: 'upgrade-2023-v25',
          date: '2023-12-15T14:20:00',
          title: 'Mainnet Upgrade v2.5',
          description:
            'Completed BandChain mainnet upgrade, introducing new oracle script execution environment and optimized gas fee model.',
          type: 'info',
          source: 'https://docs.bandchain.org/',
        },
        {
          id: 'validator-expansion-2023',
          date: '2023-10-08T09:15:00',
          title: 'Validator Node Expansion',
          description:
            'Validator nodes increased to 72, distributed across 25 countries and regions, improving network decentralization.',
          type: 'success',
          source: 'https://docs.bandchain.org/',
        },
        {
          id: 'latency-2023',
          date: '2023-08-22T16:45:00',
          title: 'Price Delay Incident',
          description:
            'Due to network congestion, some price feeds experienced 3-5 minute delays. Team optimized data aggregation algorithm to improve response speed.',
          type: 'warning',
          source: 'https://docs.bandchain.org/',
        },
        {
          id: 'datasource-2023',
          date: '2023-06-10T11:30:00',
          title: 'New Data Source Integration',
          description:
            'Successfully integrated 15 new institutional-grade data sources, improving price data accuracy and manipulation resistance.',
          type: 'success',
          source: 'https://docs.bandchain.org/',
        },
        {
          id: 'staking-2023',
          date: '2023-04-05T08:00:00',
          title: 'Staking Mechanism Optimization',
          description:
            'Updated validator staking requirements, introducing dynamic slashing mechanism to enhance network security.',
          type: 'info',
          source: 'https://docs.bandchain.org/',
        },
        {
          id: 'audit-2023',
          date: '2023-01-15T10:00:00',
          title: 'Annual Security Review',
          description:
            'Completed comprehensive security review covering smart contracts, validator infrastructure, and cross-chain bridges.',
          type: 'success',
          source: 'https://www.certik.com/projects/bandprotocol',
        },
        {
          id: 'ibc-upgrade-2022',
          date: '2022-11-20T14:00:00',
          title: 'IBC Protocol Upgrade',
          description:
            'Upgraded IBC protocol to latest version, improving cross-chain communication reliability and adding new features.',
          type: 'info',
          source: 'https://docs.bandchain.org/',
        },
      ];

      return events;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch security audit events',
        'SECURITY_AUDIT_EVENTS_ERROR'
      );
    }
  }

  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;

    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;
    const total = sortedValues.reduce((sum, v) => sum + v, 0);

    if (total === 0) return 0;

    let cumulativeSum = 0;
    let giniSum = 0;

    for (let i = 0; i < n; i++) {
      cumulativeSum += sortedValues[i];
      giniSum += cumulativeSum;
    }

    const gini = (2 * giniSum) / (n * total) - (n + 1) / n;
    return Math.max(0, Math.min(1, gini));
  }

  private calculateNakamotoCoefficient(validators: ValidatorInfo[], totalStake: number): number {
    if (validators.length === 0 || totalStake === 0) return 0;

    const sortedValidators = [...validators].sort((a, b) => b.tokens - a.tokens);
    const threshold = totalStake / 3;

    let cumulativeStake = 0;
    let count = 0;

    for (const validator of sortedValidators) {
      cumulativeStake += validator.tokens;
      count++;
      if (cumulativeStake >= threshold) {
        break;
      }
    }

    return count;
  }

  async getGovernanceProposals(status?: ProposalStatus): Promise<GovernanceProposal[]> {
    try {
      const proposals: GovernanceProposal[] = [];
      const now = Date.now();

      const proposalTemplates = [
        {
          title: 'Upgrade BandChain to v3.0',
          description: 'Proposal to upgrade BandChain mainnet to version 3.0, introducing enhanced oracle script execution environment and improved gas optimization.',
          type: 'Software Upgrade',
          status: 'voting' as ProposalStatus,
        },
        {
          title: 'Increase Validator Set Size',
          description: 'Proposal to increase the active validator set from 72 to 100 validators to improve network decentralization.',
          type: 'Parameter Change',
          status: 'voting' as ProposalStatus,
        },
        {
          title: 'Community Pool Spending for Marketing',
          description: 'Proposal to allocate 500,000 BAND from the community pool for marketing and ecosystem development initiatives.',
          type: 'Community Pool Spend',
          status: 'passed' as ProposalStatus,
        },
        {
          title: 'Reduce Minimum Deposit Amount',
          description: 'Proposal to reduce the minimum deposit for governance proposals from 512 BAND to 256 BAND to lower barriers to participation.',
          type: 'Parameter Change',
          status: 'voting' as ProposalStatus,
        },
        {
          title: 'Add New Oracle Scripts',
          description: 'Proposal to add 10 new oracle scripts for emerging DeFi protocols and NFT price feeds.',
          type: 'Oracle Script Addition',
          status: 'passed' as ProposalStatus,
        },
        {
          title: 'Adjust Staking Parameters',
          description: 'Proposal to adjust staking parameters including unbonding period and slashing rates.',
          type: 'Parameter Change',
          status: 'rejected' as ProposalStatus,
        },
        {
          title: 'Fund Developer Grant Program',
          description: 'Proposal to establish a developer grant program with 1,000,000 BAND allocation for ecosystem growth.',
          type: 'Community Pool Spend',
          status: 'passed' as ProposalStatus,
        },
        {
          title: 'Enable IBC Relayer Incentives',
          description: 'Proposal to implement incentive mechanisms for IBC relayers to improve cross-chain connectivity.',
          type: 'Parameter Change',
          status: 'deposit' as ProposalStatus,
        },
        {
          title: 'Security Audit Funding',
          description: 'Proposal to fund comprehensive security audit by leading firms for BandChain core contracts.',
          type: 'Community Pool Spend',
          status: 'passed' as ProposalStatus,
        },
        {
          title: 'Update Oracle Script Standards',
          description: 'Proposal to update standards and requirements for oracle script development and deployment.',
          type: 'Software Upgrade',
          status: 'failed' as ProposalStatus,
        },
      ];

      for (let i = 0; i < proposalTemplates.length; i++) {
        const template = proposalTemplates[i];
        const submitTime = now - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000);
        const depositEndTime = submitTime + 14 * 24 * 60 * 60 * 1000;
        const votingEndTime = depositEndTime + 7 * 24 * 60 * 60 * 1000;

        const totalVotes = 50000000 + Math.floor(Math.random() * 50000000);
        const yesRatio = template.status === 'passed' ? 0.7 + Math.random() * 0.2 : 
                         template.status === 'rejected' ? 0.2 + Math.random() * 0.2 :
                         0.4 + Math.random() * 0.2;

        proposals.push({
          id: i + 1,
          title: template.title,
          description: template.description,
          type: template.type,
          status: template.status,
          submitTime,
          depositEndTime,
          votingEndTime,
          proposer: `band1${this.generateRandomAddress()}`,
          totalDeposit: 512 + Math.floor(Math.random() * 1000),
          votes: {
            yes: Math.floor(totalVotes * yesRatio),
            no: Math.floor(totalVotes * (1 - yesRatio) * 0.5),
            abstain: Math.floor(totalVotes * (1 - yesRatio) * 0.3),
            noWithVeto: Math.floor(totalVotes * (1 - yesRatio) * 0.2),
          },
        });
      }

      if (status) {
        return proposals.filter((p) => p.status === status);
      }

      return proposals;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch governance proposals',
        'GOVERNANCE_PROPOSALS_ERROR'
      );
    }
  }

  async getGovernanceParams(): Promise<GovernanceParams> {
    try {
      return {
        minDeposit: 512,
        maxDepositPeriod: 14,
        votingPeriod: 7,
        quorum: 33.4,
        threshold: 50,
        vetoThreshold: 33.4,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch governance params',
        'GOVERNANCE_PARAMS_ERROR'
      );
    }
  }
}
