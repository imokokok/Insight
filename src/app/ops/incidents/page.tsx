import { getIncidentAggregation } from '@/lib/api/services/incidentService';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

import IncidentsTable from '../components/IncidentsTable';
import RefreshControl from '../RefreshControl';
import { PageHeader, Stat, Card, Badge, EmptyState } from '../ui';

export const metadata = {
  title: 'Incidents - Insight Ops',
};

const severityTone = (sev: string): 'default' | 'warn' | 'bad' => {
  if (sev === 'critical' || sev === 'high') return 'bad';
  if (sev === 'medium') return 'warn';
  return 'default';
};

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
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
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
        <IncidentsTable incidents={result.incidents} />
      </Card>
    </div>
  );
}
