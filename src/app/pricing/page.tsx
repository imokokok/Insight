import Link from 'next/link';

import { ArrowRight, BookOpen, Key } from 'lucide-react';

import { DataAccessTierMatrix, PricingSection } from '@/components/pricing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing - Insight API',
  description:
    'Simple, flat pricing for Insight Oracle API. Free 1,000 calls/mo. Pro 49 USDC/mo. Protocol 499 USDC/mo. Annual plans include 2 months free. Crypto payments via NOWPayments.',
  openGraph: {
    title: 'Pricing - Insight API',
    description:
      'Simple, flat pricing for Insight Oracle API. Free 1,000 calls/mo. Pro 49 USDC/mo. Protocol 499 USDC/mo.',
    type: 'website',
  },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-5">
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-5">
            Infrastructure pricing that scales with your data needs
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Start free with hourly reliability snapshots. Upgrade to Pro for deep analysis, or
            Protocol for risk-committee intelligence.
          </p>
        </div>
      </section>

      <div className="-mt-12 relative z-10 px-4 sm:px-6 lg:px-8">
        <PricingSection showTrialBanner={false} />
      </div>

      <DataAccessTierMatrix />

      {/* Integration CTAs — link back to product surfaces so the pricing page is
          not a dead-end for users coming from external/payment-provider review links. */}
      <section className="py-16 sm:py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Ready to integrate?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Create a free API key or explore the interactive reference to start building.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/api"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm shadow-blue-900/10"
            >
              <Key className="w-4 h-4" />
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 rounded-xl font-semibold transition-colors shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              API Reference
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
