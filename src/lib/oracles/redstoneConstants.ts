export const REDSTONE_API_BASE = 'https://api.redstone.finance';

export interface RedStoneChainInfo {
  chain: string;
  latency: number;
  updateFreq: number;
  status: 'active' | 'inactive';
}

export const REDSTONE_SUPPORTED_CHAINS: RedStoneChainInfo[] = [
  { chain: 'Ethereum', latency: 80, updateFreq: 60, status: 'active' },
  { chain: 'Arbitrum', latency: 65, updateFreq: 30, status: 'active' },
  { chain: 'Optimism', latency: 70, updateFreq: 30, status: 'active' },
  { chain: 'Polygon', latency: 75, updateFreq: 45, status: 'active' },
  { chain: 'Avalanche', latency: 85, updateFreq: 60, status: 'active' },
  { chain: 'Base', latency: 60, updateFreq: 30, status: 'active' },
  { chain: 'BNB Chain', latency: 90, updateFreq: 60, status: 'active' },
  { chain: 'Fantom', latency: 95, updateFreq: 60, status: 'active' },
  { chain: 'Linea', latency: 70, updateFreq: 45, status: 'active' },
  { chain: 'Mantle', latency: 75, updateFreq: 45, status: 'active' },
  { chain: 'Scroll', latency: 80, updateFreq: 60, status: 'active' },
  { chain: 'zkSync', latency: 72, updateFreq: 45, status: 'active' },
];

export const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  REDSTONE: 0.08,
  USDC: 0.01,
};

export const REDSTONE_DEFAULT_RISK_METRICS = {
  centralizationRisk: 0.25,
  liquidityRisk: 0.2,
  technicalRisk: 0.12,
  overallRisk: 0.19,
};
