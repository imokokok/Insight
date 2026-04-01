/**
 * API3 数据获取策略配置
 * 定义不同数据类型的获取优先级和数据源
 */

export type DataSourceType = 'on-chain' | 'api' | 'mixed';
export type DataPriority = 'on-chain-only' | 'on-chain-primary' | 'api-primary' | 'api-only';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DataStrategy {
  /** 数据类型标识 */
  dataType: string;
  /** 获取优先级策略 */
  priority: DataPriority;
  /** 首选数据源 */
  primarySource: DataSourceType;
  /** 备用数据源 */
  fallbackSource?: DataSourceType;
  /** 数据新鲜度要求（毫秒） */
  freshnessThreshold: number;
  /** 是否需要缓存 */
  enableCache: boolean;
  /** 缓存时间（毫秒） */
  cacheTTL: number;
}

export interface DataSourceInfo {
  source: DataSourceType;
  timestamp: number;
  confidence: ConfidenceLevel;
  latency: number;
  error?: string;
}

/**
 * API3 数据获取策略配置
 */
export const API3_DATA_STRATEGIES: Record<string, DataStrategy> = {
  // 质押数据 - 必须准确，优先链上
  staking: {
    dataType: 'staking',
    priority: 'on-chain-only',
    primarySource: 'on-chain',
    freshnessThreshold: 60000, // 1分钟
    enableCache: true,
    cacheTTL: 30000, // 30秒
  },

  // Coverage Pool 数据 - 资金安全相关，优先链上
  coveragePool: {
    dataType: 'coveragePool',
    priority: 'on-chain-primary',
    primarySource: 'on-chain',
    fallbackSource: 'api',
    freshnessThreshold: 120000, // 2分钟
    enableCache: true,
    cacheTTL: 60000, // 1分钟
  },

  // Token 数据 - 链上最准确
  token: {
    dataType: 'token',
    priority: 'on-chain-only',
    primarySource: 'on-chain',
    freshnessThreshold: 300000, // 5分钟
    enableCache: true,
    cacheTTL: 120000, // 2分钟
  },

  // dAPI Market 数据 - 数据量大，API 更高效
  dapis: {
    dataType: 'dapis',
    priority: 'api-primary',
    primarySource: 'api',
    fallbackSource: 'on-chain',
    freshnessThreshold: 30000, // 30秒
    enableCache: true,
    cacheTTL: 15000, // 15秒
  },

  // Airnode 网络统计 - API 数据更丰富
  airnodeStats: {
    dataType: 'airnodeStats',
    priority: 'api-primary',
    primarySource: 'api',
    fallbackSource: 'on-chain',
    freshnessThreshold: 300000, // 5分钟
    enableCache: true,
    cacheTTL: 120000, // 2分钟
  },

  // dAPI 覆盖率 - API 数据更完整
  dapiCoverage: {
    dataType: 'dapiCoverage',
    priority: 'api-primary',
    primarySource: 'api',
    fallbackSource: 'on-chain',
    freshnessThreshold: 600000, // 10分钟
    enableCache: true,
    cacheTTL: 300000, // 5分钟
  },

  // 价格偏差 - 需要实时对比，优先 API
  priceDeviations: {
    dataType: 'priceDeviations',
    priority: 'api-primary',
    primarySource: 'api',
    fallbackSource: 'on-chain',
    freshnessThreshold: 60000, // 1分钟
    enableCache: true,
    cacheTTL: 30000, // 30秒
  },

  // 数据源可追溯性 - API 数据更详细
  dataSources: {
    dataType: 'dataSources',
    priority: 'api-primary',
    primarySource: 'api',
    fallbackSource: 'mixed',
    freshnessThreshold: 600000, // 10分钟
    enableCache: true,
    cacheTTL: 300000, // 5分钟
  },

  // OEV 数据 - 只能通过 API 获取
  oev: {
    dataType: 'oev',
    priority: 'api-only',
    primarySource: 'api',
    freshnessThreshold: 300000, // 5分钟
    enableCache: true,
    cacheTTL: 120000, // 2分钟
  },

  // 第一方预言机数据 - API 数据更完整
  firstParty: {
    dataType: 'firstParty',
    priority: 'api-primary',
    primarySource: 'api',
    fallbackSource: 'mixed',
    freshnessThreshold: 600000, // 10分钟
    enableCache: true,
    cacheTTL: 300000, // 5分钟
  },
};

/**
 * 根据数据类型获取策略
 */
export function getDataStrategy(dataType: string): DataStrategy {
  return (
    API3_DATA_STRATEGIES[dataType] || {
      dataType,
      priority: 'api-primary',
      primarySource: 'api',
      freshnessThreshold: 300000,
      enableCache: true,
      cacheTTL: 120000,
    }
  );
}

/**
 * 判断是否应该使用链上数据源
 */
export function shouldUseOnChain(strategy: DataStrategy): boolean {
  return (
    strategy.priority === 'on-chain-only' ||
    strategy.priority === 'on-chain-primary' ||
    strategy.primarySource === 'on-chain'
  );
}

/**
 * 判断是否应该使用 API 数据源
 */
export function shouldUseAPI(strategy: DataStrategy): boolean {
  return (
    strategy.priority === 'api-only' ||
    strategy.priority === 'api-primary' ||
    strategy.primarySource === 'api'
  );
}

/**
 * 计算数据置信度
 */
export function calculateConfidence(
  strategy: DataStrategy,
  primarySuccess: boolean,
  fallbackSuccess?: boolean
): ConfidenceLevel {
  if (strategy.priority === 'on-chain-only' || strategy.priority === 'api-only') {
    return primarySuccess ? 'high' : 'low';
  }

  if (primarySuccess && fallbackSuccess) {
    return 'high';
  }

  if (primarySuccess) {
    return 'medium';
  }

  if (fallbackSuccess) {
    return 'medium';
  }

  return 'low';
}

/**
 * 创建数据源信息
 */
export function createDataSourceInfo(
  source: DataSourceType,
  startTime: number,
  error?: string
): DataSourceInfo {
  return {
    source,
    timestamp: Date.now(),
    confidence: error ? 'low' : 'high',
    latency: Date.now() - startTime,
    error,
  };
}
