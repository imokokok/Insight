import { chartColors } from '@/lib/config/colors';

export interface MarketShareDataItem {
  name: string;
  value: number;
  color: string;
  tvs: string;
  chains: number;
  protocols?: number;
}

interface TvsTrendDataPoint {
  time: string;
  chainlink: number;
  pyth: number;
  api3: number;
  redstone: number;
  dia: number;
  winklink: number;
}

interface ChainSupportDataItem {
  name: string;
  chains: number;
  color: string;
  protocols: number;
}

type TimeRangeKey = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

const COLORS = {
  chainlink: chartColors.oracle.chainlink,
  pyth: chartColors.oracle.pyth,
  api3: chartColors.oracle.api3,
  redstone: chartColors.oracle.redstone,
  dia: chartColors.oracle.dia,
  winklink: chartColors.oracle.winklink,
};

const DEFAULT_MARKET_SHARE_DATA: MarketShareDataItem[] = [];

const DEFAULT_CHAIN_SUPPORT_DATA: ChainSupportDataItem[] = [];

const CACHE_CONFIG = {
  marketShare: {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  },
  tvsTrend: {
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: false,
  },
  chainSupport: {
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  },
} as const;
