import { BaseOracleClient } from './base';
import type { OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

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

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  floorPrice: number;
  floorPriceChange24h: number;
  volume24h: number;
  totalSupply: number;
  chain: Blockchain;
  imageUrl?: string;
  updateFrequency: number;
  confidence: number;
}

export interface NFTData {
  collections: NFTCollection[];
  totalCollections: number;
  byChain: Partial<Record<Blockchain, number>>;
  trending: NFTCollection[];
}

export interface StakingDetails {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
  rewardPool: number;
  minStakeAmount: number;
  lockPeriods: number[];
  aprByPeriod: Record<number, number>;
  historicalApr: { timestamp: number; apr: number }[];
  rewardsDistributed: number;
}

export interface CustomFeed {
  feedId: string;
  name: string;
  description: string;
  assetType: 'crypto' | 'fiat' | 'commodity' | 'nft' | 'custom';
  chains: Blockchain[];
  updateFrequency: number;
  confidence: number;
  dataSources: string[];
  createdAt: number;
  status: 'active' | 'paused' | 'deprecated';
}

export interface EcosystemIntegration {
  protocolId: string;
  name: string;
  category: 'dex' | 'lending' | 'derivatives' | 'yield' | 'insurance' | 'other';
  chain: Blockchain;
  tvl: number;
  integrationDepth: 'full' | 'partial' | 'experimental';
  dataFeedsUsed: string[];
  logoUrl?: string;
  website: string;
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

  async getNFTData(): Promise<NFTData> {
    const collections: NFTCollection[] = [
      {
        id: 'dia-nft-001',
        name: 'Bored Ape Yacht Club',
        symbol: 'BAYC',
        floorPrice: 45.5,
        floorPriceChange24h: 2.3,
        volume24h: 1250,
        totalSupply: 10000,
        chain: Blockchain.ETHEREUM,
        updateFrequency: 300,
        confidence: 0.96,
      },
      {
        id: 'dia-nft-002',
        name: 'CryptoPunks',
        symbol: 'PUNK',
        floorPrice: 62.8,
        floorPriceChange24h: -1.5,
        volume24h: 890,
        totalSupply: 10000,
        chain: Blockchain.ETHEREUM,
        updateFrequency: 300,
        confidence: 0.97,
      },
      {
        id: 'dia-nft-003',
        name: 'Azuki',
        symbol: 'AZUKI',
        floorPrice: 12.3,
        floorPriceChange24h: 5.2,
        volume24h: 2100,
        totalSupply: 10000,
        chain: Blockchain.ETHEREUM,
        updateFrequency: 300,
        confidence: 0.95,
      },
      {
        id: 'dia-nft-004',
        name: 'Doodles',
        symbol: 'DOODLE',
        floorPrice: 8.7,
        floorPriceChange24h: 0.8,
        volume24h: 650,
        totalSupply: 10000,
        chain: Blockchain.ETHEREUM,
        updateFrequency: 300,
        confidence: 0.94,
      },
      {
        id: 'dia-nft-005',
        name: 'CloneX',
        symbol: 'CLONEX',
        floorPrice: 6.2,
        floorPriceChange24h: -2.1,
        volume24h: 420,
        totalSupply: 20000,
        chain: Blockchain.ETHEREUM,
        updateFrequency: 300,
        confidence: 0.93,
      },
      {
        id: 'dia-nft-006',
        name: 'Pudgy Penguins',
        symbol: 'PPG',
        floorPrice: 15.8,
        floorPriceChange24h: 8.5,
        volume24h: 1800,
        totalSupply: 8888,
        chain: Blockchain.ETHEREUM,
        updateFrequency: 300,
        confidence: 0.95,
      },
    ];

    const byChain: Partial<Record<Blockchain, number>> = {
      [Blockchain.ETHEREUM]: 6,
      [Blockchain.POLYGON]: 0,
      [Blockchain.ARBITRUM]: 0,
    };

    return {
      collections,
      totalCollections: collections.length,
      byChain,
      trending: collections.slice(0, 3),
    };
  }

  async getStakingDetails(): Promise<StakingDetails> {
    const now = Date.now();
    const historicalApr = Array.from({ length: 30 }, (_, i) => ({
      timestamp: now - (29 - i) * 24 * 60 * 60 * 1000,
      apr: 8.5 + Math.random() * 2 - 1,
    }));

    return {
      totalStaked: 15000000,
      stakingApr: 8.5,
      stakerCount: 2500,
      rewardPool: 500000,
      minStakeAmount: 1000,
      lockPeriods: [30, 90, 180, 365],
      aprByPeriod: {
        30: 6.5,
        90: 7.5,
        180: 8.5,
        365: 10.5,
      },
      historicalApr,
      rewardsDistributed: 2500000,
    };
  }

  async getCustomFeeds(): Promise<CustomFeed[]> {
    return [
      {
        feedId: 'dia-feed-001',
        name: 'ETH/USD',
        description: 'Ethereum to USD price feed',
        assetType: 'crypto',
        chains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.POLYGON],
        updateFrequency: 60,
        confidence: 0.99,
        dataSources: ['Uniswap V3', 'Binance', 'Coinbase'],
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
        status: 'active',
      },
      {
        feedId: 'dia-feed-002',
        name: 'BTC/USD',
        description: 'Bitcoin to USD price feed',
        assetType: 'crypto',
        chains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.POLYGON, Blockchain.BASE],
        updateFrequency: 60,
        confidence: 0.99,
        dataSources: ['Uniswap V3', 'Binance', 'Coinbase', 'Kraken'],
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
        status: 'active',
      },
      {
        feedId: 'dia-feed-003',
        name: 'BAYC Floor Price',
        description: 'Bored Ape Yacht Club floor price in ETH',
        assetType: 'nft',
        chains: [Blockchain.ETHEREUM],
        updateFrequency: 300,
        confidence: 0.96,
        dataSources: ['OpenSea', 'Blur', 'LooksRare'],
        createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000,
        status: 'active',
      },
      {
        feedId: 'dia-feed-004',
        name: 'EUR/USD',
        description: 'Euro to USD forex rate',
        assetType: 'fiat',
        chains: [Blockchain.ETHEREUM, Blockchain.POLYGON],
        updateFrequency: 3600,
        confidence: 0.98,
        dataSources: ['Forex API', 'Bank Rate'],
        createdAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
        status: 'active',
      },
      {
        feedId: 'dia-feed-005',
        name: 'Gold/USD',
        description: 'Gold price in USD per ounce',
        assetType: 'commodity',
        chains: [Blockchain.ETHEREUM],
        updateFrequency: 1800,
        confidence: 0.97,
        dataSources: ['Commodity Exchange', 'Market Data'],
        createdAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
        status: 'active',
      },
    ];
  }

  async getEcosystemIntegrations(): Promise<EcosystemIntegration[]> {
    return [
      {
        protocolId: 'dia-eco-001',
        name: 'Aave',
        category: 'lending',
        chain: Blockchain.ETHEREUM,
        tvl: 8500000000,
        integrationDepth: 'full',
        dataFeedsUsed: ['ETH/USD', 'BTC/USD', 'LINK/USD'],
        website: 'https://aave.com',
      },
      {
        protocolId: 'dia-eco-002',
        name: 'Uniswap',
        category: 'dex',
        chain: Blockchain.ETHEREUM,
        tvl: 4200000000,
        integrationDepth: 'full',
        dataFeedsUsed: ['ETH/USD', 'Multiple Token Pairs'],
        website: 'https://uniswap.org',
      },
      {
        protocolId: 'dia-eco-003',
        name: 'Compound',
        category: 'lending',
        chain: Blockchain.ETHEREUM,
        tvl: 2100000000,
        integrationDepth: 'full',
        dataFeedsUsed: ['ETH/USD', 'BTC/USD', 'COMP/USD'],
        website: 'https://compound.finance',
      },
      {
        protocolId: 'dia-eco-004',
        name: 'SushiSwap',
        category: 'dex',
        chain: Blockchain.ETHEREUM,
        tvl: 890000000,
        integrationDepth: 'partial',
        dataFeedsUsed: ['ETH/USD', 'SUSHI/USD'],
        website: 'https://sushi.com',
      },
      {
        protocolId: 'dia-eco-005',
        name: 'dYdX',
        category: 'derivatives',
        chain: Blockchain.ETHEREUM,
        tvl: 650000000,
        integrationDepth: 'full',
        dataFeedsUsed: ['ETH/USD', 'BTC/USD', 'Multiple Assets'],
        website: 'https://dydx.exchange',
      },
      {
        protocolId: 'dia-eco-006',
        name: 'Yearn Finance',
        category: 'yield',
        chain: Blockchain.ETHEREUM,
        tvl: 1200000000,
        integrationDepth: 'partial',
        dataFeedsUsed: ['YFI/USD', 'Vault Tokens'],
        website: 'https://yearn.finance',
      },
      {
        protocolId: 'dia-eco-007',
        name: 'Nexus Mutual',
        category: 'insurance',
        chain: Blockchain.ETHEREUM,
        tvl: 450000000,
        integrationDepth: 'experimental',
        dataFeedsUsed: ['NXM/USD'],
        website: 'https://nexusmutual.io',
      },
      {
        protocolId: 'dia-eco-008',
        name: 'Curve Finance',
        category: 'dex',
        chain: Blockchain.ETHEREUM,
        tvl: 3200000000,
        integrationDepth: 'full',
        dataFeedsUsed: ['Stablecoin Pairs', 'CRV/USD'],
        website: 'https://curve.fi',
      },
    ];
  }
}
