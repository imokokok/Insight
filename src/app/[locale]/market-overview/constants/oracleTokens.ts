import { OracleProvider } from '@/types/oracle';

export interface OracleToken {
  symbol: string;
  name: string;
  provider: OracleProvider;
  chainId: number;
  contractAddress?: string;
  logoUrl?: string;
  decimals: number;
}

export const ORACLE_TOKENS: OracleToken[] = [
  {
    symbol: 'LINK',
    name: 'Chainlink Token',
    provider: OracleProvider.CHAINLINK,
    chainId: 1,
    contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    logoUrl: '/logos/oracles/chainlink.svg',
    decimals: 18,
  },
  {
    symbol: 'PYTH',
    name: 'Pyth Network',
    provider: OracleProvider.PYTH,
    chainId: 1,
    contractAddress: '0xE4D5c6aE46C3f6272C3e68E07E4aE6d6a3a3e0e3',
    logoUrl: '/logos/oracles/pyth.svg',
    decimals: 6,
  },
  {
    symbol: 'API3',
    name: 'API3 Token',
    provider: OracleProvider.API3,
    chainId: 1,
    contractAddress: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
    logoUrl: '/logos/oracles/api3.svg',
    decimals: 18,
  },
  {
    symbol: 'REDSTONE',
    name: 'RedStone Token',
    provider: OracleProvider.REDSTONE,
    chainId: 1,
    logoUrl: '/logos/oracles/redstone.svg',
    decimals: 18,
  },
  {
    symbol: 'DIA',
    name: 'DIA Token',
    provider: OracleProvider.DIA,
    chainId: 1,
    contractAddress: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
    logoUrl: '/logos/oracles/dia.svg',
    decimals: 18,
  },
  {
    symbol: 'WIN',
    name: 'WIN Token',
    provider: OracleProvider.WINKLINK,
    chainId: 728126428,
    contractAddress: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
    logoUrl: '/logos/oracles/winklink.svg',
    decimals: 6,
  },
];

export const getOracleTokenBySymbol = (symbol: string): OracleToken | undefined => {
  return ORACLE_TOKENS.find((token) => token.symbol.toLowerCase() === symbol.toLowerCase());
};

export const getOracleTokensByProvider = (provider: OracleProvider): OracleToken[] => {
  return ORACLE_TOKENS.filter((token) => token.provider === provider);
};

export const getOracleTokenByProviderAndSymbol = (
  provider: OracleProvider,
  symbol: string
): OracleToken | undefined => {
  return ORACLE_TOKENS.find(
    (token) => token.provider === provider && token.symbol.toLowerCase() === symbol.toLowerCase()
  );
};
