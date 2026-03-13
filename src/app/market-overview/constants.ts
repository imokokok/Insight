import { OracleMarketData, AssetData, TVSTrendData, ChainSupportData } from './types';
import { oracleColors } from '@/lib/constants';

export const ORACLE_COLORS = {
  chainlink: oracleColors['chainlink'] || '#375BD2',
  pyth: oracleColors['pyth-network'] || '#E6B800',
  band: oracleColors['band-protocol'] || '#516BEB',
  api3: oracleColors['api3'] || '#7CE3CB',
  uma: oracleColors['uma'] || '#FF4A8D',
  others: '#9CA3AF',
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
    name: 'Band Protocol',
    share: 8.7,
    color: ORACLE_COLORS.band,
    tvs: '$4.1B',
    tvsValue: 4.1,
    chains: 12,
    protocols: 120,
    avgLatency: 600,
    accuracy: 99.2,
    updateFrequency: 1800,
    change24h: -1.2,
    change7d: 3.4,
    change30d: 8.9,
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
    name: 'UMA',
    share: 4.3,
    color: ORACLE_COLORS.uma,
    tvs: '$2.5B',
    tvsValue: 2.5,
    chains: 8,
    protocols: 45,
    avgLatency: 1200,
    accuracy: 98.5,
    updateFrequency: 7200,
    change24h: -0.8,
    change7d: 2.1,
    change30d: 5.4,
  },
];

// 生成TVS趋势数据
export function generateTVSTrendData(hours: number): TVSTrendData[] {
  const data: TVSTrendData[] = [];
  const now = Date.now();
  const interval = hours <= 24 ? 3600000 : 86400000; // 1小时或1天
  const points = hours === 0 ? 365 : Math.min(hours, 365);

  let chainlinkBase = 35;
  let pythBase = 8;
  let bandBase = 3.5;
  let api3Base = 2.5;
  let umaBase = 2;

  // 置信区间系数 (95% 置信区间约为 ±5%)
  const confidenceInterval = 0.05;

  for (let i = points; i >= 0; i--) {
    const timestamp = now - i * interval;
    const date = new Date(timestamp);
    const dateStr =
      hours <= 24
        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 添加随机波动
    const volatility = 0.02;
    chainlinkBase *= 1 + (Math.random() - 0.48) * volatility;
    pythBase *= 1 + (Math.random() - 0.45) * volatility;
    bandBase *= 1 + (Math.random() - 0.5) * volatility;
    api3Base *= 1 + (Math.random() - 0.5) * volatility;
    umaBase *= 1 + (Math.random() - 0.5) * volatility;

    // 计算置信区间上下界
    const chainlinkUpper = chainlinkBase * (1 + confidenceInterval);
    const chainlinkLower = chainlinkBase * (1 - confidenceInterval);
    const pythUpper = pythBase * (1 + confidenceInterval);
    const pythLower = pythBase * (1 - confidenceInterval);
    const bandUpper = bandBase * (1 + confidenceInterval);
    const bandLower = bandBase * (1 - confidenceInterval);
    const api3Upper = api3Base * (1 + confidenceInterval);
    const api3Lower = api3Base * (1 - confidenceInterval);
    const umaUpper = umaBase * (1 + confidenceInterval);
    const umaLower = umaBase * (1 - confidenceInterval);

    data.push({
      timestamp,
      date: dateStr,
      chainlink: Number(chainlinkBase.toFixed(2)),
      chainlinkUpper: Number(chainlinkUpper.toFixed(2)),
      chainlinkLower: Number(chainlinkLower.toFixed(2)),
      pyth: Number(pythBase.toFixed(2)),
      pythUpper: Number(pythUpper.toFixed(2)),
      pythLower: Number(pythLower.toFixed(2)),
      band: Number(bandBase.toFixed(2)),
      bandUpper: Number(bandUpper.toFixed(2)),
      bandLower: Number(bandLower.toFixed(2)),
      api3: Number(api3Base.toFixed(2)),
      api3Upper: Number(api3Upper.toFixed(2)),
      api3Lower: Number(api3Lower.toFixed(2)),
      uma: Number(umaBase.toFixed(2)),
      umaUpper: Number(umaUpper.toFixed(2)),
      umaLower: Number(umaLower.toFixed(2)),
      total: Number((chainlinkBase + pythBase + bandBase + api3Base + umaBase).toFixed(2)),
    });
  }

  return data;
}

// 链支持数据
export const CHAIN_SUPPORT_DATA: ChainSupportData[] = [
  { name: 'Chainlink', chains: 15, protocols: 450, color: ORACLE_COLORS.chainlink },
  { name: 'Pyth Network', chains: 20, protocols: 280, color: ORACLE_COLORS.pyth },
  { name: 'Band Protocol', chains: 12, protocols: 120, color: ORACLE_COLORS.band },
  { name: 'API3', chains: 10, protocols: 85, color: ORACLE_COLORS.api3 },
  { name: 'UMA', chains: 8, protocols: 45, color: ORACLE_COLORS.uma },
];

// 模拟资产数据
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
    change24h: -2.1,
    change7d: 1.8,
    volume24h: 180000000,
    marketCap: 2600000000,
    primaryOracle: 'Band Protocol',
    oracleCount: 3,
    priceSources: [],
  },
  {
    symbol: 'UNI',
    price: 9.8,
    change24h: 3.4,
    change7d: 7.5,
    volume24h: 220000000,
    marketCap: 5900000000,
    primaryOracle: 'Chainlink',
    oracleCount: 5,
    priceSources: [],
  },
  {
    symbol: 'AAVE',
    price: 125.4,
    change24h: -1.8,
    change7d: 4.5,
    volume24h: 150000000,
    marketCap: 1900000000,
    primaryOracle: 'API3',
    oracleCount: 4,
    priceSources: [],
  },
];

import { type RefreshInterval } from '@/lib/constants';

export { type RefreshInterval };

export const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
] as const;
