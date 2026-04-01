/**
 * React Query 全局配置
 * 优化数据获取性能和缓存策略
 */

// 缓存时间配置 (毫秒)
export const STALE_TIME = {
  // 实时价格数据 - 30秒
  PRICE: 30 * 1000,
  // 历史数据 - 5分钟
  HISTORY: 5 * 60 * 1000,
  // 网络/节点数据 - 1分钟
  NETWORK: 60 * 1000,
  // 统计数据 - 2分钟
  STATS: 2 * 60 * 1000,
  // 配置数据 - 10分钟
  CONFIG: 10 * 60 * 1000,
  // 静态数据 - 30分钟
  STATIC: 30 * 60 * 1000,
  // 用户数据 - 1分钟
  USER: 60 * 1000,
  // 默认 - 30秒
  DEFAULT: 30 * 1000,
} as const;

// 垃圾回收时间配置 (毫秒)
export const GC_TIME = {
  // 价格数据 - 5分钟
  PRICE: 5 * 60 * 1000,
  // 历史数据 - 10分钟
  HISTORY: 10 * 60 * 1000,
  // 网络数据 - 5分钟
  NETWORK: 5 * 60 * 1000,
  // 统计数据 - 10分钟
  STATS: 10 * 60 * 1000,
  // 配置数据 - 30分钟
  CONFIG: 30 * 60 * 1000,
  // 静态数据 - 60分钟
  STATIC: 60 * 60 * 1000,
  // 用户数据 - 10分钟
  USER: 10 * 60 * 1000,
  // 默认 - 5分钟
  DEFAULT: 5 * 60 * 1000,
} as const;

// 重试配置
export const RETRY_CONFIG = {
  // 最大重试次数
  MAX_RETRIES: 3,
  // 重试延迟 (指数退避)
  RETRY_DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

// 轮询配置
export const REFETCH_CONFIG = {
  // 价格数据轮询间隔
  PRICE_INTERVAL: 30 * 1000,
  // 统计数据轮询间隔
  STATS_INTERVAL: 60 * 1000,
  // 网络数据轮询间隔
  NETWORK_INTERVAL: 60 * 1000,
  // 警报数据轮询间隔
  ALERTS_INTERVAL: 15 * 1000,
} as const;

// 窗口聚焦重新获取配置
export const WINDOW_FOCUS_CONFIG = {
  // 价格数据在窗口聚焦时重新获取
  PRICE: true,
  // 历史数据在窗口聚焦时不重新获取
  HISTORY: false,
  // 网络数据在窗口聚焦时重新获取
  NETWORK: true,
  // 用户数据在窗口聚焦时重新获取
  USER: true,
  // 默认
  DEFAULT: false,
} as const;

// 预取配置
export const PREFETCH_CONFIG = {
  // 悬停预取延迟
  HOVER_DELAY: 150,
  // 路由预取延迟
  ROUTE_DELAY: 100,
  // 最大并发预取数
  MAX_CONCURRENT_PREFETCHES: 3,
  // 预取 staleTime
  STALE_TIME: 60 * 1000,
  // 预取 gcTime
  GC_TIME: 5 * 60 * 1000,
} as const;

// 查询客户端默认配置
export const DEFAULT_QUERY_OPTIONS = {
  staleTime: STALE_TIME.DEFAULT,
  gcTime: GC_TIME.DEFAULT,
  refetchOnWindowFocus: WINDOW_FOCUS_CONFIG.DEFAULT,
  refetchOnReconnect: true,
  refetchOnMount: true,
  retry: RETRY_CONFIG.MAX_RETRIES,
  retryDelay: RETRY_CONFIG.RETRY_DELAY,
  structuralSharing: true,
} as const;

// 按数据类型的查询配置
export const QUERY_CONFIG_BY_TYPE = {
  price: {
    staleTime: STALE_TIME.PRICE,
    gcTime: GC_TIME.PRICE,
    refetchInterval: REFETCH_CONFIG.PRICE_INTERVAL,
    refetchOnWindowFocus: WINDOW_FOCUS_CONFIG.PRICE,
  },
  history: {
    staleTime: STALE_TIME.HISTORY,
    gcTime: GC_TIME.HISTORY,
    refetchOnWindowFocus: WINDOW_FOCUS_CONFIG.HISTORY,
  },
  network: {
    staleTime: STALE_TIME.NETWORK,
    gcTime: GC_TIME.NETWORK,
    refetchInterval: REFETCH_CONFIG.NETWORK_INTERVAL,
    refetchOnWindowFocus: WINDOW_FOCUS_CONFIG.NETWORK,
  },
  stats: {
    staleTime: STALE_TIME.STATS,
    gcTime: GC_TIME.STATS,
    refetchInterval: REFETCH_CONFIG.STATS_INTERVAL,
  },
  config: {
    staleTime: STALE_TIME.CONFIG,
    gcTime: GC_TIME.CONFIG,
    refetchOnWindowFocus: false,
  },
  static: {
    staleTime: STALE_TIME.STATIC,
    gcTime: GC_TIME.STATIC,
    refetchOnWindowFocus: false,
  },
  user: {
    staleTime: STALE_TIME.USER,
    gcTime: GC_TIME.USER,
    refetchOnWindowFocus: WINDOW_FOCUS_CONFIG.USER,
  },
  alerts: {
    staleTime: STALE_TIME.PRICE,
    gcTime: GC_TIME.PRICE,
    refetchInterval: REFETCH_CONFIG.ALERTS_INTERVAL,
    refetchOnWindowFocus: true,
  },
} as const;

// WebSocket 配置
export const WEBSOCKET_CONFIG = {
  // 重连间隔
  RECONNECT_INTERVAL: 3000,
  // 最大重连次数
  MAX_RECONNECT_ATTEMPTS: 5,
  // 心跳间隔
  HEARTBEAT_INTERVAL: 30000,
  // 心跳超时
  HEARTBEAT_TIMEOUT: 10000,
  // 批量大小
  BATCH_SIZE: 10,
  // 批量窗口 (毫秒)
  BATCH_WINDOW_MS: 100,
  // 节流间隔 (毫秒)
  THROTTLE_MS: 100,
} as const;

// 导出类型
export type QueryConfigType = keyof typeof QUERY_CONFIG_BY_TYPE;
