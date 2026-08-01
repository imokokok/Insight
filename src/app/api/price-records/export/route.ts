import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { createUserClient } from '@/lib/supabase/server';

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    // Internal page requests skip the auth middleware (skipInternalAuthAndRateLimit),
    // but the UI still sends the Supabase session token in the Authorization header.
    // External callers must authenticate via the auth middleware first.
    const accessToken = context.auth?.accessToken ?? extractBearerToken(_request);

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const searchParams = _request.nextUrl.searchParams;
    const parsedLimit = parseInt(searchParams.get('limit') || '10000', 10);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50000) : 10000;

    const supabase = createUserClient(accessToken);
    const { data, error } = await supabase
      .from('price_records')
      .select('provider, symbol, chain, price, timestamp, confidence, source')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch price records' },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      records: data,
      count: data?.length || 0,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: true },
      cors: true,
    },
    skipInternalAuthAndRateLimit: true,
  }
);
