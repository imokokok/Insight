import { getCronHealth } from '@/lib/ops/opsQueries';

import RefreshControl from '../RefreshControl';
import {
  PageHeader,
  Stat,
  Card,
  Badge,
  EmptyState,
  ErrorBanner,
  tableCls,
  thCls,
  trCls,
} from '../ui';

export const metadata = {
  title: 'Cron & Pipelines - Insight Ops',
};

function fmtAge(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default async function OpsCronPage() {
  const { jobs, errored } = await getCronHealth();
  const staleCount = jobs.filter((j) => j.stale).length;
  const hasAge = jobs.some((j) => j.ageMinutes != null);
  const oldestAge = hasAge ? Math.max(...jobs.map((j) => j.ageMinutes ?? 0)) : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Cron & Pipelines"
        subtitle="Freshness of each background pipeline, derived from output-table latest rows"
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      {errored && <ErrorBanner message="管道新鲜度查询失败，下列 Stale / Fresh 状态不可信。" />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Pipelines" value={jobs.length} />
        <Stat
          label="Stale"
          value={errored ? '—' : staleCount}
          tone={errored ? 'bad' : staleCount > 0 ? 'bad' : 'good'}
          hint={errored ? 'query failed' : 'past freshness window'}
        />
        <Stat label="Fresh" value={jobs.length - staleCount} tone="good" />
        <Stat
          label="Oldest age"
          value={oldestAge != null ? fmtAge(oldestAge) : '—'}
          tone={oldestAge != null && oldestAge > 0 ? 'warn' : 'good'}
        />
      </div>

      <Card title="Pipeline freshness">
        {jobs.length === 0 ? (
          <EmptyState message="no pipelines tracked" />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className={thCls}>Pipeline</th>
                  <th className={thCls}>Source</th>
                  <th className={thCls}>Last run</th>
                  <th className={`${thCls} text-right`}>Age</th>
                  <th className={`${thCls} text-right`}>Threshold</th>
                  <th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.name} className={trCls}>
                    <td className="py-2 pr-3 font-medium text-gray-800">{j.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                      {j.table}.{j.column}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-gray-500">
                      {j.lastRunAt
                        ? new Date(j.lastRunAt).toISOString().slice(0, 16).replace('T', ' ')
                        : 'never'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                      {fmtAge(j.ageMinutes)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-400">
                      {fmtAge(j.staleThresholdMinutes)}
                    </td>
                    <td className="py-2 pr-3">
                      {j.lastRunAt == null ? (
                        <Badge tone="warn">no data</Badge>
                      ) : j.stale ? (
                        <Badge tone="bad">stale</Badge>
                      ) : (
                        <Badge tone="good">fresh</Badge>
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
