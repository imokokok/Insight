import Link from 'next/link';

import { getWorkflowQualityReport, WorkflowFilters } from '@/lib/ops/workflowQuality';

import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  OpsScopeNote,
  OpsSectionHeading,
  PageHeader,
  Stat,
  tableCls,
  thCls,
  trCls,
} from '../../ui';

import { saveWorkflowReview } from './actions';

export const metadata = { title: 'Workflow Quality - Insight Ops' };

function WorkflowErrorState({ message }: { message: string }) {
  return (
    <div className="ops-view ops-workflow-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="08"
        context="Workflow review"
        title="Workflow quality"
        subtitle="Inspect completed checks, baseline comparisons, and human review evidence."
        actions={
          <Link href="/ops/safety/workflows" className="ops-page-link">
            Reset filters <span aria-hidden="true">↗</span>
          </Link>
        }
      />
      <ErrorBanner message={message} />
    </div>
  );
}

export default async function WorkflowQualityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const input = Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== ''
    )
  );
  const parsed = WorkflowFilters.safeParse(input);
  if (!parsed.success)
    return <WorkflowErrorState message="Invalid filters. Use days 1–90 and a valid API key ID." />;
  let report;
  try {
    report = await getWorkflowQualityReport(parsed.data);
  } catch {
    return (
      <WorkflowErrorState message="Workflow report unavailable. Check migration 0055 and database availability. No zero-value report has been substituted." />
    );
  }
  const s = report.summary;
  const query = new URLSearchParams(input).toString();
  return (
    <div className="ops-view ops-workflow-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="08"
        context="Workflow review"
        title="Workflow quality"
        subtitle="Inspect completed checks, baseline comparisons, and human review evidence."
        updatedAt={report.generatedAt}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/ops/safety" className="ops-page-link">
              Safety overview <span aria-hidden="true">↗</span>
            </Link>
            <Link className="ops-export-link" href={`/ops/safety/workflows/export?${query}`}>
              Export evidence JSON ↗
            </Link>
          </div>
        }
      />

      <OpsScopeNote label="Evidence scope">
        Counts describe completed assessments in the selected cohort. Paired baseline findings
        require a recorded baseline version; human reviews append a reasoned record to a check.
      </OpsScopeNote>

      <OpsSectionHeading
        index="01"
        title="Select the cohort"
        detail="Narrow the time window, customer key, workflow, or evidence context before interpreting results."
      />
      <form className="ops-workflow-filters" method="get">
        {[
          ['days', 'Days (1–90)', '14'],
          ['apiKeyId', 'Customer API key ID', ''],
          ['workflow', 'Workflow tag', ''],
          ['asset', 'Asset', ''],
          ['chainId', 'Evidence chain ID', ''],
          ['modelVersion', 'Model version', ''],
        ].map(([name, label, fallback]) => (
          <label key={name} className={`ops-workflow-filter ops-workflow-filter-${name}`}>
            <span>{label}</span>
            <input
              className="ops-workflow-input"
              name={name}
              defaultValue={input[name] ?? fallback}
              inputMode={name === 'days' || name === 'chainId' ? 'numeric' : undefined}
            />
          </label>
        ))}
        <label className="ops-workflow-filter">
          <span>Action</span>
          <select className="ops-workflow-input" name="action" defaultValue={input.action ?? ''}>
            <option value="">All</option>
            {['swap', 'borrow', 'repay', 'lend', 'liquidate'].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <button className="ops-workflow-submit" type="submit">
          Apply filters <span aria-hidden="true">↗</span>
        </button>
        <Link href="/ops/safety/workflows" className="ops-workflow-reset">
          Clear filters
        </Link>
      </form>
      {report.truncated && (
        <ErrorBanner message="This report contains only the latest 1,000 matching checks. Narrow filters before interpreting totals." />
      )}

      <OpsSectionHeading
        index="02"
        title="Assessment signal"
        detail="Completed checks, scope completeness, and distinct evidence or market alerts."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Completed checks" value={s.totalChecks} hint={s.sampleAssessment} index="01" />
        <Stat
          label="Complete assessment scope"
          value={s.scopeCompleteChecks}
          hint={`${s.unknownScopeChecks} historical rows have unknown scope`}
          index="02"
        />
        <Stat
          label="Evidence-induced BLOCK"
          value={s.coverageStops}
          hint="Coverage, independence or stale-data rule"
          tone={s.coverageStops > 0 ? 'warn' : 'default'}
          index="03"
        />
        <Stat
          label="Market / protocol alerts"
          value={s.marketAlerts}
          hint="Can coexist with evidence gaps"
          tone={s.marketAlerts > 0 ? 'warn' : 'default'}
          index="04"
        />
      </div>

      <OpsSectionHeading
        index="03"
        title="Baseline comparison"
        detail="Matched customer baselines and the overlap between their alerts and Insight findings."
      />
      <div className="ops-secondary-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Paired baseline rows"
          value={s.pairedBaselines}
          hint="Requires caller baseline version"
          index="05"
        />
        <Stat
          label="Insight-only alerts"
          value={s.insightOnlyAlerts}
          hint="Unverified incremental findings"
          index="06"
        />
        <Stat
          label="Baseline-only alerts"
          value={s.baselineOnlyAlerts}
          hint="Review possible omissions"
          index="07"
        />
        <Stat
          label="Overlapping alerts"
          value={s.overlappingAlerts}
          hint={`p95 assessment ${s.p95LatencyMs ?? '—'} ms`}
          index="08"
        />
      </div>

      <Card title="Interpretation limits" className="mt-5">
        <ul className="ops-workflow-limit-list">
          {s.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="ops-workflow-review-counts">
          <span>Human review</span>
          {Object.entries(s.humanReviews)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · ')}
        </p>
      </Card>

      <OpsSectionHeading
        index="04"
        title="Workflow slices"
        detail="Compare checks and findings by customer key, workflow, asset, and action."
      />
      <Card>
        <p className="ops-table-scroll-hint lg:hidden">Scroll sideways to inspect every column →</p>
        <div className="ops-table-scroll overflow-auto">
          <table className={tableCls}>
            <thead>
              <tr>
                {[
                  'API key',
                  'Workflow',
                  'Asset / chain',
                  'Action',
                  'Checks',
                  'Evidence stops',
                  'Market alerts',
                  'Signed',
                ].map((t) => (
                  <th key={t} className={thCls}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.slices.map((r, i) => (
                <tr key={i} className={trCls}>
                  <td>{r.apiKeyId ?? 'unattributed'}</td>
                  <td>{r.workflow}</td>
                  <td>
                    {r.asset} / {r.chainId}
                  </td>
                  <td>{r.action}</td>
                  <td>{r.checks}</td>
                  <td>{r.coverageStops}</td>
                  <td>{r.marketAlerts}</td>
                  <td>{r.signed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <OpsSectionHeading
        index="05"
        title="Review queue"
        detail="Open a check to inspect its factors, assessment scope, and prior human reviews."
      />
      <Card>
        {!report.rows.length ? (
          <EmptyState message="No matching recorded checks. No baseline or labels have been invented." />
        ) : (
          <div className="ops-review-list">
            {report.rows.slice(0, 30).map((r, index) => (
              <details key={r.id} className="ops-review-record">
                <summary className="ops-review-summary">
                  <span className="ops-review-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="ops-review-title">
                    <strong>
                      {r.asset} / {r.chain_id}
                    </strong>
                    <small>
                      {r.workflow_tag ?? 'untagged'} · {r.action} ·{' '}
                      {new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC
                    </small>
                  </span>
                  <Badge
                    tone={r.verdict === 'BLOCK' ? 'bad' : r.verdict === 'ALLOW' ? 'good' : 'warn'}
                  >
                    {r.verdict}
                  </Badge>
                </summary>
                <div className="ops-review-body">
                  <div className="ops-review-meta">
                    <p>
                      <span>Request</span>
                      {r.request_id ?? 'not recorded'}
                    </p>
                    <p>
                      <span>Model</span>
                      {r.ml_model_version ?? 'none'}
                    </p>
                    <p>
                      <span>Baseline</span>
                      {r.baseline_verdict ?? 'unknown'} / {r.baseline_version ?? 'unversioned'}
                    </p>
                  </div>
                  <p className="ops-review-label">Recorded factors / assessment scope</p>
                  <pre className="ops-review-evidence">
                    {JSON.stringify(
                      { factors: r.contributing_factors, scope: r.assessment_scope },
                      null,
                      2
                    )}
                  </pre>
                  <form action={saveWorkflowReview} className="ops-review-form">
                    <input type="hidden" name="checkId" value={r.id} />
                    <label>
                      <span>Review outcome</span>
                      <select name="status" required>
                        <option value="useful">Useful finding</option>
                        <option value="false_positive">False positive</option>
                        <option value="missed_event">Missed event</option>
                        <option value="inconclusive">Inconclusive</option>
                      </select>
                    </label>
                    <label>
                      <span>Evidence and reason</span>
                      <textarea
                        required
                        name="reason"
                        maxLength={2000}
                        placeholder="Explain the evidence behind this review"
                      />
                    </label>
                    <button type="submit" className="ops-review-submit">
                      Append review ↗
                    </button>
                  </form>
                  {report.reviews.some((v) => v.check_id === r.id) && (
                    <div className="ops-review-history">
                      <p className="ops-review-label">Previous reviews</p>
                      {report.reviews
                        .filter((v) => v.check_id === r.id)
                        .map((v) => (
                          <p key={v.id}>
                            <span>
                              {v.created_at} · {v.status}
                            </span>
                            {v.reason}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
