import { OracleProvider, Blockchain } from '@/lib/oracles';
import {
  chartColors as configChartColors,
  chainColors as configChainColors,
} from '@/lib/config/colors';

export const providerNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
    [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
    [OracleProvider.UMA]: 'UMA',
    [OracleProvider.PYTH]: 'Pyth',
    [OracleProvider.API3]: 'API3',
    [OracleProvider.REDSTONE]: 'RedStone',
    [OracleProvider.DIA]: 'DIA',
    [OracleProvider.TELLOR]: 'Tellor',
    [OracleProvider.CHRONICLE]: 'Chronicle',
    [OracleProvider.WINKLINK]: 'WINkLink',
};

// i18n 键名映射，用于将 OracleProvider 映射到 navbar i18n 键
export const oracleI18nKeys: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'bandProtocol',
  [OracleProvider.UMA]: 'uma',
  [OracleProvider.PYTH]: 'pythNetwork',
  [OracleProvider.API3]: 'api3',
  [OracleProvider.REDSTONE]: 'redstone',
  [OracleProvider.DIA]: 'dia',
  [OracleProvider.TELLOR]: 'tellor',
  [OracleProvider.CHRONICLE]: 'chronicle',
  [OracleProvider.WINKLINK]: 'winklink',
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
  [Blockchain.ETHEREUM]: configChainColors.ethereum,
  [Blockchain.ARBITRUM]: '#06B6D4',
  [Blockchain.OPTIMISM]: '#EF4444',
  [Blockchain.POLYGON]: configChainColors.polygon,
  [Blockchain.SOLANA]: '#10B981',
  [Blockchain.AVALANCHE]: configChainColors.avalanche,
  [Blockchain.FANTOM]: configChainColors.fantom,
  [Blockchain.CRONOS]: configChainColors.cronos,
  [Blockchain.JUNO]: '#DC1FFF',
  [Blockchain.COSMOS]: configChainColors.cosmosHub,
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
  [OracleProvider.CHAINLINK]: configChartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: configChartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: configChartColors.oracle.uma,
  [OracleProvider.PYTH]: configChartColors.oracle['pyth'],
  [OracleProvider.API3]: configChartColors.oracle.api3,
  [OracleProvider.REDSTONE]: configChartColors.oracle.redstone,
  [OracleProvider.DIA]: configChartColors.oracle.dia,
  [OracleProvider.TELLOR]: configChartColors.oracle.tellor,
  [OracleProvider.CHRONICLE]: configChartColors.oracle.chronicle,
  [OracleProvider.WINKLINK]: configChartColors.oracle.winklink,
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
