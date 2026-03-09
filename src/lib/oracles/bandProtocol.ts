import { BaseOracleClient } from './base';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

const BASE_PRICES: Record<string, number> = {
  BTC: 67850,
  ETH: 3480,
  SOL: 178,
  BAND: 2.5,
  USDC: 1,
};

// Band Protocol 市场数据类型
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

// 验证者信息类型
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

// 网络统计类型
export interface NetworkStats {
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

// 跨链统计类型
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

// 历史价格数据点
export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [Blockchain.ETHEREUM, Blockchain.POLYGON];

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.generateMockPrice(symbol, basePrice, chain);
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
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.generateMockHistoricalPrices(symbol, basePrice, chain, period);
    } catch (error) {
      throw this.createError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical prices from Band Protocol',
        'BAND_PROTOCOL_HISTORICAL_ERROR'
      );
    }
  }

  // 获取 BAND 代币市场数据
  async getBandMarketData(): Promise<BandMarketData> {
    try {
      const basePrice = BASE_PRICES.BAND || 2.5;
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
        stakingRatio: Number(((circulatingSupply * 0.65) / circulatingSupply * 100).toFixed(2)),
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

  // 获取验证者列表
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
        const tokens = i === 0 
          ? totalTokens * 0.08 
          : totalTokens * (0.05 / (i + 1) + Math.random() * 0.01);
        
        validators.push({
          operatorAddress: `bandvaloper1${this.generateRandomAddress()}`,
          moniker: validatorNames[i],
          identity: this.generateRandomHex(16),
          website: i < 10 ? `https://${validatorNames[i].toLowerCase().replace(/\s+/g, '')}.com` : '',
          details: `Professional validator ${validatorNames[i]} securing Band Protocol network`,
          tokens: Number(tokens.toFixed(2)),
          delegatorShares: Number(tokens.toFixed(2)),
          commissionRate: Number((0.05 + Math.random() * 0.15).toFixed(4)),
          maxCommissionRate: Number((0.15 + Math.random() * 0.10).toFixed(4)),
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

  // 获取网络统计信息
  async getNetworkStats(): Promise<NetworkStats> {
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

  // 获取跨链数据请求统计
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

  // 获取 BAND 历史价格
  async getHistoricalBandPrices(period: '1d' | '7d' | '30d' | '90d' | '1y' = '30d'): Promise<HistoricalPricePoint[]> {
    try {
      const basePrice = BASE_PRICES.BAND || 2.5;
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

      return prices;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical BAND prices',
        'HISTORICAL_BAND_PRICES_ERROR'
      );
    }
  }

  // 辅助方法：生成随机地址
  private generateRandomAddress(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 39; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 辅助方法：生成随机十六进制字符串
  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
