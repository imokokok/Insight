import Link from 'next/link';

import { getBillingSummary } from '@/lib/ops/opsQueries';

import RefreshControl from '../RefreshControl';
import {
  Card,
  EmptyState,
  ErrorBanner,
  OpsScopeNote,
  OpsSectionHeading,
  PageHeader,
  Stat,
} from '../ui';

export const metadata = {
  title: 'Billing - Insight Ops',
};

export default async function OpsBillingPage() {
  const billing = await getBillingSummary();
  const plans = Object.entries(billing.byPlan).sort(
    ([planA, countA], [planB, countB]) => countB - countA || planA.localeCompare(planB)
  );
  const rateLimits = Object.entries(billing.byRateLimit).sort(
    ([limitA], [limitB]) => Number(limitA) - Number(limitB)
  );
  const activeShare = billing.totalKeys
    ? Math.round((billing.activeKeys / billing.totalKeys) * 100)
    : null;

  return (
    <div className="ops-view ops-commercial-view ops-billing-view mx-auto max-w-[1280px] px-5 pb-14 pt-2 sm:px-8">
      <PageHeader
        index="10"
        context="Access inventory"
        title="Billing & access"
        subtitle="A clear view of issued API keys, their plan mix, and configured request limits."
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      <OpsScopeNote label="Reading this record">
        This is a cumulative snapshot of <code>api_keys</code>, not a time-windowed billing report.
        For requests and credit movement, open the <Link href="/ops/usage">usage record</Link>. For
        direct x402/MPP receipts and paid-call outcomes, open{' '}
        <Link href="/ops/x402">pay-per-call operations</Link>.
      </OpsScopeNote>

      {billing.errored && (
        <ErrorBanner message="Billing 数据查询失败。当前数量不可用，请勿将占位值视为真实状态。" />
      )}

      <OpsSectionHeading
        index="01"
        title="Access signal"
        detail="How many keys exist, how many remain active, and how access is configured."
      />
      <div className="ops-signal-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Issued keys" value={billing.errored ? '—' : billing.totalKeys} index="01" />
        <Stat
          label="Active keys"
          value={billing.errored ? '—' : billing.activeKeys}
          hint={
            activeShare === null || billing.errored
              ? 'share unavailable'
              : `${activeShare}% of issued`
          }
          tone={!billing.errored && billing.activeKeys > 0 ? 'good' : 'default'}
          index="02"
        />
        <Stat label="Plan types" value={billing.errored ? '—' : plans.length} index="03" />
        <Stat label="Rate tiers" value={billing.errored ? '—' : rateLimits.length} index="04" />
      </div>

      <OpsSectionHeading
        index="02"
        title="Configuration mix"
        detail="Key counts by plan and request ceiling; bars show share of all issued keys."
      />
      <div className="ops-commercial-columns grid gap-4 lg:grid-cols-2">
        <Card title="Keys by plan">
          {billing.errored ? (
            <EmptyState message="Plan distribution unavailable" />
          ) : plans.length === 0 ? (
            <EmptyState message="No API keys have been issued" />
          ) : (
            <div className="ops-commercial-list">
              {plans.map(([plan, count], index) => (
                <div className="ops-commercial-row" key={plan}>
                  <div className="ops-commercial-row-heading">
                    <span className="ops-commercial-rank">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="ops-commercial-name">{plan}</span>
                    <strong>{count.toLocaleString()}</strong>
                  </div>
                  <div className="ops-commercial-track" aria-hidden="true">
                    <span style={{ width: `${(count / billing.totalKeys) * 100}%` }} />
                  </div>
                  <p>{Math.round((count / billing.totalKeys) * 100)}% of issued keys</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Keys by rate tier">
          {billing.errored ? (
            <EmptyState message="Rate tier distribution unavailable" />
          ) : rateLimits.length === 0 ? (
            <EmptyState message="No rate tiers are configured" />
          ) : (
            <div className="ops-commercial-list">
              {rateLimits.map(([limit, count], index) => (
                <div className="ops-commercial-row" key={limit}>
                  <div className="ops-commercial-row-heading">
                    <span className="ops-commercial-rank">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="ops-commercial-name">
                      {Number(limit).toLocaleString()} <small>req/min</small>
                    </span>
                    <strong>{count.toLocaleString()}</strong>
                  </div>
                  <div className="ops-commercial-track" aria-hidden="true">
                    <span style={{ width: `${(count / billing.totalKeys) * 100}%` }} />
                  </div>
                  <p>{Math.round((count / billing.totalKeys) * 100)}% of issued keys</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <OpsSectionHeading
        index="03"
        title="Interpretation"
        detail="The limits of this inventory snapshot."
      />
      <div className="ops-commercial-notes">
        <p>
          Plan and rate-tier counts include inactive keys. The active count is shown separately.
        </p>
        <p>
          Configured request limits describe access settings; they do not measure actual traffic.
        </p>
        <p>
          Credit movement is recorded in the usage window, not in this cumulative key inventory.
        </p>
      </div>
    </div>
  );
}
