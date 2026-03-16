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
  [Blockchain.TRON]: 'TRON',
  [Blockchain.TON]: 'TON',
  [Blockchain.NEAR]: 'Near',
  [Blockchain.AURORA]: 'Aurora',
  [Blockchain.CELO]: 'Celo',
};

export const chainColors: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: configChainColors.ethereum,
  [Blockchain.ARBITRUM]: configChainColors.arbitrum,
  [Blockchain.OPTIMISM]: configChainColors.optimism,
  [Blockchain.POLYGON]: configChainColors.polygon,
  [Blockchain.SOLANA]: configChainColors.solana,
  [Blockchain.AVALANCHE]: configChainColors.avalanche,
  [Blockchain.FANTOM]: configChainColors.fantom,
  [Blockchain.CRONOS]: configChainColors.cronos,
  [Blockchain.JUNO]: configChainColors.juno,
  [Blockchain.COSMOS]: configChainColors.cosmosHub,
  [Blockchain.OSMOSIS]: configChainColors.osmosis,
  [Blockchain.BNB_CHAIN]: configChainColors.bnbChain,
  [Blockchain.BASE]: configChainColors.base,
  [Blockchain.SCROLL]: configChainColors.scroll,
  [Blockchain.ZKSYNC]: configChainColors.zkSync,
  [Blockchain.APTOS]: configChainColors.aptos,
  [Blockchain.SUI]: configChainColors.sui,
  [Blockchain.GNOSIS]: configChainColors.gnosis,
  [Blockchain.MANTLE]: configChainColors.mantle,
  [Blockchain.LINEA]: configChainColors.linea,
  [Blockchain.CELESTIA]: configChainColors.celestia,
  [Blockchain.INJECTIVE]: configChainColors.injective,
  [Blockchain.SEI]: configChainColors.sei,
  [Blockchain.TRON]: configChainColors.tron,
  [Blockchain.TON]: configChainColors.ton,
  [Blockchain.NEAR]: configChainColors.near,
  [Blockchain.AURORA]: configChainColors.aurora,
  [Blockchain.CELO]: configChainColors.celo,
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

export const symbols = [
  // Layer 1
  'BTC',
  'ETH',
  'SOL',
  'AVAX',
  'NEAR',
  'MATIC',
  'ARB',
  'OP',
  'DOT',
  'ADA',
  'ATOM',
  'FTM',
  // DeFi
  'LINK',
  'UNI',
  'AAVE',
  'MKR',
  'SNX',
  'COMP',
  'YFI',
  'CRV',
  'LDO',
  'SUSHI',
  '1INCH',
  'BAL',
  'FXS',
  'RPL',
  'GMX',
  'DYDX',
  // Stablecoins
  'USDC',
  'USDT',
  'DAI',
];

export const TIME_RANGES = [
  { value: 1, key: 'timeRange1Hour', label: '1H' },
  { value: 6, key: 'timeRange6Hours', label: '6H' },
  { value: 24, key: 'timeRange24Hours', label: '24H' },
  { value: 168, key: 'timeRange7Days', label: '7D' },
];

export const DEVIATION_THRESHOLD = 0.5;

export type RefreshInterval = 0 | 30000 | 60000 | 300000;
