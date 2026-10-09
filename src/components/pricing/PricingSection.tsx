'use client';

import { useState } from 'react';

import { PricingCards } from './PricingCards';

export function PricingSection() {
  // Annual is the default because it is the only cadence that carries a real
  // discount: measured against the x402 list price, annual plans land
  // 12.5%–19.8% below while monthly plans manage only 4.6%–12.5%.
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <section className="pricing-cycle-control py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Billing toggle */}
        <div className="pricing-cycle-intro mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-blue-700">
              Billing cadence / 01
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Choose the allowance that fits your request volume. Every paid option opens the same
              tools and endpoints — annual billing is where the discount lives.
            </p>
          </div>
          <div
            className="pricing-cycle-switch inline-flex items-center border border-slate-900/15 bg-white"
            role="group"
            aria-label="Billing cadence"
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              aria-pressed={billingCycle === 'monthly'}
              className={`px-4 py-2 text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              aria-pressed={billingCycle === 'yearly'}
              className={`inline-flex items-center gap-2 border-l border-slate-900/10 px-4 py-2 text-sm font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Yearly
              <span
                className={`pricing-cycle-saving ${billingCycle === 'yearly' ? 'is-active' : ''}`}
              >
                1 month included
              </span>
            </button>
          </div>
        </div>

        <PricingCards billingCycle={billingCycle} />
      </div>
    </section>
  );
}
