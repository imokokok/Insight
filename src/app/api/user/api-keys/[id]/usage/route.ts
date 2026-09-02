/**
 * GET /api/user/api-keys/[id]/usage
 *
 * Returns usage analytics for a single API key (last 7 days):
 *   - Total calls
 *   - Calls grouped by date (YYYY-MM-DD)
 *   - Calls grouped by endpoint
 *
 * Used by the UsageChart component in the BillingPanel.
 *
 * Uses Bearer session auth. The keyId must belong to the authenticated user
 * (ownership is verified via a user_id filter on the api_keys lookup).
 */

import { NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { createServiceRoleClient } from '@/lib/supabase/server';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const GET = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    const keyId = context.validated?.params?.id;

    if (!userId) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    if (!keyId) {
      return NextResponse.json(ApiResponseBuilder.error('BAD_REQUEST', 'Missing key id'), {
        status: 400,
      });
    }

    const client = createServiceRoleClient();

    // 1. Verify the key belongs to the user (prevent IDOR)
    const { data: key, error: keyError } = await client
      .from('api_keys')
      .select('id, name, plan')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (keyError || !key) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', 'API key not found', { retryable: false }),
        { status: 404 }
      );
    }

    // 2. Fetch raw usage rows from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    const { data: usageRows, error: usageError } = await client
      .from('api_key_usage')
      .select('created_at, endpoint')
      .eq('api_key_id', keyId)
      .gte('created_at', sevenDaysAgo);

    if (usageError) {
      return NextResponse.json(
        ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to fetch usage data'),
        { status: 500 }
      );
    }

    // 3. Aggregate by date and by endpoint (in-memory reduce — the row count
    //    for 7 days is bounded by the key's rate limit, so this is cheap)
    const dateMap = new Map<string, number>();
    const endpointMap = new Map<string, number>();
    let total = 0;

    for (const row of usageRows ?? []) {
      const day = (row.created_at as string).slice(0, 10); // YYYY-MM-DD
      dateMap.set(day, (dateMap.get(day) ?? 0) + 1);
      endpointMap.set(row.endpoint, (endpointMap.get(row.endpoint) ?? 0) + 1);
      total++;
    }

    return NextResponse.json(
      ApiResponseBuilder.success({
        key: {
          id: key.id,
          name: key.name,
          plan: key.plan,
        },
        total,
        byDate: Array.from(dateMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        byEndpoint: Array.from(endpointMap.entries())
          .map(([endpoint, count]) => ({ endpoint, count }))
          .sort((a, b) => b.count - a.count),
      })
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true, allowApiKey: false },
      rateLimit: { preset: 'strict' },
      cors: true,
    },
  }
);
