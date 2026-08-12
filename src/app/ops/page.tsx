import Link from 'next/link';

import { getOverviewStats } from '@/lib/ops/opsQueries';

import { rangeLabel, rangeToHours } from './range';
import RefreshControl from './RefreshControl';
import TimeRangePicker from './TimeRangePicker';
import { PageHeader, Stat, Card, Badge, ErrorBanner } from './ui';

export const metadata = {
  title: 'Ops Overview - Insight',
};

export default async function OpsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const hours = rangeToHours(range);
  const label = rangeLabel(range);
  const stats = await getOverviewStats(hours);

  const signingTone =
    stats.signedRatePct == null ? 'default' : stats.signedRatePct < 100 ? 'warn' : 'good';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Ops Overview"
        subtitle="One-glance health of the Insight API & safety pipeline"
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex items-center gap-3">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
          </div>
        }
      />

      {stats.partial && <ErrorBanner message="部分概览数据查询失败，至少有一项指标不可信。" />}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Active feeds"
          value={stats.feedsActive}
          hint={`${stats.feedsInactive} inactive · ${stats.providers} providers`}
        />
        <Stat
          label="Symbols / chains"
          value={`${stats.symbols} / ${stats.chains}`}
          hint="covered by active feeds"
        />
        <Stat
          label={`Signing rate (${label})`}
          value={stats.signedRatePct != null ? `${stats.signedRatePct}%` : '—'}
          tone={signingTone}
          hint="signed / total pre-trade checks"
        />
        <Stat
          label={`Unsigned BLOCKs (${label})`}
          value={stats.unsignedBlocks}
          tone={stats.unsignedBlocks > 0 ? 'bad' : 'good'}
          hint="Raul canary failure quadrant"
        />
        <Stat label="Incidents (7d)" value={stats.incidents7d} hint="from incident aggregation" />
        <Stat
          label="Cron stale"
          value={stats.cronStale}
          tone={stats.cronStale > 0 ? 'warn' : 'good'}
          hint="pipelines past freshness"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Signing integrity">
          <p className="text-sm text-gray-600 mb-3">
            Every BLOCK must be signed for Raul&apos;s canary to treat it as an enforceable stop.
            Unsigned BLOCKs fail open silently.
          </p>
          <Link href="/ops/safety" className="text-sm text-gray-900 font-medium underline">
            Open Safety &amp; Attestation →
          </Link>
        </Card>
        <Card title="Quick links">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              <Link href="/ops/feeds" className="underline">
                Feed health &amp; deactivation audit
              </Link>
            </li>
            <li>
              <Link href="/ops/usage" className="underline">
                API usage &amp; latency
              </Link>
            </li>
            <li>
              <Link href="/ops/cron" className="underline">
                Cron &amp; pipeline freshness
              </Link>
            </li>
          </ul>
        </Card>
      </div>

      {stats.unsignedBlocks > 0 && (
        <div className="mt-4">
          <Badge tone="bad">
            {stats.unsignedBlocks} unsigned BLOCKs in last {label}
          </Badge>
        </div>
      )}
    </div>
  );
}
