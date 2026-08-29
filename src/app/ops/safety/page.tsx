import { getSigningIntegrity } from '@/lib/ops/opsQueries';

import TrendChart from '../components/TrendChart';
import { rangeLabel, rangeToHours } from '../range';
import RefreshControl from '../RefreshControl';
import TimeRangePicker from '../TimeRangePicker';
import {
  PageHeader,
  Stat,
  Card,
  Badge,
  EmptyState,
  ErrorBanner,
  tableCls,
  thCls,
  trCls,
} from '../ui';

export const metadata = {
  title: 'Safety & Attestation - Insight Ops',
};

export default async function OpsSafetyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const hours = rangeToHours(range);
  const label = rangeLabel(range);
  const { summary, trend, unsignedBlocks } = await getSigningIntegrity(hours);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Safety & Attestation"
        subtitle="EIP-712 signing provenance on every pre-trade check (pre_trade_checks + 0026)"
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex items-center gap-3">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
          </div>
        }
      />

      {summary.errored && <ErrorBanner message="签名数据查询失败，以下数字可能不完整或不可用。" />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label={`Signing rate (${label})`}
          value={summary.signedRatePct != null ? `${summary.signedRatePct}%` : '—'}
          tone={
            summary.signedRatePct == null
              ? 'default'
              : summary.signedRatePct < 100
                ? 'warn'
                : 'good'
          }
          hint={`${summary.signed} / ${summary.total} checks`}
        />
        <Stat
          label="Unsigned BLOCKs"
          value={summary.unsignedBlocks}
          tone={summary.unsignedBlocks > 0 ? 'bad' : 'good'}
          hint="canary failure quadrant"
        />
        <Stat
          label="Coverage INSUFFICIENT"
          value={summary.insufficientCoverage}
          tone={summary.insufficientCoverage > 0 ? 'warn' : 'default'}
          hint="v2 quorum gate failed"
        />
        <Stat
          label="Unresolved assets"
          value={summary.unresolvedAssets}
          tone={summary.unresolvedAssets > 0 ? 'warn' : 'default'}
          hint="registry gap in signed artifact"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Distinct attesters"
          value={summary.distinctAttesters}
          hint="key-rotation watch"
        />
        <Stat label="v1 rows" value={summary.v1Rows} hint="11-field schema" />
        <Stat label="v2 rows" value={summary.v2Rows} hint="26-field CAIP-19" />
        <Stat label="v3 rows" value={summary.v3Rows} hint="27-field, signed threshold" />
        <Stat label="Window" value={`${summary.windowHours}h`} hint="rolling" />
      </div>

      <Card title="Signing trend (hourly, signed vs unsigned)" className="mb-6">
        <TrendChart trend={trend} />
      </Card>

      <Card title={`Unsigned BLOCKs (latest ${unsignedBlocks.length})`}>
        {unsignedBlocks.length === 0 ? (
          <EmptyState message="all BLOCKs signed" />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  <th className={thCls}>Time</th>
                  <th className={thCls}>Asset</th>
                  <th className={thCls}>Chain</th>
                  <th className={thCls}>Action</th>
                  <th className={thCls}>Coverage</th>
                  <th className={thCls}>Schema</th>
                </tr>
              </thead>
              <tbody>
                {unsignedBlocks.map((b) => (
                  <tr key={b.id} className={trCls}>
                    <td className="py-2 pr-3 tabular-nums text-gray-500">
                      {new Date(b.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-2 pr-3 font-medium text-gray-800">{b.asset}</td>
                    <td className="py-2 pr-3 tabular-nums text-gray-500">{b.chain_id}</td>
                    <td className="py-2 pr-3 text-gray-600">{b.action}</td>
                    <td className="py-2 pr-3">
                      {b.coverage_status ? (
                        <Badge tone="warn">{b.coverage_status}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-gray-500">
                      v{b.schema_version ?? '?'}
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
