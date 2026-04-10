import { chartColors } from '@/lib/config/colors';
import { OracleClientFactory } from '@/lib/oracles';
import { type PriceHistoryPoint } from '@/lib/oracles/oracleDataUtils';
import { type CalculatedPerformanceMetrics } from '@/lib/oracles/performanceMetricsCalculator';
import { OracleProvider } from '@/types/oracle';

export type SortField = 'price' | 'deviation' | 'confidence' | 'responseTime' | 'name';
export type SortDirection = 'asc' | 'desc' | null;
export type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// 从 oracleDataUtils.ts 重新导出 PriceHistoryPoint 类型，保持一致性
export type { PriceHistoryPoint };

export interface OraclePerformance {
  provider: OracleProvider;
  responseTime: number;
  updateFrequency: number;
  dataSources: number;
  supportedChains: number;
  reliability: number;
  accuracy: number;
  decentralization: number;
  sampleSize?: number;
  lastCalculated?: number;
  isCalculated?: boolean;
}

// 从计算后的指标转换为 OraclePerformance
export function convertCalculatedMetricsToPerformance(
  metrics: CalculatedPerformanceMetrics
): OraclePerformance {
  return {
    provider: metrics.provider,
    responseTime: metrics.responseTime,
    updateFrequency: metrics.updateFrequency,
    dataSources: metrics.dataSources,
    supportedChains: metrics.supportedChains,
    reliability: metrics.reliability,
    accuracy: metrics.accuracy,
    decentralization: metrics.decentralization,
    sampleSize: metrics.sampleSize,
    lastCalculated: metrics.lastCalculated,
    isCalculated: true,
  };
}

// 合并静态数据和动态计算数据
export function mergePerformanceData(
  staticData: OraclePerformance[],
  calculatedMetrics: CalculatedPerformanceMetrics[]
): OraclePerformance[] {
  const metricsMap = new Map(
    calculatedMetrics.map((m) => [m.provider, convertCalculatedMetricsToPerformance(m)])
  );

  return staticData.map((staticItem) => {
    const calculatedItem = metricsMap.get(staticItem.provider);
    if (calculatedItem && calculatedItem.sampleSize && calculatedItem.sampleSize > 5) {
      // 如果有足够的计算样本，优先使用计算数据
      return calculatedItem;
    }
    // 否则使用静态数据，但标记为未计算
    return { ...staticItem, isCalculated: false };
  });
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

export const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

export const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.PYTH]: chartColors.oracle['pyth'],
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: chartColors.oracle.dia,
  [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
};

export const symbols = [
  'BTC',
  'ETH',
  'SOL',
  'USDC',
  'LINK',
  'AVAX',
  'MATIC',
  'ARB',
  'BNB',
  'XRP',
  'DOGE',
  'ADA',
  'DOT',
  'ATOM',
  'NEAR',
  'OP',
  'UNI',
  'AAVE',
  'MKR',
  'LDO',
  'CRV',
  'SNX',
  'COMP',
  'YFI',
  'STETH',
  'WBTC',
  'DAI',
  'USDT',
  'WETH',
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
];

// 预言机特性分组
export const ORACLE_GROUPS = {
  HIGH_FREQUENCY: [OracleProvider.PYTH, OracleProvider.REDSTONE],
  STANDARD: [OracleProvider.CHAINLINK, OracleProvider.API3, OracleProvider.DIA],
  ALL: [
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.API3,
    OracleProvider.REDSTONE,
    OracleProvider.DIA,
  ],
} as const;

export type OracleGroup = 'HIGH_FREQUENCY' | 'STANDARD' | 'ALL';
