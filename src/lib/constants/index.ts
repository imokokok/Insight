import {
  chartColors as configChartColors,
  chainColors as configChainColors,
} from '@/lib/config/colors';
import { OracleProvider, Blockchain } from '@/lib/oracles';

export const providerNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

// i18n 键名映射，用于将 OracleProvider 映射到 navbar i18n 键
export const oracleI18nKeys: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'chainlink',
  [OracleProvider.PYTH]: 'pythNetwork',
  [OracleProvider.API3]: 'api3',
  [OracleProvider.REDSTONE]: 'redstone',
  [OracleProvider.DIA]: 'dia',
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
  [Blockchain.STARKNET]: 'Starknet',
  [Blockchain.BLAST]: 'Blast',
  [Blockchain.CARDANO]: 'Cardano',
  [Blockchain.POLKADOT]: 'Polkadot',
  [Blockchain.KAVA]: 'Kava',
  [Blockchain.MOONBEAM]: 'Moonbeam',
  [Blockchain.MOONRIVER]: 'Moonriver',
  [Blockchain.METIS]: 'Metis',
  [Blockchain.STARKEX]: 'StarkEx',
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
  [Blockchain.STARKNET]: configChainColors.starknet,
  [Blockchain.BLAST]: configChainColors.blast,
  [Blockchain.CARDANO]: configChainColors.cardano,
  [Blockchain.POLKADOT]: configChainColors.polkadot,
  [Blockchain.KAVA]: configChainColors.kava,
  [Blockchain.MOONBEAM]: configChainColors.moonbeam,
  [Blockchain.MOONRIVER]: configChainColors.moonriver,
  [Blockchain.METIS]: configChainColors.metis,
  [Blockchain.STARKEX]: configChainColors.starkex,
};

export const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: configChartColors.oracle.chainlink,
  [OracleProvider.PYTH]: configChartColors.oracle['pyth'],
  [OracleProvider.API3]: configChartColors.oracle.api3,
  [OracleProvider.REDSTONE]: configChartColors.oracle.redstone,
  [OracleProvider.DIA]: configChartColors.oracle.dia,
  [OracleProvider.WINKLINK]: configChartColors.oracle.winklink,
};

export const symbols = [
  // 按市值排名排序（从高到低）
  // Layer 1 - 按市值排序
  'BTC', // 1. Bitcoin
  'ETH', // 2. Ethereum
  'BNB', // 3. BNB
  'SOL', // 4. Solana
  'XRP', // 5. Ripple
  'ADA', // 6. Cardano
  'DOGE', // 7. Dogecoin
  'TRX', // 8. TRON
  'DOT', // 9. Polkadot
  'MATIC', // 10. Polygon
  'LTC', // 11. Litecoin
  'SHIB', // 12. Shiba Inu
  'AVAX', // 13. Avalanche
  'LINK', // 14. Chainlink
  'ATOM', // 15. Cosmos
  'UNI', // 16. Uniswap
  'XLM', // 17. Stellar
  'ETC', // 18. Ethereum Classic
  'BCH', // 19. Bitcoin Cash
  'FIL', // 20. Filecoin
  'NEAR', // 21. NEAR Protocol
  'APT', // 22. Aptos
  'ARB', // 23. Arbitrum
  'OP', // 24. Optimism
  'INJ', // 25. Injective
  'SUI', // 26. Sui
  'SEI', // 27. Sei
  'TIA', // 28. Celestia
  'TON', // 29. Toncoin
  'FTM', // 30. Fantom
  // Stablecoins - 按市值排序
  'USDT', // 31. Tether
  'USDC', // 32. USD Coin
  'DAI', // 33. DAI
  'FRAX', // 34. Frax
  'LUSD', // 35. Liquity USD
  'BUSD', // 36. Binance USD
  'TUSD', // 37. TrueUSD
  // DeFi - 按市值排序
  'AAVE', // 38. Aave
  'MKR', // 39. Maker
  'COMP', // 40. Compound
  'SNX', // 41. Synthetix
  'CRV', // 42. Curve
  'SUSHI', // 43. SushiSwap
  'LDO', // 44. Lido DAO
  'GMX', // 45. GMX
  'DYDX', // 46. dYdX
  'GRT', // 47. The Graph
  'APE', // 48. ApeCoin
  'SAND', // 49. The Sandbox
  'MANA', // 50. Decentraland
  'AXS', // 51. Axie Infinity
  'GALA', // 52. Gala
  'IMX', // 53. Immutable X
  'RNDR', // 54. Render
  'THETA', // 55. Theta Network
  'KAVA', // 56. Kava
  'RUNE', // 57. THORChain
  'CAKE', // 58. PancakeSwap
  'ENS', // 59. Ethereum Name Service
  'BLUR', // 60. Blur
  // Wrapped Assets
  'WBTC', // 61. Wrapped Bitcoin
  'WETH', // 62. Wrapped Ether
  'STETH', // 63. Lido Staked Ether
  'RETH', // 64. Rocket Pool ETH
  'CBETH', // 65. Coinbase Wrapped Staked ETH
  // Layer 2 Tokens
  'MNT', // 66. Mantle
  'BLAST', // 67. Blast
  // DeFi & Others
  'RPL', // 68. Rocket Pool
  'CVX', // 69. Convex Finance
  'YFI', // 70. Yearn
  '1INCH', // 71. 1inch
  'BAL', // 72. Balancer
  'FXS', // 73. Frax Share
  // Oracle Tokens
  'PYTH', // 74. Pyth Network
  // Meme Tokens
  'PEPE', // 75. Pepe
  'WIF', // 76. dogwifhat
  'BONK', // 77. Bonk
  'MEME', // 78. Meme
];

export const TIME_RANGES = [
  { value: 1, key: 'timeRange1Hour', label: '1H' },
  { value: 6, key: 'timeRange6Hours', label: '6H' },
  { value: 24, key: 'timeRange24Hours', label: '24H' },
  { value: 168, key: 'timeRange7Days', label: '7D' },
];

export const DEVIATION_THRESHOLD = 0.5;

export type RefreshInterval = 0 | 30000 | 60000 | 300000;

// ============================================
// 链分类定义
// ============================================

export type ChainCategory = 'l1' | 'l2' | 'cosmos' | 'other';

/**
 * 链分类映射 - 用于按类型筛选链
 */
export const CHAIN_CATEGORIES: Record<Blockchain, ChainCategory> = {
  // Layer 1
  [Blockchain.ETHEREUM]: 'l1',
  [Blockchain.SOLANA]: 'l1',
  [Blockchain.AVALANCHE]: 'l1',
  [Blockchain.BNB_CHAIN]: 'l1',
  [Blockchain.TRON]: 'l1',
  [Blockchain.TON]: 'l1',
  [Blockchain.NEAR]: 'l1',
  [Blockchain.APTOS]: 'l1',
  [Blockchain.SUI]: 'l1',
  [Blockchain.INJECTIVE]: 'l1',
  [Blockchain.SEI]: 'l1',
  [Blockchain.CELESTIA]: 'l1',
  [Blockchain.CELO]: 'l1',
  [Blockchain.FANTOM]: 'l1',
  [Blockchain.CRONOS]: 'l1',
  [Blockchain.CARDANO]: 'l1',
  [Blockchain.POLKADOT]: 'l1',
  [Blockchain.KAVA]: 'l1',
  // Layer 2
  [Blockchain.ARBITRUM]: 'l2',
  [Blockchain.OPTIMISM]: 'l2',
  [Blockchain.BASE]: 'l2',
  [Blockchain.SCROLL]: 'l2',
  [Blockchain.ZKSYNC]: 'l2',
  [Blockchain.MANTLE]: 'l2',
  [Blockchain.LINEA]: 'l2',
  [Blockchain.AURORA]: 'l2',
  [Blockchain.STARKNET]: 'l2',
  [Blockchain.BLAST]: 'l2',
  [Blockchain.STARKEX]: 'l2',
  [Blockchain.POLYGON]: 'l2',
  // Cosmos 生态
  [Blockchain.COSMOS]: 'cosmos',
  [Blockchain.OSMOSIS]: 'cosmos',
  [Blockchain.JUNO]: 'cosmos',
  [Blockchain.GNOSIS]: 'cosmos',
  [Blockchain.MOONBEAM]: 'cosmos',
  [Blockchain.MOONRIVER]: 'cosmos',
  [Blockchain.METIS]: 'l2',
} as const;

/**
 * 按分类获取链列表
 */
export function getChainsByCategory(category: ChainCategory | 'all'): Blockchain[] {
  const allChains = Object.keys(CHAIN_CATEGORIES) as Blockchain[];
  if (category === 'all') {
    return allChains;
  }
  return allChains.filter((chain) => CHAIN_CATEGORIES[chain] === category);
}

/**
 * 获取链的分类
 */
export function getChainCategory(chain: Blockchain): ChainCategory {
  return CHAIN_CATEGORIES[chain] || 'other';
}
