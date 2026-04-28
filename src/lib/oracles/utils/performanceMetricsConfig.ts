import { type OracleProvider } from '@/types/oracle';

export interface ProviderPerformanceDefaults {
  responseTime: number;
  updateFrequency: number;
  accuracy: number;
  reliability: number;
  dataSources: number;
  decentralizationScore: number;
  supportedChains: number;
  marketShare: number;
  tvs: string;
  tvsValue: number;
  protocols: number;
  chains: number;
  aggregationMethod: 'median' | 'weighted_average' | 'simple_average' | 'unknown';
  hasOnChainVerification: boolean;
  primaryDataSources: string[];
}

export interface MemoryManagementConfig {
  enabled: boolean;
  maxAgeMs: number;
  maxSize: number;
  cleanupIntervalMs: number;
  warningThresholdBytes: number;
  enableDevWarnings: boolean;
}

export interface PerformanceMetricsConfig {
  defaults: Record<OracleProvider, ProviderPerformanceDefaults>;
  fallbackDefaults: ProviderPerformanceDefaults;
  calculation: {
    accuracyWindowMs: number;
    reliabilityWindowMs: number;
    updateFrequencyWindowMs: number;
    minSampleSize: number;
    maxHistorySize: number;
    referencePriceMaxTimeDiff: number;
  };
  cache: {
    enabled: boolean;
    ttlMs: number;
    maxSize: number;
  };
  memoryManagement: MemoryManagementConfig;
}

const DEFAULT_PROVIDER_CONFIG: PerformanceMetricsConfig = {
  defaults: {
    chainlink: {
      responseTime: 450,
      updateFrequency: 3600,
      accuracy: 99.8,
      reliability: 99.9,
      dataSources: 350,
      decentralizationScore: 95,
      supportedChains: 22,
      marketShare: 55,
      tvs: '$75B+',
      tvsValue: 75e9,
      protocols: 1200,
      chains: 22,
      aggregationMethod: 'median',
      hasOnChainVerification: true,
      primaryDataSources: ['binance', 'coinbase', 'kraken', 'bitstamp', 'gemini'],
    },
    pyth: {
      responseTime: 120,
      updateFrequency: 1,
      accuracy: 99.5,
      reliability: 99.8,
      dataSources: 180,
      decentralizationScore: 90,
      supportedChains: 12,
      marketShare: 18,
      tvs: '$15B+',
      tvsValue: 15e9,
      protocols: 350,
      chains: 12,
      aggregationMethod: 'weighted_average',
      hasOnChainVerification: true,
      primaryDataSources: ['binance', 'okx', 'bybit', 'coinbase', 'jump_trading'],
    },
    api3: {
      responseTime: 900,
      updateFrequency: 3600,
      accuracy: 98.9,
      reliability: 99.7,
      dataSources: 180,
      decentralizationScore: 80,
      supportedChains: 8,
      marketShare: 5,
      tvs: '$2B+',
      tvsValue: 2e9,
      protocols: 80,
      chains: 8,
      aggregationMethod: 'simple_average',
      hasOnChainVerification: true,
      primaryDataSources: ['coinbase', 'kraken', 'bitstamp', 'binance'],
    },
    redstone: {
      responseTime: 200,
      updateFrequency: 1,
      accuracy: 99.3,
      reliability: 99.8,
      dataSources: 120,
      decentralizationScore: 85,
      supportedChains: 8,
      marketShare: 4,
      tvs: '$1.5B+',
      tvsValue: 1.5e9,
      protocols: 60,
      chains: 8,
      aggregationMethod: 'median',
      hasOnChainVerification: true,
      primaryDataSources: ['binance', 'coinbase', 'coingecko', 'coinmarketcap'],
    },
    dia: {
      responseTime: 800,
      updateFrequency: 3600,
      accuracy: 98.8,
      reliability: 99.5,
      dataSources: 80,
      decentralizationScore: 75,
      supportedChains: 15,
      marketShare: 3,
      tvs: '$500M+',
      tvsValue: 5e8,
      protocols: 40,
      chains: 15,
      aggregationMethod: 'weighted_average',
      hasOnChainVerification: false,
      primaryDataSources: ['binance', 'coinbase', 'kraken', 'uniswap'],
    },
    winklink: {
      responseTime: 600,
      updateFrequency: 1800,
      accuracy: 98.5,
      reliability: 99.3,
      dataSources: 40,
      decentralizationScore: 70,
      supportedChains: 1,
      marketShare: 1,
      tvs: '$100M+',
      tvsValue: 1e8,
      protocols: 10,
      chains: 1,
      aggregationMethod: 'simple_average',
      hasOnChainVerification: false,
      primaryDataSources: ['binance', 'huobi'],
    },
    supra: {
      responseTime: 300,
      updateFrequency: 60,
      accuracy: 99.2,
      reliability: 99.7,
      dataSources: 100,
      decentralizationScore: 88,
      supportedChains: 20,
      marketShare: 3,
      tvs: '$800M+',
      tvsValue: 8e8,
      protocols: 50,
      chains: 20,
      aggregationMethod: 'median',
      hasOnChainVerification: true,
      primaryDataSources: ['binance', 'coinbase', 'kraken', 'okx'],
    },
    twap: {
      responseTime: 500,
      updateFrequency: 600,
      accuracy: 99.0,
      reliability: 99.5,
      dataSources: 22,
      decentralizationScore: 85,
      supportedChains: 6,
      marketShare: 2,
      tvs: '$300M+',
      tvsValue: 3e8,
      protocols: 25,
      chains: 6,
      aggregationMethod: 'weighted_average',
      hasOnChainVerification: true,
      primaryDataSources: ['uniswap', 'sushiswap', 'curve'],
    },
    reflector: {
      responseTime: 800,
      updateFrequency: 300,
      accuracy: 99.5,
      reliability: 99.0,
      dataSources: 7,
      decentralizationScore: 80,
      supportedChains: 1,
      marketShare: 0.5,
      tvs: '$50M+',
      tvsValue: 5e7,
      protocols: 5,
      chains: 1,
      aggregationMethod: 'simple_average',
      hasOnChainVerification: false,
      primaryDataSources: ['binance', 'coinbase'],
    },
    flare: {
      responseTime: 400,
      updateFrequency: 90,
      accuracy: 99.5,
      reliability: 99.8,
      dataSources: 100,
      decentralizationScore: 92,
      supportedChains: 1,
      marketShare: 2,
      tvs: '$400M+',
      tvsValue: 4e8,
      protocols: 30,
      chains: 1,
      aggregationMethod: 'median',
      hasOnChainVerification: true,
      primaryDataSources: ['binance', 'coinbase', 'kraken', 'coingecko'],
    },
  },
  fallbackDefaults: {
    responseTime: 600,
    updateFrequency: 3600,
    accuracy: 98.0,
    reliability: 99.0,
    dataSources: 50,
    decentralizationScore: 80,
    supportedChains: 5,
    marketShare: 1,
    tvs: '$100M+',
    tvsValue: 1e8,
    protocols: 15,
    chains: 5,
    aggregationMethod: 'unknown',
    hasOnChainVerification: false,
    primaryDataSources: ['binance', 'coinbase'],
  },
  calculation: {
    accuracyWindowMs: 24 * 60 * 60 * 1000,
    reliabilityWindowMs: 60 * 60 * 1000,
    updateFrequencyWindowMs: 60 * 60 * 1000,
    minSampleSize: 5,
    maxHistorySize: 1000,
    referencePriceMaxTimeDiff: 60000,
  },
  cache: {
    enabled: true,
    ttlMs: 60 * 1000,
    maxSize: 100,
  },
  memoryManagement: {
    enabled: true,
    maxAgeMs: 24 * 60 * 60 * 1000,
    maxSize: 500,
    cleanupIntervalMs: 5 * 60 * 1000,
    warningThresholdBytes: 50 * 1024 * 1024,
    enableDevWarnings: process.env.NODE_ENV === 'development',
  },
};

let currentConfig: PerformanceMetricsConfig = { ...DEFAULT_PROVIDER_CONFIG };

export function getPerformanceMetricsConfig(): PerformanceMetricsConfig {
  return currentConfig;
}

function setPerformanceMetricsConfig(config: Partial<PerformanceMetricsConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    defaults: {
      ...currentConfig.defaults,
      ...config.defaults,
    },
    calculation: {
      ...currentConfig.calculation,
      ...config.calculation,
    },
    cache: {
      ...currentConfig.cache,
      ...config.cache,
    },
    memoryManagement: {
      ...currentConfig.memoryManagement,
      ...config.memoryManagement,
    },
  };
}

function _resetPerformanceMetricsConfig(): void {
  currentConfig = { ...DEFAULT_PROVIDER_CONFIG };
}

export function getProviderDefaults(provider: OracleProvider): ProviderPerformanceDefaults {
  const config = getPerformanceMetricsConfig();
  return config.defaults[provider] || config.fallbackDefaults;
}

function _updateProviderDefaults(
  provider: OracleProvider,
  updates: Partial<ProviderPerformanceDefaults>
): void {
  const config = getPerformanceMetricsConfig();
  const currentDefaults = config.defaults[provider] || config.fallbackDefaults;

  setPerformanceMetricsConfig({
    defaults: {
      ...config.defaults,
      [provider]: {
        ...currentDefaults,
        ...updates,
      },
    },
  });
}
