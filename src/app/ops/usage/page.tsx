import { getApiUsage } from '@/lib/ops/opsQueries';

import UsageEndpointsTable from '../components/UsageEndpointsTable';
import { rangeLabel, rangeToHours } from '../range';
import RefreshControl from '../RefreshControl';
import TimeRangePicker from '../TimeRangePicker';
import {
  PageHeader,
  Stat,
  Card,
  EmptyState,
  ErrorBanner,
  formatCompact,
  tableCls,
  thCls,
  trCls,
} from '../ui';

export const metadata = {
  title: 'API Usage - Insight Ops',
};

export default async function OpsUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const hours = rangeToHours(range);
  const label = rangeLabel(range);
  const usage = await getApiUsage(hours);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="API Usage"
        subtitle={`Request volume, errors & latency from api_key_usage (last ${usage.windowHours}h)`}
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex items-center gap-3">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
          </div>
        }
      />

      {usage.errored && (
        <ErrorBanner message="API 用量数据查询失败，以下请求/错误计数与延迟可能不完整或不可用。" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label={`Requests (${label})`} value={formatCompact(usage.totalRequests)} />
        <Stat
          label="Errors (5xx)"
          value={formatCompact(usage.totalErrors)}
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
          <UsageEndpointsTable rows={usage.byEndpoint} />
        </Card>

        <Card title="Hourly latency (p50 / p95 / p99 ms)">
          {usage.byHour.length === 0 ? (
            <EmptyState message="no usage in window" />
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Hour</th>
                    <th className={`${thCls} text-right`}>Reqs</th>
                    <th className={`${thCls} text-right`}>p50</th>
                    <th className={`${thCls} text-right`}>p95</th>
                    <th className={`${thCls} text-right`}>p99</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.byHour.slice(-24).map((h) => (
                    <tr key={h.hour} className={trCls}>
                      <td className="py-2 pr-3 tabular-nums text-slate-500">
                        {h.hour.slice(5, 13)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                        {formatCompact(h.requests)}
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
