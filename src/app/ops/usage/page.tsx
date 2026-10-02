import Link from 'next/link';

import { getCreditUsage, getApiUsage } from '@/lib/ops/opsQueries';

import UsageEndpointsTable from '../components/UsageEndpointsTable';
import { rangeLabel, rangeToHours } from '../range';
import RefreshControl from '../RefreshControl';
import TimeRangePicker from '../TimeRangePicker';
import {
  Card,
  EmptyState,
  ErrorBanner,
  OpsScopeNote,
  OpsSectionHeading,
  PageHeader,
  Stat,
  formatCompact,
  tableCls,
  thCls,
  trCls,
} from '../ui';

export const metadata = {
  title: 'API Usage - Insight Ops',
};

function formatHour(hour: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).format(new Date(`${hour}:00:00Z`));
}

export default async function OpsUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const hours = rangeToHours(range);
  const label = rangeLabel(range);
  const [usage, credit] = await Promise.all([getApiUsage(hours), getCreditUsage(hours)]);
  const recentHours = usage.byHour.slice(-24);
  const peakRequests = Math.max(1, ...recentHours.map((hour) => hour.requests));

  return (
    <div className="ops-view ops-commercial-view ops-usage-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="09"
        context="Traffic & credits"
        title="API usage"
        subtitle="Follow request volume, server errors, latency, and credit movement in one observation window."
        updatedAt={new Date().toISOString()}
        actions={
          <div className="ops-usage-actions">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
          </div>
        }
      />

      <OpsScopeNote label="Reading this record">
        Requests and 5xx errors come from <code>api_key_usage</code>; credit movement comes from a
        separate ledger. Both use the selected {label} window. Net flow is credited minus spent, not
        a current wallet balance. View the cumulative <Link href="/ops/billing">key inventory</Link>
        .
      </OpsScopeNote>

      {usage.errored && <ErrorBanner message="API 用量数据查询失败。请求、错误和延迟暂不可用。" />}
      {credit.errored && (
        <ErrorBanner message="信用账本数据查询失败。信用消耗与入账暂不可用；请确认迁移 0039。" />
      )}

      <OpsSectionHeading
        index="01"
        title="Traffic signal"
        detail={`Requests and 5xx responses observed in the last ${usage.windowHours} hours.`}
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Requests"
          value={usage.errored ? '—' : formatCompact(usage.totalRequests)}
          hint={label}
          index="01"
        />
        <Stat
          label="Server errors"
          value={usage.errored ? '—' : formatCompact(usage.totalErrors)}
          tone={!usage.errored && usage.totalErrors > 0 ? 'warn' : 'default'}
          hint="5xx responses"
          index="02"
        />
        <Stat
          label="Error rate"
          value={usage.errored || usage.errorRatePct == null ? '—' : `${usage.errorRatePct}%`}
          tone={
            usage.errored || usage.errorRatePct == null
              ? 'default'
              : usage.errorRatePct > 1
                ? 'warn'
                : 'good'
          }
          hint="5xx / requests"
          index="03"
        />
        <Stat
          label="Endpoints"
          value={usage.errored ? '—' : usage.byEndpoint.length}
          hint="distinct routes"
          index="04"
        />
      </div>

      <OpsSectionHeading
        index="02"
        title="Request rhythm"
        detail="The latest 24 recorded hours in this window; gaps are omitted. Times use Beijing time."
      />
      <Card className="ops-usage-rhythm-card">
        {usage.errored ? (
          <EmptyState message="Request history unavailable" />
        ) : recentHours.length === 0 ? (
          <EmptyState message="No requests in the selected window" />
        ) : (
          <figure>
            <div className="ops-usage-chart-meta">
              <div>
                <span>HOURLY REQUESTS</span>
                <strong>{formatCompact(usage.totalRequests)} total</strong>
              </div>
              <p>Peak recorded hour / {formatCompact(peakRequests)} requests</p>
            </div>
            <div
              className="ops-usage-chart-scroll"
              role="img"
              aria-label="Hourly request volume; exact values are listed in the table below"
            >
              <div className="ops-usage-chart" aria-hidden="true">
                {recentHours.map((hour) => (
                  <div className="ops-usage-chart-column" key={hour.hour}>
                    <div className="ops-usage-chart-bar-wrap">
                      <span
                        className={`ops-usage-chart-bar ${hour.errors > 0 ? 'has-errors' : ''}`}
                        style={{ height: `${Math.max(4, (hour.requests / peakRequests) * 100)}%` }}
                      />
                    </div>
                    <span className="ops-usage-chart-tick">{formatHour(hour.hour).slice(-2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <figcaption className="ops-usage-chart-caption">
              <span>
                <i /> Requests
              </span>
              <span>
                <i /> Hours containing 5xx
              </span>
              <span>Hour labels / Beijing time</span>
            </figcaption>
          </figure>
        )}
      </Card>

      <OpsSectionHeading
        index="03"
        title="Credit movement"
        detail="Credits charged for API calls and credits entering the ledger in the same window."
      />
      <div className="ops-secondary-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Credits spent"
          value={credit.errored ? '—' : credit.totalSpent.toLocaleString()}
          hint="usage charges / cr"
          index="01"
        />
        <Stat
          label="Billed calls"
          value={credit.errored ? '—' : formatCompact(credit.billedCalls)}
          hint="credit-metered"
          index="02"
        />
        <Stat
          label="Wallet credited"
          value={credit.errored ? '—' : credit.totalCredited.toLocaleString()}
          hint="topups + grants / cr"
          index="03"
        />
        <Stat
          label="Net flow"
          value={credit.errored ? '—' : credit.net.toLocaleString()}
          tone={!credit.errored && credit.net < 0 ? 'warn' : 'default'}
          hint="credited − spent / cr"
          index="04"
        />
      </div>

      <OpsSectionHeading
        index="04"
        title="Usage ledger"
        detail="Inspect the endpoints behind the totals and latency across recently recorded hours."
      />
      <div className="ops-usage-ledger grid gap-4 xl:grid-cols-2">
        <Card title="By endpoint">
          {usage.errored ? (
            <EmptyState message="Endpoint breakdown unavailable" />
          ) : (
            <UsageEndpointsTable rows={usage.byEndpoint} />
          )}
        </Card>

        <Card title="Hourly latency / ms">
          {usage.errored ? (
            <EmptyState message="Latency history unavailable" />
          ) : recentHours.length === 0 ? (
            <EmptyState message="No usage in the selected window" />
          ) : (
            <>
              <p className="ops-table-scroll-hint lg:hidden">
                Scroll sideways to inspect every column →
              </p>
              <div className="ops-table-scroll overflow-x-auto">
                <table className={tableCls}>
                  <thead>
                    <tr>
                      <th className={thCls} scope="col">
                        Hour / Beijing
                      </th>
                      <th className={`${thCls} text-right`} scope="col">
                        Reqs
                      </th>
                      <th className={`${thCls} text-right`} scope="col">
                        p50
                      </th>
                      <th className={`${thCls} text-right`} scope="col">
                        p95
                      </th>
                      <th className={`${thCls} text-right`} scope="col">
                        p99
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHours.map((hour) => (
                      <tr key={hour.hour} className={trCls}>
                        <td className="whitespace-nowrap py-2 pr-3 font-medium text-slate-800">
                          <time dateTime={`${hour.hour}:00:00Z`}>{formatHour(hour.hour)}</time>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                          {formatCompact(hour.requests)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                          {hour.p50 ?? '—'}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                          {hour.p95 ?? '—'}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                          {hour.p99 ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
