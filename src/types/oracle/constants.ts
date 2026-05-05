export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings?: string[];
}
