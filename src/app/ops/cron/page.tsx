import { getCronDispatchHistory, getCronHealth } from '@/lib/ops/opsQueries';

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
  const [{ jobs, errored }, dispatch] = await Promise.all([
    getCronHealth(),
    getCronDispatchHistory(),
  ]);
  const staleCount = jobs.filter((j) => j.stale).length;
  const hasAge = jobs.some((j) => j.ageMinutes != null);
  const oldestAge = hasAge ? Math.max(...jobs.map((j) => j.ageMinutes ?? 0)) : null;

  return (
    <div className="ops-view ops-reliability-view ops-cron-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="05"
        context="Pipeline freshness"
        title="Cron & Pipelines"
        subtitle="See which background pipelines are current, which have stalled, and when the scheduler last dispatched."
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      <OpsScopeNote label="Reading freshness">
        Pipeline age comes from the latest output row for each source, with no fixed time window.
        Scheduler history covers the last 30 days and is reported separately below.
      </OpsScopeNote>

      {errored && <ErrorBanner message="管道新鲜度查询失败，下列 Stale / Fresh 状态不可信。" />}

      <OpsSectionHeading
        index="01"
        title="Freshness signal"
        detail="A current count of tracked pipelines and their oldest observed output."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pipelines" value={jobs.length} index="01" />
        <Stat
          label="Stale"
          value={errored ? '—' : staleCount}
          tone={errored ? 'bad' : staleCount > 0 ? 'bad' : 'good'}
          hint={errored ? 'query failed' : 'past freshness window'}
          index="02"
        />
        <Stat
          label="Fresh"
          value={errored ? '—' : jobs.length - staleCount}
          tone={errored ? 'default' : 'good'}
          index="03"
        />
        <Stat
          label="Oldest age"
          value={oldestAge != null ? fmtAge(oldestAge) : '—'}
          tone={errored || oldestAge == null ? 'default' : staleCount > 0 ? 'warn' : 'good'}
          index="04"
        />
      </div>

      <OpsSectionHeading
        index="02"
        title="Pipeline register"
        detail="Source, latest output, age, threshold, and current state for every tracked pipeline."
      />
      <Card>
        {jobs.length === 0 ? (
          <EmptyState message="no pipelines tracked" />
        ) : (
          <div>
            <p className="ops-table-scroll-hint md:hidden">
              Scroll sideways to inspect every column →
            </p>
            <div className="ops-table-scroll overflow-x-auto">
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
          </div>
        )}
      </Card>

      <OpsSectionHeading
        index="03"
        title="Dispatch ledger"
        detail="Scheduled and completed runs over the last 30 days."
      />
      <Card>
        {dispatch.errored ? (
          <EmptyState message="dispatcher ledger unavailable — apply migration 0045 to activate it" />
        ) : dispatch.runs.length === 0 ? (
          <EmptyState message="dispatcher is installed; no runs recorded yet" />
        ) : (
          <div>
            <p className="ops-table-scroll-hint md:hidden">
              Scroll sideways to inspect every column →
            </p>
            <div className="ops-table-scroll overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className={thCls}>Workflow</th>
                    <th className={thCls}>Source</th>
                    <th className={thCls}>Scheduled</th>
                    <th className={thCls}>Completed</th>
                    <th className={thCls}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatch.runs.map((run) => (
                    <tr key={run.id} className={trCls}>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {run.githubRunUrl ? (
                          <a
                            href={run.githubRunUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {run.workflowFile}
                          </a>
                        ) : (
                          run.workflowFile
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{run.source}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500">
                        {new Date(run.scheduledFor).toISOString().slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-gray-500">
                        {run.completedAt
                          ? new Date(run.completedAt).toISOString().slice(0, 16).replace('T', ' ')
                          : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          tone={
                            run.status === 'succeeded'
                              ? 'good'
                              : run.status === 'running' || run.status === 'dispatching'
                                ? 'warn'
                                : 'bad'
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
