import { OracleProvider, Blockchain, PriceData } from '@/lib/oracles';

export type { PriceData };

export interface QueryResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
}

export const providerNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

export const chainNames: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: 'Ethereum',
  [Blockchain.ARBITRUM]: 'Arbitrum',
  [Blockchain.OPTIMISM]: 'Optimism',
  [Blockchain.POLYGON]: 'Polygon',
  [Blockchain.SOLANA]: 'Solana',
  [Blockchain.AVALANCHE]: 'Avalanche',
  [Blockchain.FANTOM]: 'Fantom',
  [Blockchain.CRONOS]: 'Cronos',
  [Blockchain.JUNO]: 'Juno',
  [Blockchain.COSMOS]: 'Cosmos',
  [Blockchain.OSMOSIS]: 'Osmosis',
};

export const symbols = ['BTC', 'ETH', 'SOL', 'USDC'];

export const chainColors: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: '#6366F1',
  [Blockchain.ARBITRUM]: '#06B6D4',
  [Blockchain.OPTIMISM]: '#EF4444',
  [Blockchain.POLYGON]: '#A855F7',
  [Blockchain.SOLANA]: '#10B981',
  [Blockchain.AVALANCHE]: '#E84133',
  [Blockchain.FANTOM]: '#1969FF',
  [Blockchain.CRONOS]: '#002D74',
  [Blockchain.JUNO]: '#DC1FFF',
  [Blockchain.COSMOS]: '#2E3148',
  [Blockchain.OSMOSIS]: '#FAAB3B',
};

export const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#3B82F6',
  [OracleProvider.BAND_PROTOCOL]: '#10B981',
  [OracleProvider.UMA]: '#F59E0B',
  [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
  [OracleProvider.API3]: '#EC4899',
};

export const TIME_RANGES = [
  { value: 1, key: 'timeRange1Hour', label: '1小时' },
  { value: 6, key: 'timeRange6Hours', label: '6小时' },
  { value: 24, key: 'timeRange24Hours', label: '24小时' },
  { value: 168, key: 'timeRange7Days', label: '7天' },
];

export const DEVIATION_THRESHOLD = 0.01;
