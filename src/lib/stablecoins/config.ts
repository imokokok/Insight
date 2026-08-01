import { Blockchain, OracleProvider } from '@/types/oracle';

export type StablecoinSymbol = 'USDC' | 'USDT' | 'DAI' | 'FRAX' | 'LUSD' | 'USDD';

export type DexName = 'uniswap-v3' | 'curve';

export interface DexPoolConfig {
  dexName: DexName;
  poolAddress: string;
  chain: Blockchain;
  chainId: number;
  token0Symbol: string;
  token1Symbol: string;
  feeTier?: number;
  poolType?: string;
  /** For Curve: token indices in the pool */
  tokenInIndex?: number;
  tokenOutIndex?: number;
}

interface StablecoinPriceSource {
  symbol: StablecoinSymbol;
  provider: OracleProvider;
  chain: Blockchain;
  displayName: string;
}

interface StablecoinConfig {
  symbol: StablecoinSymbol;
  displayName: string;
  targetPeg: number;
  sources: StablecoinPriceSource[];
  dexPools: DexPoolConfig[];
}

export const STABLECOINS: StablecoinConfig[] = [
  {
    symbol: 'USDC',
    displayName: 'USD Coin',
    targetPeg: 1,
    sources: [
      {
        symbol: 'USDC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.API3,
        chain: Blockchain.ETHEREUM,
        displayName: 'API3 @ Ethereum',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.REDSTONE,
        chain: Blockchain.ETHEREUM,
        displayName: 'RedStone @ Ethereum',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.TWAP,
        chain: Blockchain.ETHEREUM,
        displayName: 'Uniswap V3 TWAP @ Ethereum',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ARBITRUM,
        displayName: 'Chainlink @ Arbitrum',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.BASE,
        displayName: 'Chainlink @ Base',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.OPTIMISM,
        displayName: 'Chainlink @ Optimism',
      },
      {
        symbol: 'USDC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.POLYGON,
        displayName: 'Chainlink @ Polygon',
      },
    ],
    dexPools: [
      {
        dexName: 'uniswap-v3',
        poolAddress: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C6',
        chain: Blockchain.ETHEREUM,
        chainId: 1,
        token0Symbol: 'USDC',
        token1Symbol: 'USDT',
        feeTier: 500,
      },
      {
        dexName: 'curve',
        poolAddress: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
        chain: Blockchain.ETHEREUM,
        chainId: 1,
        token0Symbol: 'USDC',
        token1Symbol: 'USDT',
        poolType: 'stableswap',
        tokenInIndex: 1,
        tokenOutIndex: 2,
      },
    ],
  },
  {
    symbol: 'USDT',
    displayName: 'Tether USD',
    targetPeg: 1,
    sources: [
      {
        symbol: 'USDT',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'USDT',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
      {
        symbol: 'USDT',
        provider: OracleProvider.TWAP,
        chain: Blockchain.ETHEREUM,
        displayName: 'Uniswap V3 TWAP @ Ethereum',
      },
      {
        symbol: 'USDT',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ARBITRUM,
        displayName: 'Chainlink @ Arbitrum',
      },
      {
        symbol: 'USDT',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.BASE,
        displayName: 'Chainlink @ Base',
      },
      {
        symbol: 'USDT',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.OPTIMISM,
        displayName: 'Chainlink @ Optimism',
      },
      {
        symbol: 'USDT',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.BNB_CHAIN,
        displayName: 'Chainlink @ BNB Chain',
      },
    ],
    dexPools: [
      {
        dexName: 'uniswap-v3',
        poolAddress: '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36',
        chain: Blockchain.ETHEREUM,
        chainId: 1,
        token0Symbol: 'USDT',
        token1Symbol: 'WETH',
        feeTier: 3000,
      },
      {
        dexName: 'curve',
        poolAddress: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
        chain: Blockchain.ETHEREUM,
        chainId: 1,
        token0Symbol: 'USDT',
        token1Symbol: 'USDC',
        poolType: 'stableswap',
        tokenInIndex: 2,
        tokenOutIndex: 1,
      },
    ],
  },
  {
    symbol: 'DAI',
    displayName: 'Dai Stablecoin',
    targetPeg: 1,
    sources: [
      {
        symbol: 'DAI',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'DAI',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
      {
        symbol: 'DAI',
        provider: OracleProvider.TWAP,
        chain: Blockchain.ETHEREUM,
        displayName: 'Uniswap V3 TWAP @ Ethereum',
      },
      {
        symbol: 'DAI',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ARBITRUM,
        displayName: 'Chainlink @ Arbitrum',
      },
      {
        symbol: 'DAI',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.OPTIMISM,
        displayName: 'Chainlink @ Optimism',
      },
      {
        symbol: 'DAI',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.POLYGON,
        displayName: 'Chainlink @ Polygon',
      },
    ],
    dexPools: [
      {
        dexName: 'uniswap-v3',
        poolAddress: '0x6c6Bc977E13Df9b0de53b251522280BB72383700',
        chain: Blockchain.ETHEREUM,
        chainId: 1,
        token0Symbol: 'DAI',
        token1Symbol: 'USDC',
        feeTier: 500,
      },
      {
        dexName: 'curve',
        poolAddress: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
        chain: Blockchain.ETHEREUM,
        chainId: 1,
        token0Symbol: 'DAI',
        token1Symbol: 'USDC',
        poolType: 'stableswap',
        tokenInIndex: 0,
        tokenOutIndex: 1,
      },
    ],
  },
  {
    symbol: 'FRAX',
    displayName: 'Frax',
    targetPeg: 1,
    sources: [
      {
        symbol: 'FRAX',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'FRAX',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
    ],
    dexPools: [
      {
        dexName: 'uniswap-v3',
        poolAddress: '0xc63B0708E2F7e69CB8A1df0e1389A98C35A76D52',
        chain: Blockchain.ETHEREUM,
        chainId: 1,
        token0Symbol: 'FRAX',
        token1Symbol: 'USDC',
        feeTier: 500,
      },
      // The Curve FRAX/USDC entry used address 0xDcEF968d... which is not a
      // valid Curve StableSwap pool (get_virtual_price returns empty), causing
      // every get_dy call to revert. Removed until a verified Curve FRAX pool
      // address is available; FRAX still has the Uniswap V3 market source above.
    ],
  },
  {
    symbol: 'LUSD',
    displayName: 'Liquity USD',
    targetPeg: 1,
    sources: [
      {
        symbol: 'LUSD',
        // Chainlink's LUSD/USD feed only exists on Arbitrum (chainId 42161),
        // not on Ethereum mainnet — referencing Ethereum here always fails the
        // active-feed check. Use Arbitrum where the feed is actually deployed.
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ARBITRUM,
        displayName: 'Chainlink @ Arbitrum',
      },
      {
        symbol: 'LUSD',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
    ],
    // LUSD's Curve "metapool" pairs LUSD with 3CRV (the 3pool LP token), not
    // USDC directly. getStablecoinPrice(symbol, 'USDC') can therefore never
    // match this pool (3POOL ≠ USDC), so the dexPool entry was non-functional.
    // LUSD is tracked via oracles only (Chainlink @ Arbitrum + Pyth).
    dexPools: [],
  },
  {
    symbol: 'USDD',
    displayName: 'USDD',
    targetPeg: 1,
    sources: [
      {
        // Chainlink has no USDD/USD feed on any chain. USDD is tracked via
        // Pyth (chain-agnostic, USDD/USD price ID in pythConstants) plus the
        // Curve USDD/3pool DEX price below.
        symbol: 'USDD',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
    ],
    // The USDD/3pool Curve address (0x42d1...) is dead — get_virtual_price
    // returns empty, so every get_dy call reverts. Removed; USDD is tracked
    // via Pyth only until a verified Curve USDD pool is available.
    dexPools: [],
  },
];

export function getStablecoinConfig(symbol: string): StablecoinConfig | undefined {
  return STABLECOINS.find((s) => s.symbol === symbol);
}
