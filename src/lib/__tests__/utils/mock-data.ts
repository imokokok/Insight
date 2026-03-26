/**
 * Mock data generators for testing
 * Provides consistent mock data for various types used in tests
 */

import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

/**
 * Generate mock price data
 */
export function generateMockPriceData(
  symbol: string,
  provider: OracleProvider,
  price?: number,
  chain?: Blockchain
): PriceData {
  const basePrice = price ?? 100;
  return {
    provider,
    symbol,
    price: basePrice,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.98,
    chain,
    change24h: basePrice * 0.02,
    change24hPercent: 2,
  };
}

/**
 * Generate mock historical prices
 */
export function generateMockHistoricalPrices(
  symbol: string,
  provider: OracleProvider,
  count: number,
  basePrice?: number,
  chain?: Blockchain
): PriceData[] {
  const prices: PriceData[] = [];
  const price = basePrice ?? 100;
  const now = Date.now();
  const interval = 15 * 60 * 1000; // 15 minutes

  for (let i = 0; i < count; i++) {
    const volatility = 0.01;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const currentPrice = price * (1 + randomChange);

    prices.push({
      provider,
      symbol,
      price: Number(currentPrice.toFixed(4)),
      timestamp: now - (count - 1 - i) * interval,
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
      chain,
      change24h: currentPrice * 0.02,
      change24hPercent: 2,
    });
  }

  return prices;
}

/**
 * Mock network stats
 */
export function generateMockNetworkStats() {
  return {
    activeNodes: 100 + Math.floor(Math.random() * 50),
    dataFeeds: 200 + Math.floor(Math.random() * 100),
    nodeUptime: 99.5 + Math.random() * 0.5,
    avgResponseTime: 100 + Math.floor(Math.random() * 100),
    latency: 100 + Math.floor(Math.random() * 100),
  };
}

/**
 * Mock validator data
 */
export function generateMockValidators(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `validator-${i + 1}`,
    name: `Validator ${i + 1}`,
    address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    stakedAmount: 100000 + Math.floor(Math.random() * 900000),
    uptime: 95 + Math.random() * 5,
    responseTime: 100 + Math.floor(Math.random() * 100),
    status: Math.random() > 0.1 ? 'active' : 'inactive',
    reputation: 80 + Math.floor(Math.random() * 20),
  }));
}

/**
 * Mock dispute data
 */
export function generateMockDisputes(count: number) {
  const statuses = ['active', 'resolved', 'rejected'] as const;
  const types = ['price', 'state', 'liquidation', 'other'] as const;

  return Array.from({ length: count }, (_, i) => ({
    id: `dispute-${i + 1}`,
    timestamp: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    type: types[Math.floor(Math.random() * types.length)],
    stakeAmount: 10000 + Math.floor(Math.random() * 50000),
    rewardAmount: Math.floor(Math.random() * 10000),
    totalValue: 10000 + Math.floor(Math.random() * 60000),
  }));
}

/**
 * Mock staking data
 */
export function generateMockStakingData() {
  return {
    totalStaked: 10000000 + Math.floor(Math.random() * 5000000),
    stakingApr: 5 + Math.random() * 10,
    stakerCount: 1000 + Math.floor(Math.random() * 5000),
    rewardPool: 500000 + Math.floor(Math.random() * 500000),
  };
}

/**
 * Mock ecosystem data
 */
export function generateMockEcosystemData() {
  const categories = ['lending', 'dex', 'derivatives', 'yield', 'insurance'] as const;

  return {
    totalProtocols: 20 + Math.floor(Math.random() * 30),
    totalTvl: 1000000000 + Math.floor(Math.random() * 5000000000),
    protocolsByCategory: categories.map((category) => ({
      category,
      count: Math.floor(Math.random() * 10) + 1,
      tvl: Math.floor(Math.random() * 1000000000),
    })),
  };
}

/**
 * Mock price feed data
 */
export function generateMockPriceFeeds(count: number) {
  const assets = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'UNI', 'AAVE', 'COMP'];

  return Array.from({ length: count }, (_, i) => {
    const symbol = assets[i % assets.length];
    return {
      id: `feed-${i + 1}`,
      name: `${symbol}/USD`,
      symbol,
      price: 100 + Math.random() * 50000,
      change24h: (Math.random() - 0.5) * 10,
      change24hPercent: (Math.random() - 0.5) * 5,
      volume24h: Math.floor(Math.random() * 1000000000),
      timestamp: Date.now(),
    };
  });
}

/**
 * Mock chain data
 */
export function generateMockChainData(chain: Blockchain) {
  return {
    chain,
    blockHeight: 10000000 + Math.floor(Math.random() * 1000000),
    blockTime: 2 + Math.random() * 10,
    tps: 10 + Math.floor(Math.random() * 100),
    gasPrice: 10 + Math.floor(Math.random() * 100),
    activeAddresses: 100000 + Math.floor(Math.random() * 900000),
  };
}
