export const priceKeys = {
  all: ['price'] as const,
  bySymbol: (symbol: string) => [...priceKeys.all, symbol] as const,
  byProvider: (provider: string, symbol: string, chain: string) =>
    [...priceKeys.bySymbol(symbol), provider, chain] as const,
  historical: (provider: string, symbol: string, chain: string, period: string) =>
    [...priceKeys.byProvider(provider, symbol, chain), 'historical', period] as const,
};

export const crossChainKeys = {
  all: ['cross-chain'] as const,
  byProvider: (provider: string, symbol: string, period: string) =>
    [...crossChainKeys.all, provider, symbol, period] as const,
};
