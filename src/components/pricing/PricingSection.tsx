'use client';

import { useState } from 'react';

import { PricingCards } from './PricingCards';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all inline-flex items-center gap-2 ${
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
