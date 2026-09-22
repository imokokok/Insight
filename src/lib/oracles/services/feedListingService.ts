import { createServiceRoleClient } from '@/lib/supabase/server';

const FEED_COLUMNS =
  'id,provider,symbol,chain_id,address,name,decimals,category,is_active,consecutive_failures,last_success_at,last_failure_at';

export interface FeedListFilters {
  provider?: string;
  symbol?: string;
  category?: string;
  chainId?: number;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface ListedFeed {
  id: string;
  provider: string;
  symbol: string;
  chain_id: number;
  address: string | null;
  name: string;
  decimals: number | null;
  category: string;
  is_active: boolean;
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
}

/** Filter, count, and page in Postgres so callers never download the whole registry. */
export async function listOracleFeeds(
  filters: FeedListFilters
): Promise<{ feeds: ListedFeed[]; total: number }> {
  let query = createServiceRoleClient()
    .from('oracle_feeds')
    .select(FEED_COLUMNS, { count: 'exact' });

  if (filters.provider !== undefined) query = query.eq('provider', filters.provider);
  if (filters.symbol !== undefined) query = query.eq('symbol', filters.symbol);
  if (filters.category !== undefined) query = query.eq('category', filters.category);
  if (filters.chainId !== undefined) query = query.eq('chain_id', filters.chainId);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);

  const { data, count, error } = await query
    .order('symbol', { ascending: true })
    .order('chain_id', { ascending: true })
    .order('id', { ascending: true })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (error) throw new Error(`Failed to list oracle feeds: ${error.message}`);
  if (!data || count === null || count === undefined) {
    throw new Error('Feed listing query did not return data and an exact count');
  }

  return { feeds: data as ListedFeed[], total: count };
}
