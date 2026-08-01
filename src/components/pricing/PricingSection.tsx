'use client';

import { useState } from 'react';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { PricingCards } from './PricingCards';

interface PricingSectionProps {
  showTrialBanner?: boolean;
}

export function PricingSection({ showTrialBanner = true }: PricingSectionProps) {
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

        {showTrialBanner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-10"
          >
            <div className="flex items-start sm:items-center gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-800">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm leading-relaxed">
                <strong>7-day Pro trial.</strong> Every new account gets full access to Tier 2
                endpoints for 7 days — no payment required.
              </p>
            </div>
          </motion.div>
        )}

        <PricingCards billingCycle={billingCycle} />
      </div>
    </section>
  );
}
