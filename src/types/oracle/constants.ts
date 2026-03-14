export enum TimeRange {
  '1H' = 3600,
  '6H' = 21600,
  '24H' = 86400,
  '7D' = 604800,
  '30D' = 2592000,
}

export enum DataStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  STALE = 'stale',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  EXPANDING = 'expanding',
  SHRINKING = 'shrinking',
}

export interface ConfidenceIntervalData {
  bid: number;
  ask: number;
  widthPercentage: number;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  lastUpdated?: number;
}

export interface FilterState {
  timeRange?: TimeRange;
  chain?: import('./enums').Blockchain;
  symbol?: string;
  status?: DataStatus;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'png';
  filename?: string;
  includeMetadata?: boolean;
}
