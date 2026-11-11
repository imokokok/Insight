import { corsExposeHeaders } from '@/lib/api/x402/corsExposeHeaders';

export interface CorsOptions {
  origin?: string;
  methods?: string[];
  headers?: string[];
  maxAge?: number;
}

const DEFAULT_CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-Id',
  'Cache-Control',
  'X-API-Key',
  'PAYMENT-SIGNATURE',
  'X-Insight-Entry-Source',
];

export function getCorsHeaders(options: CorsOptions): Record<string, string> {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    headers = DEFAULT_CORS_HEADERS,
    maxAge = 86400,
  } = options;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': headers.join(', '),
    'Access-Control-Expose-Headers': corsExposeHeaders(),
    'Access-Control-Max-Age': String(maxAge),
  };
}

export function applyCorsHeaders<T extends { headers: Headers }>(
  response: T,
  corsHeaders: Record<string, string>
): T {
  for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value);
  return response;
}
