import Link from 'next/link';

import { getFeedHealth } from '@/lib/ops/opsQueries';

import FeedsTable from '../components/FeedsTable';
import RefreshControl from '../RefreshControl';
import {
  PageHeader,
  Stat,
  Card,
  Badge,
  EmptyState,
  ErrorBanner,
  OpsSectionHeading,
  OpsScopeNote,
} from '../ui';

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
    <div className="ops-view ops-feeds-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="03"
        context="Feed lifecycle"
        title="Feed Health"
        subtitle="Inspect the current feed inventory, failures, and deactivation trail."
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      <OpsScopeNote label="Snapshot scope">
        Counts reflect the current feed inventory. The problem feed ledger can be searched, sorted,
        and exported for follow-up.
      </OpsScopeNote>

      {provider && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-gray-500">
            筛选 provider：<span className="font-medium text-gray-800">{provider}</span>
          </span>
          <Link
            href="/ops/feeds"
            className="inline-flex items-center gap-1 border-l-2 border-gray-400 bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:border-primary-500 hover:text-primary-700"
          >
            ✕ 清除
          </Link>
        </div>
      )}

      {summary.errored && (
        <ErrorBanner message="Feed 健康数据查询失败，以下计数可能不完整或不可用。" />
      )}

      <OpsSectionHeading
        index="01"
        title="Feed signal"
        detail="Availability and failure pressure across the current snapshot."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Active"
          value={summary.active}
          hint={`of ${summary.total} feeds`}
          tone="good"
          index="01"
        />
        <Stat
          label="Inactive"
          value={summary.inactive}
          tone={summary.inactive > 0 ? 'warn' : 'good'}
          index="02"
        />
        <Stat
          label="Failing"
          value={summary.failingFeeds}
          tone={summary.failingFeeds > 0 ? 'bad' : 'good'}
          hint="consecutive_failures > 0"
          index="03"
        />
        <Stat
          label="Stale"
          value={summary.staleFeeds}
          tone={summary.staleFeeds > 0 ? 'warn' : 'default'}
          hint="> 2h since success"
          index="04"
        />
      </div>

      <OpsSectionHeading
        index="02"
        title="Lifecycle diagnosis"
        detail="Why feeds leave service and which sources may need rediscovery."
      />
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <OpsSectionHeading
        index="03"
        title="Problem feed ledger"
        detail={`${filteredFeeds.length} records in the current provider scope.`}
      />
      <Card>
        <FeedsTable feeds={filteredFeeds} />
      </Card>
    </div>
  );
}
