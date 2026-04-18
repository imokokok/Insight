// Chainlink supported symbols (based on actual verification results, only including available trading pairs)
// Note: These symbols have available Chainlink price feeds on at least one chain
const chainlinkSymbols = [
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

// RedStone supported symbols (based on actual verification results - 2026-04-14)
// Only including symbols that can be correctly fetched
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
  // LRT (partially available)
  'METH',
  // Yield-Bearing Assets (partially available)
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
  // Layer 2 Tokens (partially available)
  'MNT',
  'ZK',
  'MANTA',
  // Others
  'PEPE',
  'BONK',
  'WIF',
  'FLOKI',
] as const;

// DIA supported symbols (based on actual detection results - 2026-04-14)
// Only including symbols that can be correctly fetched
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

// API3 supported symbols (based on actual detection results - 2026-04-14)
// Only including symbols that can be correctly fetched
const api3Symbols = [
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

// API3 available chain-trading pair mapping (based on actual detection results - 2026-04-14)
// Only including trading pairs that can be correctly fetched
export const API3_AVAILABLE_PAIRS: Record<string, string[]> = {
  // Ethereum: 5 available
  ethereum: ['BAL', 'BTC', 'COMP', 'ETH', 'USDC'],
  // Arbitrum: 9 available
  arbitrum: ['ARB', 'AVAX', 'BTC', 'COMP', 'DAI', 'ETH', 'USDC', 'USDT', 'WBTC'],
  // Polygon: 7 available
  polygon: ['ARB', 'AVAX', 'BNB', 'BTC', 'ETH', 'USDC', 'WBTC'],
  // Base: 8 available
  base: ['BNB', 'BTC', 'DAI', 'ETH', 'SOL', 'USDC', 'USDT', 'WBTC'],
  // Optimism: 3 available
  optimism: ['ETH', 'USDC', 'WBTC'],
  // Avalanche: 3 available
  avalanche: ['AVAX', 'ETH', 'USDT'],
  // BNB Chain: 6 available
  'bnb-chain': ['BNB', 'BTC', 'ETH', 'USDC', 'USDT', 'WBTC'],
  // Fantom: 0 successful - API3 has not deployed dAPI on Fantom, removed
};

// Pyth supported symbols (based on official documentation, supporting 400+ price feeds)
// Pyth covers cryptocurrencies, forex, commodities, equities, ETFs
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

// Pyth available chain-trading pair mapping
// Pyth provides the same trading pairs on all supported chains (fetched uniformly via Hermes API)
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

// WINkLink supported symbols (primarily supports TRON ecosystem, only including trading pairs with real contract addresses)
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

// Supra supported symbols (based on actual verification results - 2026-04-16)
// Only including symbols that can be correctly fetched
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
  // Chains supported by project RPC (corresponding to ALCHEMY_*_RPC in .env.local)
  ethereum: [...supraSymbols],
  arbitrum: [...supraSymbols],
  optimism: [...supraSymbols],
  polygon: [...supraSymbols],
  base: [...supraSymbols],
  solana: [...supraSymbols],
  'bnb-chain': [...supraSymbols],
  avalanche: [...supraSymbols],
  // RedStone-specific chains
  zksync: [...supraSymbols],
  scroll: [...supraSymbols],
  mantle: [...supraSymbols],
  linea: [...supraSymbols],
  // Other Supra-supported chains
  aptos: [...supraSymbols],
  sui: [...supraSymbols],
  blast: [...supraSymbols],
};

const twapSymbols = [
  'BTC',
  'ETH',
  'USDC',
  'USDT',
  'DAI',
  'WBTC',
  'LINK',
  'UNI',
  'AAVE',
  'ARB',
  'OP',
  'MATIC',
  'SNX',
  'CRV',
  'COMP',
  'MKR',
  'SUSHI',
  '1INCH',
  'BAL',
  'BNB',
  'STETH',
  'FRAX',
] as const;
type TwapSymbol = (typeof twapSymbols)[number];

const TWAP_AVAILABLE_PAIRS: Record<string, string[]> = {
  ethereum: [
    'BTC',
    'ETH',
    'USDC',
    'USDT',
    'DAI',
    'WBTC',
    'LINK',
    'UNI',
    'AAVE',
    'SNX',
    'CRV',
    'COMP',
    'MKR',
    'SUSHI',
    '1INCH',
    'BAL',
    'STETH',
    'FRAX',
  ],
  arbitrum: [
    'BTC',
    'ETH',
    'USDC',
    'USDT',
    'DAI',
    'WBTC',
    'LINK',
    'UNI',
    'AAVE',
    'ARB',
    'SNX',
    'CRV',
    'COMP',
    'MKR',
    'GMX',
  ],
  optimism: ['BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'OP', 'SNX'],
  polygon: ['BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'MATIC'],
  base: ['BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'OP'],
  'bnb-chain': ['BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'BNB'],
};

const reflectorSymbols = [
  'BTC',
  'ETH',
  'USDT',
  'XRP',
  'SOL',
  'USDC',
  'ADA',
  'AVAX',
  'DOT',
  'LINK',
  'ATOM',
  'XLM',
  'UNI',
  'EURC',
  'EUR',
  'GBP',
  'CAD',
  'BRL',
  'JPY',
  'CNY',
] as const;

type ReflectorSymbol = (typeof reflectorSymbols)[number];

const REFLECTOR_AVAILABLE_PAIRS: Record<string, string[]> = {
  stellar: [...reflectorSymbols],
};

const flareSymbols = [
  'BTC',
  'ETH',
  'FLR',
  'XRP',
  'SOL',
  'DOGE',
  'ADA',
  'BNB',
  'AVAX',
  'LINK',
  'DOT',
  'MATIC',
  'ARB',
  'UNI',
  'ATOM',
  'LTC',
  'USDT',
  'USDC',
  'DAI',
  'AAVE',
  'NEAR',
  'APT',
  'OP',
  'TRX',
  'SHIB',
  'TON',
  'HBAR',
  'FIL',
  'XLM',
  'SGB',
  'ALGO',
  'XDC',
  'ICP',
  'RUNE',
  'FTM',
  'QNT',
] as const;

type FlareSymbol = (typeof flareSymbols)[number];

const FLARE_AVAILABLE_PAIRS: Record<string, string[]> = {
  flare: [...flareSymbols],
};

export const oracleSupportedSymbols = {
  chainlink: chainlinkSymbols,
  redstone: redstoneSymbols,
  dia: diaSymbols,
  api3: api3Symbols,
  pyth: pythSymbols,
  winklink: winklinkSymbols,
  supra: supraSymbols,
  twap: twapSymbols,
  reflector: reflectorSymbols,
  flare: flareSymbols,
} as const;

// Type definitions
type ChainlinkSymbol = (typeof chainlinkSymbols)[number];
type RedstoneSymbol = (typeof redstoneSymbols)[number];
type DiaSymbol = (typeof diaSymbols)[number];
type Api3Symbol = (typeof api3Symbols)[number];
type PythSymbol = (typeof pythSymbols)[number];
type WinklinkSymbol = (typeof winklinkSymbols)[number];
type SupraSymbol = (typeof supraSymbols)[number];

type OracleName = keyof typeof oracleSupportedSymbols;

// Get all supported trading pairs (deduplicated)
export function getAllSupportedSymbols(): string[] {
  const allSymbols = new Set<string>();
  Object.values(oracleSupportedSymbols).forEach((symbols) => {
    symbols.forEach((symbol) => allSymbols.add(symbol));
  });
  return Array.from(allSymbols).sort();
}

// Get the number of trading pairs supported by a specified oracle
function getOracleSymbolCount(oracle: OracleName): number {
  return oracleSupportedSymbols[oracle].length;
}

// Check if a trading pair is supported by a specified oracle
function isSymbolSupportedByOracle(symbol: string, oracle: OracleName): boolean {
  const symbols = oracleSupportedSymbols[oracle];
  return symbols.includes(symbol.toUpperCase() as never);
}
