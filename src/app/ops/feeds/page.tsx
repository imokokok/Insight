import Link from 'next/link';

import { getFeedHealth } from '@/lib/ops/opsQueries';

import FeedsTable from '../components/FeedsTable';
import RefreshControl from '../RefreshControl';
import { PageHeader, Stat, Card, Badge, EmptyState, ErrorBanner } from '../ui';

export const metadata = {
  title: 'Feed Health - Insight Ops',
};

export default async function OpsFeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider } = await searchParams;
  const { summary, problemFeeds } = await getFeedHealth();

  const filteredFeeds = provider
    ? problemFeeds.filter((f) => f.provider.toLowerCase() === provider.toLowerCase())
    : problemFeeds;

  const reasonTone = (reason: string) => {
    if (reason === 'discover_pruned') return 'warn' as const;
    if (reason === 'health_failed') return 'bad' as const;
    if (reason === 'manual') return 'default' as const;
    return 'default' as const;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Feed Health"
        subtitle="Oracle feed lifecycle & deactivation observability (oracle_feeds + 0025) · 当前全量快照"
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      {provider && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-gray-500">
            筛选 provider：<span className="font-medium text-gray-800">{provider}</span>
          </span>
          <Link
            href="/ops/feeds"
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
          >
            ✕ 清除
          </Link>
        </div>
      )}

      {summary.errored && (
        <ErrorBanner message="Feed 健康数据查询失败，以下计数可能不完整或不可用。" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Active"
          value={summary.active}
          hint={`of ${summary.total} feeds`}
          tone="good"
        />
        <Stat
          label="Inactive"
          value={summary.inactive}
          tone={summary.inactive > 0 ? 'warn' : 'good'}
        />
        <Stat
          label="Failing"
          value={summary.failingFeeds}
          tone={summary.failingFeeds > 0 ? 'bad' : 'good'}
          hint="consecutive_failures > 0"
        />
        <Stat
          label="Stale"
          value={summary.staleFeeds}
          tone={summary.staleFeeds > 0 ? 'warn' : 'default'}
          hint="> 2h since success"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="Deactivation reasons">
          {Object.keys(summary.byReason).length === 0 ? (
            <EmptyState message="no deactivated feeds" />
          ) : (
            <div className="space-y-2">
              {Object.entries(summary.byReason).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Badge tone={reasonTone(reason)}>{reason}</Badge>
                  </span>
                  <span className="tabular-nums text-gray-700 font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Rediscover queue">
          <p className="text-sm text-gray-600 mb-2">
            Feeds absent from discovery for {summary.rediscoverQueue} consecutive run(s) — reconcile
            before pruning.
          </p>
          <Stat
            label="absent_discovery_runs > 0"
            value={summary.rediscoverQueue}
            tone={summary.rediscoverQueue > 0 ? 'warn' : 'good'}
          />
        </Card>
      </div>

      <Card title={`Problem feeds (${filteredFeeds.length})`}>
        <FeedsTable feeds={filteredFeeds} />
      </Card>
    </div>
  );
}
