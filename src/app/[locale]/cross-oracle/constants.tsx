/**
 * @fileoverview 跨预言机对比页面常量定义
 */

import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { escapeCSVField } from '@/lib/utils/export';
import { OracleProvider } from '@/types/oracle';

// ============================================================================
// 时间范围
// ============================================================================

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

export type TimeRangeValue = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y';

export function timeRangeToValue(range: TimeRange): TimeRangeValue {
  const map: Record<TimeRange, TimeRangeValue> = {
    '1h': '1H',
    '24h': '24H',
    '7d': '7D',
    '30d': '30D',
    '90d': '90D',
    '1y': '1Y',
  };
  return map[range];
}

export const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1小时' },
  { value: '24h', label: '24小时' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
  { value: '90d', label: '90天' },
  { value: '1y', label: '1年' },
];

// ============================================================================
// 交易对 - 从统一的符号列表生成
// ============================================================================

// 获取所有支持的交易对并转换为 BTC/USD 格式
const allSymbols = getAllSupportedSymbols();
export const tradingPairs = allSymbols.map((symbol) => `${symbol}/USD`);

export const symbols = tradingPairs;

// ============================================================================
// 预言机提供商 - 使用统一的 OracleProvider enum
// ============================================================================

// 兼容旧代码的导出 - 使用 OracleProvider enum
export const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.WINKLINK]: 'WINkLink',
  [OracleProvider.SUPRA]: 'Supra',
};

export const oracleColors: Record<string, string> = {
  [OracleProvider.CHAINLINK]: '#375bd2',
  [OracleProvider.PYTH]: '#e6c5ff',
  [OracleProvider.API3]: '#7ce3cb',
  [OracleProvider.REDSTONE]: '#ff6b6b',
  [OracleProvider.DIA]: '#c9f31d',
  [OracleProvider.WINKLINK]: '#f0b90b',
  [OracleProvider.SUPRA]: '#14B8A6',
};

// ============================================================================
// 刷新间隔
// ============================================================================

export type RefreshInterval = 'off' | '10s' | '30s' | '1m' | '5m';

// ============================================================================
// 阈值配置
// ============================================================================

export const deviationThresholds = {
  critical: 5,
  warning: 2,
  info: 1,
};

export const ANOMALY_ZSCORE_THRESHOLD = 2;

// ============================================================================
// 图表配置
// ============================================================================

export const chartConfig = {
  height: 400,
  margin: { top: 20, right: 30, left: 20, bottom: 30 },
  colors: oracleColors,
};

// ============================================================================
// 缓存配置
// ============================================================================

export const cacheConfig = {
  staleTime: 5 * 60 * 1000, // 5分钟
  gcTime: 10 * 60 * 1000, // 10分钟
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 计算Z-score（标准分数）
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * 判断是否为异常值
 */
export function isOutlier(zScore: number, threshold: number = ANOMALY_ZSCORE_THRESHOLD): boolean {
  return Math.abs(zScore) > threshold;
}

/**
 * 获取偏差背景色类名
 */
export function getDeviationBgClass(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= deviationThresholds.critical) {
    return 'bg-red-100 text-red-800';
  }
  if (absDeviation >= deviationThresholds.warning) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (absDeviation >= deviationThresholds.info) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-green-100 text-green-800';
}

/**
 * 获取数据新鲜度信息
 */
export function getFreshnessInfo(timestamp: number): {
  textKey: string;
  textParams: Record<string, number>;
  color: string;
  seconds?: number;
} {
  const age = Date.now() - timestamp;
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(age / 60000);

  if (minutes < 1) {
    return { textKey: 'crossOracle.freshness.justNow', textParams: {}, color: '#22c55e', seconds };
  }
  if (minutes < 5) {
    return {
      textKey: 'crossOracle.freshness.minutesAgo',
      textParams: { minutes },
      color: '#22c55e',
      seconds,
    };
  }
  if (minutes < 30) {
    return {
      textKey: 'crossOracle.freshness.minutesAgo',
      textParams: { minutes },
      color: '#f59e0b',
      seconds,
    };
  }
  if (minutes < 60) {
    return {
      textKey: 'crossOracle.freshness.minutesAgo',
      textParams: { minutes },
      color: '#ef4444',
      seconds,
    };
  }
  return {
    textKey: 'crossOracle.freshness.hoursAgo',
    textParams: { hours: Math.floor(minutes / 60) },
    color: '#7f1d1d',
    seconds,
  };
}

/**
 * 获取新鲜度圆点颜色
 */
export function getFreshnessDotColor(timestamp: number): string {
  const age = Date.now() - timestamp;
  const minutes = Math.floor(age / 60000);

  if (minutes < 1) return '#22c55e';
  if (minutes < 5) return '#22c55e';
  if (minutes < 30) return '#f59e0b';
  if (minutes < 60) return '#ef4444';
  return '#7f1d1d';
}

// ============================================================================
// 排序和筛选类型
// ============================================================================

export type SortColumn = 'oracle' | 'price' | 'deviation' | 'timestamp' | 'confidence';
export type SortDirection = 'asc' | 'desc';
export type DeviationFilter = 'all' | 'normal' | 'warning' | 'critical';

// ============================================================================
// 导出功能
// ============================================================================

export interface ExportData {
  symbol: string;
  timestamp: string;
  oracles: {
    name: string;
    price: number;
    deviation: number;
    timestamp: number;
  }[];
}

export function exportToCSV(data: ExportData): string {
  const headers = ['Symbol', 'Timestamp', 'Oracle', 'Price', 'Deviation (%)', 'Oracle Timestamp'];
  const rows = data.oracles.map((oracle) => [
    escapeCSVField(data.symbol),
    escapeCSVField(data.timestamp),
    escapeCSVField(oracle.name),
    escapeCSVField(oracle.price.toFixed(8)),
    escapeCSVField(oracle.deviation.toFixed(4)),
    escapeCSVField(new Date(oracle.timestamp).toISOString()),
  ]);

  return [headers.map(escapeCSVField).join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(
    {
      symbol: data.symbol,
      timestamp: data.timestamp,
      oracles: data.oracles,
    },
    null,
    2
  );
}
