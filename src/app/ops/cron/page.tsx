import { getCronHealth } from '@/lib/ops/opsQueries';

import RefreshButton from '../RefreshButton';
import { PageHeader, Stat, Card, Badge, EmptyState } from '../ui';

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
  const { jobs } = await getCronHealth();
  const staleCount = jobs.filter((j) => j.stale).length;
  const hasAge = jobs.some((j) => j.ageMinutes != null);
  const oldestAge = hasAge ? Math.max(...jobs.map((j) => j.ageMinutes ?? 0)) : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Cron & Pipelines"
        subtitle="Freshness of each background pipeline, derived from output-table latest rows"
        actions={<RefreshButton />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Pipelines" value={jobs.length} />
        <Stat
          label="Stale"
          value={staleCount}
          tone={staleCount > 0 ? 'bad' : 'good'}
          hint="past freshness window"
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-3 font-medium">Pipeline</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 pr-3 font-medium">Last run</th>
                  <th className="py-2 pr-3 font-medium text-right">Age</th>
                  <th className="py-2 pr-3 font-medium text-right">Threshold</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.name} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-medium text-slate-800">{j.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-500">
                      {j.table}.{j.column}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-500">
                      {j.lastRunAt
                        ? new Date(j.lastRunAt).toISOString().slice(0, 16).replace('T', ' ')
                        : 'never'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                      {fmtAge(j.ageMinutes)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-400">
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
