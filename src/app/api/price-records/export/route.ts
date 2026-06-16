import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { createUserClient } from '@/lib/supabase/server';

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const userId = context.auth?.userId;
    if (!userId || !context.auth?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = _request.nextUrl.searchParams;
    const parsedLimit = parseInt(searchParams.get('limit') || '10000', 10);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50000) : 10000;

    const supabase = createUserClient(context.auth.accessToken);
    const { data, error } = await supabase
      .from('price_records')
      .select('provider, symbol, chain, price, timestamp, confidence, source')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch price records' }, { status: 500 });
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
  }
);
