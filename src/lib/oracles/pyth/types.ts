import type { RetryConfig } from '../constants/pythConstants';

export interface PythPriceRaw {
  price: string | number;
  conf?: string | number;
  expo?: number;
  publish_time?: number;
}

export function isPythPriceRaw(data: unknown): data is PythPriceRaw {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.price !== 'string' && typeof obj.price !== 'number') return false;
  if (typeof obj.price === 'number' && (!Number.isFinite(obj.price) || Number.isNaN(obj.price)))
    return false;
  if (typeof obj.price === 'string') {
    const parsed = Number(obj.price);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return false;
  }
  return true;
}
