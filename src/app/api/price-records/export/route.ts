import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { createServiceRoleClient, createUserClient } from '@/lib/supabase/server';
import { loadSnapshotHistoryPage } from '@/lib/supabase/snapshotHistory';

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
    // Egress guard: 50,000 rows ≈ 21 MB of Supabase egress per request;
    // 10,000 (~4 MB) still covers the UI's download needs.
    const parsedLimit = parseInt(searchParams.get('limit') || '10000', 10);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 10000) : 10000;

    const supabase = createUserClient(accessToken);
    let data;
    let error;
    let snapshotRows;
    try {
      [{ data, error }, snapshotRows] = await Promise.all([
        supabase
          .from('price_records')
          .select('provider, symbol, chain, price, timestamp, confidence, source')
          .order('timestamp', { ascending: false })
          .limit(limit),
        loadSnapshotHistoryPage(
          createServiceRoleClient(),
          'price',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString(),
          [
            'snapshot_ts',
            'provider',
            'symbol',
            'chain_id',
            'price',
            'confidence',
            'data_age_seconds',
          ],
          { successOnly: true, ascending: false, limit }
        ),
      ]);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch price snapshot history' },
        },
        { status: 500 }
      );
    }

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
      // Rich records retain their existing response shape. The separate
      // snapshot stream restores the complete 15-minute price history without
      // pretending that each sample has hourly-only verification evidence.
      snapshots: snapshotRows.map((row) => ({
        provider: row.provider,
        symbol: row.symbol,
        chain: getBlockchainByChainId(row.chain_id) ?? null,
        chainId: row.chain_id,
        price: row.price,
        timestamp: row.snapshot_ts,
        confidence: row.confidence,
        dataAgeSeconds: row.data_age_seconds,
        source: 'price_snapshots',
        verification: null,
      })),
      snapshotCount: snapshotRows.length,
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
