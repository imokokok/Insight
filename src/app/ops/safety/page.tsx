import { getSigningIntegrity } from '@/lib/ops/opsQueries';

import RefreshButton from '../RefreshButton';
import { PageHeader, Stat, Card, Badge, EmptyState } from '../ui';

export const metadata = {
  title: 'Safety & Attestation - Insight Ops',
};

const MAX_BAR = 120;

export default async function OpsSafetyPage() {
  const { summary, trend, unsignedBlocks } = await getSigningIntegrity(24);

  const maxTrend = Math.max(1, ...trend.map((t) => t.signed + t.unsigned));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Safety & Attestation"
        subtitle="EIP-712 signing provenance on every pre-trade check (pre_trade_checks + 0026)"
        actions={<RefreshButton />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Signing rate (24h)"
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
        <Stat label="Window" value={`${summary.windowHours}h`} hint="rolling" />
      </div>

      <Card title="Signing trend (hourly, signed vs unsigned)" className="mb-6">
        {trend.length === 0 ? (
          <EmptyState message="no pre-trade checks in window" />
        ) : (
          <div className="space-y-1.5">
            {trend.map((t) => {
              const signedW = Math.round((t.signed / maxTrend) * MAX_BAR);
              const unsignedW = Math.round((t.unsigned / maxTrend) * MAX_BAR);
              return (
                <div key={t.hour} className="flex items-center gap-2 text-xs">
                  <span className="w-14 shrink-0 text-slate-400 tabular-nums">
                    {t.hour.slice(5, 13)}
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <div
                      className="h-3 rounded bg-emerald-500"
                      style={{ width: `${signedW}px` }}
                      title={`signed ${t.signed}`}
                    />
                    <div
                      className="h-3 rounded bg-red-500"
                      style={{ width: `${unsignedW}px` }}
                      title={`unsigned ${t.unsigned}`}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right tabular-nums text-slate-500">
                    {t.signed}✓ / {t.unsigned}✗
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title={`Unsigned BLOCKs (latest ${unsignedBlocks.length})`}>
        {unsignedBlocks.length === 0 ? (
          <EmptyState message="all BLOCKs signed" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Asset</th>
                  <th className="py-2 pr-3 font-medium">Chain</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">Coverage</th>
                  <th className="py-2 pr-3 font-medium">Schema</th>
                </tr>
              </thead>
              <tbody>
                {unsignedBlocks.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3 tabular-nums text-slate-500">
                      {new Date(b.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{b.asset}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-500">{b.chain_id}</td>
                    <td className="py-2 pr-3 text-slate-600">{b.action}</td>
                    <td className="py-2 pr-3">
                      {b.coverage_status ? (
                        <Badge tone="warn">{b.coverage_status}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-500">
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
