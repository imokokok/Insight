import { ALCHEMY_RPC } from '@/lib/config/serverEnv';

export const UNISWAP_V3_FACTORY: Record<number, `0x${string}`> = {
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  42161: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  10: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  137: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  8453: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  56: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
};

export const TWAP_FEE_TIERS = {
  LOW: 500,
  MEDIUM: 3000,
  HIGH: 10000,
} as const;

export const TWAP_INTERVALS = {
  SHORT: 600,
  MEDIUM: 1800,
  LONG: 3600,
} as const;

export const TWAP_TOKEN_ADDRESSES: Record<string, Record<number, `0x${string}`>> = {
  WETH: {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    10: '0x4200000000000000000000000000000000000006',
    137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    8453: '0x4200000000000000000000000000000000000006',
    56: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  },
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    8453: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    56: '0x55d398326f99059fF775485246999027B3197955',
  },
  WBTC: {
    1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    42161: '0x2f5E2f57A05eA4836B5dE9a2990D5c8E705FA1F0',
    10: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
    137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    8453: '0xcbB7C0000aB88B473b1f5aFd9ef808440ee33D29',
    56: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  },
  LINK: {
    1: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    42161: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    10: '0x350a791Bfc2C21F9Ed0dAD25A2162663f3240eCE',
    137: '0x53E0bca35Ec356BD5ddDFebbD9Fc35df7e4D9980',
    8453: '0x88Fb150BDc53A8d15f1a0E4aEDe9E6b72f4F4F4F',
    56: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
  },
  UNI: {
    1: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    42161: '0xA394b9DA6FD6e412C7cA0208bDB3a7b0C1a3b0c1',
    10: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
    137: '0xb33EaAd8d912B6F80350C1a33479B2c6Aa5e0F45',
    8453: '0xc3De8306D1D2413a4B2D3b226D0a3c0B08C2B0dA',
    56: '0xBF5140CA225F9E8252B3Bf7E3Bb68f5aA5B0E3A0',
  },
  DAI: {
    1: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    42161: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    10: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    137: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    8453: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    56: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  },
  AAVE: {
    1: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    42161: '0xba5DdD1f9d7F570dc94a51479a000E3B5968B298',
    10: '0x76FB31fb4af56890A9139AAb4a5ad0DF2c9E7a8D',
    137: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    8453: '0x4cdcC8B83A3e9355B1C78A1928e9BE0Ae1F019c4',
    56: '0xfb6115445Bff7b52Fe5957014397dd0c0a0e2C5c',
  },
  ARB: {
    42161: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
    137: '0x539bDE0C6F8c8aD0916F6d8a1c1e4f2F3E4a5B6c',
    8453: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  },
  OP: {
    10: '0x4200000000000000000000000000000000000042',
    8453: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  MATIC: {
    137: '0x0000000000000000000000000000000000001010',
    1: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
  },
  SNX: {
    1: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
    10: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
    42161: '0x00eA6fFb0D4676c8E0e9E9936E4A54e1B0c0A2c0',
  },
  CRV: {
    1: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    42161: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
  },
  COMP: {
    1: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    42161: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
  },
  MKR: {
    1: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    42161: '0x3F56e0c36d275367b8C502090EDF38289b3dEa0d',
  },
  SUSHI: {
    1: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
    42161: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A',
  },
  '1INCH': {
    1: '0x111111111117dC0aa78b770fA6A738034120C302',
  },
  BAL: {
    1: '0xba100000625a3754423978a60c9317c58a424e3D',
  },
  BNB: {
    56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    1: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
  },
  SOL: {
    1: '0xD31a59c85aE9Ab8A51fc8d4440271E6FbC5f0e6b',
  },
  DOGE: {
    1: '0x4206931337dc273a630d328dA6441786BfaD668f',
  },
  AVAX: {
    1: '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3',
  },
  APE: {
    1: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
  },
  LDO: {
    1: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
  },
  GMX: {
    42161: '0x62edc0692BD897D2295872a9FFCac5425011c661',
  },
  FRAX: {
    1: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
  },
  STETH: {
    1: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  },
};

export interface TwapPoolConfig {
  address: `0x${string}`;
  feeTier: number;
  token0: string;
  token1: string;
}

export const TWAP_POOL_ADDRESSES: Record<string, Record<number, TwapPoolConfig>> = {
  ETH: {
    1: {
      address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
      feeTier: 500,
      token0: 'USDC',
      token1: 'WETH',
    },
    42161: {
      address: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
      feeTier: 500,
      token0: 'WETH',
      token1: 'USDC',
    },
    10: {
      address: '0x1fb3cf6e48f1e7b10213e7b6d87d4c073c7fdb7b',
      feeTier: 500,
      token0: 'USDC',
      token1: 'WETH',
    },
    137: {
      address: '0xa4d8c89f0c20efbe54cba9e7e7a7e509056228d9',
      feeTier: 500,
      token0: 'USDC',
      token1: 'WETH',
    },
    8453: {
      address: '0xd0b53d9277642d899df5c87a3966a349a798f224',
      feeTier: 500,
      token0: 'WETH',
      token1: 'USDC',
    },
    56: {
      address: '0xd0e226f674bbf064f54ab47f42473ff80db98cba',
      feeTier: 500,
      token0: 'WETH',
      token1: 'BNB',
    },
  },
  BTC: {
    1: {
      address: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0',
      feeTier: 3000,
      token0: 'WBTC',
      token1: 'WETH',
    },
    42161: {
      address: '0x2f5E2f57A05eA4836B5dE9a2990D5c8E705FA1F0',
      feeTier: 3000,
      token0: 'WBTC',
      token1: 'WETH',
    },
    10: {
      address: '0x7a4e5Dd5c79f4983D6E3aC7e0E4B3865D936c7E3',
      feeTier: 3000,
      token0: 'WBTC',
      token1: 'WETH',
    },
    137: {
      address: '0x50eaEDBc3eEf8b4E4691e3e7c25E70DC4f0e2F0e',
      feeTier: 3000,
      token0: 'WBTC',
      token1: 'WETH',
    },
    8453: {
      address: '0x039B4E269965Fc6e50A6Bc2c4A3b7E1d5B0970f1',
      feeTier: 3000,
      token0: 'WBTC',
      token1: 'WETH',
    },
    56: {
      address: '0x7Ef5740518e1E1B6f7B5BDBb5095b3A3D9A6A0f1',
      feeTier: 3000,
      token0: 'USDT',
      token1: 'WBTC',
    },
  },
  LINK: {
    1: {
      address: '0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8',
      feeTier: 3000,
      token0: 'LINK',
      token1: 'WETH',
    },
    42161: {
      address: '0x4f3126d5DE26413Ab2fF950C7E247e3E0e9e4642',
      feeTier: 3000,
      token0: 'LINK',
      token1: 'WETH',
    },
    10: {
      address: '0xb8527C089e4D5Fb7Ff2Bc23c8e4379246Ec15D2e',
      feeTier: 3000,
      token0: 'LINK',
      token1: 'WETH',
    },
    137: {
      address: '0x3Fb3696a1C4e4e1f8a0C7e0e9e7e3D9A6A0f1B2c',
      feeTier: 3000,
      token0: 'LINK',
      token1: 'WETH',
    },
    8453: {
      address: '0x4e1dC0aA8a5b4fBEe0E6e3A7e8e9e7e3D9A6A0f1',
      feeTier: 3000,
      token0: 'LINK',
      token1: 'WETH',
    },
  },
  UNI: {
    1: {
      address: '0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801',
      feeTier: 3000,
      token0: 'UNI',
      token1: 'WETH',
    },
    42161: {
      address: '0xc846A8fC8F3a8bA3B0E7a1e2F5c0f3D9A6A0f1B2c',
      feeTier: 3000,
      token0: 'UNI',
      token1: 'WETH',
    },
    10: {
      address: '0xb5c457b0A7e0bD2f5e9A1c2F5c0f3D9A6A0f1B2c',
      feeTier: 3000,
      token0: 'UNI',
      token1: 'WETH',
    },
  },
  DAI: {
    1: {
      address: '0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168',
      feeTier: 500,
      token0: 'DAI',
      token1: 'USDC',
    },
    42161: {
      address: '0x9A3c033a8D81176eAeA38D9a94C7B6e1b4e7E4f5',
      feeTier: 500,
      token0: 'DAI',
      token1: 'USDC',
    },
    10: {
      address: '0x1A4c1a8B6E0fB4f5E8c3D2A1B6c0E4f5D8A7b9C2',
      feeTier: 500,
      token0: 'DAI',
      token1: 'USDC',
    },
  },
  AAVE: {
    1: {
      address: '0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB',
      feeTier: 3000,
      token0: 'AAVE',
      token1: 'WETH',
    },
    42161: {
      address: '0x3c7b4A8C2e6f1D5A8B3c4E5f6A7b8C9d0E1f2A3b',
      feeTier: 3000,
      token0: 'AAVE',
      token1: 'WETH',
    },
  },
  ARB: {
    42161: {
      address: '0xecba432187664a6bbd410d59bfa92b4aecd0b8e6',
      feeTier: 3000,
      token0: 'WETH',
      token1: 'ARB',
    },
  },
  OP: {
    10: {
      address: '0x6815e4187e036DfFD6D3e0e8B1b5f0C1e2D3A4b5',
      feeTier: 3000,
      token0: 'OP',
      token1: 'WETH',
    },
  },
  MATIC: {
    137: {
      address: '0x50eaEDBc3eEf8b4E4691e3e7c25E70DC4f0e2F0e',
      feeTier: 3000,
      token0: 'MATIC',
      token1: 'USDC',
    },
  },
  BNB: {
    56: {
      address: '0x36696169C63e42cd08ce11f5deeBbCeBae652050',
      feeTier: 500,
      token0: 'USDT',
      token1: 'BNB',
    },
  },
  USDC: {
    1: {
      address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
      feeTier: 500,
      token0: 'USDC',
      token1: 'WETH',
    },
    42161: {
      address: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
      feeTier: 500,
      token0: 'WETH',
      token1: 'USDC',
    },
  },
  USDT: {
    1: {
      address: '0x4e68Ccd3E89f51C3074ca5072bbAC773960d3633',
      feeTier: 3000,
      token0: 'USDT',
      token1: 'WETH',
    },
    56: {
      address: '0x36696169C63e42cd08ce11f5deeBbCeBae652050',
      feeTier: 500,
      token0: 'USDT',
      token1: 'BNB',
    },
  },
  WBTC: {
    1: {
      address: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0',
      feeTier: 3000,
      token0: 'WBTC',
      token1: 'WETH',
    },
  },
  STETH: {
    1: {
      address: '0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801',
      feeTier: 3000,
      token0: 'STETH',
      token1: 'WETH',
    },
  },
  FRAX: {
    1: {
      address: '0xc63B0708E2F76040eE2A91F4eC3b1B3e5e2e4F5a',
      feeTier: 500,
      token0: 'FRAX',
      token1: 'USDC',
    },
  },
};

function buildEndpoints(alchemyUrl: string, publicEndpoints: string[]): string[] {
  if (!alchemyUrl) return publicEndpoints;
  return [alchemyUrl, ...publicEndpoints];
}

export const TWAP_RPC_CONFIG: Record<
  number,
  { endpoints: string[]; chainId: number; name: string }
> = {
  1: {
    endpoints: buildEndpoints(ALCHEMY_RPC.ethereum, [
      'https://ethereum.publicnode.com',
      'https://eth.llamarpc.com',
    ]),
    chainId: 1,
    name: 'Ethereum Mainnet',
  },
  42161: {
    endpoints: buildEndpoints(ALCHEMY_RPC.arbitrum, [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
    ]),
    chainId: 42161,
    name: 'Arbitrum One',
  },
  10: {
    endpoints: buildEndpoints(ALCHEMY_RPC.optimism, [
      'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
    ]),
    chainId: 10,
    name: 'Optimism',
  },
  137: {
    endpoints: buildEndpoints(ALCHEMY_RPC.polygon, [
      'https://polygon.publicnode.com',
      'https://polygon-rpc.com',
    ]),
    chainId: 137,
    name: 'Polygon',
  },
  8453: {
    endpoints: buildEndpoints(ALCHEMY_RPC.base, [
      'https://mainnet.base.org',
      'https://base.publicnode.com',
    ]),
    chainId: 8453,
    name: 'Base',
  },
  56: {
    endpoints: buildEndpoints(ALCHEMY_RPC.bnb, [
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
    ]),
    chainId: 56,
    name: 'BNB Chain',
  },
};

export const UNISWAP_V3_POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'secondsAgos', type: 'uint32[]' }],
    name: 'observe',
    outputs: [
      { name: 'tickCumulatives', type: 'int56[]' },
      { name: 'secondsPerLiquidityCumulativeX128s', type: 'uint160[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fee',
    outputs: [{ name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const UNISWAP_V3_FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const twapSymbols = [
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

export const BLOCKCHAIN_TO_CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  base: 8453,
  'bnb-chain': 56,
};

const CHAIN_ID_TO_BLOCKCHAIN: Record<number, string> = {
  1: 'ethereum',
  42161: 'arbitrum',
  10: 'optimism',
  137: 'polygon',
  8453: 'base',
  56: 'bnb-chain',
};

const TWAP_CHAIN_RELABILITY: Record<string, number> = {
  ethereum: 0.99,
  arbitrum: 0.98,
  optimism: 0.98,
  polygon: 0.97,
  base: 0.97,
  'bnb-chain': 0.95,
};
