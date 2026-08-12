import { getOracleHealthReport } from '@/lib/oracles/services/oracleHealthService';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { getTodayUtc } from '@/lib/utils/date';

import RefreshControl from '../RefreshControl';
import { PageHeader, Stat, Card, Badge, EmptyState, tableCls, thCls, trCls } from '../ui';

export const metadata = {
  title: 'Oracle Health - Insight Ops',
};

const riskTone = (level: string): 'good' | 'warn' | 'bad' => {
  if (level === 'low') return 'good';
  if (level === 'medium') return 'warn';
  return 'bad';
};

export default async function OpsHealthPage() {
  const reputations = await reputationService.getReputations();

  // The daily health report is compute-heavy; never let it 500 the page.
  let report: Awaited<ReturnType<typeof getOracleHealthReport>> = null;
  try {
    report = await getOracleHealthReport(getTodayUtc());
  } catch {
    report = null;
  }

  const avgScore =
    reputations.length > 0
      ? Number(
          (reputations.reduce((s, r) => s + r.overall_score, 0) / reputations.length).toFixed(1)
        )
      : null;
  const avgUptime =
    reputations.length > 0
      ? Number(
          (reputations.reduce((s, r) => s + r.uptime_percentage, 0) / reputations.length).toFixed(2)
        )
      : null;
  const highRisk = report?.overview.highRiskProviders ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Oracle Health"
        subtitle="Per-provider reputation directory + today's oracle health report"
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Monitored providers" value={reputations.length} />
        <Stat
          label="Avg overall score"
          value={avgScore != null ? avgScore : '—'}
          tone={avgScore == null ? 'default' : avgScore < 80 ? 'warn' : 'good'}
        />
        <Stat
          label="Avg uptime %"
          value={avgUptime != null ? `${avgUptime}%` : '—'}
          tone={avgUptime == null ? 'default' : avgUptime < 99 ? 'warn' : 'good'}
        />
        <Stat
          label="High-risk (today)"
          value={highRisk}
          tone={highRisk > 0 ? 'bad' : 'good'}
          hint="from health report"
        />
      </div>

      <Card title="Reputation directory" className="mb-6">
        {reputations.length === 0 ? (
          <EmptyState message="no reputation rows" />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className={thCls}>Provider</th>
                  <th className={`${thCls} text-right`}>Score</th>
                  <th className={`${thCls} text-right`}>Uptime %</th>
                  <th className={`${thCls} text-right`}>Avg latency ms</th>
                  <th className={`${thCls} text-right`}>Avg dev %</th>
                  <th className={`${thCls} text-right`}>Queries</th>
                  <th className={`${thCls} text-right`}>Symbols</th>
                  <th className={`${thCls} text-right`}>Chains</th>
                </tr>
              </thead>
              <tbody>
                {reputations.map((r) => (
                  <tr key={r.provider} className={trCls}>
                    <td className="py-2 pr-3 font-medium text-slate-800">{r.provider}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                      {r.overall_score.toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                      {r.uptime_percentage.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                      {r.avg_latency_ms}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                      {r.avg_deviation_pct.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                      {r.total_queries.toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                      {r.supported_symbols_count}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                      {r.supported_chains_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {report ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Today's health report">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge tone={riskTone(report.overview.riskLevel)}>
                  {report.overview.riskLevel}
                </Badge>
                <span className="text-sm text-slate-600">{report.overview.reason}</span>
              </div>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-500">Monitored</dt>
                <dd className="tabular-nums text-slate-700 text-right">
                  {report.overview.monitoredProviders}
                </dd>
                <dt className="text-slate-500">Heartbeat lost</dt>
                <dd className="tabular-nums text-slate-700 text-right">
                  {report.overview.heartbeatMissingProviders}
                </dd>
                <dt className="text-slate-500">Delayed</dt>
                <dd className="tabular-nums text-slate-700 text-right">
                  {report.overview.delayedProviders}
                </dd>
                <dt className="text-slate-500">With deviation</dt>
                <dd className="tabular-nums text-slate-700 text-right">
                  {report.overview.providersWithDeviation}
                </dd>
                <dt className="text-slate-500">Dependency risk</dt>
                <dd className="tabular-nums text-slate-700 text-right">
                  {report.overview.providersWithDependencyRisk}
                </dd>
                <dt className="text-slate-500">Anomalies</dt>
                <dd className="tabular-nums text-slate-700 text-right">
                  {report.overview.anomalyCount}
                </dd>
              </dl>
            </div>
          </Card>
          <Card title="Shared dependency">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge tone={riskTone(report.sharedDependency.level)}>
                  {report.sharedDependency.level}
                </Badge>
                <span className="text-sm text-slate-500">
                  systemic risk {report.sharedDependency.systemicRiskFactor.toFixed(2)}
                </span>
              </div>
              {report.sharedDependency.sharedSourceGroups.length === 0 ? (
                <EmptyState message="no shared upstream sources" />
              ) : (
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {report.sharedDependency.sharedSourceGroups.map((g) => (
                    <li key={g.source}>
                      <span className="font-mono text-xs text-slate-700">{g.source}</span> →{' '}
                      {g.oracles.join(', ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card title="Today's health report">
          <EmptyState message="no snapshot data for today yet" />
        </Card>
      )}
    </div>
  );
}
