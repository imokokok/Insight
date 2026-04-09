export const DEFAULT_CONFIDENCE = {
  HIGH: 0.98,
  MEDIUM: 0.95,
  LOW: 0.9,
} as const;

export const REQUEST_TIMEOUT = {
  DEFAULT: 15000,
  FAST: 5000,
  SLOW: 30000,
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;

export const API_BASE_URLS = {
  DIA: 'https://api.diadata.org/v1',
  REDSTONE: 'https://api.redstone.finance',
  BINANCE: 'https://api.binance.com/api/v3',
} as const;

export const UPDATE_INTERVAL_MINUTES = {
  CHAINLINK: 60,
  DIA: 5,
  PYTH: 1,
  REDSTONE: 1,
  API3: 1,
  UMA: 60,
  WINKLINK: 60,
} as const;

export const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  USDC: 0.01,
  USDT: 0.01,
  LINK: 0.03,
  PYTH: 0.1,
  REDSTONE: 0.08,
} as const;

export const DEFAULT_SPREAD_PERCENTAGE = 0.05;

export const ORACLE_CONFIDENCE_MAP: Record<string, number> = {
  chainlink: DEFAULT_CONFIDENCE.HIGH,
  pyth: DEFAULT_CONFIDENCE.MEDIUM,
  dia: DEFAULT_CONFIDENCE.MEDIUM,
  redstone: DEFAULT_CONFIDENCE.MEDIUM,
  api3: DEFAULT_CONFIDENCE.MEDIUM,
  uma: DEFAULT_CONFIDENCE.MEDIUM,
  winklink: DEFAULT_CONFIDENCE.LOW,
} as const;

export type ConfidenceLevel = keyof typeof DEFAULT_CONFIDENCE;
export type TimeoutLevel = keyof typeof REQUEST_TIMEOUT;
