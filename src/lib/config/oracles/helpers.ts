import { getTokenMarketData } from '@/lib/services/marketData/binanceMarketService';

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

async function fetchOracleMarketData(
  symbol: string,
  name: string
): Promise<MarketDataConfig & { change24hPercent?: number }> {
  try {
    const marketData = await getTokenMarketData(symbol);
    if (marketData) {
      return {
        symbol: marketData.symbol,
        tokenName: marketData.name,
        tokenSymbol: marketData.symbol,
        marketCap: marketData.marketCap ?? 0,
        volume24h: marketData.totalVolume24h,
        circulatingSupply: marketData.circulatingSupply ?? 0,
        totalSupply: marketData.totalSupply ?? 0,
        fullyDilutedValuation: marketData.marketCap ?? 0,
        marketCapRank: marketData.marketCapRank ?? 0,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        change24h: marketData.priceChange24h,
        change24hValue: marketData.priceChange24h,
        change24hPercent: marketData.priceChangePercentage24h,
        stakingApr: 0,
      };
    }
  } catch (error) {
    console.warn(`Failed to fetch market data for ${symbol}:`, error);
  }
  return getDefaultMarketData(symbol, name);
}

export { getDefaultMarketData, getDefaultNetworkData, fetchOracleMarketData };
