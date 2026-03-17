import { OracleMarketData, AssetData, TVSTrendData, ChainSupportData } from './types';
import { chartColors } from '@/lib/config/colors';

export const ORACLE_COLORS = {
  chainlink: chartColors.oracle.chainlink,
  pyth: chartColors.oracle.pyth,
  band: chartColors.oracle['band-protocol'],
  api3: chartColors.oracle.api3,
  uma: chartColors.oracle.uma,
  redstone: chartColors.oracle.redstone,
  dia: chartColors.oracle.dia,
  tellor: chartColors.oracle.tellor,
  chronicle: chartColors.oracle.chronicle,
  winklink: chartColors.oracle.winklink,
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
    name: 'Tellor',
    share: 2.2,
    color: ORACLE_COLORS.tellor,
    tvs: '$1.3B',
    tvsValue: 1.3,
    chains: 7,
    protocols: 22,
    avgLatency: 1800,
    accuracy: 98.7,
    updateFrequency: 5400,
    change24h: -0.3,
    change7d: 1.8,
    change30d: 6.5,
  },
  {
    name: 'Chronicle',
    share: 1.8,
    color: ORACLE_COLORS.chronicle,
    tvs: '$1.0B',
    tvsValue: 1.0,
    chains: 5,
    protocols: 18,
    avgLatency: 500,
    accuracy: 99.4,
    updateFrequency: 1200,
    change24h: 1.2,
    change7d: 5.6,
    change30d: 14.2,
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
  let redstoneBase = 1.5;
  let diaBase = 1.2;
  let tellorBase = 0.9;
  let chronicleBase = 0.7;
  let winklinkBase = 0.5;

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
    redstoneBase *= 1 + (Math.random() - 0.5) * volatility;
    diaBase *= 1 + (Math.random() - 0.5) * volatility;
    tellorBase *= 1 + (Math.random() - 0.5) * volatility;
    chronicleBase *= 1 + (Math.random() - 0.5) * volatility;
    winklinkBase *= 1 + (Math.random() - 0.5) * volatility;

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
    const redstoneUpper = redstoneBase * (1 + confidenceInterval);
    const redstoneLower = redstoneBase * (1 - confidenceInterval);
    const diaUpper = diaBase * (1 + confidenceInterval);
    const diaLower = diaBase * (1 - confidenceInterval);
    const tellorUpper = tellorBase * (1 + confidenceInterval);
    const tellorLower = tellorBase * (1 - confidenceInterval);
    const chronicleUpper = chronicleBase * (1 + confidenceInterval);
    const chronicleLower = chronicleBase * (1 - confidenceInterval);
    const winklinkUpper = winklinkBase * (1 + confidenceInterval);
    const winklinkLower = winklinkBase * (1 - confidenceInterval);

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
      redstone: Number(redstoneBase.toFixed(2)),
      redstoneUpper: Number(redstoneUpper.toFixed(2)),
      redstoneLower: Number(redstoneLower.toFixed(2)),
      dia: Number(diaBase.toFixed(2)),
      diaUpper: Number(diaUpper.toFixed(2)),
      diaLower: Number(diaLower.toFixed(2)),
      tellor: Number(tellorBase.toFixed(2)),
      tellorUpper: Number(tellorUpper.toFixed(2)),
      tellorLower: Number(tellorLower.toFixed(2)),
      chronicle: Number(chronicleBase.toFixed(2)),
      chronicleUpper: Number(chronicleUpper.toFixed(2)),
      chronicleLower: Number(chronicleLower.toFixed(2)),
      winklink: Number(winklinkBase.toFixed(2)),
      winklinkUpper: Number(winklinkUpper.toFixed(2)),
      winklinkLower: Number(winklinkLower.toFixed(2)),
      total: Number(
        (
          chainlinkBase +
          pythBase +
          bandBase +
          api3Base +
          umaBase +
          redstoneBase +
          diaBase +
          tellorBase +
          chronicleBase +
          winklinkBase
        ).toFixed(2)
      ),
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
  { name: 'RedStone', chains: 6, protocols: 32, color: ORACLE_COLORS.redstone },
  { name: 'DIA', chains: 9, protocols: 28, color: ORACLE_COLORS.dia },
  { name: 'Tellor', chains: 7, protocols: 22, color: ORACLE_COLORS.tellor },
  { name: 'Chronicle', chains: 5, protocols: 18, color: ORACLE_COLORS.chronicle },
  { name: 'WINkLink', chains: 3, protocols: 12, color: ORACLE_COLORS.winklink },
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
