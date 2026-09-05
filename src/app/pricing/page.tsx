import Link from 'next/link';

import { ArrowRight, BookOpen } from 'lucide-react';

import { EditorialWorkspaceHeader } from '@/components/editorial';
import { DataAccessTierMatrix, PricingSection } from '@/components/pricing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Insight Oracle Evidence Infrastructure',
  description:
    'Choose capacity for Insight REST API, AI/MCP, and Guard SDK usage. Every paying user gets every endpoint, with transparent per-call credit metering and prepaid top-ups.',
};

const BILLING_FACTS = [
  {
    value: '30',
    label: 'Trial credits',
    detail: 'One grant after email verification',
  },
  {
    value: 'C1–C4',
    label: 'Metering classes',
    detail: '0.5 to 10 credits per call',
  },
  {
    value: '100%',
    label: 'Capability access',
    detail: 'Every endpoint on every paid path',
  },
  {
    value: 'USDC',
    label: 'Plan currency',
    detail: 'Crypto checkout without auto-renewal',
  },
];

export default function PricingPage() {
  return (
    <div className="editorial-workspace min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="12"
          stage="Choose"
          eyebrow="Capacity, not feature gates · Website access stays public; REST API, AI/MCP, and Guard SDK calls draw from one credit wallet"
          title="Pay for the evidence your system actually uses."
          description="Choose a monthly capacity allowance or add prepaid credits when you need them. REST API, AI/MCP, and Guard SDK are distinct integration paths over the same endpoints, tools, risk analysis, verification features, and credit wallet."
          evidence={['One credit wallet', 'All endpoints', 'Transparent metering']}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/register?redirect=/pricing"
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                Start with 30 credits
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
              >
                <BookOpen className="h-4 w-4" />
                Read metering docs
              </Link>
            </div>
          }
        />

        <div className="grid border-b border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
          {BILLING_FACTS.map((fact, index) => (
            <div
              key={fact.label}
              className="border-b border-r border-slate-900/10 bg-white/30 px-0 py-6 sm:px-5 first:sm:pl-0"
            >
              <span className="font-mono text-[10px] text-blue-700">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                {fact.value}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                {fact.label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{fact.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — Select capacity</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                One evidence layer. Three operating scales.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Developer and Team include monthly credits and defined rate limits. Enterprise adds
                unlimited calls, custom service levels, and dedicated support.
              </p>
            </div>
          </div>
          <PricingSection />
        </div>
      </section>

      <div className="border-t border-slate-900/10">
        <DataAccessTierMatrix />
      </div>
    </div>
  );
}
