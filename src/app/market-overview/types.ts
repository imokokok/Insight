export interface OracleMarketData {
  name: string;
  share: number;
  color: string;
  tvs: string;
  tvsValue: number;
  chains: number;
  protocols: number;
  avgLatency: number;
  accuracy: number;
  updateFrequency: number;
  change24h: number;
  change7d: number;
  change30d: number;
}

export interface AssetData {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  primaryOracle: string;
  oracleCount: number;
  priceSources: {
    oracle: string;
    price: number;
    latency: number;
    timestamp: number;
  }[];
}

export interface MarketStats {
  totalTVS: number;
  totalChains: number;
  totalProtocols: number;
  totalAssets: number;
  avgUpdateLatency: number;
  marketDominance: number;
  oracleCount: number;
  change24h: number;
}

export interface TVSTrendData {
  timestamp: number;
  date: string;
  chainlink: number;
  pyth: number;
  band: number;
  api3: number;
  uma: number;
  total: number;
}

export interface ChainSupportData {
  name: string;
  chains: number;
  protocols: number;
  color: string;
}

export interface TimeRange {
  key: string;
  label: string;
  hours: number;
}

export type ChartType = 'pie' | 'trend' | 'bar';
export type ViewType = 'chart' | 'table';

export const TIME_RANGES: TimeRange[] = [
  { key: '1H', label: '1H', hours: 1 },
  { key: '24H', label: '24H', hours: 24 },
  { key: '7D', label: '7D', hours: 168 },
  { key: '30D', label: '30D', hours: 720 },
  { key: '90D', label: '90D', hours: 2160 },
  { key: '1Y', label: '1Y', hours: 8760 },
  { key: 'ALL', label: 'ALL', hours: 0 },
];
