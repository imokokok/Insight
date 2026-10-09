'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Check, Coins, Layers, Loader2, Zap } from 'lucide-react';

import {
  METERING_CLASS_DESCRIPTION,
  METERING_CLASS_ORDER,
  formatCreditCost,
} from '@/lib/billing/metering';
import {
  CREDIT_PACKS,
  CREDIT_PACK_ORDER,
  PLANS,
  PLAN_ORDER,
  callPriceRange,
  callsPerCycle,
  type Plan,
} from '@/lib/billing/plans';
import { announceNavigationStart } from '@/lib/navigation/progress';
import { useSession } from '@/stores/authStore';

interface PricingCardsProps {
  billingCycle: 'monthly' | 'yearly';
}

type SelfServePlan = Exclude<Plan, 'enterprise'>;

const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  developer: 'For analysts and builders running production oracle checks.',
  team: 'For teams running batch analytics and multi-agent workloads.',
  scale: 'For high-volume applications with sustained agent traffic.',
  enterprise: 'For protocols and risk committees managing systemic exposure.',
};

/**
 * Per-call metering classes surfaced on the pricing page. Derived from
 * metering.ts so the ledger can never disagree with what the middleware
 * charges — changing CREDIT_COST is the only edit ever needed.
 */
const METERING_ROWS = METERING_CLASS_ORDER.map((cls) => ({
  cls,
  cost: formatCreditCost(cls),
  desc: METERING_CLASS_DESCRIPTION[cls],
}));

/** The metering class behind a pre-trade safety check, used for translations. */
const AGENT_GATE_CLASS = 'C3' as const;

const API_C3_PRICE_RANGE = callPriceRange(AGENT_GATE_CLASS);
const apiC3PriceMin = API_C3_PRICE_RANGE.min.toFixed(4);
const apiC3PriceMax = API_C3_PRICE_RANGE.max.toFixed(4);

export function PricingCards({ billingCycle }: PricingCardsProps) {
  const router = useRouter();
  const session = useSession();
  const accessToken = session?.access_token;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: SelfServePlan) => {
    setError(null);

    // If not logged in, send to register first — they can subscribe after auth.
    if (!accessToken) {
      const redirect = encodeURIComponent(`/pricing`);
      announceNavigationStart();
      router.push(`/register?redirect=${redirect}`);
      return;
    }

    const interval = billingCycle === 'yearly' ? 'year' : 'month';
    setLoadingPlan(planId);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to start checkout');
      }

      // Redirect to NOWPayments invoice page.
      window.location.href = result.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoadingPlan(null);
    }
  };

  const handleTopUp = async (pack: (typeof CREDIT_PACK_ORDER)[number]) => {
    setError(null);

    if (!accessToken) {
      const redirect = encodeURIComponent(`/pricing`);
      announceNavigationStart();
      router.push(`/register?redirect=${redirect}`);
      return;
    }

    setLoadingPack(pack);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type: 'topup', pack }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to start top-up');
      }

      window.location.href = result.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top-up failed');
      setLoadingPack(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 border-l-2 border-red-500 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="pricing-plan-grid grid grid-cols-1 border-y border-slate-900/15 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((planId, planIndex) => {
          const plan = PLANS[planId];
          const isTeam = planId === 'team';
          const isEnterprise = planId === 'enterprise';
          const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const isLoading = loadingPlan === planId;
          // The first two bullets restate the capacity readout, so the list
          // shows only what is left. Higher tiers lead with an inheritance
          // line, because the ladder is a superset — every tier carries the
          // same capabilities and only the operating limits improve.
          const visibleFeatures = plan.features.slice(isEnterprise ? 1 : 2);
          const previousPlan = planIndex > 0 ? PLANS[PLAN_ORDER[planIndex - 1]] : null;

          return (
            <div
              key={planId}
              className={`pricing-plan-card relative flex flex-col border-slate-900/15 bg-white/55 p-6 transition-colors hover:bg-white md:border-r md:last:border-r-0 ${isTeam ? 'pricing-plan-featured' : ''} ${
                isTeam
                  ? 'border-l-2 border-l-blue-600 md:border-l-0 md:border-t-2 md:border-t-blue-600'
                  : 'border-l-0 border-t-0'
              }`}
            >
              <span className="pricing-plan-index">P—{String(planIndex + 1).padStart(2, '0')}</span>
              {isTeam && (
                <div className="absolute right-5 top-0">
                  <span className="inline-flex items-center bg-blue-600 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                    Recommended
                  </span>
                </div>
              )}

              <div className="pricing-plan-intro mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  {isEnterprise && (
                    <span className="inline-flex items-center border-l-2 border-amber-500 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Contact sales
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {PLAN_DESCRIPTIONS[planId]}
                </p>
              </div>

              <div className="pricing-plan-price mb-5">
                {isEnterprise ? (
                  <div className="text-3xl font-bold tracking-tight text-slate-900">Custom</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="pricing-price-currency">$</span>
                      <span className="pricing-price-number">
                        {billingCycle === 'yearly' && price
                          ? (price / 12).toFixed(2)
                          : (price ?? 0).toLocaleString('en-US')}
                      </span>
                      <span className="text-sm text-slate-500">/ month</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {billingCycle === 'yearly' && price
                        ? `${price.toLocaleString('en-US')} USDC billed annually · effective monthly price`
                        : 'USDC billed monthly'}
                    </p>
                  </>
                )}
              </div>

              <div className="pricing-capacity-readout">
                <span>Included capacity</span>
                <strong>
                  {isEnterprise ? 'Unlimited' : plan.monthlyQuota.toLocaleString('en-US')}
                </strong>
                <span>{isEnterprise ? 'API calls' : 'credits / month'}</span>
                <small>
                  {isEnterprise
                    ? 'Dedicated limits'
                    : `${plan.rateLimit.toLocaleString('en-US')} requests / minute`}
                </small>
                {!isEnterprise && (
                  <small className="pricing-capacity-equivalent">
                    {`≈${callsPerCycle(planId, AGENT_GATE_CLASS).toLocaleString('en-US')} pre-trade checks / month`}
                  </small>
                )}
              </div>

              <ul className="pricing-feature-list space-y-3 mb-7 flex-1">
                {previousPlan && (
                  <li
                    key="inherited"
                    className="pricing-feature-inherit flex items-start gap-3 text-sm font-semibold text-slate-700"
                  >
                    <Layers className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{`Everything in ${previousPlan.name}, plus`}</span>
                  </li>
                )}
                {visibleFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isEnterprise ? (
                <a
                  href="mailto:sales@oracleinsight.xyz?subject=Enterprise%20plan"
                  className="inline-flex w-full items-center justify-center gap-2 border border-slate-900/20 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-700"
                >
                  Contact sales
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubscribe(planId as SelfServePlan)}
                  disabled={isLoading}
                  className={`inline-flex w-full items-center justify-center gap-2 border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isTeam
                      ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Redirecting…' : 'Subscribe with crypto'}
                </button>
              )}
              <p className="pricing-payment-note">
                {isEnterprise
                  ? 'A tailored agreement for your operating needs.'
                  : 'Crypto checkout · manual renewal · same platform access'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Per-call metering + credit packs */}
      <div className="pricing-metering-split mt-10 grid grid-cols-1 border-y border-slate-900/15 md:grid-cols-2">
        {/* Metering classes */}
        <div className="pricing-metering-ledger border-b border-slate-900/15 bg-white/55 p-6 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Per-call credit pricing</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Every paying user gets all endpoints and MCP tools. Each call costs credits by metering
            class — subscribe for a monthly allowance, then top up when your agents burn through it.
          </p>
          <p className="text-xs text-slate-500 mb-4">
            For C3 pre-trade checks, API credit pricing works out to ${apiC3PriceMin}–$
            {apiC3PriceMax} per call, depending on the plan, billing cycle, or prepaid pack — annual
            plans are the cheapest path. The direct x402 price remains $0.02 per check.
          </p>
          <div className="border-y border-slate-900/15">
            {METERING_ROWS.map((row) => (
              <div
                key={row.cls}
                className="pricing-metering-record flex items-center justify-between gap-3 border-b border-slate-900/10 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center border border-emerald-200 bg-emerald-50 font-mono text-sm font-bold text-emerald-700">
                    {row.cls}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{row.desc}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-700 tabular-nums">
                  {row.cost}
                  <span className="ml-1 text-xs font-normal text-slate-400">/ call</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit packs */}
        <div className="pricing-credit-vault bg-white/55 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Prepaid credit packs</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            No subscription required. A pack is not a volume discount — per call it lands within a
            few percent of the x402 list price. Its value is settlement: one invoice instead of a
            per-call on-chain x402 payment, which is what makes high-frequency and bursty agent
            workloads practical.
          </p>
          <div className="border-y border-slate-900/15">
            {CREDIT_PACK_ORDER.map((pack) => {
              const config = CREDIT_PACKS[pack];
              const isLoading = loadingPack === pack;
              return (
                <button
                  key={pack}
                  type="button"
                  onClick={() => handleTopUp(pack)}
                  disabled={isLoading}
                  className="pricing-credit-record flex w-full items-center justify-between gap-3 border-b border-slate-900/10 bg-white/35 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50/45 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {config.name}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {config.credits.toLocaleString()} credits
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{config.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                      ${config.priceUsd}
                    </span>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
