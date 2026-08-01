import { Blockchain, OracleProvider } from '@/types/oracle';

type WrappedAssetType = 'wrapped-btc' | 'wrapped-eth' | 'lst-eth';

interface WrappedAssetPriceSource {
  symbol: string;
  provider: OracleProvider;
  chain: Blockchain;
  displayName: string;
}

interface ExchangeRateConfig {
  provider: OracleProvider;
  chain: Blockchain;
  displayName: string;
}

interface WrappedAssetConfig {
  symbol: string;
  type: WrappedAssetType;
  displayName: string;
  underlyingSymbol: string;
  exchangeRate?: ExchangeRateConfig;
  priceSources: WrappedAssetPriceSource[];
}

export const WRAPPED_ASSETS: WrappedAssetConfig[] = [
  {
    symbol: 'WBTC',
    type: 'wrapped-btc',
    displayName: 'Wrapped Bitcoin',
    underlyingSymbol: 'BTC',
    priceSources: [
      {
        symbol: 'WBTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'WBTC',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
      {
        symbol: 'WBTC',
        provider: OracleProvider.TWAP,
        chain: Blockchain.ETHEREUM,
        displayName: 'Uniswap V3 TWAP @ Ethereum',
      },
      {
        symbol: 'WBTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ARBITRUM,
        displayName: 'Chainlink @ Arbitrum',
      },
      {
        symbol: 'WBTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.BASE,
        displayName: 'Chainlink @ Base',
      },
      {
        symbol: 'WBTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.OPTIMISM,
        displayName: 'Chainlink @ Optimism',
      },
    ],
  },
  {
    symbol: 'wstETH',
    type: 'lst-eth',
    displayName: 'Wrapped Staked ETH',
    underlyingSymbol: 'ETH',
    exchangeRate: {
      provider: OracleProvider.CHAINLINK,
      chain: Blockchain.ETHEREUM,
      displayName: 'Chainlink wstETH/stETH rate @ Ethereum',
    },
    priceSources: [
      {
        symbol: 'WSTETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'WSTETH',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
      {
        symbol: 'WSTETH',
        provider: OracleProvider.TWAP,
        chain: Blockchain.ETHEREUM,
        displayName: 'Uniswap V3 TWAP @ Ethereum',
      },
      {
        symbol: 'WSTETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ARBITRUM,
        displayName: 'Chainlink @ Arbitrum',
      },
      {
        symbol: 'WSTETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.OPTIMISM,
        displayName: 'Chainlink @ Optimism',
      },
      {
        symbol: 'WSTETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.POLYGON,
        displayName: 'Chainlink @ Polygon',
      },
    ],
  },
  {
    symbol: 'cbETH',
    type: 'lst-eth',
    displayName: 'Coinbase Staked ETH',
    underlyingSymbol: 'ETH',
    exchangeRate: {
      provider: OracleProvider.CHAINLINK,
      chain: Blockchain.ETHEREUM,
      displayName: 'Chainlink cbETH/ETH rate @ Ethereum',
    },
    priceSources: [
      {
        symbol: 'CBETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'CBETH',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
      {
        symbol: 'CBETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.BASE,
        displayName: 'Chainlink @ Base',
      },
    ],
  },
  {
    symbol: 'BTCB',
    type: 'wrapped-btc',
    displayName: 'BNB Chain Pegged Bitcoin',
    underlyingSymbol: 'BTC',
    priceSources: [
      {
        symbol: 'BTCB',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.BNB_CHAIN,
        displayName: 'Chainlink @ BNB Chain',
      },
      {
        symbol: 'BTCB',
        provider: OracleProvider.PYTH,
        chain: Blockchain.BNB_CHAIN,
        displayName: 'Pyth @ BNB Chain',
      },
    ],
  },
  {
    // STETH is the base LST; we compare its USD price directly to ETH/USD,
    // so it behaves like a 1:1 pegged asset (no exchange-rate conversion).
    symbol: 'STETH',
    type: 'wrapped-eth',
    displayName: 'Lido Staked ETH',
    underlyingSymbol: 'ETH',
    priceSources: [
      {
        symbol: 'STETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'STETH',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ARBITRUM,
        displayName: 'Chainlink @ Arbitrum',
      },
      {
        symbol: 'STETH',
        provider: OracleProvider.PYTH,
        chain: Blockchain.ETHEREUM,
        displayName: 'Pyth @ Ethereum',
      },
    ],
  },
  {
    symbol: 'cbBTC',
    type: 'wrapped-btc',
    displayName: 'Coinbase Wrapped Bitcoin',
    underlyingSymbol: 'BTC',
    priceSources: [
      {
        symbol: 'CBBTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
      {
        symbol: 'CBBTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.BASE,
        displayName: 'Chainlink @ Base',
      },
    ],
  },
  {
    symbol: 'tBTC',
    type: 'wrapped-btc',
    displayName: 'Threshold Bitcoin',
    underlyingSymbol: 'BTC',
    priceSources: [
      {
        symbol: 'TBTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
        displayName: 'Chainlink @ Ethereum',
      },
    ],
  },
];

export function getWrappedAssetConfig(symbol: string): WrappedAssetConfig | undefined {
  return WRAPPED_ASSETS.find((a) => a.symbol === symbol);
}
