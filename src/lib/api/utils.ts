import { NextResponse } from 'next/server';

type CachePreset = 'static' | 'semiStatic' | 'realtime' | 'shortLived' | 'noStore';

export const CACHE_PRESETS: Record<CachePreset, string> = {
  // Near-immutable data (e.g. asset metadata, feed registry). Cache for 1 day.
  static: 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400',
  // Semi-static data updated by cron or manual import. Cache for 5 minutes.
  semiStatic: 'public, s-maxage=300, max-age=120, stale-while-revalidate=600',
  // On-demand price / health data (fetched live, not real-time pushed). Cache for a few seconds.
  realtime: 'public, s-maxage=5, max-age=0, stale-while-revalidate=10',
  // Very short-lived cache for aggregated metrics / reports.
  shortLived: 'public, s-maxage=60, max-age=30, stale-while-revalidate=120',
  // Fully dynamic / user-specific endpoints.
  noStore: 'no-store, must-revalidate',
};

interface CreateCachedJsonResponseOptions {
  preset?: CachePreset;
  header?: string;
}

export function createCachedJsonResponse<T>(
  data: T,
  cacheConfig: CreateCachedJsonResponseOptions
): NextResponse<T> {
  const header = cacheConfig.header ?? CACHE_PRESETS[cacheConfig.preset ?? 'noStore'];
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', header);
  if (header.includes('public')) {
    // Keep the CDN policy explicit even if a future framework default changes
    // Cache-Control handling. Vercel consumes this header before responding to
    // the browser.
    response.headers.set('Vercel-CDN-Cache-Control', header);
  }
  return response;
}
