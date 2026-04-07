// Chainlink 支持的币种（按市值排序）
export const chainlinkSymbols = [
  'BTC',
  'ETH',
  'BNB',
  'AVAX',
  'MATIC',
  'LINK',
  'USDT',
  'USDC',
  'DAI',
] as const;

// RedStone 支持的币种
export const redstoneSymbols = [
  'BTC',
  'ETH',
  'SOL',
  'AVAX',
  'LINK',
  'UNI',
  'AAVE',
  'SNX',
  'CRV',
  'MKR',
  'COMP',
  'YFI',
  'SUSHI',
  '1INCH',
  'LDO',
  'STETH',
  'USDC',
  'USDT',
  'DAI',
  'FRAX',
  'WBTC',
  'WETH',
  'MATIC',
  'BNB',
  'FTM',
  'OP',
  'ARB',
  'BASE',
  'MNT',
  'RED',
] as const;

// UMA 支持的币种
export const umaSymbols = ['UMA'] as const;

// DIA 支持的币种
export const diaSymbols = ['BTC', 'ETH', 'USDC', 'USDT', 'LINK', 'UNI'] as const;

// Band Protocol 支持的币种
export const bandProtocolSymbols = [
  'BTC',
  'ETH',
  'BAND',
  'LINK',
  'USDC',
  'USDT',
  'DAI',
  'ATOM',
  'OSMO',
  'JUNO',
  'AVAX',
  'MATIC',
  'DOT',
] as const;

// API3 支持的币种 - 基于实际测试，只包含能获取到真实价格的
export const api3Symbols = [
  'ETH',
  'BTC',
  'AVAX',
  'BNB',
  'ARB',
  'OP',
  'COMP',
  'BAL',
  'USDC',
  'USDT',
  'DAI',
  'SOL',
] as const;

// API3 可用的链-交易对映射（基于实际测试结果）
export const API3_AVAILABLE_PAIRS: Record<string, string[]> = {
  ethereum: ['ETH', 'BTC', 'COMP', 'BAL', 'USDC'],
  arbitrum: ['ETH', 'BTC', 'AVAX', 'ARB', 'COMP', 'USDC', 'USDT', 'DAI'],
  polygon: ['ETH', 'BTC', 'AVAX', 'BNB', 'ARB', 'OP', 'USDC'],
  base: ['ETH', 'BTC', 'BNB', 'SOL', 'USDC', 'USDT', 'DAI'],
  optimism: ['ETH', 'USDC'],
};

// Tellor 支持的币种
export const tellorSymbols = ['BTC', 'ETH', 'LINK', 'TRB', 'USDC', 'USDT', 'DAI'] as const;

// Pyth 支持的币种
export const pythSymbols = [
  'BTC',
  'ETH',
  'SOL',
  'AVAX',
  'LINK',
  'MATIC',
  'BNB',
  'ARB',
  'OP',
  'PYTH',
  'DOT',
  'UNI',
  'ATOM',
] as const;

// Pyth 可用的链-交易对映射
// Pyth 在所有支持的链上提供相同的交易对（通过 Hermes API 统一获取）
export const PYTH_AVAILABLE_PAIRS: Record<string, string[]> = {
  ethereum: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  arbitrum: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  optimism: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  polygon: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  solana: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  avalanche: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  'bnb-chain': [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  aptos: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  sui: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
  base: [
    'BTC',
    'ETH',
    'SOL',
    'AVAX',
    'LINK',
    'MATIC',
    'BNB',
    'ARB',
    'OP',
    'PYTH',
    'DOT',
    'UNI',
    'ATOM',
  ],
};

// WINkLink 支持的币种
export const winklinkSymbols = [
  'BTC',
  'ETH',
  'TRX',
  'USDT',
  'USDC',
  'WIN',
  'BTT',
  'JST',
  'SUN',
] as const;

// 统一映射对象
export const oracleSupportedSymbols = {
  chainlink: chainlinkSymbols,
  redstone: redstoneSymbols,
  uma: umaSymbols,
  dia: diaSymbols,
  bandProtocol: bandProtocolSymbols,
  api3: api3Symbols,
  tellor: tellorSymbols,
  pyth: pythSymbols,
  winklink: winklinkSymbols,
} as const;

// 类型定义
export type ChainlinkSymbol = (typeof chainlinkSymbols)[number];
export type RedstoneSymbol = (typeof redstoneSymbols)[number];
export type UmaSymbol = (typeof umaSymbols)[number];
export type DiaSymbol = (typeof diaSymbols)[number];
export type BandProtocolSymbol = (typeof bandProtocolSymbols)[number];
export type Api3Symbol = (typeof api3Symbols)[number];
export type TellorSymbol = (typeof tellorSymbols)[number];
export type PythSymbol = (typeof pythSymbols)[number];
export type WinklinkSymbol = (typeof winklinkSymbols)[number];

export type OracleName = keyof typeof oracleSupportedSymbols;
