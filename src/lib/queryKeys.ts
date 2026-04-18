export const priceKeys = {
  all: ['price'] as const,
  byProvider: (provider: string, symbol: string, chain: string) =>
    [...priceKeys.all, provider, symbol, chain] as const,
  historical: (provider: string, symbol: string, chain: string, period: string) =>
    [...priceKeys.all, 'historical', provider, symbol, chain, period] as const,
};

export const crossChainKeys = {
  all: ['cross-chain'] as const,
  byProvider: (provider: string, symbol: string, period: string) =>
    [...crossChainKeys.all, provider, symbol, period] as const,
};

export const crossOracleKeys = {
  all: ['cross-oracle'] as const,
  bySymbol: (symbol: string, period: string) =>
    [...crossOracleKeys.all, 'bySymbol', symbol, period] as const,
  byProvider: (provider: string, symbol: string, period: string) =>
    [...crossOracleKeys.all, 'byProvider', provider, symbol, period] as const,
};
