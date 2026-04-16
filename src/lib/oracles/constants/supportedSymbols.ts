// Chainlink 支持的币种（基于实际验证结果，只包含可用的交易对）
// 注意：这些币种在至少一条链上有可用的 Chainlink 价格源
export const chainlinkSymbols = [
  'BTC',
  'ETH',
  'LINK',
  'MATIC',
  'AVAX',
  'USDT',
  'USDC',
  'DAI',
  'AAVE',
  'APE',
  'LDO',
  '1INCH',
  'WBTC',
  'STETH',
  'SHIB',
  'UNI',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'SNX',
  'CRV',
  'SUSHI',
  'GMX',
  'GRT',
  'AXS',
  'INJ',
  'SUI',
  'SEI',
  'TIA',
  'TON',
  'PEPE',
  'WIF',
  'LUSD',
  'MNT',
  'RPL',
  'CVX',
  'CAKE',
  'BONK',
  'MKR',
  'COMP',
  'YFI',
  'FRAX',
  'SOL',
  'DOGE',
  'BNB',
] as const;

// RedStone 支持的币种（基于实际验证结果 - 2026-04-14）
// 只包含可以正确获取数据的币种
export const redstoneSymbols = [
  // Major Cryptocurrencies
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'TRX',
  'DOT',
  'MATIC',
  'LTC',
  'AVAX',
  'LINK',
  'ATOM',
  'UNI',
  'XLM',
  'ETC',
  'BCH',
  'FIL',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'INJ',
  // DeFi Tokens
  'AAVE',
  'SNX',
  'CRV',
  'COMP',
  'YFI',
  'SUSHI',
  '1INCH',
  'BAL',
  'LDO',
  'FXS',
  'GMX',
  'DYDX',
  'RPL',
  'ENS',
  'GRT',
  'BLUR',
  'APE',
  'SAND',
  'MANA',
  'AXS',
  'GALA',
  'IMX',
  'RNDR',
  'THETA',
  'KAVA',
  'RUNE',
  'CAKE',
  'CVX',
  // LRT (部分可用)
  'METH',
  // Yield-Bearing Assets (部分可用)
  'EIGEN',
  // Stablecoins
  'USDC',
  'USDT',
  'DAI',
  'FRAX',
  'LUSD',
  'TUSD',
  'USDD',
  // Wrapped Assets
  'WBTC',
  // Layer 2 Tokens (部分可用)
  'MNT',
  'ZK',
  'MANTA',
  // Others
  'PEPE',
  'BONK',
  'WIF',
  'FLOKI',
] as const;

// DIA 支持的币种（基于实际检测结果 - 2026-04-14）
// 只包含可以正确获取数据的币种
export const diaSymbols = [
  // Major Cryptocurrencies
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'XRP',
  'ADA',
  'DOGE',
  'DOT',
  'MATIC',
  'LTC',
  'AVAX',
  'LINK',
  'ATOM',
  'UNI',
  'XLM',
  'ETC',
  'BCH',
  'FIL',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  // DeFi Tokens
  'AAVE',
  'SNX',
  'CRV',
  'MKR',
  'COMP',
  'YFI',
  'SUSHI',
  '1INCH',
  'BAL',
  'LDO',
  'GMX',
  'DYDX',
  // Stablecoins
  'USDC',
  'USDT',
  'DAI',
  'FRAX',
  'BUSD',
  // Wrapped Assets
  'WBTC',
  'WETH',
] as const;

// API3 支持的币种（基于实际检测结果 - 2026-04-14）
// 只包含可以正确获取数据的币种
export const api3Symbols = [
  'ARB',
  'AVAX',
  'BAL',
  'BNB',
  'BTC',
  'COMP',
  'DAI',
  'ETH',
  'SOL',
  'USDC',
  'USDT',
  'WBTC',
] as const;

// API3 可用的链-交易对映射（基于实际检测结果 - 2026-04-14）
// 只包含可以正确获取数据的交易对
export const API3_AVAILABLE_PAIRS: Record<string, string[]> = {
  // Ethereum: 5个可用
  ethereum: ['BAL', 'BTC', 'COMP', 'ETH', 'USDC'],
  // Arbitrum: 9个可用
  arbitrum: ['ARB', 'AVAX', 'BTC', 'COMP', 'DAI', 'ETH', 'USDC', 'USDT', 'WBTC'],
  // Polygon: 7个可用
  polygon: ['ARB', 'AVAX', 'BNB', 'BTC', 'ETH', 'USDC', 'WBTC'],
  // Base: 8个可用
  base: ['BNB', 'BTC', 'DAI', 'ETH', 'SOL', 'USDC', 'USDT', 'WBTC'],
  // Optimism: 3个可用
  optimism: ['ETH', 'USDC', 'WBTC'],
  // Avalanche: 3个可用
  avalanche: ['AVAX', 'ETH', 'USDT'],
  // BNB Chain: 6个可用
  bnbchain: ['BNB', 'BTC', 'ETH', 'USDC', 'USDT', 'WBTC'],
  // Fantom: 0个成功 - API3 未在 Fantom 部署 dAPI，已移除
};

// Pyth 支持的币种（基于官方文档，支持400+价格源）
// Pyth 覆盖加密货币、外汇、大宗商品、股票、ETF
export const pythSymbols = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'ADA',
  'DOGE',
  'TRX',
  'DOT',
  'MATIC',
  'LTC',
  'AVAX',
  'LINK',
  'ATOM',
  'UNI',
  'XLM',
  'ETC',
  'BCH',
  'FIL',
  'NEAR',
  'APT',
  'ARB',
  'OP',
  'INJ',
  'SUI',
  'SEI',
  'AAVE',
  'SNX',
  'CRV',
  'COMP',
  'YFI',
  'SUSHI',
  '1INCH',
  'BAL',
  'LDO',
  'GMX',
  'DYDX',
  'RPL',
  'ENS',
  'GRT',
  'BLUR',
  'APE',
  'SAND',
  'MANA',
  'AXS',
  'GALA',
  'IMX',
  'THETA',
  'KAVA',
  'RUNE',
  'CAKE',
  'CVX',
  'SHIB',
  'USDC',
  'USDT',
  'DAI',
  'FRAX',
  'LUSD',
  'TUSD',
  'WBTC',
  'WETH',
  'STETH',
  'RETH',
  'CBETH',
  'WSTETH',
  'FRXETH',
  'WEETH',
  'EZETH',
  'PYTH',
  'PEPE',
  'BONK',
  'WIF',
  'MEME',
  'TIA',
  'TON',
  'MNT',
] as const;

// Pyth 可用的链-交易对映射
// Pyth 在所有支持的链上提供相同的交易对（通过 Hermes API 统一获取）
export const PYTH_AVAILABLE_PAIRS: Record<string, string[]> = {
  ethereum: [...pythSymbols],
  arbitrum: [...pythSymbols],
  optimism: [...pythSymbols],
  polygon: [...pythSymbols],
  solana: [...pythSymbols],
  avalanche: [...pythSymbols],
  'bnb-chain': [...pythSymbols],
  aptos: [...pythSymbols],
  sui: [...pythSymbols],
  base: [...pythSymbols],
  scroll: [...pythSymbols],
  zksync: [...pythSymbols],
  linea: [...pythSymbols],
  mantle: [...pythSymbols],
  blast: [...pythSymbols],
};

// WINkLink 支持的币种（主要支持TRON生态系统，仅包含有真实合约地址的交易对）
export const winklinkSymbols = [
  'BTC',
  'ETH',
  'TRX',
  'LTC',
  'WIN',
  'BTT',
  'JST',
  'SUN',
  'USDD',
  'NFT',
  'USDT',
  'USDC',
  'TUSD',
  'USDJ',
  'WBTC',
] as const;

export const WINKLINK_SYMBOL_ALIASES: Record<string, string> = {
  APENFT: 'NFT',
};

export const WINKLINK_AVAILABLE_PAIRS: Record<string, string[]> = {
  tron: [...winklinkSymbols],
};

// Supra 支持的币种（基于实际验证结果 - 2026-04-16）
// 只包含可以正确获取数据的币种
export const supraSymbols = [
  'AAVE',
  'ADA',
  'APE',
  'APT',
  'AR',
  'ARB',
  'AVAX',
  'AXS',
  'BAL',
  'BCH',
  'BLUR',
  'BNB',
  'BOME',
  'BONK',
  'BTC',
  'CAKE',
  'CELO',
  'COMP',
  'CRV',
  'CVX',
  'DAI',
  'DOGE',
  'DOT',
  'DYDX',
  'EIGEN',
  'ENA',
  'ENS',
  'ETC',
  'ETH',
  'FET',
  'FIL',
  'FLOKI',
  'FXS',
  'GALA',
  'GMX',
  'GRT',
  'HBAR',
  'ICP',
  'IMX',
  'INJ',
  'IO',
  'JUP',
  'KAVA',
  'LINK',
  'LTC',
  'MANA',
  'MEME',
  'MNT',
  'NEAR',
  'NOT',
  'ONDO',
  'OP',
  'PAXG',
  'PEPE',
  'POL',
  'PYTH',
  'RETH',
  'RNDR',
  'RPL',
  'RUNE',
  'SAND',
  'SEI',
  'SHIB',
  'SNX',
  'SOL',
  'STETH',
  'STX',
  'SUI',
  'SUPRA',
  'SUSHI',
  'TAO',
  'THETA',
  'TIA',
  'TON',
  'TRX',
  'UMA',
  'UNI',
  'WBTC',
  'WETH',
  'WIF',
  'WLD',
  'XAUT',
  'XLM',
  'XRP',
  'YFI',
  'ZK',
  'ZRO',
] as const;

export const SUPRA_AVAILABLE_PAIRS: Record<string, string[]> = {
  ethereum: [...supraSymbols],
  arbitrum: [...supraSymbols],
  optimism: [...supraSymbols],
  polygon: [...supraSymbols],
  solana: [...supraSymbols],
  avalanche: [...supraSymbols],
  'bnb-chain': [...supraSymbols],
  aptos: [...supraSymbols],
  sui: [...supraSymbols],
  base: [...supraSymbols],
  scroll: [...supraSymbols],
  zksync: [...supraSymbols],
  linea: [...supraSymbols],
  mantle: [...supraSymbols],
  blast: [...supraSymbols],
};

export const oracleSupportedSymbols = {
  chainlink: chainlinkSymbols,
  redstone: redstoneSymbols,
  dia: diaSymbols,
  api3: api3Symbols,
  pyth: pythSymbols,
  winklink: winklinkSymbols,
  supra: supraSymbols,
} as const;

// 类型定义
export type ChainlinkSymbol = (typeof chainlinkSymbols)[number];
export type RedstoneSymbol = (typeof redstoneSymbols)[number];
export type DiaSymbol = (typeof diaSymbols)[number];
export type Api3Symbol = (typeof api3Symbols)[number];
export type PythSymbol = (typeof pythSymbols)[number];
export type WinklinkSymbol = (typeof winklinkSymbols)[number];
export type SupraSymbol = (typeof supraSymbols)[number];

export type OracleName = keyof typeof oracleSupportedSymbols;

// 获取所有支持的交易对（去重）
export function getAllSupportedSymbols(): string[] {
  const allSymbols = new Set<string>();
  Object.values(oracleSupportedSymbols).forEach((symbols) => {
    symbols.forEach((symbol) => allSymbols.add(symbol));
  });
  return Array.from(allSymbols).sort();
}

// 获取指定预言机支持的交易对数量
export function getOracleSymbolCount(oracle: OracleName): number {
  return oracleSupportedSymbols[oracle].length;
}

// 检查交易对是否被指定预言机支持
export function isSymbolSupportedByOracle(symbol: string, oracle: OracleName): boolean {
  const symbols = oracleSupportedSymbols[oracle];
  return symbols.includes(symbol.toUpperCase() as never);
}
