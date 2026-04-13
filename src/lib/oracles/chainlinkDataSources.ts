import { ALCHEMY_RPC } from '@/lib/config/serverEnv';

export interface ChainlinkPriceFeed {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  category: 'crypto' | 'fiat' | 'commodity' | 'index';
}

export interface ChainlinkContracts {
  linkToken: `0x${string}`;
  stakingPool?: `0x${string}`;
}

export interface ChainlinkRPCConfig {
  endpoints: string[];
  chainId: number;
  name: string;
}

export const CHAINLINK_PRICE_FEEDS: Record<string, Record<number, ChainlinkPriceFeed>> = {
  ETH: {
    1: {
      address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 8,
      category: 'crypto',
    },
    42161: {
      address: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 8,
      category: 'crypto',
    },
    137: {
      address: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 8,
      category: 'crypto',
    },
    8453: {
      address: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 8,
      category: 'crypto',
    },
    43114: {
      address: '0x976b3d034e162d8bd72d6b9c989d545b839003b0',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 8,
      category: 'crypto',
    },
    56: {
      address: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 8,
      category: 'crypto',
    },
    10: {
      address: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
      name: 'ETH / USD',
      symbol: 'ETH',
      decimals: 8,
      category: 'crypto',
    },
  },
  BTC: {
    1: {
      address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 8,
      category: 'crypto',
    },
    42161: {
      address: '0x6ce185860a4963106506C203335A2910413708e9',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 8,
      category: 'crypto',
    },
    137: {
      address: '0xc907e116054ad103354f2d350fd2514433d57f6f',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 8,
      category: 'crypto',
    },
    8453: {
      address: '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848f',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 8,
      category: 'crypto',
    },
    43114: {
      address: '0x2779D32d5196c3C70aFc7189d76Ca6f99B2B8e7D',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 8,
      category: 'crypto',
    },
    56: {
      address: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 8,
      category: 'crypto',
    },
    10: {
      address: '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
      name: 'BTC / USD',
      symbol: 'BTC',
      decimals: 8,
      category: 'crypto',
    },
  },
  LINK: {
    1: {
      address: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 8,
      category: 'crypto',
    },
    42161: {
      address: '0x86E53CF1B870786351Da77A57575e79CB55812CB',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 8,
      category: 'crypto',
    },
    137: {
      address: '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 8,
      category: 'crypto',
    },
    8453: {
      address: '0x6b6C7139B4817185eAB5E1da0C09eEf74c7576f1',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 8,
      category: 'crypto',
    },
    43114: {
      address: '0x1b8a25F73c9420dD507406C3A3816A276b62f56a',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 8,
      category: 'crypto',
    },
    56: {
      address: '0x1B329402Cb1825C6F30A0d92aB9E2862BE47333f',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 8,
      category: 'crypto',
    },
    10: {
      address: '0xCc232dcFAA0B0C57f147E7D5a3f2DdC1f4B8928b',
      name: 'LINK / USD',
      symbol: 'LINK',
      decimals: 8,
      category: 'crypto',
    },
  },
  USDC: {
    1: {
      address: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
      name: 'USDC / USD',
      symbol: 'USDC',
      decimals: 8,
      category: 'fiat',
    },
    42161: {
      address: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
      name: 'USDC / USD',
      symbol: 'USDC',
      decimals: 8,
      category: 'fiat',
    },
  },
  USDT: {
    1: {
      address: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
      name: 'USDT / USD',
      symbol: 'USDT',
      decimals: 8,
      category: 'fiat',
    },
    42161: {
      address: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
      name: 'USDT / USD',
      symbol: 'USDT',
      decimals: 8,
      category: 'fiat',
    },
  },
  DAI: {
    1: {
      address: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
      name: 'DAI / USD',
      symbol: 'DAI',
      decimals: 8,
      category: 'fiat',
    },
    42161: {
      address: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB',
      name: 'DAI / USD',
      symbol: 'DAI',
      decimals: 8,
      category: 'fiat',
    },
  },
  MATIC: {
    137: {
      address: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
      name: 'MATIC / USD',
      symbol: 'MATIC',
      decimals: 8,
      category: 'crypto',
    },
    1: {
      address: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676',
      name: 'MATIC / USD',
      symbol: 'MATIC',
      decimals: 8,
      category: 'crypto',
    },
  },
  AVAX: {
    43114: {
      address: '0x0FCAa9c899EC5A91eBc3D5Dd869De833b06fB046',
      name: 'AVAX / USD',
      symbol: 'AVAX',
      decimals: 8,
      category: 'crypto',
    },
    1: {
      address: '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7',
      name: 'AVAX / USD',
      symbol: 'AVAX',
      decimals: 8,
      category: 'crypto',
    },
  },
  BNB: {
    56: {
      address: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
      name: 'BNB / USD',
      symbol: 'BNB',
      decimals: 8,
      category: 'crypto',
    },
    1: {
      address: '0x14e613AC84a61f71ce32C3c567E5Ec1f7Ee4A7eE',
      name: 'BNB / USD',
      symbol: 'BNB',
      decimals: 8,
      category: 'crypto',
    },
  },
  SOL: {
    42161: {
      address: '0x24ceA4b8ce57cdA5058b924B9B9987992450590c',
      name: 'SOL / USD',
      symbol: 'SOL',
      decimals: 8,
      category: 'crypto',
    },
  },
  DOGE: {
    42161: {
      address: '0x9A7FB1b3950837a8D9b40517626E11D4127C098C',
      name: 'DOGE / USD',
      symbol: 'DOGE',
      decimals: 8,
      category: 'crypto',
    },
  },
  SHIB: {
    42161: {
      address: '0x0E278D14B4bf6429dDB0a1B353e2Ae8A4e128C93',
      name: 'SHIB / USD',
      symbol: 'SHIB',
      decimals: 8,
      category: 'crypto',
    },
  },
  UNI: {
    42161: {
      address: '0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720',
      name: 'UNI / USD',
      symbol: 'UNI',
      decimals: 8,
      category: 'crypto',
    },
  },
  NEAR: {
    42161: {
      address: '0xBF5C3fB2633e924598A46B9D07a174a9DBcF57C0',
      name: 'NEAR / USD',
      symbol: 'NEAR',
      decimals: 8,
      category: 'crypto',
    },
  },
  APT: {
    42161: {
      address: '0xdc49F292ad1bb3DAb6C11363d74ED06F38b9bd9C',
      name: 'APT / USD',
      symbol: 'APT',
      decimals: 8,
      category: 'crypto',
    },
  },
  ARB: {
    42161: {
      address: '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
      name: 'ARB / USD',
      symbol: 'ARB',
      decimals: 8,
      category: 'crypto',
    },
  },
  OP: {
    42161: {
      address: '0x205aaD468a11fd5D34fA7211bC6Bad5b3deB9b98',
      name: 'OP / USD',
      symbol: 'OP',
      decimals: 8,
      category: 'crypto',
    },
  },
  AAVE: {
    42161: {
      address: '0xaD1d5344AaDE45F43E596773Bcc4c423EAbdD034',
      name: 'AAVE / USD',
      symbol: 'AAVE',
      decimals: 8,
      category: 'crypto',
    },
  },
  MKR: {
    42161: {
      address: '0xdE9f0894670c4EFcacF370426F10C3AD2Cdf147e',
      name: 'MKR / USD',
      symbol: 'MKR',
      decimals: 8,
      category: 'crypto',
    },
  },
  COMP: {
    42161: {
      address: '0xe7C53FFd03Eb6ceF7d208bC4C13446c76d1E5884',
      name: 'COMP / USD',
      symbol: 'COMP',
      decimals: 8,
      category: 'crypto',
    },
  },
  SNX: {
    42161: {
      address: '0x054296f0D036b95531B4E14aFB578B80CFb41252',
      name: 'SNX / USD',
      symbol: 'SNX',
      decimals: 8,
      category: 'crypto',
    },
  },
  CRV: {
    42161: {
      address: '0xaebDA2c976cfd1eE1977Eac079B4382acb849325',
      name: 'CRV / USD',
      symbol: 'CRV',
      decimals: 8,
      category: 'crypto',
    },
  },
  SUSHI: {
    42161: {
      address: '0xb2A8BA74cbca38508BA1632761b56C897060147C',
      name: 'SUSHI / USD',
      symbol: 'SUSHI',
      decimals: 8,
      category: 'crypto',
    },
  },
  LDO: {
    42161: {
      address: '0xA43A34030088E6510FecCFb77E88ee5e7ed0fE64',
      name: 'LDO / USD',
      symbol: 'LDO',
      decimals: 8,
      category: 'crypto',
    },
  },
  GMX: {
    42161: {
      address: '0xDB98056FecFff59D032aB628337A4887110df3dB',
      name: 'GMX / USD',
      symbol: 'GMX',
      decimals: 8,
      category: 'crypto',
    },
  },
  GRT: {
    42161: {
      address: '0x0F38D86FceF4955B705F35c9e41d1A16e0637c73',
      name: 'GRT / USD',
      symbol: 'GRT',
      decimals: 8,
      category: 'crypto',
    },
  },
  APE: {
    42161: {
      address: '0x221912ce795669f628c51c69b7d0873eDA9C03bB',
      name: 'APE / USD',
      symbol: 'APE',
      decimals: 8,
      category: 'crypto',
    },
  },
  AXS: {
    42161: {
      address: '0x5B58aA6E0651Ae311864876A55411F481aD86080',
      name: 'AXS / USD',
      symbol: 'AXS',
      decimals: 8,
      category: 'crypto',
    },
  },
  INJ: {
    42161: {
      address: '0x6aCcBB82aF71B8a576B4C05D4aF92A83A035B991',
      name: 'INJ / USD',
      symbol: 'INJ',
      decimals: 8,
      category: 'crypto',
    },
  },
  SUI: {
    42161: {
      address: '0x4a85B128EBDaFC24d5CB611e161376ffDECeB289',
      name: 'SUI / USD',
      symbol: 'SUI',
      decimals: 8,
      category: 'crypto',
    },
  },
  SEI: {
    42161: {
      address: '0xCc9742d77622eE9abBF1Df03530594f9097bDcB3',
      name: 'SEI / USD',
      symbol: 'SEI',
      decimals: 8,
      category: 'crypto',
    },
  },
  TIA: {
    42161: {
      address: '0x4096b9bfB4c34497B7a3939D4f629cf65EBf5634',
      name: 'TIA / USD',
      symbol: 'TIA',
      decimals: 8,
      category: 'crypto',
    },
  },
  TON: {
    42161: {
      address: '0x0301e5D0A8f7490444ebd1921E3d0f0fe7722786',
      name: 'TON / USD',
      symbol: 'TON',
      decimals: 8,
      category: 'crypto',
    },
  },
  PEPE: {
    42161: {
      address: '0x02DEd5a7EDDA750E3Eb240b54437a54d57b74dBE',
      name: 'PEPE / USD',
      symbol: 'PEPE',
      decimals: 8,
      category: 'crypto',
    },
  },
  WIF: {
    42161: {
      address: '0xF7Ee427318d2Bd0EEd3c63382D0d52Ad8A68f90D',
      name: 'WIF / USD',
      symbol: 'WIF',
      decimals: 8,
      category: 'crypto',
    },
  },
  FRAX: {
    42161: {
      address: '0x0809E3d38d1B4214958faf06D8b1B1a2b73f2ab8',
      name: 'FRAX / USD',
      symbol: 'FRAX',
      decimals: 8,
      category: 'fiat',
    },
  },
  LUSD: {
    42161: {
      address: '0x0411D28c94d85A36bC72Cb0f875dfA8371D8fFfF',
      name: 'LUSD / USD',
      symbol: 'LUSD',
      decimals: 8,
      category: 'fiat',
    },
  },
  WBTC: {
    42161: {
      address: '0xd0C7101eACbB49F3deCcCc166d238410D6D46d57',
      name: 'WBTC / USD',
      symbol: 'WBTC',
      decimals: 8,
      category: 'crypto',
    },
  },
  STETH: {
    42161: {
      address: '0x07C5b924399cc23c24a95c8743DE4006a32b7f2a',
      name: 'STETH / USD',
      symbol: 'STETH',
      decimals: 8,
      category: 'crypto',
    },
  },
  MNT: {
    42161: {
      address: '0x37DDEE84dE03d039e1Bf809b7a01EDd2c4665771',
      name: 'MNT / USD',
      symbol: 'MNT',
      decimals: 8,
      category: 'crypto',
    },
  },
  RPL: {
    42161: {
      address: '0xF0b7159BbFc341Cc41E7Cb182216F62c6d40533D',
      name: 'RPL / USD',
      symbol: 'RPL',
      decimals: 8,
      category: 'crypto',
    },
  },
  CVX: {
    42161: {
      address: '0x851175a919f36c8e30197c09a9A49dA932c2CC00',
      name: 'CVX / USD',
      symbol: 'CVX',
      decimals: 8,
      category: 'crypto',
    },
  },
  YFI: {
    42161: {
      address: '0x745Ab5b69E01E2BE1104Ca84937Bb71f96f5fB21',
      name: 'YFI / USD',
      symbol: 'YFI',
      decimals: 8,
      category: 'crypto',
    },
  },
  '1INCH': {
    42161: {
      address: '0x4bC735Ef24bf286983024CAd5D03f0738865Aaef',
      name: '1INCH / USD',
      symbol: '1INCH',
      decimals: 8,
      category: 'crypto',
    },
  },
  CAKE: {
    42161: {
      address: '0x256654437f1ADA8057684b18d742eFD14034C400',
      name: 'CAKE / USD',
      symbol: 'CAKE',
      decimals: 8,
      category: 'crypto',
    },
  },
  BONK: {
    42161: {
      address: '0x3d9145b5804E13Bc14d19c3DDbd3DA8fD02b5034',
      name: 'BONK / USD',
      symbol: 'BONK',
      decimals: 8,
      category: 'crypto',
    },
  },
};

export const CHAINLINK_CONTRACTS: Record<number, ChainlinkContracts> = {
  1: {
    linkToken: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  },
  42161: {
    linkToken: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  },
  137: {
    linkToken: '0xb0897686c545045aFc77CF20eC7A532E3120E0F1',
  },
  8453: {
    linkToken: '0x88Fb150BdC53A65fe94Dea0c9BA0a6dAf8C6e196',
  },
  43114: {
    linkToken: '0x5947BB275c521040051D82396192181b413227A3',
  },
  56: {
    linkToken: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
  },
  10: {
    linkToken: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
  },
};

export const CHAINLINK_RPC_CONFIG: Record<number, ChainlinkRPCConfig> = {
  1: {
    endpoints: [
      ALCHEMY_RPC.ethereum,
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
    ].filter(Boolean),
    chainId: 1,
    name: 'Ethereum Mainnet',
  },
  42161: {
    endpoints: [
      ALCHEMY_RPC.arbitrum,
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
    ].filter(Boolean),
    chainId: 42161,
    name: 'Arbitrum One',
  },
  137: {
    endpoints: [
      ALCHEMY_RPC.polygon,
      'https://polygon-rpc.com',
      'https://polygon.publicnode.com',
    ].filter(Boolean),
    chainId: 137,
    name: 'Polygon',
  },
  8453: {
    endpoints: [ALCHEMY_RPC.base, 'https://mainnet.base.org', 'https://base.publicnode.com'].filter(
      Boolean
    ),
    chainId: 8453,
    name: 'Base',
  },
  43114: {
    endpoints: [
      ALCHEMY_RPC.avalanche,
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.publicnode.com',
      'https://rpc.ankr.com/avalanche',
    ].filter(Boolean),
    chainId: 43114,
    name: 'Avalanche C-Chain',
  },
  56: {
    endpoints: [
      ALCHEMY_RPC.bnb,
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
      'https://rpc.ankr.com/bsc',
    ].filter(Boolean),
    chainId: 56,
    name: 'BNB Chain',
  },
  10: {
    endpoints: [
      ALCHEMY_RPC.optimism,
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
    ].filter(Boolean),
    chainId: 10,
    name: 'Optimism',
  },
};

export const CHAINLINK_AGGREGATOR_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'version',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const CHAINLINK_TOKEN_ABI = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function getChainlinkPriceFeed(symbol: string, chainId: number): ChainlinkPriceFeed | null {
  const feeds = CHAINLINK_PRICE_FEEDS[symbol.toUpperCase()];
  if (!feeds) return null;
  return feeds[chainId] || null;
}

export function getChainlinkContracts(chainId: number): ChainlinkContracts | null {
  return CHAINLINK_CONTRACTS[chainId] || null;
}

export function getChainlinkRPCConfig(chainId: number): ChainlinkRPCConfig | null {
  return CHAINLINK_RPC_CONFIG[chainId] || null;
}

export function getSupportedSymbols(): string[] {
  return Object.keys(CHAINLINK_PRICE_FEEDS);
}

export function getSupportedChainIds(symbol: string): number[] {
  const feeds = CHAINLINK_PRICE_FEEDS[symbol.toUpperCase()];
  if (!feeds) return [];
  return Object.keys(feeds).map(Number);
}

export function isPriceFeedSupported(symbol: string, chainId: number): boolean {
  return getChainlinkPriceFeed(symbol, chainId) !== null;
}
