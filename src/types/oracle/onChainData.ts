export interface ReflectorTokenOnChainData {
  symbol: string;
  price: number;
  decimals: number;
  resolution: number;
  version: number;
  assets: string[];
  lastTimestamp: number;
  nodeCount: number;
  threshold: number;
  baseAsset: string;
  dataAge: number | null;
  lastUpdated: number;
  source: string;
}

export interface TwapOnChainData {
  poolAddress: string;
  feeTier: number;
  liquidity: string;
  twapInterval: number;
  twapPrice: number;
  spotPrice: number;
  priceDeviation: number;
  tick: number;
  sqrtPriceX96: string;
  confidence: number;
}

export interface FlareTokenOnChainData {
  symbol: string;
  price: number;
  decimals: number;
  feedId: string;
  dataAge: number;
  lastUpdated: number;
  network: string;
  provider: string;
}

export interface RedStoneTokenOnChainData {
  symbol: string;
  price: number;
  decimals: number;
  bid: number | null;
  ask: number | null;
  spreadPercentage: number | null;
  supportedChainsCount: number;
  updateIntervalMinutes: number;
  provider: string;
  dataAge: number | null;
  lastUpdated: number;
}

export interface SupraTokenOnChainData {
  symbol: string;
  price: number;
  decimals: number;
  pairIndex: number;
  pairName: string;
  supportedChainsCount: number;
  updateIntervalMinutes: number;
  dataAge: number | null;
  lastUpdated: number;
  source: string;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  change24hPercent?: number;
}

export interface DIATokenOnChainData {
  symbol: string;
  price: number;
  change24hPercent: number;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  marketCap: number | null;
  exchangeCount: number;
  activeExchangeCount: number;
  totalTradingPairs: number;
  totalVolume24h: number;
  lastUpdated: number;
  dataSource: string;
}

export interface WINkLinkTokenOnChainData {
  symbol: string;
  price: number;
  feedContractAddress: string | null;
  decimals: number | null;
  dataFeedsCount: number;
  activeNodes: number | null;
  nodeUptime: number;
  avgResponseTime: number;
  lastUpdated: number;
  priceUpdateTime: number | null;
  dataSource: string;
}

export type AnyOnChainData =
  | DIATokenOnChainData
  | RedStoneTokenOnChainData
  | SupraTokenOnChainData
  | WINkLinkTokenOnChainData
  | TwapOnChainData
  | ReflectorTokenOnChainData
  | FlareTokenOnChainData;

export interface OnChainData {
  diaOnChainData?: AnyOnChainData | null;
  isDIADataLoading?: boolean;
  winklinkOnChainData?: AnyOnChainData | null;
  isWINkLinkDataLoading?: boolean;
  redstoneOnChainData?: AnyOnChainData | null;
  isRedStoneDataLoading?: boolean;
  supraOnChainData?: AnyOnChainData | null;
  isSupraDataLoading?: boolean;
  twapOnChainData?: AnyOnChainData | null;
  isTwapDataLoading?: boolean;
  reflectorOnChainData?: AnyOnChainData | null;
  isReflectorDataLoading?: boolean;
  flareOnChainData?: AnyOnChainData | null;
  isFlareDataLoading?: boolean;
}
