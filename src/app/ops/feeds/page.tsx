import { getFeedHealth } from '@/lib/ops/opsQueries';

import RefreshButton from '../RefreshButton';
import { PageHeader, Stat, Card, Badge, EmptyState, ErrorBanner } from '../ui';

export const metadata = {
  title: 'Feed Health - Insight Ops',
};

export default async function OpsFeedsPage() {
  const { summary, problemFeeds } = await getFeedHealth();

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
        subtitle="Oracle feed lifecycle & deactivation observability (oracle_feeds + 0025)"
        actions={<RefreshButton />}
      />

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
                  <span className="tabular-nums text-slate-700 font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Rediscover queue">
          <p className="text-sm text-slate-600 mb-2">
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

      <Card title={`Problem feeds (top ${problemFeeds.length})`}>
        {problemFeeds.length === 0 ? (
          <EmptyState message="no problem feeds" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-3 font-medium">Provider</th>
                  <th className="py-2 pr-3 font-medium">Symbol</th>
                  <th className="py-2 pr-3 font-medium">Chain</th>
                  <th className="py-2 pr-3 font-medium">Fails</th>
                  <th className="py-2 pr-3 font-medium">Last success</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {problemFeeds.map((f, i) => (
                  <tr
                    key={`${f.provider}-${f.symbol}-${f.chain_id}-${i}`}
                    className="border-b border-slate-50"
                  >
                    <td className="py-2 pr-3 font-medium text-slate-800">{f.provider}</td>
                    <td className="py-2 pr-3 text-slate-700">{f.symbol}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-500">{f.chain_id}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-700">
                      {f.consecutive_failures}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-500">
                      {f.last_success_at
                        ? new Date(f.last_success_at).toISOString().slice(0, 16).replace('T', ' ')
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {f.deactivated_reason ? (
                        <Badge tone={reasonTone(f.deactivated_reason)}>
                          {f.deactivated_reason}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {f.is_active ? (
                        <Badge tone="good">active</Badge>
                      ) : (
                        <Badge tone="default">inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
