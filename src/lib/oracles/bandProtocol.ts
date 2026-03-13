import { BaseOracleClient, OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

export interface BandMarketData {
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

export interface CrossChainStats {
  totalRequests24h: number;
  totalRequests7d: number;
  totalRequests30d: number;
  chains: ChainDataRequest[];
  timestamp: number;
}

export interface CrossChainSnapshot {
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

export enum EventType {
  DELEGATION = 'DELEGATION',
  UNDELEGATION = 'UNDELEGATION',
  COMMISSION_CHANGE = 'COMMISSION_CHANGE',
  JAILED = 'JAILED',
  UNJAILED = 'UNJAILED',
}

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

export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [Blockchain.ETHEREUM, Blockchain.POLYGON];

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

  async getBandMarketData(): Promise<BandMarketData> {
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

  async getCrossChainSnapshot(timestamp: number): Promise<CrossChainSnapshot> {
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
        const eventTypes = type ? [type] : Object.values(EventType);
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
}
