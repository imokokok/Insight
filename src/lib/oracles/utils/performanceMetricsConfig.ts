import { type OracleProvider } from '@/types/oracle';

export interface ProviderPerformanceDefaults {
  responseTime: number;
  updateFrequency: number;
  accuracy: number;
  reliability: number;
  dataSources: number;
  decentralizationScore: number;
  supportedChains: number;
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
      supportedChains: 15,
    },
    pyth: {
      responseTime: 120,
      updateFrequency: 1,
      accuracy: 99.5,
      reliability: 99.8,
      dataSources: 180,
      decentralizationScore: 90,
      supportedChains: 10,
    },
    api3: {
      responseTime: 900,
      updateFrequency: 3600,
      accuracy: 98.9,
      reliability: 99.7,
      dataSources: 168,
      decentralizationScore: 80,
      supportedChains: 5,
    },
    redstone: {
      responseTime: 200,
      updateFrequency: 1,
      accuracy: 99.3,
      reliability: 99.8,
      dataSources: 120,
      decentralizationScore: 85,
      supportedChains: 6,
    },
    dia: {
      responseTime: 800,
      updateFrequency: 3600,
      accuracy: 98.8,
      reliability: 99.5,
      dataSources: 80,
      decentralizationScore: 75,
      supportedChains: 12,
    },
    winklink: {
      responseTime: 600,
      updateFrequency: 1800,
      accuracy: 98.5,
      reliability: 99.3,
      dataSources: 40,
      decentralizationScore: 70,
      supportedChains: 1,
    },
    supra: {
      responseTime: 300,
      updateFrequency: 60,
      accuracy: 99.2,
      reliability: 99.7,
      dataSources: 100,
      decentralizationScore: 88,
      supportedChains: 30,
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

export function setPerformanceMetricsConfig(config: Partial<PerformanceMetricsConfig>): void {
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

export function resetPerformanceMetricsConfig(): void {
  currentConfig = { ...DEFAULT_PROVIDER_CONFIG };
}

export function getProviderDefaults(provider: OracleProvider): ProviderPerformanceDefaults {
  const config = getPerformanceMetricsConfig();
  return config.defaults[provider] || config.fallbackDefaults;
}

export function updateProviderDefaults(
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
