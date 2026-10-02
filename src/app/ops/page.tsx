import Link from 'next/link';

import { getOverviewStats } from '@/lib/ops/opsQueries';

import { rangeLabel, rangeToHours } from './range';
import RefreshControl from './RefreshControl';
import TimeRangePicker from './TimeRangePicker';
import { PageHeader, Stat, Card, Badge, ErrorBanner, OpsSectionHeading, OpsScopeNote } from './ui';

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
    <div className="ops-view ops-overview-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="01"
        context="System overview"
        title="Operations overview"
        subtitle="One clear view of feed coverage, signing integrity, and pipeline freshness."
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
          </div>
        }
      />

      {stats.partial && <ErrorBanner message="部分概览数据查询失败，至少有一项指标不可信。" />}

      <OpsScopeNote label="Reading the window">
        The selected range applies to signing rate and unsigned BLOCKs. Incidents use a fixed
        seven-day window; cron freshness uses its own threshold. Select a linked metric to inspect
        the underlying record.
      </OpsScopeNote>

      <OpsSectionHeading
        index="01"
        title="Signals at a glance"
        detail="Coverage and safeguards across the current operating window."
      />
      <div className="ops-signal-grid grid gap-3 md:grid-cols-3">
        <Stat
          label="Active feeds"
          value={stats.feedsActive}
          href="/ops/feeds"
          hint={`${stats.feedsInactive} inactive · ${stats.providers} providers`}
          index="01"
        />
        <Stat
          label={`Signing rate (${label})`}
          value={stats.signedRatePct != null ? `${stats.signedRatePct}%` : '—'}
          tone={signingTone}
          href="/ops/safety"
          hint="signed / total pre-trade checks"
          index="02"
        />
        <Stat
          label={`Unsigned BLOCKs (${label})`}
          value={stats.unsignedBlocks}
          tone={stats.unsignedBlocks > 0 ? 'bad' : 'good'}
          href="/ops/safety"
          hint="Raul canary failure quadrant"
          index="03"
        />
      </div>

      <div className="ops-secondary-grid mt-3 grid gap-3 md:grid-cols-3">
        <Stat
          label="Symbols / chains"
          value={`${stats.symbols} / ${stats.chains}`}
          hint="covered by active feeds"
          index="04"
        />
        <Stat
          label="Incidents (7d)"
          value={stats.incidents7d}
          href="/ops/incidents"
          hint="from incident aggregation"
          index="05"
        />
        <Stat
          label="Cron stale"
          value={stats.cronStale}
          tone={stats.cronStale > 0 ? 'warn' : 'good'}
          href="/ops/cron"
          hint="pipelines past freshness"
          index="06"
        />
      </div>

      <OpsSectionHeading
        index="02"
        title="Follow the signal"
        detail="Move from a headline condition to the source that explains it."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
