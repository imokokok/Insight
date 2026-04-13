/**
 * @fileoverview 跨预言机对比页面常量定义
 */

import { OracleProvider } from '@/types/oracle';

// ============================================================================
// 时间范围
// ============================================================================

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

export const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1小时' },
  { value: '24h', label: '24小时' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
  { value: '90d', label: '90天' },
  { value: '1y', label: '1年' },
];

// ============================================================================
// 交易对
// ============================================================================

export const tradingPairs = [
  'BTC/USD',
  'ETH/USD',
  'LINK/USD',
  'UNI/USD',
  'AAVE/USD',
  'SNX/USD',
  'CRV/USD',
  'MKR/USD',
  'COMP/USD',
  'YFI/USD',
  'BAL/USD',
  'SUSHI/USD',
  '1INCH/USD',
  'LDO/USD',
  'FXS/USD',
  'DYDX/USD',
  'GMX/USD',
  'ARB/USD',
  'OP/USD',
  'MATIC/USD',
  'AVAX/USD',
  'FTM/USD',
  'NEAR/USD',
  'ATOM/USD',
  'DOT/USD',
  'SOL/USD',
  'ADA/USD',
];

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
};

export const oracleColors: Record<string, string> = {
  [OracleProvider.CHAINLINK]: '#375bd2',
  [OracleProvider.PYTH]: '#e6c5ff',
  [OracleProvider.API3]: '#7ce3cb',
  [OracleProvider.REDSTONE]: '#ff6b6b',
  [OracleProvider.DIA]: '#c9f31d',
  [OracleProvider.WINKLINK]: '#f0b90b',
  chronicle: '#f6c344',
  tellor: '#20fe9b',
  band: '#516ff2',
  uma: '#ff4a4a',
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

export const ANOMALY_THRESHOLD = 2; // Z-score threshold for outliers

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
export function isOutlier(zScore: number, threshold: number = ANOMALY_THRESHOLD): boolean {
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
  text: string;
  color: string;
  seconds?: number;
} {
  const age = Date.now() - timestamp;
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(age / 60000);

  if (minutes < 1) {
    return { text: '刚刚', color: '#22c55e', seconds };
  }
  if (minutes < 5) {
    return { text: `${minutes}分钟前`, color: '#22c55e', seconds };
  }
  if (minutes < 30) {
    return { text: `${minutes}分钟前`, color: '#f59e0b', seconds };
  }
  if (minutes < 60) {
    return { text: `${minutes}分钟前`, color: '#ef4444', seconds };
  }
  return { text: `${Math.floor(minutes / 60)}小时前`, color: '#7f1d1d', seconds };
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
    data.symbol,
    data.timestamp,
    oracle.name,
    oracle.price.toFixed(8),
    oracle.deviation.toFixed(4),
    new Date(oracle.timestamp).toISOString(),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
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
