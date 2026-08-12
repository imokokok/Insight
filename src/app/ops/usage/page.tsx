import { getApiUsage } from '@/lib/ops/opsQueries';

import RefreshButton from '../RefreshButton';
import { PageHeader, Stat, Card, Badge, EmptyState } from '../ui';

export const metadata = {
  title: 'API Usage - Insight Ops',
};

export default async function OpsUsagePage() {
  const usage = await getApiUsage(24);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="API Usage"
        subtitle={`Request volume, errors & latency from api_key_usage (last ${usage.windowHours}h)`}
        actions={<RefreshButton />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Requests (24h)" value={usage.totalRequests.toLocaleString()} />
        <Stat
          label="Errors (5xx)"
          value={usage.totalErrors.toLocaleString()}
          tone={usage.totalErrors > 0 ? 'warn' : 'good'}
        />
        <Stat
          label="Error rate"
          value={usage.errorRatePct != null ? `${usage.errorRatePct}%` : '—'}
          tone={usage.errorRatePct != null && usage.errorRatePct > 1 ? 'warn' : 'good'}
        />
        <Stat label="Endpoints" value={usage.byEndpoint.length} hint="distinct" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="By endpoint">
          {usage.byEndpoint.length === 0 ? (
            <EmptyState message="no usage in window" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-3 font-medium">Endpoint</th>
                    <th className="py-2 pr-3 font-medium text-right">Requests</th>
                    <th className="py-2 pr-3 font-medium text-right">Errors</th>
                    <th className="py-2 pr-3 font-medium text-right">Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.byEndpoint.slice(0, 25).map((e) => (
                    <tr key={e.endpoint} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-700">{e.endpoint}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                        {e.requests.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {e.errors > 0 ? (
                          <Badge tone="warn">{e.errors}</Badge>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                        {e.avgMs ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Hourly latency (p50 / p95 / p99 ms)">
          {usage.byHour.length === 0 ? (
            <EmptyState message="no usage in window" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-3 font-medium">Hour</th>
                    <th className="py-2 pr-3 font-medium text-right">Reqs</th>
                    <th className="py-2 pr-3 font-medium text-right">p50</th>
                    <th className="py-2 pr-3 font-medium text-right">p95</th>
                    <th className="py-2 pr-3 font-medium text-right">p99</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.byHour.slice(-24).map((h) => (
                    <tr key={h.hour} className="border-b border-slate-50">
                      <td className="py-2 pr-3 tabular-nums text-slate-500">
                        {h.hour.slice(5, 13)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                        {h.requests.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                        {h.p50 ?? '—'}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                        {h.p95 ?? '—'}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                        {h.p99 ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
