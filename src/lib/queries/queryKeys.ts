export const oracleKeys = {
  all: ['oracles'] as const,
  lists: () => [...oracleKeys.all, 'list'] as const,
  list: (params: { provider?: string; symbols?: string[]; chain?: string }) =>
    [...oracleKeys.lists(), params] as const,
  details: () => [...oracleKeys.all, 'detail'] as const,
  detail: (provider: string) => [...oracleKeys.details(), provider] as const,
};

const priceKeys = {
  all: ['prices'] as const,
  lists: () => [...priceKeys.all, 'list'] as const,
  list: (params: { provider?: string; symbols?: string[]; chain?: string }) =>
    [...priceKeys.lists(), params] as const,
  histories: () => [...priceKeys.all, 'history'] as const,
  history: (params: { symbol: string; provider?: string; chain?: string; period?: number }) =>
    [...priceKeys.histories(), params] as const,
};

const networkKeys = {
  all: ['network'] as const,
  status: () => [...networkKeys.all, 'status'] as const,
  stats: () => [...networkKeys.all, 'stats'] as const,
};

const favoritesKeys = {
  all: ['favorites'] as const,
  list: (userId: string) => [...favoritesKeys.all, userId] as const,
  byType: (userId: string, configType: string) =>
    [...favoritesKeys.list(userId), configType] as const,
};

const alertsKeys = {
  all: ['alerts'] as const,
  list: (userId: string) => [...alertsKeys.all, userId] as const,
  events: (userId: string) => [...alertsKeys.all, 'events', userId] as const,
};

const api3Keys = {
  all: ['api3'] as const,
  price: (symbol: string, chain?: string) =>
    [...api3Keys.all, 'price', symbol, chain ?? 'default'] as const,
  historical: (symbol: string, timeRange: string, chain?: string) =>
    [...api3Keys.all, 'historical', symbol, timeRange, chain ?? 'default'] as const,
  dapiCoverage: () => [...api3Keys.all, 'dapi-coverage'] as const,
  stakingData: () => [...api3Keys.all, 'staking-data'] as const,
  airnodeStats: () => [...api3Keys.all, 'airnode-stats'] as const,
  qualityMetrics: () => [...api3Keys.all, 'quality-metrics'] as const,
  latencyDistribution: () => [...api3Keys.all, 'latency-distribution'] as const,
};

const queryKeys = {
  oracle: oracleKeys,
  price: priceKeys,
  network: networkKeys,
  favorites: favoritesKeys,
  alerts: alertsKeys,
  api3: api3Keys,
} as const;

type OracleListParams = Parameters<typeof oracleKeys.list>[0];
type PriceHistoryParams = Parameters<typeof priceKeys.history>[0];
type PriceListParams = Parameters<typeof priceKeys.list>[0];
