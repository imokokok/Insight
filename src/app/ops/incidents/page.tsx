import Link from 'next/link';

import { getIncidentAggregation } from '@/lib/api/services/incidentService';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

import IncidentsTable from '../components/IncidentsTable';
import RefreshControl from '../RefreshControl';
import { PageHeader, Stat, Card, Badge, EmptyState, OpsSectionHeading, OpsScopeNote } from '../ui';

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
    <div className="ops-view ops-reliability-view ops-incidents-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="04"
        context="Incident response"
        title="Incidents"
        subtitle="Trace feed failures and deviation events from the first signal to the affected provider."
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      <OpsScopeNote label="Reading the window">
        This record combines feed failures and reputation deviation events from the last seven days.
        The ledger shows up to 200 incidents; provider filters narrow the aggregation.
      </OpsScopeNote>

      {provider && (
        <div className="ops-active-filter mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Provider scope <strong>{provider}</strong>
          </span>
          <Link
            href="/ops/incidents"
            className="ops-active-filter-clear inline-flex items-center gap-1 text-xs"
          >
            Clear filter ↗
          </Link>
        </div>
      )}

      <OpsSectionHeading
        index="01"
        title="Response signal"
        detail="Severity distribution across the current seven-day window."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Total (7d)"
          value={result.total}
          tone={result.total > 0 ? 'warn' : 'good'}
          hint="all severity levels"
          index="01"
        />
        <Stat
          label="Critical"
          value={result.bySeverity.critical}
          tone={result.bySeverity.critical > 0 ? 'bad' : 'default'}
          index="02"
        />
        <Stat
          label="High"
          value={result.bySeverity.high}
          tone={result.bySeverity.high > 0 ? 'bad' : 'default'}
          index="03"
        />
        <Stat
          label="Medium / low"
          value={result.bySeverity.medium + result.bySeverity.low}
          index="04"
        />
      </div>

      <OpsSectionHeading
        index="02"
        title="Incident composition"
        detail="Compare event classes and severity before opening the row-level record."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <OpsSectionHeading
        index="03"
        title="Incident ledger"
        detail={`${result.incidents.length} records shown from the current query.`}
      />
      <Card>
        <IncidentsTable incidents={result.incidents} />
      </Card>
    </div>
  );
}
