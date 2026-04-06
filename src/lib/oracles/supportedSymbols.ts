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

// API3 支持的币种
export const api3Symbols = [
  'BTC',
  'ETH',
  'LINK',
  'API3',
  'USDC',
  'USDT',
  'DAI',
  'MATIC',
  'AVAX',
] as const;

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
] as const;

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
