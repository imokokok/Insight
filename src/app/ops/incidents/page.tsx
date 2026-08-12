import { getIncidentAggregation, type Incident } from '@/lib/api/services/incidentService';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

import RefreshButton from '../RefreshButton';
import { PageHeader, Stat, Card, Badge, EmptyState } from '../ui';

export const metadata = {
  title: 'Incidents - Insight Ops',
};

const severityTone = (sev: string): 'default' | 'warn' | 'bad' => {
  if (sev === 'critical' || sev === 'high') return 'bad';
  if (sev === 'medium') return 'warn';
  return 'default';
};

function incidentWhen(inc: Incident): string | null {
  return inc.type === 'feed_failure' ? inc.lastFailureAt : inc.snapshotTime;
}

export default async function OpsIncidentsPage() {
  const result = await getIncidentAggregation({
    from: get7dAgoUtc(),
    to: getTodayUtc(),
    limit: 200,
    offset: 0,
  });

  const typeKeys = Object.keys(result.byType);
  const severityKeys = Object.keys(result.bySeverity);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Incidents"
        subtitle="Oracle incidents aggregated from oracle_feeds & reputation_history (last 7d)"
        actions={<RefreshButton />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Total (7d)" value={result.total} tone={result.total > 0 ? 'warn' : 'good'} />
        <Stat
          label="Critical"
          value={result.bySeverity.critical}
          tone={result.bySeverity.critical > 0 ? 'bad' : 'default'}
        />
        <Stat
          label="High"
          value={result.bySeverity.high}
          tone={result.bySeverity.high > 0 ? 'bad' : 'default'}
        />
        <Stat label="Medium / low" value={result.bySeverity.medium + result.bySeverity.low} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="By type">
          {typeKeys.length === 0 ? (
            <EmptyState message="no incidents" />
          ) : (
            <div className="space-y-2">
              {typeKeys.map((type) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <Badge tone="default">{type}</Badge>
                  <span className="tabular-nums text-slate-700 font-medium">
                    {result.byType[type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="By severity">
          {severityKeys.length === 0 ? (
            <EmptyState message="no incidents" />
          ) : (
            <div className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                <div key={sev} className="flex items-center justify-between text-sm">
                  <Badge tone={severityTone(sev)}>{sev}</Badge>
                  <span className="tabular-nums text-slate-700 font-medium">
                    {result.bySeverity[sev]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title={`Incidents (${result.incidents.length} shown)`}>
        {result.incidents.length === 0 ? (
          <EmptyState message="no incidents in last 7d" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-3 font-medium">Severity</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Provider</th>
                  <th className="py-2 pr-3 font-medium">Symbol</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {result.incidents.map((inc, i) => {
                  const when = incidentWhen(inc);
                  return (
                    <tr
                      key={`${inc.type}-${inc.provider}-${inc.symbol}-${i}`}
                      className="border-b border-slate-50"
                    >
                      <td className="py-2 pr-3">
                        <Badge tone={severityTone(inc.severity)}>{inc.severity}</Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone="default">{inc.type}</Badge>
                      </td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{inc.provider}</td>
                      <td className="py-2 pr-3 text-slate-700">{inc.symbol}</td>
                      <td className="py-2 pr-3">
                        {inc.type === 'feed_failure' ? (
                          <Badge tone={inc.status === 'ongoing' ? 'bad' : 'good'}>
                            {inc.status}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">recorded</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-slate-500">
                        {when ? new Date(when).toISOString().slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-600 max-w-md">{inc.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
