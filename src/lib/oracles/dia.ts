import { BaseOracleClient, OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

export interface DataSourceTransparency {
  sourceId: string;
  name: string;
  type: 'exchange' | 'defi_protocol' | 'aggregator';
  credibilityScore: number;
  lastUpdate: number;
  status: 'active' | 'inactive' | 'suspended';
  verificationMethod: string;
  dataPoints: number;
}

export interface CrossChainAsset {
  symbol: string;
  name: string;
  chains: Blockchain[];
  coverageStatus: 'full' | 'partial' | 'limited';
  updateFrequency: number;
  confidence: number;
}

export interface CrossChainCoverage {
  totalAssets: number;
  byChain: Partial<Record<Blockchain, number>>;
  byAssetType: {
    crypto: number;
    stablecoin: number;
    defi: number;
    nft: number;
  };
  assets: CrossChainAsset[];
}

export interface DataSourceVerification {
  verificationId: string;
  sourceId: string;
  timestamp: number;
  status: 'verified' | 'pending' | 'failed';
  method: string;
  details: string;
  validatorCount: number;
}

export interface DIANetworkStats {
  activeDataSources: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  latency: number;
  stakingTokenSymbol: string;
}

export class DIAClient extends BaseOracleClient {
  name = OracleProvider.DIA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

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
        error instanceof Error ? error.message : 'Failed to fetch price from DIA',
        'DIA_ERROR'
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
        error instanceof Error ? error.message : 'Failed to fetch historical prices from DIA',
        'DIA_HISTORICAL_ERROR'
      );
    }
  }

  async getDataTransparency(): Promise<DataSourceTransparency[]> {
    return [
      {
        sourceId: 'dia-src-001',
        name: 'Uniswap V3',
        type: 'defi_protocol',
        credibilityScore: 95,
        lastUpdate: Date.now(),
        status: 'active',
        verificationMethod: 'On-chain Verification',
        dataPoints: 1500000,
      },
      {
        sourceId: 'dia-src-002',
        name: 'Curve Finance',
        type: 'defi_protocol',
        credibilityScore: 94,
        lastUpdate: Date.now() - 5000,
        status: 'active',
        verificationMethod: 'On-chain Verification',
        dataPoints: 1200000,
      },
      {
        sourceId: 'dia-src-003',
        name: 'Binance',
        type: 'exchange',
        credibilityScore: 98,
        lastUpdate: Date.now() - 10000,
        status: 'active',
        verificationMethod: 'API Verification',
        dataPoints: 2000000,
      },
      {
        sourceId: 'dia-src-004',
        name: 'Coinbase',
        type: 'exchange',
        credibilityScore: 97,
        lastUpdate: Date.now() - 8000,
        status: 'active',
        verificationMethod: 'API Verification',
        dataPoints: 1800000,
      },
      {
        sourceId: 'dia-src-005',
        name: 'Chainlink Market',
        type: 'aggregator',
        credibilityScore: 96,
        lastUpdate: Date.now() - 3000,
        status: 'active',
        verificationMethod: 'Multi-source Verification',
        dataPoints: 2200000,
      },
      {
        sourceId: 'dia-src-006',
        name: 'Balancer',
        type: 'defi_protocol',
        credibilityScore: 93,
        lastUpdate: Date.now() - 12000,
        status: 'active',
        verificationMethod: 'On-chain Verification',
        dataPoints: 900000,
      },
    ];
  }

  async getCrossChainCoverage(): Promise<CrossChainCoverage> {
    const assets: CrossChainAsset[] = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        chains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.POLYGON, Blockchain.BASE],
        coverageStatus: 'full',
        updateFrequency: 60,
        confidence: 0.98,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        chains: [
          Blockchain.ETHEREUM,
          Blockchain.ARBITRUM,
          Blockchain.POLYGON,
          Blockchain.AVALANCHE,
          Blockchain.BASE,
        ],
        coverageStatus: 'full',
        updateFrequency: 30,
        confidence: 0.99,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        chains: [
          Blockchain.ETHEREUM,
          Blockchain.ARBITRUM,
          Blockchain.POLYGON,
          Blockchain.AVALANCHE,
          Blockchain.BASE,
          Blockchain.BNB_CHAIN,
        ],
        coverageStatus: 'full',
        updateFrequency: 60,
        confidence: 0.97,
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        chains: [
          Blockchain.ETHEREUM,
          Blockchain.ARBITRUM,
          Blockchain.POLYGON,
          Blockchain.BNB_CHAIN,
        ],
        coverageStatus: 'partial',
        updateFrequency: 120,
        confidence: 0.96,
      },
      {
        symbol: 'LINK',
        name: 'Chainlink',
        chains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.POLYGON],
        coverageStatus: 'full',
        updateFrequency: 60,
        confidence: 0.95,
      },
      {
        symbol: 'UNI',
        name: 'Uniswap',
        chains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.POLYGON],
        coverageStatus: 'partial',
        updateFrequency: 120,
        confidence: 0.94,
      },
    ];

    const byChain: Partial<Record<Blockchain, number>> = {
      [Blockchain.ETHEREUM]: 6,
      [Blockchain.ARBITRUM]: 6,
      [Blockchain.POLYGON]: 6,
      [Blockchain.AVALANCHE]: 2,
      [Blockchain.BASE]: 3,
      [Blockchain.BNB_CHAIN]: 2,
    };

    return {
      totalAssets: assets.length,
      byChain,
      byAssetType: {
        crypto: 4,
        stablecoin: 2,
        defi: 6,
        nft: 0,
      },
      assets,
    };
  }

  async getDataSourceVerification(): Promise<DataSourceVerification[]> {
    const now = Date.now();
    return [
      {
        verificationId: 'dia-vrf-001',
        sourceId: 'dia-src-001',
        timestamp: now - 3600000,
        status: 'verified',
        method: 'Cryptographic Signature',
        details: 'Successfully verified Uniswap V3 price feed signatures',
        validatorCount: 12,
      },
      {
        verificationId: 'dia-vrf-002',
        sourceId: 'dia-src-002',
        timestamp: now - 7200000,
        status: 'verified',
        method: 'Cryptographic Signature',
        details: 'Successfully verified Curve Finance price feed signatures',
        validatorCount: 10,
      },
      {
        verificationId: 'dia-vrf-003',
        sourceId: 'dia-src-003',
        timestamp: now - 1800000,
        status: 'verified',
        method: 'API Key Authentication',
        details: 'Binance API response validated successfully',
        validatorCount: 8,
      },
      {
        verificationId: 'dia-vrf-004',
        sourceId: 'dia-src-004',
        timestamp: now - 5400000,
        status: 'verified',
        method: 'API Key Authentication',
        details: 'Coinbase API response validated successfully',
        validatorCount: 9,
      },
      {
        verificationId: 'dia-vrf-005',
        sourceId: 'dia-src-005',
        timestamp: now - 900000,
        status: 'pending',
        method: 'Multi-source Consensus',
        details: 'Awaiting additional validator confirmations',
        validatorCount: 5,
      },
    ];
  }

  async getNetworkStats(): Promise<DIANetworkStats> {
    return {
      activeDataSources: 45,
      nodeUptime: 99.8,
      avgResponseTime: 150,
      updateFrequency: 60,
      totalStaked: 15000000,
      dataFeeds: 280,
      hourlyActivity: [
        1800, 1650, 1500, 1350, 1200, 1350, 1650, 2400, 3300, 4200, 5100, 5700, 5400, 5100, 4800,
        4950, 5250, 5550, 5100, 4200, 3300, 2550, 2100, 1950,
      ],
      status: 'online',
      latency: 120,
      stakingTokenSymbol: 'DIA',
    };
  }

  async getStakingData(): Promise<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  }> {
    return {
      totalStaked: 15000000,
      stakingApr: 8.5,
      stakerCount: 2500,
      rewardPool: 500000,
    };
  }
}
