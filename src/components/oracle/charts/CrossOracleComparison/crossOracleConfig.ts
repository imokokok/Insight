import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  TellorClient,
  ChronicleClient,
  WINkLinkClient,
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
  [OracleProvider.DIA]: new DIAClient(),
  [OracleProvider.TELLOR]: new TellorClient(),
  [OracleProvider.CHRONICLE]: new ChronicleClient(),
  [OracleProvider.WINKLINK]: new WINkLinkClient(),
};

export const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.TELLOR]: 'Tellor',
  [OracleProvider.CHRONICLE]: 'Chronicle',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

export const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.PYTH]: chartColors.oracle['pyth'],
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: chartColors.oracle.dia,
  [OracleProvider.TELLOR]: chartColors.oracle.tellor,
  [OracleProvider.CHRONICLE]: chartColors.oracle.chronicle,
  [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
};

export const symbols = [
  'BTC', 'ETH', 'SOL', 'USDC', 'LINK', 'AVAX', 'MATIC', 'ARB',
  'BNB', 'XRP', 'DOGE', 'ADA', 'DOT', 'ATOM', 'NEAR', 'OP',
  'UNI', 'AAVE', 'MKR', 'LDO', 'CRV', 'SNX', 'COMP', 'YFI',
  'STETH', 'WBTC', 'DAI', 'USDT', 'WETH'
];

export const defaultPerformanceData: OraclePerformance[] = [
  {
    provider: OracleProvider.CHAINLINK,
    responseTime: 85,
    updateFrequency: 3600, // 1小时（秒）
    dataSources: 350,
    supportedChains: 15,
    reliability: 99.9,
    accuracy: 99.5,
    decentralization: 95,
  },
  {
    provider: OracleProvider.PYTH,
    responseTime: 45,
    updateFrequency: 0.4, // 400ms（秒）
    dataSources: 180,
    supportedChains: 10,
    reliability: 99.9,
    accuracy: 99.7,
    decentralization: 90,
  },
  {
    provider: OracleProvider.BAND_PROTOCOL,
    responseTime: 150,
    updateFrequency: 1800, // 30分钟（秒）
    dataSources: 150,
    supportedChains: 8,
    reliability: 99.5,
    accuracy: 99.2,
    decentralization: 85,
  },
  {
    provider: OracleProvider.API3,
    responseTime: 180,
    updateFrequency: 3600, // 1小时（秒）
    dataSources: 168,
    supportedChains: 5,
    reliability: 99.7,
    accuracy: 99.4,
    decentralization: 80,
  },
  {
    provider: OracleProvider.REDSTONE,
    responseTime: 30,
    updateFrequency: 0.1, // 100ms（秒）- 实时流式
    dataSources: 120,
    supportedChains: 6,
    reliability: 99.8,
    accuracy: 99.6,
    decentralization: 85,
  },
  {
    provider: OracleProvider.DIA,
    responseTime: 200,
    updateFrequency: 3600, // 1小时（秒）
    dataSources: 80,
    supportedChains: 12,
    reliability: 99.5,
    accuracy: 99.3,
    decentralization: 75,
  },
  {
    provider: OracleProvider.TELLOR,
    responseTime: 300,
    updateFrequency: 7200, // 2小时（秒）- 按需
    dataSources: 50,
    supportedChains: 4,
    reliability: 99.0,
    accuracy: 98.8,
    decentralization: 95, // PoW 机制，高度去中心化
  },
];

// 预言机特性分组
export const ORACLE_GROUPS = {
  HIGH_FREQUENCY: [OracleProvider.PYTH, OracleProvider.REDSTONE],
  STANDARD: [
    OracleProvider.CHAINLINK,
    OracleProvider.BAND_PROTOCOL,
    OracleProvider.API3,
    OracleProvider.DIA,
    OracleProvider.TELLOR,
  ],
  ALL: [
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.BAND_PROTOCOL,
    OracleProvider.API3,
    OracleProvider.REDSTONE,
    OracleProvider.DIA,
    OracleProvider.TELLOR,
  ],
} as const;

export type OracleGroup = 'HIGH_FREQUENCY' | 'STANDARD' | 'ALL';
