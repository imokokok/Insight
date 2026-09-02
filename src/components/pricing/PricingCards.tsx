'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Check, Coins, Loader2, Zap } from 'lucide-react';

import { CREDIT_PACKS, CREDIT_PACK_ORDER, PLANS } from '@/lib/billing/plans';
import { useSession } from '@/stores/authStore';

interface PricingCardsProps {
  billingCycle: 'monthly' | 'yearly';
}

const planOrder = ['developer', 'team', 'enterprise'] as const;

/** Per-call metering classes surfaced on the pricing page. */
const METERING_ROWS = [
  { cls: 'C1', cost: '0.5 cr', desc: 'Foundational data — prices, listings, daily reports' },
  { cls: 'C2', cost: '2 cr', desc: 'Deep analysis — deviation, correlation, risk, history' },
  { cls: 'C3', cost: '5 cr', desc: 'Agent gates — pre-trade safety, oracle-watch' },
  { cls: 'C4', cost: '10 cr', desc: 'Proofs & receipts — attested execution receipts' },
];

export function PricingCards({ billingCycle }: PricingCardsProps) {
  const router = useRouter();
  const session = useSession();
  const accessToken = session?.access_token;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: 'developer' | 'team') => {
    setError(null);

    // If not logged in, send to register first — they can subscribe after auth.
    if (!accessToken) {
      const redirect = encodeURIComponent(`/api#pricing`);
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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {planOrder.map((planId) => {
          const plan = PLANS[planId];
          const isTeam = planId === 'team';
          const isEnterprise = planId === 'enterprise';
          const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const isLoading = loadingPlan === planId;

          return (
            <div
              key={planId}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                isTeam
                  ? 'border-blue-200 ring-1 ring-blue-100 md:-mt-2 md:mb-2'
                  : 'border-slate-100'
              }`}
            >
              {isTeam && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  {isEnterprise && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                      Contact sales
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {isTeam
                    ? 'For teams running batch analytics and multi-agent workloads.'
                    : isEnterprise
                      ? 'For protocol teams and risk committees managing systemic exposure.'
                      : 'For analysts and builders who need deep oracle risk signals.'}
                </p>
              </div>

              <div className="mb-5">
                {isEnterprise ? (
                  <div className="text-3xl font-bold tracking-tight text-slate-900">Custom</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight text-slate-900">
                        {billingCycle === 'yearly' && price ? Math.round(price / 12) : (price ?? 0)}
                      </span>
                      <span className="text-sm text-slate-500">USDC/mo</span>
                    </div>
                    {billingCycle === 'yearly' && price && price > 0 && (
                      <p className="text-xs text-slate-400 mt-1">{price} USDC billed annually</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Crypto payment · no auto-renew</p>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-7 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isEnterprise ? (
                <a
                  href="mailto:sales@oracleinsight.xyz?subject=Enterprise%20plan"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                >
                  Contact sales
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubscribe(planId as 'developer' | 'team')}
                  disabled={isLoading}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    isTeam
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-900/10'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Redirecting…' : 'Subscribe with crypto'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-call metering + credit packs */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Metering classes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Per-call credit pricing</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Every paying user gets all endpoints and MCP tools. Each call costs credits by metering
            class — subscribe for a monthly allowance, then top up when your agents burn through it.
          </p>
          <div className="space-y-2">
            {METERING_ROWS.map((row) => (
              <div
                key={row.cls}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm flex items-center justify-center">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Prepaid credit packs</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            No subscription required — add credits and spend per call. Good for high-frequency and
            bursty agent workloads.
          </p>
          <div className="space-y-2">
            {CREDIT_PACK_ORDER.map((pack) => {
              const config = CREDIT_PACKS[pack];
              const isLoading = loadingPack === pack;
              return (
                <button
                  key={pack}
                  type="button"
                  onClick={() => handleTopUp(pack)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
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
