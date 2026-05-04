export enum DataStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  STALE = 'stale',
}

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings?: string[];
}
