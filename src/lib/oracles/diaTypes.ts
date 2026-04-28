export interface DIAAssetQuotation {
  Symbol: string;
  Name: string;
  Address: string;
  Blockchain: string;
  Price: number;
  PriceYesterday: number;
  VolumeYesterdayUSD: number;
  Time: string;
  Source: string;
}

export interface DIASupply {
  Symbol: string;
  Name: string;
  CirculatingSupply: number;
  TotalSupply: number;
  MaxSupply: number;
}

export interface DIAExchange {
  Name: string;
  Volume24h: number;
  Trades: number;
  Pairs: number;
  Type: 'CEX' | 'DEX';
  Blockchain: string;
  ScraperActive: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
