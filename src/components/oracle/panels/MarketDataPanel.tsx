export interface MarketDataConfig {
  symbol: string;
  tokenName: string;
  tokenSymbol: string;
  marketCap: number;
  volume24h: number;
  volume24hChange?: number | null;
  liquidity?: number;
  circulatingSupply: number;
  totalSupply: number;
  fullyDilutedValuation: number;
  marketCapRank: number;
  high24h: number;
  low24h: number;
  change24h: number;
  change24hValue: number;
  stakingApr?: number;
}