import { chartColors } from '@/lib/config/colors';

export const COLORS = {
  chainlink: chartColors.oracle.chainlink,
  pyth: chartColors.oracle.pyth,
  band: chartColors.oracle['band-protocol'],
  api3: chartColors.oracle.api3,
  uma: chartColors.oracle.uma,
  redstone: chartColors.oracle.redstone,
  dia: chartColors.oracle.dia,
  winklink: chartColors.oracle.winklink,
  others: chartColors.oracle.redstone,
};

export const oracleLineConfig = [
  { dataKey: 'chainlink', name: 'Chainlink', stroke: COLORS.chainlink },
  { dataKey: 'pyth', name: 'Pyth Network', stroke: COLORS.pyth },
  { dataKey: 'band', name: 'Band Protocol', stroke: COLORS.band },
  { dataKey: 'api3', name: 'API3', stroke: COLORS.api3 },
  { dataKey: 'uma', name: 'UMA', stroke: COLORS.uma },
  { dataKey: 'redstone', name: 'RedStone', stroke: COLORS.redstone },
  { dataKey: 'dia', name: 'DIA', stroke: COLORS.dia },
  { dataKey: 'winklink', name: 'WINkLink', stroke: COLORS.winklink },
];

export const marketShareData = [
  { name: 'Chainlink', value: 62.5, color: COLORS.chainlink, tvs: '$42.1B', chains: 15 },
  { name: 'Pyth Network', value: 18.3, color: COLORS.pyth, tvs: '$15.2B', chains: 20 },
  { name: 'Band Protocol', value: 8.7, color: COLORS.band, tvs: '$4.1B', chains: 12 },
  { name: 'API3', value: 6.2, color: COLORS.api3, tvs: '$3.5B', chains: 10 },
  { name: 'UMA', value: 4.3, color: COLORS.uma, tvs: '$2.5B', chains: 8 },
  { name: 'RedStone', value: 3.5, color: COLORS.redstone, tvs: '$2.1B', chains: 6 },
  { name: 'DIA', value: 2.8, color: COLORS.dia, tvs: '$1.6B', chains: 9 },
  { name: 'WINkLink', value: 1.2, color: COLORS.winklink, tvs: '$0.7B', chains: 3 },
];

export const chainSupportData = [
  { name: 'Chainlink', chains: 15, symbols: 1500, updateFreq: 'Heartbeat', latency: '1-3s' },
  { name: 'Pyth Network', chains: 20, symbols: 500, updateFreq: 'On-demand', latency: '400ms' },
  { name: 'Band Protocol', chains: 12, symbols: 200, updateFreq: 'On-demand', latency: '3-6s' },
  { name: 'API3', chains: 10, symbols: 300, updateFreq: 'On-demand', latency: '2-5s' },
  { name: 'UMA', chains: 8, symbols: 100, updateFreq: 'Optimistic', latency: '2h' },
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
