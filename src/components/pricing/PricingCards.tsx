'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Check, Loader2 } from 'lucide-react';

import { PLANS } from '@/lib/billing/plans';
import { useSession } from '@/stores/authStore';

interface PricingCardsProps {
  billingCycle: 'monthly' | 'yearly';
}

const planOrder = ['free', 'pro', 'protocol'] as const;

const planHighlights: Record<string, string[]> = {
  free: ['1,000 API calls / month', 'Current prices & daily reports', '7-day reputation trends'],
  pro: [
    '10,000 API calls / month',
    'Deviation, correlation & divergence',
    'Historical hourly snapshots',
    'CSV / Excel export',
  ],
  protocol: [
    '100,000 API calls / month',
    'Protocol exposure analysis',
    'Cross-chain spread tracking',
    'Incident timeline & coverage',
    'Priority batch queue',
  ],
};

export function PricingCards({ billingCycle }: PricingCardsProps) {
  const router = useRouter();
  const session = useSession();
  const accessToken = session?.access_token;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: 'pro' | 'protocol') => {
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
          const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const isPro = planId === 'pro';
          const isProtocol = planId === 'protocol';
          const isPaid = planId === 'pro' || planId === 'protocol';
          const isLoading = loadingPlan === planId;

          return (
            <div
              key={planId}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                isPro ? 'border-blue-200 ring-1 ring-blue-100 md:-mt-2 md:mb-2' : 'border-slate-100'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900 capitalize">{plan.name}</h3>
                  {isProtocol && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                      Enterprise
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {isPro
                    ? 'For analysts and builders who need deep oracle risk signals.'
                    : isProtocol
                      ? 'For protocol teams and risk committees managing systemic exposure.'
                      : 'For developers exploring oracle reliability data.'}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">
                    {billingCycle === 'yearly' && price ? Math.round(price / 12) : (price ?? 0)}
                  </span>
                  <span className="text-sm text-slate-500">USDC/mo</span>
                </div>
                {billingCycle === 'yearly' && price && price > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{price} USDC billed annually</p>
                )}
                {isPaid && (
                  <p className="text-xs text-slate-400 mt-1">Crypto payment · no auto-renew</p>
                )}
              </div>

              <ul className="space-y-3 mb-7 flex-1">
                {planHighlights[planId].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isPaid ? (
                <button
                  type="button"
                  onClick={() => handleSubscribe(planId as 'pro' | 'protocol')}
                  disabled={isLoading}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    isPro
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-900/10'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Redirecting…' : 'Subscribe with crypto'}
                </button>
              ) : (
                <a
                  href="/register"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                >
                  Get started free
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
