import { type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { createServiceRoleClient } from '@/lib/supabase/server';

const FreshnessQuerySchema = z.object({
  provider: SafeProviderSchema.optional(),
  symbol: SafeSymbolSchema.optional(),
  category: z.enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst']).optional(),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { provider, symbol, category } = context.validated!.query!;

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('oracle_feeds')
      .select(
        'id, provider, symbol, chain_id, address, name, category, is_active, consecutive_failures, last_success_at, last_failure_at'
      )
      .eq('is_active', true);

    if (provider) {
      query = query.eq('provider', provider);
    }
    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return ApiResponseBuilder.serverError(
        'Failed to fetch feed freshness data',
        context.requestId
      );
    }

    const feeds = (data ?? []) as Array<{
      id: string;
      provider: string;
      symbol: string;
      chain_id: number;
      address: string;
      name: string;
      category: string;
      is_active: boolean;
      consecutive_failures: number;
      last_success_at: string | null;
      last_failure_at: string | null;
    }>;

    const now = Date.now();

    const freshnessEntries = feeds.map((feed) => {
      const lastSuccessAt = feed.last_success_at ? new Date(feed.last_success_at).getTime() : null;
      const lastFailureAt = feed.last_failure_at ? new Date(feed.last_failure_at).getTime() : null;
      const secondsSinceLastSuccess = lastSuccessAt
        ? Math.round((now - lastSuccessAt) / 1000)
        : null;
      const secondsSinceLastFailure = lastFailureAt
        ? Math.round((now - lastFailureAt) / 1000)
        : null;

      let status: 'fresh' | 'stale' | 'outdated' | 'never' = 'never';
      if (secondsSinceLastSuccess !== null) {
        if (secondsSinceLastSuccess < 3600)
          status = 'fresh'; // < 1h
        else if (secondsSinceLastSuccess < 86400)
          status = 'stale'; // < 24h
        else status = 'outdated'; // >= 24h
      }

      return {
        feedId: feed.id,
        provider: feed.provider,
        symbol: feed.symbol,
        chainId: feed.chain_id,
        name: feed.name,
        category: feed.category,
        consecutiveFailures: feed.consecutive_failures,
        lastSuccessAt: feed.last_success_at,
        lastFailureAt: feed.last_failure_at,
        secondsSinceLastSuccess,
        secondsSinceLastFailure,
        status,
      };
    });

    // Summary stats
    const byStatus = {
      fresh: freshnessEntries.filter((e) => e.status === 'fresh').length,
      stale: freshnessEntries.filter((e) => e.status === 'stale').length,
      outdated: freshnessEntries.filter((e) => e.status === 'outdated').length,
      never: freshnessEntries.filter((e) => e.status === 'never').length,
    };

    const payload = {
      timestamp: now,
      summary: {
        totalFeeds: freshnessEntries.length,
        byStatus,
      },
      feeds: freshnessEntries,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'realtime' }
    );
  },
  {
    // Tier 2 deep-analysis endpoint
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: FreshnessQuerySchema },
  }
);
