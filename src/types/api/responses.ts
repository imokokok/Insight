import { type OracleProvider, type Blockchain } from '../oracle/enums';
import { type PriceData, type PriceDeviation } from '../oracle/price';
import { type Publisher, type PublisherStats } from '../oracle/publisher';
import { type OracleSnapshot } from '../oracle/snapshot';
import { type RiskAssessmentData } from '../risk';

type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

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

interface PriceDataResponse extends ApiResponse<PriceData[]> {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
}

interface SinglePriceResponse extends ApiResponse<PriceData> {
  provider: OracleProvider;
  symbol: string;
}

interface PriceDeviationResponse extends ApiResponse<PriceDeviation[]> {
  symbol: string;
  threshold: number;
}

interface HistoricalPriceResponse extends ApiResponse<PriceData[]> {
  symbol: string;
  startTimestamp: number;
  endTimestamp: number;
  interval: string;
}

interface PublisherListResponse extends ApiResponse<Publisher[]> {
  chain?: Blockchain;
}

interface PublisherStatsResponse extends ApiResponse<PublisherStats> {
  publisherId: string;
}

interface SnapshotListResponse extends ApiResponse<OracleSnapshot[]> {
  symbol: string;
}

interface RiskAssessmentResponse extends ApiResponse<RiskAssessmentData> {
  provider: OracleProvider;
  symbol: string;
}

type HealthCheckResponse = ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: number;
}>;

interface WebSocketMessage<T = unknown> {
  type: 'price_update' | 'deviation_alert' | 'status_change' | 'error';
  payload: T;
  timestamp: number;
}

interface PriceUpdateMessage {
  symbol: string;
  provider: OracleProvider;
  price: number;
  timestamp: number;
  change24h?: number;
}

interface DeviationAlertMessage {
  symbol: string;
  provider: OracleProvider;
  deviation: number;
  threshold: number;
  timestamp: number;
}

interface SubscriptionRequest {
  type: 'subscribe' | 'unsubscribe';
  channels: string[];
  symbols?: string[];
  providers?: OracleProvider[];
}

type SubscriptionResponse = ApiResponse<{
  channels: string[];
  subscribed: boolean;
}>;
