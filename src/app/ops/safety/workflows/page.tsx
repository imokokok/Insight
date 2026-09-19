import Link from 'next/link';

import { getWorkflowQualityReport, WorkflowFilters } from '@/lib/ops/workflowQuality';

import { Card, EmptyState, ErrorBanner, PageHeader, Stat, tableCls, thCls, trCls } from '../../ui';

import { saveWorkflowReview } from './actions';

export const metadata = { title: 'Workflow Quality - Insight Ops' };

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
    return <ErrorBanner message="Invalid filters. Use days 1–90 and a valid API key ID." />;
  let report;
  try {
    report = await getWorkflowQualityReport(parsed.data);
  } catch {
    return (
      <ErrorBanner message="Workflow report unavailable. Check migration 0053 and database availability. No zero-value report has been substituted." />
    );
  }
  const s = report.summary;
  const query = new URLSearchParams(input).toString();
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Workflow quality"
        subtitle="Completed checks, customer baseline comparisons and human review. Internal Ops owner access."
        updatedAt={report.generatedAt}
        actions={
          <Link className="text-blue-700 underline" href={`/ops/safety/workflows/export?${query}`}>
            Export evidence JSON
          </Link>
        }
      />
      <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
        {[
          ['days', 'Days (1–90)', '14'],
          ['apiKeyId', 'Customer API key ID', ''],
          ['workflow', 'Workflow tag', ''],
          ['asset', 'Asset', ''],
          ['chainId', 'Evidence chain ID', ''],
          ['modelVersion', 'Model version', ''],
        ].map(([name, label, fallback]) => (
          <label key={name} className="text-sm">
            {label}
            <input
              className="mt-1 block rounded border p-2"
              name={name}
              defaultValue={input[name] ?? fallback}
            />
          </label>
        ))}
        <label className="text-sm">
          Action
          <select
            className="mt-1 block rounded border p-2"
            name="action"
            defaultValue={input.action ?? ''}
          >
            <option value="">All</option>
            {['swap', 'borrow', 'repay', 'lend', 'liquidate'].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <button className="rounded bg-gray-900 px-4 py-2 text-white">Filter</button>
      </form>
      {report.truncated && (
        <ErrorBanner message="This report contains only the latest 1,000 matching checks. Narrow filters before interpreting totals." />
      )}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Completed checks" value={s.totalChecks} hint={s.sampleAssessment} />
        <Stat
          label="Complete assessment scope"
          value={s.scopeCompleteChecks}
          hint={`${s.unknownScopeChecks} historical rows have unknown scope`}
        />
        <Stat
          label="Evidence-induced BLOCK"
          value={s.coverageStops}
          hint="Coverage, independence or stale-data rule"
        />
        <Stat
          label="Market / protocol alerts"
          value={s.marketAlerts}
          hint="Can coexist with evidence gaps"
        />
        <Stat
          label="Paired baseline rows"
          value={s.pairedBaselines}
          hint="Requires caller baseline version"
        />
        <Stat
          label="Insight-only alerts"
          value={s.insightOnlyAlerts}
          hint="Unverified incremental findings"
        />
        <Stat
          label="Baseline-only alerts"
          value={s.baselineOnlyAlerts}
          hint="Review possible omissions"
        />
        <Stat
          label="Overlapping alerts"
          value={s.overlappingAlerts}
          hint={`p95 assessment ${s.p95LatencyMs ?? '—'} ms`}
        />
      </div>
      <Card title="Interpretation limits" className="mb-6">
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          {s.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          Human review:{' '}
          {Object.entries(s.humanReviews)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' · ')}
        </p>
      </Card>
      <Card title="Workflow / asset / action slices" className="mb-6">
        <div className="overflow-auto">
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
      <Card title="Review recent checks (latest 30)">
        {!report.rows.length ? (
          <EmptyState message="No matching recorded checks. No baseline or labels have been invented." />
        ) : (
          <div className="space-y-4">
            {report.rows.slice(0, 30).map((r) => (
              <details key={r.id} className="rounded border p-3">
                <summary className="cursor-pointer text-sm">
                  {r.created_at} · {r.asset} / {r.chain_id} · {r.action} · {r.verdict} ·{' '}
                  {r.workflow_tag ?? 'untagged'}
                </summary>
                <p className="my-2 break-all text-xs text-gray-500">
                  Request {r.request_id ?? 'not recorded'} · model {r.ml_model_version ?? 'none'} ·
                  baseline {r.baseline_verdict ?? 'unknown'} / {r.baseline_version ?? 'unversioned'}
                </p>
                <pre className="overflow-auto rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(
                    { factors: r.contributing_factors, scope: r.assessment_scope },
                    null,
                    2
                  )}
                </pre>
                <form action={saveWorkflowReview} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="checkId" value={r.id} />
                  <select name="status" className="rounded border p-2">
                    <option value="useful">Useful finding</option>
                    <option value="false_positive">False positive</option>
                    <option value="missed_event">Missed event</option>
                    <option value="inconclusive">Inconclusive</option>
                  </select>
                  <textarea
                    required
                    name="reason"
                    maxLength={2000}
                    placeholder="Evidence and reason for this human review"
                    className="min-w-64 flex-1 rounded border p-2"
                  />
                  <button className="rounded bg-gray-900 px-3 py-2 text-white">
                    Append review
                  </button>
                </form>
                {report.reviews
                  .filter((v) => v.check_id === r.id)
                  .map((v) => (
                    <p key={v.id} className="mt-2 whitespace-pre-wrap text-sm">
                      {v.created_at} · {v.status}: {v.reason}
                    </p>
                  ))}
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
