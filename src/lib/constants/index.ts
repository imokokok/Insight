import { OracleProvider, Blockchain } from '@/lib/oracles';

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
  [Blockchain.BNB_CHAIN]: 'BNB Chain',
  [Blockchain.BASE]: 'Base',
  [Blockchain.SCROLL]: 'Scroll',
  [Blockchain.ZKSYNC]: 'zkSync Era',
  [Blockchain.APTOS]: 'Aptos',
  [Blockchain.SUI]: 'Sui',
  [Blockchain.GNOSIS]: 'Gnosis',
  [Blockchain.MANTLE]: 'Mantle',
  [Blockchain.LINEA]: 'Linea',
  [Blockchain.CELESTIA]: 'Celestia',
  [Blockchain.INJECTIVE]: 'Injective',
  [Blockchain.SEI]: 'Sei',
};

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
  [Blockchain.BNB_CHAIN]: '#F3BA2F',
  [Blockchain.BASE]: '#0052FF',
  [Blockchain.SCROLL]: '#EEDFF0',
  [Blockchain.ZKSYNC]: '#8C8DFC',
  [Blockchain.APTOS]: '#4CD7D0',
  [Blockchain.SUI]: '#6FBCF0',
  [Blockchain.GNOSIS]: '#04795B',
  [Blockchain.MANTLE]: '#000000',
  [Blockchain.LINEA]: '#000000',
  [Blockchain.CELESTIA]: '#2B2B2B',
  [Blockchain.INJECTIVE]: '#00F2FE',
  [Blockchain.SEI]: '#B100CD',
};

export const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: '#3B82F6',
  [OracleProvider.BAND_PROTOCOL]: '#10B981',
  [OracleProvider.UMA]: '#F59E0B',
  [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
  [OracleProvider.API3]: '#EC4899',
};

export const symbols = ['BTC', 'ETH', 'SOL', 'USDC'];

export const TIME_RANGES = [
  { value: 1, key: 'timeRange1Hour', label: '1H' },
  { value: 6, key: 'timeRange6Hours', label: '6H' },
  { value: 24, key: 'timeRange24Hours', label: '24H' },
  { value: 168, key: 'timeRange7Days', label: '7D' },
];

export const DEVIATION_THRESHOLD = 0.5;

export type RefreshInterval = 0 | 30000 | 60000 | 300000;
