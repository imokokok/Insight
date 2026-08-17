import { createServiceRoleClient } from '@/lib/supabase/server';
import { get7dAgoUtc, getTodayUtc, addDay } from '@/lib/utils/date';
import { roundTo } from '@/lib/utils/format';

import {
  FeedFreshnessInputSchema,
  FeedsInputSchema,
  FeedHealthInputSchema,
  LatencyInputSchema,
} from './schemas';

import type { McpToolDefinition } from './types';

export const getFeedFreshnessTool: McpToolDefinition<typeof FeedFreshnessInputSchema> = {
  name: 'get_feed_freshness',
  description:
    'Scan current freshness/staleness across many active feeds, filterable by provider, symbol, or category. Use this to find feeds needing attention right now. For a single feed by UUID use get_feed_health; for a dated ecosystem-wide report use get_oracle_health.',
  parameters: FeedFreshnessInputSchema,
  handler: async (args) => {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('oracle_feeds')
      .select(
        'id, provider, symbol, chain_id, address, name, category, is_active, consecutive_failures, last_success_at, last_failure_at'
      )
      .eq('is_active', true);

    if (args.provider) {
      query = query.eq('provider', args.provider);
    }
    if (args.symbol) {
      query = query.eq('symbol', args.symbol);
    }
    if (args.category) {
      query = query.eq('category', args.category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch feed freshness: ${error.message}`);
    }

    const feeds = data ?? [];
    const now = Date.now();

    const entries = feeds.map((feed) => {
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
        if (secondsSinceLastSuccess < 3600) status = 'fresh';
        else if (secondsSinceLastSuccess < 86400) status = 'stale';
        else status = 'outdated';
      }

      return {
        feedId: feed.id,
        provider: feed.provider,
        symbol: feed.symbol,
        chainId: feed.chain_id,
        name: feed.name,
        category: feed.category,
        consecutiveFailures: feed.consecutive_failures,
        secondsSinceLastSuccess,
        secondsSinceLastFailure,
        status,
      };
    });

    const byStatus = {
      fresh: entries.filter((e) => e.status === 'fresh').length,
      stale: entries.filter((e) => e.status === 'stale').length,
      outdated: entries.filter((e) => e.status === 'outdated').length,
      never: entries.filter((e) => e.status === 'never').length,
    };

    const staleOrWorse = entries.filter(
      (e) => e.status === 'stale' || e.status === 'outdated' || e.status === 'never'
    );

    const lines = [
      `**Feed freshness report**`,
      `- Total active feeds: ${entries.length}`,
      `- Fresh: ${byStatus.fresh}, Stale: ${byStatus.stale}, Outdated: ${byStatus.outdated}, Never: ${byStatus.never}`,
      '',
    ];

    if (staleOrWorse.length > 0) {
      lines.push('**Feeds needing attention:**');
      for (const e of staleOrWorse.slice(0, 20)) {
        lines.push(
          `- ${e.provider.toUpperCase()} ${e.symbol} (chain ${e.chainId}): ${e.status}${e.consecutiveFailures > 0 ? `, ${e.consecutiveFailures} consecutive failures` : ''}`
        );
      }
      if (staleOrWorse.length > 20) {
        lines.push('', `... and ${staleOrWorse.length - 20} more.`);
      }
    } else {
      lines.push('All feeds are fresh.');
    }

    return lines.join('\n');
  },
};

export const getFeedsTool: McpToolDefinition<typeof FeedsInputSchema> = {
  name: 'get_feeds',
  description:
    'List oracle feeds from the registry with optional filters (provider, symbol, category, chain, active status). Useful for discovering available feeds and their metadata.',
  parameters: FeedsInputSchema,
  handler: async (args) => {
    const { getAdminQueries } = await import('@/lib/supabase/server');
    const queries = getAdminQueries();
    const allFeeds = await queries.getOracleFeeds('');

    let filtered = allFeeds;

    if (args.provider) {
      filtered = filtered.filter((f) => f.provider === args.provider);
    }
    if (args.symbol) {
      filtered = filtered.filter((f) => f.symbol === args.symbol);
    }
    if (args.category) {
      filtered = filtered.filter((f) => f.category === args.category);
    }
    if (args.chainId !== undefined) {
      filtered = filtered.filter((f) => f.chain_id === args.chainId);
    }
    if (args.isActive !== undefined) {
      filtered = filtered.filter((f) => f.is_active === args.isActive);
    }

    const total = filtered.length;
    const paged = filtered.slice(args.offset, args.offset + args.limit);

    if (total === 0) {
      return 'No feeds match the requested filters.';
    }

    const lines = [`**Oracle feeds (${total} total, showing ${paged.length})**`, ''];

    for (const f of paged) {
      lines.push(
        `- ${f.provider.toUpperCase()} ${f.symbol} (chain ${f.chain_id}, ${f.category}): ${f.name} [${f.id}]${f.is_active ? '' : ' [inactive]'}`
      );
    }

    return lines.join('\n');
  },
};

export const getFeedHealthTool: McpToolDefinition<typeof FeedHealthInputSchema> = {
  name: 'get_feed_health',
  description:
    'Get detailed point-in-time health status for ONE specific oracle feed by its UUID (consecutive failures, last success/failure, status). For ecosystem-wide health by date use get_oracle_health; to scan freshness across many feeds use get_feed_freshness.',
  parameters: FeedHealthInputSchema,
  handler: async (args) => {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('oracle_feeds')
      .select('*')
      .eq('id', args.feedId)
      .single();

    if (error || !data) {
      throw new Error(`Feed not found: ${args.feedId}`);
    }

    const consecutiveFailures = data.consecutive_failures ?? 0;
    const timeSinceLastSuccess = data.last_success_at
      ? Math.round((Date.now() - new Date(data.last_success_at).getTime()) / 1000)
      : null;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (consecutiveFailures >= 4) status = 'critical';
    else if (consecutiveFailures >= 1) status = 'degraded';

    const lines = [
      `**Feed health: ${data.name}**`,
      `- ID: ${data.id}`,
      `- Provider: ${data.provider.toUpperCase()}`,
      `- Symbol: ${data.symbol}`,
      `- Chain: ${data.chain_id}`,
      `- Category: ${data.category}`,
      `- Active: ${data.is_active ? 'Yes' : 'No'}`,
      `- Status: ${status}`,
      `- Consecutive failures: ${consecutiveFailures}`,
      timeSinceLastSuccess !== null
        ? `- Seconds since last success: ${timeSinceLastSuccess}`
        : '- Last success: never',
      data.last_failure_at ? `- Last failure: ${data.last_failure_at}` : '',
    ];

    return lines.filter(Boolean).join('\n');
  },
};

export const getFeedUptimeTool: McpToolDefinition<typeof LatencyInputSchema> = {
  name: 'get_feed_uptime',
  description:
    'Analyze feed data-delivery reliability over a date range: success rate, hours with data, coverage %, and average snapshots per day per provider+symbol. Use this to assess how completely a feed delivered data over time — distinct from get_feed_health (point-in-time status) and get_latency (speed).',
  parameters: LatencyInputSchema,
  handler: async (args) => {
    const fromOrDefault = args.from ?? get7dAgoUtc();
    const toOrDefault = args.to ?? getTodayUtc();

    const supabase = createServiceRoleClient();
    let query = supabase
      .from('hourly_price_snapshots')
      .select('snapshot_hour, provider, symbol, is_success')
      .gte('snapshot_hour', fromOrDefault)
      .lt('snapshot_hour', addDay(toOrDefault));

    if (args.provider) {
      query = query.eq('provider', args.provider);
    }
    if (args.symbol) {
      query = query.eq('symbol', args.symbol);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch uptime data: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{
      snapshot_hour: string;
      provider: string;
      symbol: string;
      is_success: boolean;
    }>;

    const groupMap = new Map<
      string,
      {
        provider: string;
        symbol: string;
        snapshots: number;
        successes: number;
        hours: Set<string>;
      }
    >();

    for (const row of rows) {
      const key = `${row.provider}|${row.symbol}`;
      let group = groupMap.get(key);
      if (!group) {
        group = {
          provider: row.provider,
          symbol: row.symbol,
          snapshots: 0,
          successes: 0,
          hours: new Set(),
        };
        groupMap.set(key, group);
      }
      group.snapshots++;
      if (row.is_success) group.successes++;
      group.hours.add(row.snapshot_hour.slice(0, 13)); // Hour-level granularity
    }

    const fromTime = new Date(fromOrDefault).getTime();
    const toTime = new Date(addDay(toOrDefault)).getTime();
    const totalHours = Math.max(1, Math.round((toTime - fromTime) / (60 * 60 * 1000)));

    const entries = Array.from(groupMap.values()).map((group) => {
      const coveragePct = (group.hours.size / totalHours) * 100;
      const successRate = group.snapshots > 0 ? (group.successes / group.snapshots) * 100 : 0;
      const avgPerDay = group.snapshots / Math.max(1, totalHours / 24);

      return {
        provider: group.provider,
        symbol: group.symbol,
        totalSnapshots: group.snapshots,
        successfulSnapshots: group.successes,
        successRate: roundTo(successRate, 1),
        hoursWithData: group.hours.size,
        totalHours,
        coveragePct: roundTo(Math.min(coveragePct, 100), 1),
        avgSnapshotsPerDay: roundTo(avgPerDay, 1),
      };
    });

    if (entries.length === 0) {
      return `No uptime data available for the requested filters between ${fromOrDefault} and ${toOrDefault}.`;
    }

    // Lowest coverage first — these are the feeds most needing attention.
    entries.sort((a, b) => a.coveragePct - b.coveragePct);

    const lines = [
      `**Feed uptime report (${fromOrDefault} to ${toOrDefault})**`,
      `- Expected hours: ${totalHours}`,
      `- Entries: ${entries.length}`,
      '',
      '**Provider-symbol reliability (lowest coverage first):**',
    ];

    for (const e of entries) {
      lines.push(
        `- ${e.provider.toUpperCase()} ${e.symbol}: coverage ${e.coveragePct}%, success ${e.successRate}%, ${e.hoursWithData}/${e.totalHours} hours, ${e.avgSnapshotsPerDay}/day (${e.totalSnapshots} snapshots)`
      );
    }

    return lines.join('\n');
  },
};
