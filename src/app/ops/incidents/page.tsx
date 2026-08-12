import Link from 'next/link';

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

export default async function OpsIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider } = await searchParams;
  const result = await getIncidentAggregation({
    from: get7dAgoUtc(),
    to: getTodayUtc(),
    limit: 200,
    offset: 0,
    provider,
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

      {provider && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-gray-500">
            筛选 provider：<span className="font-medium text-gray-800">{provider}</span>
          </span>
          <Link
            href="/ops/incidents"
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
          >
            ✕ 清除
          </Link>
        </div>
      )}

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
                  <span className="tabular-nums text-gray-700 font-medium">
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
                  <span className="tabular-nums text-gray-700 font-medium">
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
