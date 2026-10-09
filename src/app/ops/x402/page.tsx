import Link from 'next/link';

import { getX402Ops } from '@/lib/ops/opsQueries';

import { rangeLabel, rangeToHours } from '../range';
import RefreshControl from '../RefreshControl';
import TimeRangePicker from '../TimeRangePicker';
import {
  Badge,
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
  title: 'Pay-per-call Operations - Insight Ops',
};

function formatUsdc(value: number | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)} USDC`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function shortValue(value: string | null, start = 10, end = 6): string {
  if (!value) return '—';
  return value.length > start + end + 3 ? `${value.slice(0, start)}…${value.slice(-end)}` : value;
}

function statusTone(status: string): 'good' | 'warn' | 'bad' | 'info' | 'default' {
  if (status === 'settled' || status === 'business_succeeded') return 'good';
  if (status === 'quote_issued' || status === 'payment_verified') return 'info';
  if (
    status === 'settlement_failed' ||
    status === 'business_failed' ||
    status === 'verify_failed'
  ) {
    return 'bad';
  }
  if (status === 'payment_rejected') return 'warn';
  return 'default';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    quote_issued: 'Quote issued',
    payment_rejected: 'Payment rejected',
    payment_verified: 'Payment verified',
    business_failed: 'Service failed',
    business_succeeded: 'Service succeeded',
    settled: 'Settled',
    settlement_failed: 'Settlement failed',
    verify_failed: 'Verify failed',
  };
  return labels[status] ?? status;
}

function explorerUrl(network: string, txHash: string): string | null {
  if (network === 'eip155:8453') return `https://basescan.org/tx/${txHash}`;
  if (network === 'eip155:84532') return `https://sepolia.basescan.org/tx/${txHash}`;
  return null;
}

export default async function OpsX402Page({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const hours = rangeToHours(range);
  const label = rangeLabel(range);
  const x402 = await getX402Ops(hours);
  const maxHourlyVolume = Math.max(1, ...x402.byHour.map((item) => item.settled));

  return (
    <div className="ops-view ops-commercial-view mx-auto max-w-[1440px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="11"
        context="Agent payments"
        title="Pay-per-call operations"
        subtitle="Follow x402 and MPP requests from quote through service execution and settlement."
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
          </div>
        }
      />

      <OpsScopeNote label="Data scope">
        Internal x402 and MPP lifecycle audit from <code>x402_settlements</code>, using the selected{' '}
        {label} window. Revenue sums <code>settled</code> rows only. Quote-to-payment is a
        window-level comparison: the initial quote and paid retry are separate HTTP requests and
        cannot be attributed to one another exactly. Payer counts are wallet-address proxies, not
        customer identities.
      </OpsScopeNote>

      {x402.errored && (
        <ErrorBanner message="付费调用运营数据暂不可用。请确认 migrations 0079 和 0080 已应用、服务端 Supabase 凭据可读，并检查 x402_settlements 查询错误。" />
      )}

      <OpsSectionHeading
        index="01"
        title="Payment signal"
        detail={`Lifecycle events recorded in the last ${label}; successful settlement amount is gross USDC received.`}
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Gross settled"
          value={x402.errored ? '—' : formatUsdc(x402.grossUsdc)}
          hint="settled rows only"
          tone={!x402.errored && x402.grossUsdc > 0 ? 'good' : 'default'}
          index="01"
        />
        <Stat
          label="Settled calls"
          value={x402.errored ? '—' : formatCompact(x402.settled)}
          hint="unique request IDs"
          index="02"
        />
        <Stat
          label="Quotes issued"
          value={x402.errored ? '—' : formatCompact(x402.quotes)}
          hint="402 challenges"
          index="03"
        />
        <Stat
          label="Repeat payers"
          value={x402.errored ? '—' : formatCompact(x402.repeatPayers)}
          hint={`${formatCompact(x402.uniquePayers)} distinct wallet addresses`}
          index="04"
        />
      </div>

      <OpsSectionHeading
        index="02"
        title="Lifecycle conversion"
        detail="Use the stage counts to locate friction. Quote-to-payment rates are approximate because the initial quote and paid retry are separate requests."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Payment / quote volume"
          value={
            x402.errored || x402.quoteToVerifiedPct == null ? '—' : `${x402.quoteToVerifiedPct}%`
          }
          hint={`${formatCompact(x402.verified)} verified · ${formatCompact(x402.paymentRejected)} rejected · ${formatCompact(x402.quotes)} quotes`}
          index="01"
        />
        <Stat
          label="Service success"
          value={
            x402.errored || x402.verificationToBusinessPct == null
              ? '—'
              : `${x402.verificationToBusinessPct}%`
          }
          hint={`${formatCompact(x402.businessSucceeded)} succeeded / ${formatCompact(x402.businessFailed)} failed`}
          tone={!x402.errored && x402.businessFailed > 0 ? 'warn' : 'default'}
          index="02"
        />
        <Stat
          label="Settlement after service"
          value={
            x402.errored || x402.businessToSettlementPct == null
              ? '—'
              : `${x402.businessToSettlementPct}%`
          }
          hint={`${formatCompact(x402.lifecycleSettled)} settled / ${formatCompact(x402.lifecycleSettlementFailed)} failed`}
          tone={!x402.errored && x402.lifecycleSettlementFailed > 0 ? 'warn' : 'default'}
          index="03"
        />
        <Stat
          label="Avg service response"
          value={x402.errored || x402.avgResponseMs == null ? '—' : `${x402.avgResponseMs} ms`}
          hint={
            x402.errored || x402.p95ResponseMs == null
              ? 'business attempts'
              : `p95 ${x402.p95ResponseMs} ms · business attempts`
          }
          index="04"
        />
      </div>

      <OpsScopeNote label="Cost and margin">
        This view reports gross settlement receipts. Facilitator, RPC, data-provider, and hosting
        costs are not attributed per paid call yet, so it does not claim net margin.
      </OpsScopeNote>

      <OpsSectionHeading
        index="03"
        title="Request and revenue rhythm"
        detail="Hourly event totals in the selected window; only confirmed settlements count as revenue."
      />
      <Card title="Settled calls by hour">
        {x402.errored ? (
          <EmptyState message="Pay-per-call trend unavailable" />
        ) : x402.byHour.length === 0 ? (
          <EmptyState message="No pay-per-call lifecycle events in this window" />
        ) : (
          <div className="ops-table-scroll overflow-x-auto">
            <div className="flex min-w-max items-end gap-2 border-b border-gray-200 pb-3 pt-2">
              {x402.byHour.map((item) => (
                <div key={item.hour} className="flex w-14 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-gray-500">
                    {item.settled || ''}
                  </span>
                  <div
                    className="w-7 bg-primary-500/80"
                    style={{ height: `${Math.max(3, (item.settled / maxHourlyVolume) * 100)}px` }}
                    title={`${item.hour}: ${item.settled} settled, ${formatUsdc(item.grossUsdc)}`}
                  />
                  <time
                    className="text-[9px] text-gray-400"
                    dateTime={`${item.hour}:00:00Z`}
                    title={`${item.hour}:00 UTC`}
                  >
                    {new Intl.DateTimeFormat('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                      month: hours > 24 ? '2-digit' : undefined,
                      day: hours > 24 ? '2-digit' : undefined,
                      hour: '2-digit',
                      hour12: false,
                    }).format(new Date(`${item.hour}:00:00Z`))}
                  </time>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
              <span>Quotes: {formatCompact(x402.quotes)}</span>
              <span>Verified: {formatCompact(x402.verified)}</span>
              <span>Settled: {formatCompact(x402.settled)}</span>
              <span>Gross: {formatUsdc(x402.grossUsdc)}</span>
            </div>
          </div>
        )}
      </Card>

      <OpsSectionHeading
        index="04"
        title="Performance by resource"
        detail="Compare usage, service completion, settlement reliability, and realized gross revenue."
      />
      <Card>
        {x402.errored ? (
          <EmptyState message="Resource breakdown unavailable" />
        ) : x402.byResource.length === 0 ? (
          <EmptyState message="No x402 resource activity in this window" />
        ) : (
          <div className="ops-table-scroll overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  {[
                    'Protocol / surface / resource',
                    'Quotes',
                    'Verified',
                    'Service OK',
                    'Service errors',
                    'Settled',
                    'Settle errors',
                    'Gross USDC',
                    'Avg ms',
                  ].map((heading, index) => (
                    <th
                      key={heading}
                      scope="col"
                      className={`${thCls} ${index ? 'text-right' : ''}`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {x402.byResource.map((row) => (
                  <tr key={`${row.protocol}:${row.surface}:${row.resource}`} className={trCls}>
                    <td className="py-2 pr-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {row.protocol}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-gray-400">
                        {row.surface}
                      </div>
                      <div className="max-w-[28rem] break-all font-mono text-xs text-gray-700">
                        {row.resource}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.quotes}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.verified}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.businessSucceeded}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.businessFailed ? <Badge tone="warn">{row.businessFailed}</Badge> : '0'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.settled}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.settlementFailed ? (
                        <Badge tone="warn">{row.settlementFailed}</Badge>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {formatUsdc(row.grossUsdc)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {row.avgResponseMs ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OpsSectionHeading
        index="05"
        title="Recent lifecycle records"
        detail="The audit table includes request-stage rows and confirmed settlement details."
      />
      <Card>
        {x402.errored ? (
          <EmptyState message="Recent pay-per-call records unavailable" />
        ) : x402.recent.length === 0 ? (
          <EmptyState message="No pay-per-call records have been written yet" />
        ) : (
          <>
            <p className="ops-table-scroll-hint lg:hidden">
              Scroll sideways to inspect every column →
            </p>
            <div className="ops-table-scroll max-h-[65vh] overflow-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    {[
                      'Time (Beijing)',
                      'Stage',
                      'Request ID',
                      'Protocol',
                      'Resource',
                      'Network',
                      'Amount',
                      'Payer',
                      'Transaction',
                      'Elapsed ms / error',
                    ].map((heading) => (
                      <th key={heading} scope="col" className={thCls}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {x402.recent.map((row) => {
                    const txUrl = row.txHash ? explorerUrl(row.network, row.txHash) : null;
                    return (
                      <tr key={row.id} className={trCls}>
                        <td className="whitespace-nowrap py-2 pr-3 text-xs tabular-nums text-gray-500">
                          {formatTime(row.createdAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                        </td>
                        <td
                          className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-gray-500"
                          title={row.requestId}
                        >
                          {shortValue(row.requestId, 12, 6)}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone={row.protocol === 'mpp' ? 'info' : 'default'}>
                            {row.protocol}
                          </Badge>
                        </td>
                        <td className="max-w-56 break-all py-2 pr-3 font-mono text-xs text-gray-700">
                          <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
                            {row.surface}
                          </div>
                          {row.resource ?? 'historical / unclassified'}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-gray-500">
                          {row.network}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs tabular-nums">
                          {formatUsdc(row.amountUsdc)}
                        </td>
                        <td
                          className="py-2 pr-3 font-mono text-xs text-gray-500"
                          title={row.payer ?? undefined}
                        >
                          {shortValue(row.payer)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {row.txHash && txUrl ? (
                            <Link
                              href={txUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary-700 hover:underline"
                            >
                              {shortValue(row.txHash)}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="max-w-60 py-2 pr-3 text-xs text-gray-500">
                          {row.responseTimeMs == null ? '—' : `${row.responseTimeMs} ms`}
                          {row.errorReason && (
                            <div className="mt-1 break-words text-danger-700">
                              {row.errorReason}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Showing latest {x402.recent.length} lifecycle records ·{' '}
              <Link href="/ops/usage" className="text-primary-700 hover:underline">
                API key usage
              </Link>{' '}
              remains on the existing usage page.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
