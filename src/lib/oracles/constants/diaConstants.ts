import { ETHEREUM_TOKEN_ADDRESSES } from './ethereumTokenAddresses';

interface DIAAssetConfig {
  symbol: string;
  blockchain: string;
  address: string;
  decimals?: number;
}

const DIA_ASSET_MAPPING: Record<string, DIAAssetConfig> = {
  BTC: {
    symbol: 'BTC',
    blockchain: 'Bitcoin',
    address: '0x0000000000000000000000000000000000000000',
  },
  ETH: {
    symbol: 'ETH',
    blockchain: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
  },
  WETH: {
    symbol: 'WETH',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.WETH,
  },
  WBTC: {
    symbol: 'WBTC',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.WBTC,
  },
  USDC: {
    symbol: 'USDC',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.USDC,
  },
  USDT: {
    symbol: 'USDT',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.USDT,
  },
  DAI: {
    symbol: 'DAI',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.DAI,
  },
  LINK: {
    symbol: 'LINK',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.LINK,
  },
  UNI: {
    symbol: 'UNI',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.UNI,
  },
  AAVE: {
    symbol: 'AAVE',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.AAVE,
  },
  MKR: {
    symbol: 'MKR',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.MKR,
  },
  COMP: {
    symbol: 'COMP',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.COMP,
  },
  SNX: {
    symbol: 'SNX',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.SNX,
  },
  CRV: {
    symbol: 'CRV',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.CRV,
  },
  SUSHI: {
    symbol: 'SUSHI',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.SUSHI,
  },
  YFI: {
    symbol: 'YFI',
    blockchain: 'Ethereum',
    address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
  },
  '1INCH': {
    symbol: '1INCH',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES['1INCH'],
  },
  BAL: {
    symbol: 'BAL',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.BAL,
  },
  LDO: {
    symbol: 'LDO',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.LDO,
  },
  GMX: {
    symbol: 'GMX',
    blockchain: 'Arbitrum',
    address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
  },
  DYDX: {
    symbol: 'DYDX',
    blockchain: 'Ethereum',
    address: '0x92D6C1e31e14520e676a687F0a93788B716BEff5',
  },
  BNB: {
    symbol: 'BNB',
    blockchain: 'BinanceSmartChain',
    address: '0x0000000000000000000000000000000000000000',
  },
  SOL: {
    symbol: 'SOL',
    blockchain: 'Solana',
    address: '0x0000000000000000000000000000000000000000',
  },
  MATIC: {
    symbol: 'MATIC',
    blockchain: 'Polygon',
    address: '0x0000000000000000000000000000000000001010',
  },
  AVAX: {
    symbol: 'AVAX',
    blockchain: 'Avalanche',
    address: '0x0000000000000000000000000000000000000000',
  },
  ARB: {
    symbol: 'ARB',
    blockchain: 'Ethereum',
    address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1',
  },
  OP: {
    symbol: 'OP',
    blockchain: 'Optimism',
    address: '0x4200000000000000000000000000000000000042',
  },
  ATOM: {
    symbol: 'ATOM',
    blockchain: 'Cosmos',
    address: '0x0000000000000000000000000000000000000000',
  },
  DOT: {
    symbol: 'DOT',
    blockchain: 'Polkadot',
    address: '0x0000000000000000000000000000000000000000',
  },
  ADA: {
    symbol: 'ADA',
    blockchain: 'Cardano',
    address: '0x0000000000000000000000000000000000000000',
  },
  LTC: {
    symbol: 'LTC',
    blockchain: 'Litecoin',
    address: '0x0000000000000000000000000000000000000000',
  },
  BCH: {
    symbol: 'BCH',
    blockchain: 'BitcoinCash',
    address: '0x0000000000000000000000000000000000000000',
  },
  ETC: {
    symbol: 'ETC',
    blockchain: 'EthereumClassic',
    address: '0x0000000000000000000000000000000000000000',
  },
  XLM: {
    symbol: 'XLM',
    blockchain: 'Stellar',
    address: '0x0000000000000000000000000000000000000000',
  },
  FIL: {
    symbol: 'FIL',
    blockchain: 'Filecoin',
    address: '0x0000000000000000000000000000000000000000',
  },
  NEAR: {
    symbol: 'NEAR',
    blockchain: 'NEAR',
    address: '0x0000000000000000000000000000000000000000',
  },
  FRAX: {
    symbol: 'FRAX',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.FRAX,
  },
  BUSD: {
    symbol: 'BUSD',
    blockchain: 'Ethereum',
    address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
  },
  STETH: {
    symbol: 'STETH',
    blockchain: 'Ethereum',
    address: ETHEREUM_TOKEN_ADDRESSES.STETH,
  },
};

export function getDIAAssetConfig(symbol: string): DIAAssetConfig | null {
  return DIA_ASSET_MAPPING[symbol.toUpperCase()] || null;
}
