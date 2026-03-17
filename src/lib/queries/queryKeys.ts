export const oracleKeys = {
  all: ['oracles'] as const,
  lists: () => [...oracleKeys.all, 'list'] as const,
  list: (params: { provider?: string; symbols?: string[]; chain?: string }) =>
    [...oracleKeys.lists(), params] as const,
  details: () => [...oracleKeys.all, 'detail'] as const,
  detail: (provider: string) => [...oracleKeys.details(), provider] as const,
};

export const priceKeys = {
  all: ['prices'] as const,
  lists: () => [...priceKeys.all, 'list'] as const,
  list: (params: { provider?: string; symbols?: string[]; chain?: string }) =>
    [...priceKeys.lists(), params] as const,
  histories: () => [...priceKeys.all, 'history'] as const,
  history: (params: { symbol: string; provider?: string; chain?: string; period?: number }) =>
    [...priceKeys.histories(), params] as const,
};

export const networkKeys = {
  all: ['network'] as const,
  status: () => [...networkKeys.all, 'status'] as const,
  stats: () => [...networkKeys.all, 'stats'] as const,
};

export const queryKeys = {
  oracle: oracleKeys,
  price: priceKeys,
  network: networkKeys,
} as const;

export type OracleListParams = Parameters<typeof oracleKeys.list>[0];
export type PriceHistoryParams = Parameters<typeof priceKeys.history>[0];
export type PriceListParams = Parameters<typeof priceKeys.list>[0];
