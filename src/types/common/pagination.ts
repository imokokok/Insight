export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T extends string = string> {
  field: T;
  direction: SortDirection;
}

export interface FilterOption<T = string> {
  value: T;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortDirection;
}

export interface PaginatedRequest extends PaginationParams {
  search?: string;
  filters?: Record<string, unknown>;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  previousCursor?: string;
  hasMore: boolean;
}
