import Link from 'next/link';

import { getMlOutcomeMetrics } from '@/lib/api/services/mlOutcomeMetrics';
import { getModelStatus } from '@/lib/ml/inference';
import { getOracleWatchIntegrity, getSigningIntegrity } from '@/lib/ops/opsQueries';

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
  OpsSectionHeading,
  OpsScopeNote,
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
  const [{ summary, trend, unsignedBlocks }, watch, mlStatus, mlOutcome] = await Promise.all([
    getSigningIntegrity(hours),
    getOracleWatchIntegrity(hours),
    Promise.resolve(getModelStatus()),
    getMlOutcomeMetrics(Math.max(hours, 24 * 7)),
  ]);
  const w = watch.summary;

  return (
    <div className="ops-view ops-safety-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="07"
        context="Assurance systems"
        title="Safety & Attestation"
        subtitle="Follow each safety decision from its signed check through Oracle Watch and realized model outcomes."
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <TimeRangePicker current={range ?? '24h'} />
            <RefreshControl />
            <Link href="/ops/safety/workflows" className="ops-page-link">
              Workflow reviews <span aria-hidden="true">↗</span>
            </Link>
          </div>
        }
      />

      <OpsScopeNote label="Reading the windows">
        The selected range applies to signing and Oracle Watch. Realized model outcomes use at least
        seven days of completed labels; training metrics are shown separately from live outcomes.
      </OpsScopeNote>

      {summary.errored && <ErrorBanner message="签名数据查询失败，以下数字可能不完整或不可用。" />}

      <OpsSectionHeading
        index="01"
        title="Attestation integrity"
        detail="Signing completeness and safety gates across the selected pre-trade window."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          index="01"
        />
        <Stat
          label="Unsigned BLOCKs"
          value={summary.unsignedBlocks}
          tone={summary.unsignedBlocks > 0 ? 'bad' : 'good'}
          hint="canary failure quadrant"
          index="02"
        />
        <Stat
          label="Coverage INSUFFICIENT"
          value={summary.insufficientCoverage}
          tone={summary.insufficientCoverage > 0 ? 'warn' : 'default'}
          hint="v2 quorum gate failed"
          index="03"
        />
        <Stat
          label="Unresolved assets"
          value={summary.unresolvedAssets}
          tone={summary.unresolvedAssets > 0 ? 'warn' : 'default'}
          hint="registry gap in signed artifact"
          index="04"
        />
      </div>

      <div className="ops-secondary-grid ops-safety-secondary mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Distinct attesters"
          value={summary.distinctAttesters}
          hint="key-rotation watch"
          index="05"
        />
        <Stat label="v1 rows" value={summary.v1Rows} hint="11-field schema" index="06" />
        <Stat label="v2 rows" value={summary.v2Rows} hint="26-field CAIP-19" index="07" />
        <Stat label="v3 rows" value={summary.v3Rows} hint="27-field, signed threshold" index="08" />
        <Stat label="Window" value={`${summary.windowHours}h`} hint="rolling" index="09" />
      </div>

      <Card title="Signing trend / hourly" className="mt-5">
        {trend.length > 0 && (
          <p className="ops-table-scroll-hint lg:hidden">Scroll sideways to inspect the chart →</p>
        )}
        <div className={trend.length > 0 ? 'ops-trend-scroll' : ''}>
          <TrendChart trend={trend} />
        </div>
      </Card>

      <Card title={`Unsigned BLOCKs / latest ${unsignedBlocks.length}`} className="mt-4">
        {unsignedBlocks.length === 0 ? (
          <EmptyState message="all BLOCKs signed" />
        ) : (
          <div>
            <p className="ops-table-scroll-hint lg:hidden">
              Scroll sideways to inspect every column →
            </p>
            <div className="ops-table-scroll overflow-x-auto">
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
          </div>
        )}
      </Card>

      <OpsSectionHeading
        index="02"
        title="Oracle Watch"
        detail="Per-issuance receipts, independent-source gates, and collector spine freshness."
      />

      {w.errored && (
        <ErrorBanner message="Oracle Watch 数据查询失败，以下数字可能不完整或不可用。" />
      )}

      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={`Watch signing rate (${label})`}
          value={w.attestedRatePct != null ? `${w.attestedRatePct}%` : '—'}
          tone={w.attestedRatePct == null ? 'default' : w.attestedRatePct < 100 ? 'warn' : 'good'}
          hint={`${w.attested} / ${w.total} judgments`}
          index="01"
        />
        <Stat
          label="Unattested halts"
          value={w.unattestedHalts}
          tone={w.unattestedHalts > 0 ? 'bad' : 'good'}
          hint={`of ${w.halts} halts issued`}
          index="02"
        />
        <Stat
          label="Independence failures"
          value={w.independenceFailures}
          tone={w.independenceFailures > 0 ? 'warn' : 'default'}
          hint="non-derived group gate"
          index="03"
        />
        <Stat
          label="Quorum failures"
          value={w.quorumFailures}
          tone={w.quorumFailures > 0 ? 'warn' : 'default'}
          hint="participant count gate"
          index="04"
        />
      </div>

      <div className="ops-secondary-grid mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Spine freshness"
          value={w.spineAgeMinutes != null ? `${w.spineAgeMinutes}m` : '—'}
          tone={w.spineStale ? 'bad' : 'good'}
          hint={w.spineStale ? 'collector behind or down' : 'within 30-min cadence'}
          index="05"
        />
        <Stat
          label="Universe gaps"
          value={w.universeGaps.length}
          tone={w.universeGaps.length > 0 ? 'warn' : 'good'}
          hint="committed pairs with no spine row"
          index="06"
        />
        <Stat label="Distinct pairs" value={w.distinctPairs} hint="usage breadth" index="07" />
        <Stat
          label="Window"
          value={`${w.windowHours}h`}
          hint={
            w.spineLastEvaluatedAt
              ? `newest ${w.spineLastEvaluatedAt.slice(0, 16).replace('T', ' ')}`
              : 'no spine rows'
          }
          index="08"
        />
      </div>

      <Card title="Watch attention required" className="mt-5">
        {w.universeGaps.length === 0 && watch.unattestedHalts.length === 0 ? (
          <EmptyState message="spine complete and every halt carried a receipt" />
        ) : (
          <div className="space-y-4">
            {w.universeGaps.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Committed pairs with no spine row in the window — the collector is not writing
                  them, so <code>/history</code> will return empty for these.
                </div>
                <div className="flex flex-wrap gap-2">
                  {w.universeGaps.map((gap) => (
                    <Badge key={gap} tone="warn">
                      {gap}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {watch.unattestedHalts.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">
                  Halts issued without a receipt — we told an agent to stop and gave it nothing to
                  prove later.
                </div>
                <p className="ops-table-scroll-hint lg:hidden">
                  Scroll sideways to inspect every column →
                </p>
                <div className="ops-table-scroll overflow-x-auto">
                  <table className={tableCls}>
                    <thead>
                      <tr>
                        <th className={thCls}>Time</th>
                        <th className={thCls}>Pair</th>
                        <th className={thCls}>Verdict</th>
                        <th className={thCls}>Reason codes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watch.unattestedHalts.map((h, i) => (
                        <tr key={`${h.created_at}-${i}`} className={trCls}>
                          <td className="py-2 pr-3 tabular-nums text-gray-500">
                            {new Date(h.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                          </td>
                          <td className="py-2 pr-3 font-medium text-gray-800">
                            {h.symbol}
                            {h.chain ? ` @ ${h.chain}` : ' (global)'}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge tone="bad">{h.verdict ?? '?'}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-gray-600">
                            {(h.reason_codes ?? []).join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <OpsSectionHeading
        index="03"
        title="Model outcomes"
        detail="Training verification and realized results on labeled 1h and 6h checks."
      />

      {mlOutcome.errored && (
        <ErrorBanner message="ML 闭环指标查询失败， realized 数字可能不完整或不可用。" />
      )}

      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Model"
          value={mlStatus.active ? 'active' : 'inactive'}
          tone={mlStatus.active ? 'good' : 'warn'}
          hint={
            mlStatus.trainedAt
              ? `trained ${mlStatus.trainedAt.slice(0, 10)}`
              : 'no model trained yet'
          }
          index="01"
        />
        <Stat
          label="Verified horizons"
          value={mlStatus.horizons.join(', ') || '—'}
          hint="self-verification vs XGBoost"
          index="02"
        />
        <Stat
          label={`6h labeled checks (${mlOutcome.windowHours}h)`}
          value={mlOutcome.labeled}
          hint={`${mlOutcome.positives} positive outcomes`}
          index="03"
        />
        <Stat
          label={`6h realized AUC (${mlOutcome.windowHours}h)`}
          value={mlOutcome.auc !== null ? mlOutcome.auc.toFixed(3) : '—'}
          tone={mlOutcome.auc !== null && mlOutcome.auc < 0.6 ? 'warn' : 'default'}
          hint="live 6h score vs 6h outcome"
          index="04"
        />
      </div>

      <Card title="Training verification / out-of-time metrics" className="mt-5">
        {mlStatus.horizonDetails.length === 0 ? (
          <EmptyState message="no active model — pre-trade falls back to the rule-based score" />
        ) : (
          <div>
            <p className="ops-table-scroll-hint lg:hidden">
              Scroll sideways to inspect every column →
            </p>
            <div className="ops-table-scroll overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Horizon</th>
                    <th className={thCls}>Verified</th>
                    <th className={thCls}>Test AUC</th>
                    <th className={thCls}>High threshold</th>
                    <th className={thCls}>Precision @high</th>
                    <th className={thCls}>Recall @high</th>
                  </tr>
                </thead>
                <tbody>
                  {mlStatus.horizonDetails.map((h) => (
                    <tr key={h.name} className={trCls}>
                      <td className="py-2 pr-3 font-medium text-gray-800">{h.name}</td>
                      <td className="py-2 pr-3">
                        {h.verified ? <Badge tone="good">yes</Badge> : <Badge tone="bad">no</Badge>}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">
                        {h.auc !== null ? h.auc.toFixed(4) : '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">
                        {h.highThreshold != null ? h.highThreshold.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">
                        {h.precision !== null ? h.precision.toFixed(4) : '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">
                        {h.recall !== null ? h.recall.toFixed(4) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Card title="Realized outcomes / labeled checks" className="mt-4">
        <p className="ops-table-scroll-hint lg:hidden">Scroll sideways to inspect every column →</p>
        <div className="ops-table-scroll overflow-x-auto">
          <table className={`${tableCls} ops-wide-table`}>
            <thead>
              <tr>
                <th className={thCls}>Horizon</th>
                <th className={thCls}>Labeled</th>
                <th className={thCls}>Positives</th>
                <th className={thCls}>AUC</th>
                <th className={thCls}>High threshold</th>
                <th className={thCls}>High alerts</th>
                <th className={thCls}>Precision @high</th>
                <th className={thCls}>Recall @high</th>
              </tr>
            </thead>
            <tbody>
              {(['1h', '6h'] as const).map((name) => {
                const horizon = mlOutcome.byHorizon[name];
                const high = horizon?.buckets.find(
                  (bucket) => bucket.threshold === horizon.operatingThresholds.high
                );
                return (
                  <tr key={name} className={trCls}>
                    <td className="py-2 pr-3 font-medium text-gray-800">{name}</td>
                    <td className="py-2 pr-3">{horizon?.labeled ?? '—'}</td>
                    <td className="py-2 pr-3">{horizon?.positives ?? '—'}</td>
                    <td className="py-2 pr-3">{horizon?.auc?.toFixed(3) ?? '—'}</td>
                    <td className="py-2 pr-3">
                      {horizon?.operatingThresholds.high.toFixed(3) ?? '—'}
                    </td>
                    <td className="py-2 pr-3">{high?.n ?? '—'}</td>
                    <td className="py-2 pr-3">
                      {high?.precision != null ? `${(high.precision * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {high?.recall != null ? `${(high.recall * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="6h precision / score bucket" className="mt-4">
        {mlOutcome.labeled === 0 ? (
          <EmptyState message="no corrected 6h labels yet — backfill needs a completed observation window" />
        ) : (
          <div>
            <p className="ops-table-scroll-hint lg:hidden">
              Scroll sideways to inspect every column →
            </p>
            <div className="ops-table-scroll overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Score ≥</th>
                    <th className={thCls}>Checks</th>
                    <th className={thCls}>Abnormal outcomes</th>
                    <th className={thCls}>Realized precision</th>
                    <th className={thCls}>Recall</th>
                  </tr>
                </thead>
                <tbody>
                  {mlOutcome.buckets.map((b) => (
                    <tr key={b.threshold} className={trCls}>
                      <td className="py-2 pr-3 tabular-nums text-gray-800">{b.threshold}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">{b.n}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">{b.positives}</td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">
                        {b.precision !== null ? `${(b.precision * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-gray-600">
                        {b.recall !== null ? `${(b.recall * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
