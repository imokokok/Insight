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
      address: '0x0A77230d17318075983913bC2145DB16C7366156',
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
      address: '0xc907E116054Ad103354f2D33FD1d5D0Ad9D9163e',
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
      address: '0x31CF013A08c6Ac228C94551d535d5BAfE19c602a',
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
      address: '0x3f3f5dF88dC9F13eac63DF89B16E7F7Ff7e1e6D6',
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
};

export const CHAINLINK_RPC_CONFIG: Record<number, ChainlinkRPCConfig> = {
  1: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_ETHEREUM_RPC || '',
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
    ].filter(Boolean),
    chainId: 1,
    name: 'Ethereum Mainnet',
  },
  42161: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_RPC || '',
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
    ].filter(Boolean),
    chainId: 42161,
    name: 'Arbitrum One',
  },
  137: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_RPC || '',
      'https://polygon-rpc.com',
      'https://polygon.publicnode.com',
    ].filter(Boolean),
    chainId: 137,
    name: 'Polygon',
  },
  8453: {
    endpoints: [
      process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC || '',
      'https://mainnet.base.org',
      'https://base.publicnode.com',
    ].filter(Boolean),
    chainId: 8453,
    name: 'Base',
  },
  43114: {
    endpoints: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.publicnode.com',
      'https://rpc.ankr.com/avalanche',
    ],
    chainId: 43114,
    name: 'Avalanche C-Chain',
  },
  56: {
    endpoints: [
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
      'https://rpc.ankr.com/bsc',
    ],
    chainId: 56,
    name: 'BNB Chain',
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
