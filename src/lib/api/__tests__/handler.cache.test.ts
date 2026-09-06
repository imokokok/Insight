import { NextResponse } from 'next/server';

import { applyProtectedCachePolicy } from '../handler';

describe('applyProtectedCachePolicy', () => {
  it('overrides public route and CDN cache headers', () => {
    const response = NextResponse.json({ ok: true });
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, max-age=120, stale-while-revalidate=600'
    );
    response.headers.set(
      'Vercel-CDN-Cache-Control',
      'public, s-maxage=300, max-age=120, stale-while-revalidate=600'
    );

    applyProtectedCachePolicy(response);

    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');
  });
});
