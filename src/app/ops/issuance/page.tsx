import Link from 'next/link';

import { readIssuanceControl, readIssuanceHistory } from '@/lib/ops/issuanceControl';

import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  OpsScopeNote,
  OpsSectionHeading,
  PageHeader,
  Stat,
  relativeTime,
  tableCls,
  thCls,
  trCls,
} from '../ui';

import { setIssuanceHalt } from './actions';

export const metadata = {
  title: 'Issuance control - Insight Ops',
};

function formatUtc(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function actionTone(action: string): 'bad' | 'good' | 'default' {
  if (action === 'issuance.halt.engage') return 'bad';
  if (action === 'issuance.halt.release') return 'good';
  return 'default';
}

function actionLabel(action: string): string {
  if (action === 'issuance.halt.engage') return 'Halt engaged';
  if (action === 'issuance.halt.release') return 'Halt released';
  return action;
}

export default async function OpsIssuancePage() {
  const [control, history] = await Promise.all([readIssuanceControl(), readIssuanceHistory(50)]);
  const state = control.state;
  const halted = state?.halted === true;

  return (
    <div className="ops-view ops-issuance-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="12"
        context="Operator control"
        title="Issuance control"
        subtitle="Halt or resume pre-trade verdict issuance, with every change recorded against an operator and a reason."
        updatedAt={new Date().toISOString()}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/ops/safety" className="ops-page-link">
              Safety &amp; attestation <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/ops/evidence" className="ops-page-link">
              Evidence chain <span aria-hidden="true">↗</span>
            </Link>
          </div>
        }
      />

      <OpsScopeNote label="What this switch does">
        The halt is read on the pre-trade hot path{' '}
        <strong>before any upstream oracle data is fetched</strong>. While it is engaged every check
        short-circuits to a signed <code>BLOCK</code> verdict with the reason below, for every
        surface (REST, MCP, partner and demo routes), so an incident that implicates the oracle
        sources cannot influence the outcome. It is not a substitute for the deploy and edge
        backstops in the incident runbook.
      </OpsScopeNote>

      <OpsScopeNote label="Reading a failure">
        If the control row cannot be read, the pre-trade path continues (it does not halt) and logs
        the failure — a genuinely unreadable database already fails closed at the audit write, and
        halting on a transient read error would turn a partial failure into a total outage. This
        page shows the same unreadable state rather than guessing.
      </OpsScopeNote>

      {control.errored && (
        <ErrorBanner message="签发控制状态不可读（ops_issuance_control 查询失败或缺行）。当前签发按“未熔断”继续运行，但此页无法确认实际状态——请立即检查数据库与 migration 0081。" />
      )}

      <OpsSectionHeading
        index="01"
        title="Current state"
        detail="The value the pre-trade hot path reads on every request."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Issuance"
          value={state ? (halted ? 'HALTED' : 'RUNNING') : 'UNKNOWN'}
          tone={state ? (halted ? 'bad' : 'good') : 'warn'}
          hint={state ? `revision ${state.revision}` : 'control row unreadable'}
          index="01"
        />
        <Stat
          label="Changed by"
          value={state?.changedByEmail ?? state?.changedBy ?? '—'}
          hint={state?.changedAt ? formatUtc(state.changedAt) : 'never changed'}
          index="02"
        />
        <Stat
          label="Changed"
          value={state?.changedAt ? relativeTime(state.changedAt) || 'just now' : '—'}
          hint="Asia/Shanghai"
          index="03"
        />
        <Stat
          label="Recorded actions"
          value={history.errored ? '—' : history.actions.length}
          hint="audit rows, latest 50"
          index="04"
        />
      </div>

      {state?.reason && (
        <Card title="Reason on record" className="mt-5">
          <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{state.reason}</p>
        </Card>
      )}

      <OpsSectionHeading
        index="02"
        title={halted ? 'Release or re-state the halt' : 'Engage the halt'}
        detail="A reason of at least three characters is required; it is written into the audit log with your operator id and the before/after state."
      />
      <Card>
        <form action={setIssuanceHalt} className="mt-1 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="ops-review-label">Reason (recorded in the audit log)</span>
            <textarea
              name="reason"
              required
              minLength={3}
              maxLength={2000}
              rows={3}
              className="ops-workflow-input resize-y"
              placeholder="e.g. Oracle provider X is reporting anomalous values; halting issuance while the feed is quarantined."
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" name="halted" value="true" className="ops-issuance-danger">
              Engage halt <span aria-hidden="true">↗</span>
            </button>
            <button
              type="submit"
              name="halted"
              value="false"
              className="ops-review-submit"
              disabled={!state}
            >
              Release halt <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
      </Card>

      <OpsSectionHeading
        index="03"
        title="Action audit log"
        detail="Append-only. Every privileged console write is recorded with its actor, reason and resulting state."
      />
      <Card>
        {history.errored ? (
          <EmptyState message="audit log unavailable — ops_admin_actions could not be read; migration 0081 may not be applied" />
        ) : history.actions.length === 0 ? (
          <EmptyState message="no privileged actions recorded yet" />
        ) : (
          <div>
            <p className="ops-table-scroll-hint lg:hidden">
              Scroll sideways to inspect every column →
            </p>
            <div className="ops-table-scroll overflow-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>When (UTC)</th>
                    <th className={thCls}>Action</th>
                    <th className={thCls}>Actor</th>
                    <th className={thCls}>Reason</th>
                    <th className={thCls}>Revision</th>
                  </tr>
                </thead>
                <tbody>
                  {history.actions.map((entry) => {
                    const revision = entry.afterState?.revision;
                    return (
                      <tr key={entry.id} className={trCls}>
                        <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-gray-500">
                          {formatUtc(entry.createdAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone={actionTone(entry.action)}>{actionLabel(entry.action)}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-gray-600">
                          {entry.actorEmail ?? entry.actorId ?? 'unknown'}
                        </td>
                        <td className="max-w-[28rem] break-words py-2 pr-3 text-gray-700">
                          {entry.reason ?? '—'}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-gray-500">
                          {typeof revision === 'number' || typeof revision === 'string'
                            ? String(revision)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
