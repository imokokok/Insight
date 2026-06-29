import { Blockchain, OracleProvider } from '@/types/oracle';

export type StablecoinSymbol = 'USDC' | 'USDT' | 'DAI' | 'FRAX' | 'LUSD' | 'USDD';

export interface StablecoinPriceSource {
  symbol: StablecoinSymbol;
  provider: OracleProvider;
  chain: Blockchain;
  displayName: string;
}

export interface StablecoinConfig {
  symbol: StablecoinSymbol;
  displayName: string;
  targetPeg: number;
  sources: StablecoinPriceSource[];
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
  },
  {
    symbol: 'LUSD',
    displayName: 'Liquity USD',
    targetPeg: 1,
    sources: [
      {
        symbol: 'LUSD',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'LUSD',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
    ],
  },
  {
    symbol: 'USDD',
    displayName: 'USDD',
    targetPeg: 1,
    sources: [
      {
        symbol: 'USDD',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'USDD',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
    ],
  },
];

export function getStablecoinConfig(symbol: string): StablecoinConfig | undefined {
  return STABLECOINS.find((s) => s.symbol === symbol);
}
