'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  AlertCircle,
  Check,
  CreditCard,
  Key,
  Loader2,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { PLANS, normalizePlan, type Plan } from '@/lib/billing/plans';
import { useSession } from '@/stores/authStore';

import { CreditWalletCard } from './CreditWalletCard';
import { KeyBudgetEditor } from './KeyBudgetEditor';
import { UsageChart } from './UsageChart';

interface SubscriptionData {
  subscription: {
    id: string;
    plan: string;
    status: string;
    interval: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    stripe_customer_id: string;
  } | null;
  apiKeys: Array<{
    id: string;
    name: string;
    plan: string;
    rateLimit: number;
    budgetMonthly: number | null;
  }>;
}

const PLAN_BADGE_STYLES: Record<string, string> = {
  developer: 'bg-blue-100 text-blue-700',
  team: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  incomplete: 'bg-slate-100 text-slate-600',
};

export function BillingPanel() {
  const session = useSession();
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const accessToken = session?.access_token;

  const fetchSubscription = async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/subscription', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load billing data');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const handleRenew = async () => {
    if (!accessToken) return;
    // Renewal creates a fresh NOWPayments invoice for the user's current plan
    // and interval. Crypto payments have no auto-renew, so users must manually
    // initiate each billing cycle before expiry.
    const currentInterval = subscription?.interval === 'year' ? 'year' : 'month';
    const currentPlan = subscription?.plan as 'developer' | 'team' | undefined;
    if (!currentPlan) {
      setError('No active subscription plan found to renew');
      return;
    }
    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: currentPlan, interval: currentInterval }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to start renewal checkout');
      }

      window.location.href = result.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start renewal');
      setActionLoading(false);
    }
  };

  // "I've paid" — the user has paid but the subscription is stuck in
  // incomplete/past_due (NOWPayments IPNs are not guaranteed). Reconcile
  // against the provider; idempotent server-side, so re-running is safe.
  const handleReconcile = async () => {
    if (!accessToken || !subscription?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type: 'subscription', id: subscription.id }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to check payment');
      }

      if (result.data?.status === 'active') {
        setError('Payment confirmed — your subscription is now active');
      }
      await fetchSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check payment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-record p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Billing</h2>
            <p className="text-sm text-slate-500">Manage your subscription, usage, and billing</p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="settings-record p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Billing</h2>
            <p className="text-sm text-slate-500">Manage your subscription, usage, and billing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-l-2 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
        <Button
          onClick={fetchSubscription}
          variant="secondary"
          className="mt-4 rounded-sm border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Retry
        </Button>
      </div>
    );
  }

  const subscription = data?.subscription;
  const apiKeys = data?.apiKeys ?? [];
  const hasActiveSubscription =
    subscription && ['active', 'past_due'].includes(subscription.status);
  // Payment initiated but not yet settled — offer the "I've paid" reconcile
  // action (NOWPayments IPNs are not guaranteed to be delivered).
  const isPendingSubscription =
    subscription && ['incomplete', 'past_due'].includes(subscription.status);

  // Determine the user's effective plan — there is no free tier, so the
  // subscription plan (or the base Developer tier) is always the plan.
  const currentPlan: Plan = subscription ? normalizePlan(subscription.plan) : 'developer';
  const planConfig = PLANS[currentPlan];

  // Find the primary key for usage chart (most recently used or first)
  const primaryKey = apiKeys[0];

  return (
    <section className="settings-record p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
          <CreditCard className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Billing</h2>
          <p className="text-sm text-slate-500">Manage your subscription, usage, and billing</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 border-l-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Current plan section */}
      <div className="mb-8 border-y border-blue-200 bg-blue-50/35 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm text-slate-500">Current plan</span>
              <span
                className={`inline-flex items-center border-l-2 border-current px-2.5 py-0.5 text-xs font-medium ${
                  PLAN_BADGE_STYLES[currentPlan] ?? PLAN_BADGE_STYLES.developer
                }`}
              >
                {planConfig.name}
              </span>
              {subscription && (
                <span
                  className={`inline-flex items-center border-l-2 border-current px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_BADGE_STYLES[subscription.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {subscription.status}
                </span>
              )}
            </div>

            {hasActiveSubscription && subscription && (
              <p className="text-sm text-slate-600">
                {subscription.interval === 'year' ? 'Annual' : 'Monthly'} subscription
                {subscription.current_period_end &&
                  ` · expires ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                <span className="block text-xs text-slate-400 mt-0.5">
                  Crypto payments don&apos;t auto-renew — renew manually before expiry
                </span>
              </p>
            )}

            {!hasActiveSubscription && !isPendingSubscription && (
              <p className="text-sm text-slate-600">
                No active subscription — add credits (pay-as-you-go) or subscribe for a monthly
                credit allowance. Every feature is unlocked to paying users.
              </p>
            )}

            {isPendingSubscription && (
              <p className="text-sm text-amber-700">
                Your {subscription.interval === 'year' ? 'annual' : 'monthly'} payment is pending
                confirmation. Already paid? Click “I&apos;ve paid” to verify with the payment
                provider.
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {hasActiveSubscription && (
              <Button
                onClick={handleRenew}
                disabled={actionLoading}
                variant="secondary"
                leftIcon={
                  actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )
                }
                className="rounded-sm border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Renew
              </Button>
            )}

            {!hasActiveSubscription && !isPendingSubscription && (
              <Button
                onClick={() => router.push('/pricing')}
                variant="secondary"
                leftIcon={<Zap className="w-4 h-4" />}
                className="rounded-sm border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Subscribe
              </Button>
            )}

            {isPendingSubscription && (
              <Button
                onClick={handleReconcile}
                disabled={actionLoading}
                variant="secondary"
                leftIcon={
                  actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )
                }
                className="rounded-sm border-amber-200 text-amber-700 hover:bg-amber-100"
              >
                {actionLoading ? 'Checking…' : 'I&apos;ve paid'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Credit wallet */}
      <CreditWalletCard accessToken={accessToken} onError={setError} />

      {/* Usage chart */}
      {primaryKey && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Usage for &ldquo;{primaryKey.name}&rdquo;
          </h3>
          {accessToken && (
            <div className="border-y border-slate-900/10 bg-white/45 p-5">
              <UsageChart
                apiKeyId={primaryKey.id}
                plan={normalizePlan(primaryKey.plan)}
                accessToken={accessToken}
              />
            </div>
          )}
        </div>
      )}

      {/* API keys summary */}
      {apiKeys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-600" />
            Your API keys ({apiKeys.length})
          </h3>
          <div className="space-y-3">
            {apiKeys.map((key) => {
              const keyPlan = normalizePlan(key.plan);
              const keyPlanConfig = PLANS[keyPlan];

              return (
                <div
                  key={key.id}
                  className="flex flex-col gap-3 border-y border-slate-900/10 bg-white/50 p-4 transition-colors hover:bg-blue-50/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`inline-flex items-center border-l-2 border-current px-2 py-0.5 text-xs font-medium ${
                          PLAN_BADGE_STYLES[keyPlan] ?? PLAN_BADGE_STYLES.developer
                        }`}
                      >
                        {keyPlanConfig.name}
                      </span>
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {key.name}
                      </span>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {key.rateLimit < 0 ? 'Unlimited' : `${key.rateLimit}/min`}
                      </span>
                    </div>
                    <KeyBudgetEditor
                      accessToken={accessToken}
                      keyId={key.id}
                      defaultBudget={key.budgetMonthly}
                      onSaved={fetchSubscription}
                      onError={setError}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
