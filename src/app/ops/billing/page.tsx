import { getBillingSummary } from '@/lib/ops/opsQueries';

import RefreshControl from '../RefreshControl';
import { PageHeader, Stat, Card, Badge, EmptyState } from '../ui';

export const metadata = {
  title: 'Billing - Insight Ops',
};

export default async function OpsBillingPage() {
  const billing = await getBillingSummary();
  const plans = Object.keys(billing.byPlan).length;
  const rateLimits = Object.keys(billing.byRateLimit).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader
        title="Billing"
        subtitle="API key plans & rate limits (api_keys)"
        updatedAt={new Date().toISOString()}
        actions={<RefreshControl />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Total keys" value={billing.totalKeys} />
        <Stat
          label="Active keys"
          value={billing.activeKeys}
          tone={billing.activeKeys > 0 ? 'good' : 'warn'}
        />
        <Stat label="Plans" value={plans} hint="distinct" />
        <Stat label="Rate tiers" value={rateLimits} hint="distinct" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="By plan">
          {plans === 0 ? (
            <EmptyState message="no keys" />
          ) : (
            <div className="space-y-2">
              {Object.entries(billing.byPlan).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between text-sm">
                  <Badge tone="default">{plan}</Badge>
                  <span className="tabular-nums text-slate-700 font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="By rate limit">
          {rateLimits === 0 ? (
            <EmptyState message="no keys" />
          ) : (
            <div className="space-y-2">
              {Object.entries(billing.byRateLimit)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([rl, count]) => (
                  <div key={rl} className="flex items-center justify-between text-sm">
                    <span className="tabular-nums text-slate-600">{rl} req/min</span>
                    <span className="tabular-nums text-slate-700 font-medium">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
