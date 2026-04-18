import type { RetryConfig } from '../constants/pythConstants';

export type WebSocketConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface WebSocketConnectionState {
  status: WebSocketConnectionStatus;
  isConnected: boolean;
  lastUpdateLatency: number;
  reconnectAttempts: number;
  error: Error | null;
}

export type ConnectionStateListener = (state: WebSocketConnectionState) => void;

export interface PythPriceRaw {
  price: string | number;
  conf?: string | number;
  expo?: number;
  publish_time?: number;
}

export function isPythPriceRaw(data: unknown): data is PythPriceRaw {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.price === 'string' || typeof obj.price === 'number';
}

// Publisher status type
export type PublisherStatus = 'active' | 'inactive' | 'degraded';

// Publisher data interface
export interface PublisherData {
  id: string;
  name: string;
  publisherKey: string;
  reliabilityScore: number;
  latency: number;
  status: PublisherStatus;
  submissionCount: number;
  lastUpdate: number;
  priceFeeds: string[];
  totalSubmissions?: number;
  averageLatency?: number;
  accuracy?: number;
  stake?: number;
  source?: string;
}

// Validator data interface
export interface ValidatorData {
  id: string;
  name: string;
  reliabilityScore: number;
  latency: number;
  status: PublisherStatus;
  staked: number;
  stake?: number;
  region: string;
  uptime: number;
  commission: number;
  totalResponses: number;
  rewards: number;
  performance: number;
}

// Cross-chain price data
export interface CrossChainPriceData {
  chain: string;
  price: number;
  deviation: number;
  latency: number;
  status: 'online' | 'degraded' | 'offline';
  lastUpdate: Date;
}

// Cross-chain result
export interface CrossChainResult {
  data: CrossChainPriceData[];
  basePrice: number;
  timestamp: number;
}

// Pyth service price feed
export interface PythServicePriceFeed {
  id: string;
  symbol: string;
  description: string;
  assetType: string;
  status: string;
}

// Pyth service network stats
export interface PythServiceNetworkStats {
  totalPublishers: number;
  activePublishers: number;
  totalPriceFeeds: number;
  totalSubmissions24h: number;
  averageLatency: number;
  uptimePercentage: number;
  lastUpdated: number;
}
