import { PaginationParams } from '../common/pagination';

export interface BaseApiRequest extends PaginationParams {
  search?: string;
}

export interface PriceQueryRequest {
  symbol: string;
  chain?: string;
  provider?: string;
}

export interface HistoricalPriceRequest extends PriceQueryRequest {
  startTimestamp?: number;
  endTimestamp?: number;
  interval?: string;
}

export interface AlertConfigRequest {
  symbol: string;
  chain?: string;
  provider?: string;
  condition: 'above' | 'below' | 'change_percent';
  threshold: number;
  notifyEmail?: boolean;
  notifyPush?: boolean;
}
