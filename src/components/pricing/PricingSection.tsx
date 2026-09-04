'use client';

import { useState } from 'react';

import { PricingCards } from './PricingCards';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Billing toggle */}
        <div className="mb-10 flex justify-start">
          <div className="inline-flex items-center border border-slate-900/15 bg-white">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`inline-flex items-center gap-2 border-l border-slate-900/10 px-4 py-2 text-sm font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Yearly
              {billingCycle === 'yearly' && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded">
                  -17%
                </span>
              )}
            </button>
          </div>
        </div>

        <PricingCards billingCycle={billingCycle} />
      </div>
    </section>
  );
}
