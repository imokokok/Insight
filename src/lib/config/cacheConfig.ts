export const CACHE_CONFIG = {
  api3: {
    price: {
      staleTime: 30 * 1000,
      gcTime: 60 * 1000,
      refetchInterval: 30 * 1000,
    },
    historical: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
    airnodeStats: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    dapiCoverage: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
    staking: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    oev: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    alerts: {
      staleTime: 15 * 1000,
      gcTime: 30 * 1000,
      refetchInterval: 15 * 1000,
    },
    coveragePool: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    firstParty: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
    latency: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    quality: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    deviations: {
      staleTime: 30 * 1000,
      gcTime: 60 * 1000,
      refetchInterval: 30 * 1000,
    },
    sourceTrace: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
    coverageEvents: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    gasFees: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
    ohlc: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
    qualityHistory: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
    crossOracle: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
    },
    alertHistory: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: undefined,
    },
    alertThresholds: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: undefined,
    },
    oevAuctions: {
      staleTime: 30 * 1000,
      gcTime: 60 * 1000,
      refetchInterval: 30 * 1000,
    },
    coveragePoolDetails: {
      staleTime: 30 * 1000,
      gcTime: 60 * 1000,
      refetchInterval: 30 * 1000,
    },
    coveragePoolClaims: {
      staleTime: 30 * 1000,
      gcTime: 60 * 1000,
      refetchInterval: 30 * 1000,
    },
    stakerRewards: {
      staleTime: 60 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchInterval: 60 * 1000,
    },
  },
  offline: {
    maxAge: 24 * 60 * 60 * 1000,
    maxSize: 50 * 1024 * 1024,
    criticalDataTypes: ['price', 'alerts', 'airnodeStats'],
  },
  incremental: {
    batchSize: 10,
    minUpdateInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
  },
} as const;

export type API3CacheConfigType = keyof typeof CACHE_CONFIG.api3;
export type CacheConfig = typeof CACHE_CONFIG;
