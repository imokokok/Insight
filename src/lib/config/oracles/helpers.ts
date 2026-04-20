import { type MarketDataConfig, type NetworkDataConfig } from './types';

const getDefaultMarketData = (
  symbol: string,
  name: string
): MarketDataConfig & { change24hPercent?: number } => ({
  symbol,
  tokenName: name,
  tokenSymbol: symbol,
  marketCap: 0,
  volume24h: 0,
  circulatingSupply: 0,
  totalSupply: 0,
  fullyDilutedValuation: 0,
  marketCapRank: 0,
  high24h: 0,
  low24h: 0,
  change24h: 0,
  change24hValue: 0,
  change24hPercent: 0,
  stakingApr: 0,
});

const getDefaultNetworkData = (): NetworkDataConfig => ({
  activeNodes: 0,
  nodeUptime: 0,
  avgResponseTime: 0,
  updateFrequency: 0,
  totalStaked: 0,
  dataFeeds: 0,
  hourlyActivity: [],
  status: 'offline',
  latency: 0,
  stakingTokenSymbol: '',
});

export { getDefaultMarketData, getDefaultNetworkData };
