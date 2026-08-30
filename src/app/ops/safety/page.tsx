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

      {/* ---- Oracle Watch ------------------------------------------------ */}
      <div className="mt-10 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Oracle Watch</h2>
        <p className="text-sm text-gray-500">
          Per-issuance receipts (<code>oracle_watch_checks</code>) and collector spine freshness (
          <code>feed_health_snapshots</code>)
        </p>
      </div>

      {w.errored && (
        <ErrorBanner message="Oracle Watch 数据查询失败，以下数字可能不完整或不可用。" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label={`Watch signing rate (${label})`}
          value={w.attestedRatePct != null ? `${w.attestedRatePct}%` : '—'}
          tone={w.attestedRatePct == null ? 'default' : w.attestedRatePct < 100 ? 'warn' : 'good'}
          hint={`${w.attested} / ${w.total} judgments`}
        />
        <Stat
          label="Unattested halts"
          value={w.unattestedHalts}
          tone={w.unattestedHalts > 0 ? 'bad' : 'good'}
          hint={`of ${w.halts} halts issued`}
        />
        <Stat
          label="Independence failures"
          value={w.independenceFailures}
          tone={w.independenceFailures > 0 ? 'warn' : 'default'}
          hint="non-derived group gate"
        />
        <Stat
          label="Quorum failures"
          value={w.quorumFailures}
          tone={w.quorumFailures > 0 ? 'warn' : 'default'}
          hint="participant count gate"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Spine freshness"
          value={w.spineAgeMinutes != null ? `${w.spineAgeMinutes}m` : '—'}
          tone={w.spineStale ? 'bad' : 'good'}
          hint={w.spineStale ? 'collector behind or down' : 'within 30-min cadence'}
        />
        <Stat
          label="Universe gaps"
          value={w.universeGaps.length}
          tone={w.universeGaps.length > 0 ? 'warn' : 'good'}
          hint="committed pairs with no spine row"
        />
        <Stat label="Distinct pairs" value={w.distinctPairs} hint="usage breadth" />
        <Stat
          label="Window"
          value={`${w.windowHours}h`}
          hint={
            w.spineLastEvaluatedAt
              ? `newest ${w.spineLastEvaluatedAt.slice(0, 16).replace('T', ' ')}`
              : 'no spine rows'
          }
        />
      </div>

      <Card title="Watch attention required">
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
                <div className="overflow-x-auto">
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

      {/* ---- ML model health ---------------------------------------------- */}
      <div className="mt-10 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">ML model health</h2>
        <p className="text-sm text-gray-500">
          Manipulation-risk model status, out-of-time test metrics, and realized accuracy on labeled
          pre-trade checks (<code>ml_score</code> × <code>outcome_label</code> closed loop)
        </p>
      </div>

      {mlOutcome.errored && (
        <ErrorBanner message="ML 闭环指标查询失败， realized 数字可能不完整或不可用。" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Model"
          value={mlStatus.active ? 'active' : 'inactive'}
          tone={mlStatus.active ? 'good' : 'warn'}
          hint={
            mlStatus.trainedAt
              ? `trained ${mlStatus.trainedAt.slice(0, 10)}`
              : 'no model trained yet'
          }
        />
        <Stat
          label="Verified horizons"
          value={mlStatus.horizons.join(', ') || '—'}
          hint="self-verification vs XGBoost"
        />
        <Stat
          label="Labeled checks (7d)"
          value={mlOutcome.labeled}
          hint={`${mlOutcome.positives} positive outcomes`}
        />
        <Stat
          label="Realized AUC (7d)"
          value={mlOutcome.auc !== null ? mlOutcome.auc.toFixed(3) : '—'}
          tone={mlOutcome.auc !== null && mlOutcome.auc < 0.6 ? 'warn' : 'default'}
          hint="live ml_score vs outcome_label"
        />
      </div>

      <Card title="ML horizons (out-of-time test metrics from training)">
        {mlStatus.horizonDetails.length === 0 ? (
          <EmptyState message="no active model — pre-trade falls back to the rule-based score" />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  <th className={thCls}>Horizon</th>
                  <th className={thCls}>Verified</th>
                  <th className={thCls}>Test AUC</th>
                  <th className={thCls}>Precision @0.5</th>
                  <th className={thCls}>Recall @0.5</th>
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
        )}
      </Card>

      <Card title="Realized precision by score bucket (labeled checks)" className="mt-6">
        {mlOutcome.labeled === 0 ? (
          <EmptyState message="no labeled checks yet — the outcome backfill labels them 6h after each check" />
        ) : (
          <div className="overflow-x-auto">
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
        )}
      </Card>
    </div>
  );
}
