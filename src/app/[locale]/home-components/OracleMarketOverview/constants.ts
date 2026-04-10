import { chartColors } from '@/lib/config/colors';

export const COLORS = {
  chainlink: chartColors.oracle.chainlink,
  pyth: chartColors.oracle.pyth,
  api3: chartColors.oracle.api3,
  redstone: chartColors.oracle.redstone,
  dia: chartColors.oracle.dia,
  winklink: chartColors.oracle.winklink,
  others: chartColors.oracle.redstone,
};

export const oracleLineConfig = [
  { dataKey: 'chainlink', name: 'Chainlink', stroke: COLORS.chainlink },
  { dataKey: 'pyth', name: 'Pyth Network', stroke: COLORS.pyth },
  { dataKey: 'api3', name: 'API3', stroke: COLORS.api3 },
  { dataKey: 'redstone', name: 'RedStone', stroke: COLORS.redstone },
  { dataKey: 'dia', name: 'DIA', stroke: COLORS.dia },
  { dataKey: 'winklink', name: 'WINkLink', stroke: COLORS.winklink },
];

export const marketShareData = [
  { name: 'Chainlink', value: 62.5, color: COLORS.chainlink, tvs: '$42.1B', chains: 15 },
  { name: 'Pyth Network', value: 18.3, color: COLORS.pyth, tvs: '$15.2B', chains: 20 },
  { name: 'API3', value: 6.2, color: COLORS.api3, tvs: '$3.5B', chains: 10 },
  { name: 'RedStone', value: 3.5, color: COLORS.redstone, tvs: '$2.1B', chains: 6 },
  { name: 'DIA', value: 2.8, color: COLORS.dia, tvs: '$1.6B', chains: 9 },
  { name: 'WINkLink', value: 1.2, color: COLORS.winklink, tvs: '$0.7B', chains: 3 },
];

export const chainSupportData = [
  { name: 'Chainlink', chains: 15, symbols: 1500, updateFreq: 'Heartbeat', latency: '1-3s' },
  { name: 'Pyth Network', chains: 20, symbols: 500, updateFreq: 'On-demand', latency: '400ms' },
  { name: 'API3', chains: 10, symbols: 300, updateFreq: 'On-demand', latency: '2-5s' },
  { name: 'RedStone', chains: 6, symbols: 1000, updateFreq: 'On-demand', latency: '10s' },
  { name: 'DIA', chains: 9, symbols: 500, updateFreq: 'On-demand', latency: '2-5s' },
  { name: 'WINkLink', chains: 3, symbols: 20, updateFreq: 'On-demand', latency: '3-5s' },
];

export const timeRangeOptions = [
  { key: '1H', label: '1H' },
  { key: '24H', label: '24H' },
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: '90D', label: '90D' },
];
