import { chartColors } from '@/lib/config/colors';
import { oracleColors } from '@/lib/constants';
import { type RefreshInterval } from '@/lib/constants';
import { OracleProvider } from '@/lib/oracles';

import { type OracleMarketData, type AssetData, type ChainSupportData } from './types';

export const ORACLE_COLORS = {
  chainlink: oracleColors[OracleProvider.CHAINLINK],
  pyth: oracleColors[OracleProvider.PYTH],
  api3: oracleColors[OracleProvider.API3],
  redstone: oracleColors[OracleProvider.REDSTONE],
  dia: oracleColors[OracleProvider.DIA],
  winklink: oracleColors[OracleProvider.WINKLINK],
  others: chartColors.recharts.tick,
} as const;

// 模拟市场数据 - 实际项目中应从API获取
export const MOCK_ORACLE_DATA: OracleMarketData[] = [
  {
    name: 'Chainlink',
    share: 62.5,
    color: ORACLE_COLORS.chainlink,
    tvs: '$42.1B',
    tvsValue: 42.1,
    chains: 15,
    protocols: 450,
    avgLatency: 450,
    accuracy: 99.8,
    updateFrequency: 3600,
    change24h: 2.3,
    change7d: 5.1,
    change30d: 12.4,
  },
  {
    name: 'Pyth Network',
    share: 18.3,
    color: ORACLE_COLORS.pyth,
    tvs: '$15.2B',
    tvsValue: 15.2,
    chains: 20,
    protocols: 280,
    avgLatency: 120,
    accuracy: 99.5,
    updateFrequency: 400,
    change24h: 5.8,
    change7d: 15.2,
    change30d: 45.6,
  },
  {
    name: 'API3',
    share: 6.2,
    color: ORACLE_COLORS.api3,
    tvs: '$3.5B',
    tvsValue: 3.5,
    chains: 10,
    protocols: 85,
    avgLatency: 900,
    accuracy: 98.9,
    updateFrequency: 3600,
    change24h: 1.5,
    change7d: 7.8,
    change30d: 22.1,
  },
  {
    name: 'RedStone',
    share: 3.5,
    color: ORACLE_COLORS.redstone,
    tvs: '$2.1B',
    tvsValue: 2.1,
    chains: 6,
    protocols: 32,
    avgLatency: 300,
    accuracy: 99.3,
    updateFrequency: 600,
    change24h: 3.2,
    change7d: 8.5,
    change30d: 18.7,
  },
  {
    name: 'DIA',
    share: 2.8,
    color: ORACLE_COLORS.dia,
    tvs: '$1.6B',
    tvsValue: 1.6,
    chains: 9,
    protocols: 28,
    avgLatency: 750,
    accuracy: 99.0,
    updateFrequency: 2400,
    change24h: 0.5,
    change7d: 4.2,
    change30d: 11.3,
  },
  {
    name: 'WINkLink',
    share: 1.2,
    color: ORACLE_COLORS.winklink,
    tvs: '$0.7B',
    tvsValue: 0.7,
    chains: 3,
    protocols: 12,
    avgLatency: 600,
    accuracy: 98.8,
    updateFrequency: 1800,
    change24h: -0.5,
    change7d: 2.3,
    change30d: 7.8,
  },
];

export const CHAIN_SUPPORT_DATA: ChainSupportData[] = [
  { name: 'Chainlink', chains: 15, protocols: 450, color: ORACLE_COLORS.chainlink },
  { name: 'Pyth Network', chains: 20, protocols: 280, color: ORACLE_COLORS.pyth },
  { name: 'API3', chains: 10, protocols: 85, color: ORACLE_COLORS.api3 },
  { name: 'RedStone', chains: 6, protocols: 32, color: ORACLE_COLORS.redstone },
  { name: 'DIA', chains: 9, protocols: 28, color: ORACLE_COLORS.dia },
  { name: 'WINkLink', chains: 3, protocols: 12, color: ORACLE_COLORS.winklink },
];

export const MOCK_ASSETS: AssetData[] = [
  {
    symbol: 'BTC',
    price: 67432.5,
    change24h: 2.4,
    change7d: 5.2,
    volume24h: 28500000000,
    marketCap: 1320000000000,
    primaryOracle: 'Chainlink',
    oracleCount: 5,
    priceSources: [],
  },
  {
    symbol: 'ETH',
    price: 3521.8,
    change24h: -1.2,
    change7d: 3.8,
    volume24h: 15200000000,
    marketCap: 423000000000,
    primaryOracle: 'Pyth Network',
    oracleCount: 5,
    priceSources: [],
  },
  {
    symbol: 'SOL',
    price: 142.3,
    change24h: 5.6,
    change7d: 12.4,
    volume24h: 3200000000,
    marketCap: 64000000000,
    primaryOracle: 'Chainlink',
    oracleCount: 4,
    priceSources: [],
  },
  {
    symbol: 'AVAX',
    price: 35.4,
    change24h: -0.8,
    change7d: 2.1,
    volume24h: 890000000,
    marketCap: 13400000000,
    primaryOracle: 'API3',
    oracleCount: 4,
    priceSources: [],
  },
  {
    symbol: 'LINK',
    price: 18.2,
    change24h: 1.5,
    change7d: 8.9,
    volume24h: 450000000,
    marketCap: 11200000000,
    primaryOracle: 'Chainlink',
    oracleCount: 5,
    priceSources: [],
  },
  {
    symbol: 'MATIC',
    price: 0.65,
    change24h: -3.2,
    change7d: -5.4,
    volume24h: 280000000,
    marketCap: 6500000000,
    primaryOracle: 'Pyth Network',
    oracleCount: 4,
    priceSources: [],
  },
  {
    symbol: 'ARB',
    price: 1.85,
    change24h: 0.9,
    change7d: 4.2,
    volume24h: 320000000,
    marketCap: 5900000000,
    primaryOracle: 'Chainlink',
    oracleCount: 4,
    priceSources: [],
  },
  {
    symbol: 'OP',
    price: 2.45,
    change24h: 1.2,
    change7d: 6.8,
    volume24h: 180000000,
    marketCap: 2600000000,
    primaryOracle: 'Chainlink',
    oracleCount: 4,
    priceSources: [],
  },
  {
    symbol: 'UNI',
    price: 7.8,
    change24h: -2.1,
    change7d: 1.5,
    volume24h: 120000000,
    marketCap: 4700000000,
    primaryOracle: 'Chainlink',
    oracleCount: 5,
    priceSources: [],
  },
];

// 刷新间隔选项（毫秒）
export const REFRESH_INTERVALS: { label: string; value: RefreshInterval }[] = [
  { label: 'off', value: 0 },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
  { label: '5m', value: 300000 },
];

// 默认刷新间隔
export const DEFAULT_REFRESH_INTERVAL: RefreshInterval = 30000;

// 价格精度配置
export const PRICE_PRECISION: Record<string, number> = {
  BTC: 2,
  ETH: 2,
  SOL: 2,
  AVAX: 2,
  LINK: 4,
  MATIC: 4,
  ARB: 4,
  OP: 4,
  UNI: 4,
  default: 4,
};

// 市值格式化配置
export const MARKET_CAP_FORMAT = {
  trillion: 1e12,
  billion: 1e9,
  million: 1e6,
};

// 表格列配置
export const ASSET_TABLE_COLUMNS = [
  { key: 'symbol', label: 'asset', width: '15%' },
  { key: 'price', label: 'price', width: '15%', align: 'right' as const },
  { key: 'change24h', label: 'change24h', width: '12%', align: 'right' as const },
  { key: 'change7d', label: 'change7d', width: '12%', align: 'right' as const },
  { key: 'volume24h', label: 'volume24h', width: '18%', align: 'right' as const },
  { key: 'marketCap', label: 'marketCap', width: '18%', align: 'right' as const },
  { key: 'primaryOracle', label: 'primaryOracle', width: '10%', align: 'center' as const },
];

// 图表配置
export const CHART_CONFIG = {
  height: 400,
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
  barSize: 40,
  animationDuration: 1000,
};

// 价格变动阈值
export const PRICE_CHANGE_THRESHOLDS = {
  significant: 5, // 5%
  moderate: 2, // 2%
  small: 0.5, // 0.5%
};

// 缓存配置
export const CACHE_CONFIG = {
  marketData: 5 * 60 * 1000, // 5分钟
  priceData: 30 * 1000, // 30秒
  oracleData: 10 * 60 * 1000, // 10分钟
};

// WebSocket配置
export const WEBSOCKET_CONFIG = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  pingInterval: 30000,
};

// 错误重试配置
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};
