import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
} from '@/lib/oracles';
import { OracleProvider } from '@/types/oracle';
import { chartColors } from '@/lib/config/colors';

export type SortField = 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name';
export type SortDirection = 'asc' | 'desc' | null;
export type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export interface OraclePerformance {
  provider: OracleProvider;
  responseTime: number;
  updateFrequency: number;
  dataSources: number;
  supportedChains: number;
  reliability: number;
  accuracy: number;
  decentralization: number;
}

export interface PriceComparisonData {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  confidence?: number;
  responseTime: number;
  previousPrice?: number;
}

export interface DeviationData {
  provider: OracleProvider;
  name: string;
  price: number;
  deviationPercent: number;
  deviationFromAvg: number;
  rank: number;
  responseTime: number;
  confidence?: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

export interface PriceDeviationDetail {
  provider: OracleProvider;
  name: string;
  price: number;
  deviationFromAvg: number;
  deviationFromMedian: number;
  deviationFromBenchmark: number;
  rank: number;
}

export const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH]: new PythClient(),
  [OracleProvider.API3]: new API3Client(),
  [OracleProvider.REDSTONE]: new RedStoneClient(),
};

export const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
};

export const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.PYTH]: chartColors.oracle['pyth'],
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
};

export const symbols = ['BTC', 'ETH', 'SOL', 'USDC', 'LINK', 'AVAX', 'MATIC', 'ARB'];

export const defaultPerformanceData: OraclePerformance[] = [
  {
    provider: OracleProvider.CHAINLINK,
    responseTime: 85,
    updateFrequency: 30,
    dataSources: 350,
    supportedChains: 12,
    reliability: 99.8,
    accuracy: 99.5,
    decentralization: 95,
  },
  {
    provider: OracleProvider.PYTH,
    responseTime: 45,
    updateFrequency: 0.4,
    dataSources: 180,
    supportedChains: 8,
    reliability: 99.9,
    accuracy: 99.7,
    decentralization: 90,
  },
  {
    provider: OracleProvider.BAND_PROTOCOL,
    responseTime: 150,
    updateFrequency: 30,
    dataSources: 180,
    supportedChains: 8,
    reliability: 99.5,
    accuracy: 99.2,
    decentralization: 85,
  },
  {
    provider: OracleProvider.API3,
    responseTime: 180,
    updateFrequency: 60,
    dataSources: 168,
    supportedChains: 3,
    reliability: 99.7,
    accuracy: 99.4,
    decentralization: 80,
  },
  {
    provider: OracleProvider.UMA,
    responseTime: 300,
    updateFrequency: 120,
    dataSources: 50,
    supportedChains: 2,
    reliability: 99.5,
    accuracy: 98.8,
    decentralization: 88,
  },
];
