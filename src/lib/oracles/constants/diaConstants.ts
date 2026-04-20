import { Blockchain } from '@/types/oracle';

export interface DIAAssetConfig {
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
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  WBTC: {
    symbol: 'WBTC',
    blockchain: 'Ethereum',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  USDC: {
    symbol: 'USDC',
    blockchain: 'Ethereum',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  USDT: {
    symbol: 'USDT',
    blockchain: 'Ethereum',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  DAI: {
    symbol: 'DAI',
    blockchain: 'Ethereum',
    address: '0x6B175474E89094C44Da98b954EescdeCB5b69aE',
  },
  LINK: {
    symbol: 'LINK',
    blockchain: 'Ethereum',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  },
  UNI: {
    symbol: 'UNI',
    blockchain: 'Ethereum',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },
  AAVE: {
    symbol: 'AAVE',
    blockchain: 'Ethereum',
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  },
  MKR: {
    symbol: 'MKR',
    blockchain: 'Ethereum',
    address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  },
  COMP: {
    symbol: 'COMP',
    blockchain: 'Ethereum',
    address: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
  },
  SNX: {
    symbol: 'SNX',
    blockchain: 'Ethereum',
    address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  },
  CRV: {
    symbol: 'CRV',
    blockchain: 'Ethereum',
    address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  },
  SUSHI: {
    symbol: 'SUSHI',
    blockchain: 'Ethereum',
    address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
  },
  YFI: {
    symbol: 'YFI',
    blockchain: 'Ethereum',
    address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
  },
  '1INCH': {
    symbol: '1INCH',
    blockchain: 'Ethereum',
    address: '0x111111111117DC0aa78b770fA6A738034120C302',
  },
  BAL: {
    symbol: 'BAL',
    blockchain: 'Ethereum',
    address: '0xba100000625a3754423978a60c9317c58a424e3D',
  },
  LDO: {
    symbol: 'LDO',
    blockchain: 'Ethereum',
    address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
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
    blockchain: 'Ethereum',
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
    address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
  },
  BUSD: {
    symbol: 'BUSD',
    blockchain: 'Ethereum',
    address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
  },
  STETH: {
    symbol: 'STETH',
    blockchain: 'Ethereum',
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  },
};

export function getDIAAssetConfig(symbol: string): DIAAssetConfig | null {
  return DIA_ASSET_MAPPING[symbol.toUpperCase()] || null;
}
