import { type OracleProvider, type Blockchain } from '../oracle/enums';
import { type PriceData, type PriceDeviation } from '../oracle/price';
import { type Publisher, type PublisherStats } from '../oracle/publisher';
import { type OracleSnapshot } from '../oracle/snapshot';
import { type RiskAssessmentData } from '../risk';

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PriceDataResponse extends ApiResponse<PriceData[]> {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
}

export interface SinglePriceResponse extends ApiResponse<PriceData> {
  provider: OracleProvider;
  symbol: string;
}

export interface PriceDeviationResponse extends ApiResponse<PriceDeviation[]> {
  symbol: string;
  threshold: number;
}

export interface HistoricalPriceResponse extends ApiResponse<PriceData[]> {
  symbol: string;
  startTimestamp: number;
  endTimestamp: number;
  interval: string;
}

export interface PublisherListResponse extends ApiResponse<Publisher[]> {
  chain?: Blockchain;
}

export interface PublisherStatsResponse extends ApiResponse<PublisherStats> {
  publisherId: string;
}

export interface SnapshotListResponse extends ApiResponse<OracleSnapshot[]> {
  symbol: string;
}

export interface RiskAssessmentResponse extends ApiResponse<RiskAssessmentData> {
  provider: OracleProvider;
  symbol: string;
}

export type HealthCheckResponse = ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: number;
}>;

export interface WebSocketMessage<T = unknown> {
  type: 'price_update' | 'deviation_alert' | 'status_change' | 'error';
  payload: T;
  timestamp: number;
}

export interface PriceUpdateMessage {
  symbol: string;
  provider: OracleProvider;
  price: number;
  timestamp: number;
  change24h?: number;
}

export interface DeviationAlertMessage {
  symbol: string;
  provider: OracleProvider;
  deviation: number;
  threshold: number;
  timestamp: number;
}

export interface SubscriptionRequest {
  type: 'subscribe' | 'unsubscribe';
  channels: string[];
  symbols?: string[];
  providers?: OracleProvider[];
}

export type SubscriptionResponse = ApiResponse<{
  channels: string[];
  subscribed: boolean;
}>;
