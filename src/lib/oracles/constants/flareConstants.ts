export const FLARE_RPC_ENDPOINTS: Record<string, string[]> = {
  flare: [
    'https://flare-api.flare.network/ext/C/rpc',
    'https://rpc.ankr.com/flare',
    'https://flare.rpc.thirdweb.com',
  ],
  songbird: ['https://songbird-api.flare.network/ext/C/rpc', 'https://rpc.ankr.com/songbird'],
  coston2: ['https://coston2-api.flare.network/ext/C/rpc', 'https://coston2.rpc.thirdweb.com'],
};

export const FLARE_CHAIN_IDS: Record<string, number> = {
  flare: 14,
  songbird: 19,
  coston2: 114,
};

export const FLARE_NETWORK_DEFAULT = 'flare';

export const FTSOV2_ADDRESS: Record<string, `0x${string}`> = {
  flare: '0x7BDE3Df0624114eDB3A67dFe6753e62f4e7c1d20',
};

export const FLARE_CONTRACT_REGISTRY = '0xaD67FE6667226235497ED7B6E0e2416C2E40771B';

export const FLARE_CACHE_TTL = {
  PRICE: 30000,
  FEED_REGISTRY: 3600000,
  CONTRACT_ADDRESS: 3600000,
} as const;

export const FLARE_REQUEST_TIMEOUT = 15000;

export const FLARE_STALE_DATA_THRESHOLD = 300;

export const FLARE_FEED_CATEGORY = {
  CRYPTO: 1,
  FOREX: 2,
  COMMODITY: 3,
} as const;

export const flareSymbols = [
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

export type FlareSymbol = (typeof flareSymbols)[number];

export const FLARE_AVAILABLE_PAIRS: Record<string, string[]> = {
  flare: [...flareSymbols],
};

export const FTSOV2_ABI = [
  {
    inputs: [{ internalType: 'bytes21', name: '_feedId', type: 'bytes21' }],
    name: 'getFeedById',
    outputs: [
      { internalType: 'uint256', name: '_value', type: 'uint256' },
      { internalType: 'int8', name: '_decimals', type: 'int8' },
      { internalType: 'uint64', name: '_timestamp', type: 'uint64' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'string', name: '_name', type: 'string' }],
    name: 'getContractAddressByName',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function encodeFeedId(category: number, symbol: string): `0x${string}` {
  const categoryByte = Buffer.from([category]);
  const symbolBytes = Buffer.from(symbol + '/USD');
  const buf = Buffer.alloc(21);
  categoryByte.copy(buf, 0);
  symbolBytes.copy(buf, 1);
  return ('0x' + buf.toString('hex')) as `0x${string}`;
}

export const FLARE_SYMBOL_TO_FEED_ID: Record<string, `0x${string}`> = {};
for (const sym of flareSymbols) {
  FLARE_SYMBOL_TO_FEED_ID[sym] = encodeFeedId(FLARE_FEED_CATEGORY.CRYPTO, sym);
}
