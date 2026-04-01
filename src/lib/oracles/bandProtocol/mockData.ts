import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';

import { type SeededRandom, globalSeed, seededRandom, dataCache } from './utils';

import type {
  BandProtocolMarketData,
  BandNetworkStats,
  ValidatorInfo,
  CrossChainStats,
  ChainDataRequest,
  CrossChainTrend,
  TrendPeriod,
  HistoricalPricePoint,
  BandCrossChainSnapshot,
  CrossChainPriceComparison,
  ChainEvent,
  EventType,
  EVENT_TYPE_VALUES,
  OracleScript,
  OracleScriptCategory,
  IBCConnection,
  IBCRelayer,
  IBCTransferTrend,
  StakingDistribution,
  StakingReward,
  RiskMetrics,
  RiskTrendData,
  RiskEvent,
  GovernanceProposal,
  ProposalStatus,
  DataSource,
  DataSourceCategory,
} from './types';

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

function generateRandomAddress(random: SeededRandom): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 39; i++) {
    result += chars.charAt(Math.floor(random.next() * chars.length));
  }
  return result;
}

function generateRandomHex(random: SeededRandom, length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(random.next() * chars.length));
  }
  return result;
}

export function generateAllDataSources(generateRandomAddressFn: () => string): DataSource[] {
  const cacheKey = 'allDataSources';
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return cached as DataSource[];
  }

  seededRandom.reset(globalSeed);
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

  let id = 1;

  const generateDataSource = (
    feed: { symbol: string; name: string; basePrice: number },
    category: DataSourceCategory,
    updateFreq: string,
    deviation: string
  ): DataSource => {
    const priceChange = (seededRandom.next() - 0.5) * feed.basePrice * 0.1;
    const currentPrice = feed.basePrice + priceChange;
    const reliability = 95 + seededRandom.next() * 4.99;
    const totalRequests = Math.floor(seededRandom.next() * 2000000) + 100000;

    return {
      id: id++,
      name: `${feed.symbol}/USD`,
      symbol: feed.symbol,
      description: `${feed.name} price feed in USD`,
      owner: `band1${generateRandomAddressFn()}`,
      provider: providers[Math.floor(seededRandom.next() * providers.length)],
      status: seededRandom.next() > 0.05 ? 'active' : 'inactive',
      lastUpdated: now - Math.floor(seededRandom.next() * 60000),
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
      owner: `band1${generateRandomAddressFn()}`,
      provider: providers[Math.floor(seededRandom.next() * providers.length)],
      status: seededRandom.next() > 0.1 ? 'active' : 'inactive',
      lastUpdated: now - Math.floor(seededRandom.next() * 3600000),
      reliability: Number((98 + seededRandom.next() * 1.99).toFixed(2)),
      category: 'sports',
      updateFrequency: '60s',
      deviationThreshold: 'N/A',
      totalRequests: Math.floor(seededRandom.next() * 500000) + 50000,
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
      owner: `band1${generateRandomAddressFn()}`,
      provider: 'Band VRF',
      status: 'active',
      lastUpdated: now - Math.floor(seededRandom.next() * 10000),
      reliability: 99.99,
      category: 'random',
      updateFrequency: 'on-demand',
      deviationThreshold: 'N/A',
      totalRequests: Math.floor(seededRandom.next() * 1000000) + 200000,
    });
  });

  dataCache.set(cacheKey, dataSources);
  return dataSources;
}

export function generateBandMarketData(): BandProtocolMarketData {
  const cacheKey = 'bandMarketData';
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return cached as BandProtocolMarketData;
  }

  seededRandom.reset(globalSeed + 16);
  const basePrice = UNIFIED_BASE_PRICES.BAND || 2.5;
  const priceChange = (seededRandom.next() - 0.5) * 0.5;
  const priceChangePercentage = (priceChange / basePrice) * 100;
  const currentPrice = basePrice + priceChange;
  const circulatingSupply = 145_000_000 + seededRandom.next() * 5_000_000;
  const totalSupply = 165_000_000 + seededRandom.next() * 5_000_000;

  const result = {
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
    stakingApr: Number((8 + seededRandom.next() * 4).toFixed(2)),
    timestamp: Date.now(),
  };

  dataCache.set(cacheKey, result);
  return result;
}

export function generateValidators(
  limit: number,
  generateRandomAddressFn: () => string,
  generateRandomHexFn: (length: number) => string
): ValidatorInfo[] {
  const cacheKey = `validators_${limit}`;
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return cached as ValidatorInfo[];
  }

  seededRandom.reset(globalSeed + 1);
  const validators: ValidatorInfo[] = [];

  const totalTokens = 85_000_000 + seededRandom.next() * 10_000_000;

  for (let i = 0; i < Math.min(limit, validatorNames.length); i++) {
    const tokens =
      i === 0 ? totalTokens * 0.08 : totalTokens * (0.05 / (i + 1) + seededRandom.next() * 0.01);

    validators.push({
      operatorAddress: `bandvaloper1${generateRandomAddressFn()}`,
      moniker: validatorNames[i],
      identity: generateRandomHexFn(16),
      website: i < 10 ? `https://${validatorNames[i].toLowerCase().replace(/\s+/g, '')}.com` : '',
      details: `Professional validator ${validatorNames[i]} securing Band Protocol network`,
      tokens: Number(tokens.toFixed(2)),
      delegatorShares: Number(tokens.toFixed(2)),
      commissionRate: Number((0.05 + seededRandom.next() * 0.15).toFixed(4)),
      maxCommissionRate: Number((0.15 + seededRandom.next() * 0.1).toFixed(4)),
      maxCommissionChangeRate: Number((0.01 + seededRandom.next() * 0.02).toFixed(4)),
      uptime: Number((99.5 + seededRandom.next() * 0.48).toFixed(2)),
      jailed: false,
      rank: i + 1,
    });
  }

  dataCache.set(cacheKey, validators);
  return validators;
}

export function generateNetworkStats(): BandNetworkStats {
  const cacheKey = 'networkStats';
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return cached as BandNetworkStats;
  }

  seededRandom.reset(globalSeed + 2);
  const totalValidators = 72 + Math.floor(seededRandom.next() * 15);
  const activeValidators = 65 + Math.floor(seededRandom.next() * 10);
  const bondedTokens = 85_000_000 + seededRandom.next() * 10_000_000;
  const totalSupply = 165_000_000 + seededRandom.next() * 5_000_000;

  const result = {
    activeValidators,
    totalValidators,
    bondedTokens: Number(bondedTokens.toFixed(2)),
    totalSupply: Number(totalSupply.toFixed(2)),
    stakingRatio: Number(((bondedTokens / totalSupply) * 100).toFixed(2)),
    blockTime: Number((2.8 + seededRandom.next() * 0.4).toFixed(2)),
    latestBlockHeight: 15_000_000 + Math.floor(seededRandom.next() * 1_000_000),
    inflationRate: Number((7 + seededRandom.next() * 3).toFixed(2)),
    communityPool: Number((500_000 + seededRandom.next() * 100_000).toFixed(2)),
    timestamp: Date.now(),
  };

  dataCache.set(cacheKey, result);
  return result;
}

export function generateCrossChainStats(): CrossChainStats {
  const cacheKey = 'crossChainStats';
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return cached as CrossChainStats;
  }

  seededRandom.reset(globalSeed + 3);
  const chains: ChainDataRequest[] = [
    {
      chainName: 'Cosmos Hub',
      chainId: 'cosmoshub-4',
      requestCount24h: 1500 + Math.floor(seededRandom.next() * 500),
      requestCount7d: 10000 + Math.floor(seededRandom.next() * 3000),
      requestCount30d: 45000 + Math.floor(seededRandom.next() * 15000),
      avgGasCost: 0.0025 + seededRandom.next() * 0.001,
      supportedSymbols: ['ATOM', 'OSMO', 'JUNO', 'STARS'],
    },
    {
      chainName: 'Osmosis',
      chainId: 'osmosis-1',
      requestCount24h: 2000 + Math.floor(seededRandom.next() * 800),
      requestCount7d: 14000 + Math.floor(seededRandom.next() * 5000),
      requestCount30d: 60000 + Math.floor(seededRandom.next() * 20000),
      avgGasCost: 0.003 + seededRandom.next() * 0.0015,
      supportedSymbols: ['OSMO', 'ATOM', 'USDC', 'WBTC'],
    },
    {
      chainName: 'Ethereum',
      chainId: '1',
      requestCount24h: 3000 + Math.floor(seededRandom.next() * 1000),
      requestCount7d: 21000 + Math.floor(seededRandom.next() * 7000),
      requestCount30d: 90000 + Math.floor(seededRandom.next() * 30000),
      avgGasCost: 0.005 + seededRandom.next() * 0.002,
      supportedSymbols: ['ETH', 'USDC', 'USDT', 'WBTC', 'DAI'],
    },
    {
      chainName: 'Polygon',
      chainId: '137',
      requestCount24h: 1200 + Math.floor(seededRandom.next() * 400),
      requestCount7d: 8400 + Math.floor(seededRandom.next() * 2800),
      requestCount30d: 36000 + Math.floor(seededRandom.next() * 12000),
      avgGasCost: 0.001 + seededRandom.next() * 0.0005,
      supportedSymbols: ['MATIC', 'USDC', 'USDT', 'WETH'],
    },
    {
      chainName: 'Avalanche',
      chainId: '43114',
      requestCount24h: 800 + Math.floor(seededRandom.next() * 300),
      requestCount7d: 5600 + Math.floor(seededRandom.next() * 2100),
      requestCount30d: 24000 + Math.floor(seededRandom.next() * 9000),
      avgGasCost: 0.0015 + seededRandom.next() * 0.0007,
      supportedSymbols: ['AVAX', 'USDC', 'USDT', 'BTC.b'],
    },
    {
      chainName: 'Fantom',
      chainId: '250',
      requestCount24h: 600 + Math.floor(seededRandom.next() * 200),
      requestCount7d: 4200 + Math.floor(seededRandom.next() * 1400),
      requestCount30d: 18000 + Math.floor(seededRandom.next() * 6000),
      avgGasCost: 0.0012 + seededRandom.next() * 0.0006,
      supportedSymbols: ['FTM', 'USDC', 'USDT', 'WETH'],
    },
    {
      chainName: 'Cronos',
      chainId: '25',
      requestCount24h: 400 + Math.floor(seededRandom.next() * 150),
      requestCount7d: 2800 + Math.floor(seededRandom.next() * 1050),
      requestCount30d: 12000 + Math.floor(seededRandom.next() * 4500),
      avgGasCost: 0.001 + seededRandom.next() * 0.0005,
      supportedSymbols: ['CRO', 'USDC', 'USDT', 'WBTC'],
    },
    {
      chainName: 'Juno',
      chainId: 'juno-1',
      requestCount24h: 300 + Math.floor(seededRandom.next() * 100),
      requestCount7d: 2100 + Math.floor(seededRandom.next() * 700),
      requestCount30d: 9000 + Math.floor(seededRandom.next() * 3000),
      avgGasCost: 0.002 + seededRandom.next() * 0.0008,
      supportedSymbols: ['JUNO', 'ATOM', 'OSMO', 'STARS'],
    },
  ];

  const totalRequests24h = chains.reduce((sum, chain) => sum + chain.requestCount24h, 0);
  const totalRequests7d = chains.reduce((sum, chain) => sum + chain.requestCount7d, 0);
  const totalRequests30d = chains.reduce((sum, chain) => sum + chain.requestCount30d, 0);

  const result = {
    totalRequests24h,
    totalRequests7d,
    totalRequests30d,
    chains,
    timestamp: Date.now(),
  };

  dataCache.set(cacheKey, result);
  return result;
}

export function generateCrossChainTrend(period: TrendPeriod): CrossChainTrend[] {
  const cacheKey = `crossChainTrend_${period}`;
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return cached as CrossChainTrend[];
  }

  seededRandom.reset(globalSeed + 4);
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

    const baseRequests = 9800 + Math.floor(seededRandom.next() * 4000);
    const trend = Math.sin(i / 3) * 800;
    const requestCount = Math.floor(baseRequests + trend + (seededRandom.next() - 0.5) * 1000);

    const successRate = 0.97 + seededRandom.next() * 0.025;
    const successCount = Math.floor(requestCount * successRate);
    const failureCount = requestCount - successCount;

    const avgLatency = 150 + Math.floor(seededRandom.next() * 100);

    trends.push({
      date: dateStr,
      requestCount,
      successCount,
      failureCount,
      avgLatency,
    });
  }

  dataCache.set(cacheKey, trends);
  return trends;
}

export function generateHistoricalBandPrices(
  period: '1d' | '7d' | '30d' | '90d' | '1y',
  calculateTechnicalIndicatorsFn: (prices: number[]) => {
    ma7: number[];
    ma20: number[];
    stdDev1Upper: number[];
    stdDev1Lower: number[];
    stdDev2Upper: number[];
    stdDev2Lower: number[];
  }
): HistoricalPricePoint[] {
  const cacheKey = `historicalBandPrices_${period}`;
  const cached = dataCache.get(cacheKey);
  if (cached) {
    return cached as HistoricalPricePoint[];
  }

  seededRandom.reset(globalSeed + 5);
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
    const randomChange = (seededRandom.next() - 0.5) * 2 * volatility;
    const price = basePrice * (1 + trend + randomChange);
    const open = price * (1 + (seededRandom.next() - 0.5) * 0.02);
    const close = price;
    const high = Math.max(open, close) * (1 + seededRandom.next() * 0.01);
    const low = Math.min(open, close) * (1 - seededRandom.next() * 0.01);

    prices.push({
      timestamp,
      price: Number(price.toFixed(4)),
      volume: Number((100000 + seededRandom.next() * 500000).toFixed(2)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      open: Number(open.toFixed(4)),
      close: Number(close.toFixed(4)),
    });
  }

  const priceValues = prices.map((p) => p.price);
  const indicators = calculateTechnicalIndicatorsFn(priceValues);

  const result = prices.map((point, index) => ({
    ...point,
    ma7: indicators.ma7[index],
    ma20: indicators.ma20[index],
    stdDev1Upper: indicators.stdDev1Upper[index],
    stdDev1Lower: indicators.stdDev1Lower[index],
    stdDev2Upper: indicators.stdDev2Upper[index],
    stdDev2Lower: indicators.stdDev2Lower[index],
  }));

  dataCache.set(cacheKey, result);
  return result;
}


