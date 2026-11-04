import Link from 'next/link';

import {
  ArrowRight,
  BarChart3,
  CircleGauge,
  FileText,
  Gauge,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Risk Intelligence — Oracle Context & Position Stress | Insight',
  description:
    'Explore Insight risk tools for cross-oracle comparison, position stress testing, peg risk, provider context, and daily evidence reports.',
  keywords: [
    'oracle risk intelligence',
    'position stress',
    'peg risk',
    'oracle comparison',
    'DeFi risk',
  ],
  openGraph: {
    title: 'Risk Intelligence — Oracle Context & Position Stress | Insight',
    description: 'Choose the right risk instrument for the oracle question in front of you.',
    type: 'website',
  },
};

const tools = [
  {
    href: '/price-insight?stage=compare',
    icon: Search,
    title: 'Compare & Assess',
    body: 'Inspect disagreement, freshness, and source-level context across oracle providers and chains.',
    label: 'Source comparison',
  },
  {
    href: '/safety-check',
    icon: ShieldCheck,
    title: 'Position Stress Test',
    body: 'Calculate the critical oracle deviation and liquidation exposure for a supported lending position.',
    label: 'Position-specific',
  },
  {
    href: '/peg-risk',
    icon: Gauge,
    title: 'Peg Risk',
    body: 'Assess stablecoins, wrapped assets, and LSTs through source deviation and protocol impact.',
    label: 'Asset-specific',
  },
  {
    href: '/reputation',
    icon: BarChart3,
    title: 'Oracle Directory',
    body: 'Explore provider coverage, characteristics, and historical performance context.',
    label: 'Provider context',
  },
  {
    href: '/reports',
    icon: FileText,
    title: 'Daily Reports',
    body: 'Review recurring price deviations, rankings, and risk highlights over time.',
    label: 'Historical context',
  },
] as const;

export default function RiskIntelligencePage() {
  return (
    <div className="editorial-workspace evidence-workbench min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="02"
          stage="Assess"
          eyebrow="Risk intelligence · Choose the instrument that matches the question"
          title="Risk needs context before it needs a score."
          description="Insight separates source comparison, position stress, asset-specific peg risk, provider context, and historical reporting so each conclusion is grounded in the evidence it actually needs."
          evidence={['Source context', 'Exposure context', 'Historical context']}
          action={
            <Link
              href="/price-insight?stage=compare"
              className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
            >
              Compare oracle evidence
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <EvidenceProcessRail
          label="Risk investigation"
          items={[
            { label: 'Observe', detail: 'Source record · coverage' },
            { label: 'Compare', detail: 'Divergence · freshness' },
            { label: 'Contextualize', detail: 'Position · asset · provider' },
            { label: 'Decide', detail: 'Use your own policy' },
          ]}
          activeIndex={2}
        />
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — Risk instruments</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Start with the question you need to answer.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
                These tools are deliberately distinct. A general source comparison should not be
                presented as a personal liquidation calculation, and a position stress result should
                not be mistaken for a universal oracle verdict.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 border-l border-t border-slate-900/10 md:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex min-h-64 flex-col border-b border-r border-slate-900/10 bg-white/45 p-6 transition-colors hover:bg-blue-50/55"
                >
                  <div className="mb-10 flex items-start justify-between">
                    <span className="font-mono text-xs text-blue-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50 text-blue-700 transition-colors group-hover:bg-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {tool.label}
                  </p>
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                    {tool.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{tool.body}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-blue-700">
                    Open tool <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/15 bg-slate-950 py-14 text-white sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
          <CircleGauge className="h-10 w-10 text-blue-300" />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-blue-300">
              Decision boundary
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Risk intelligence informs; it does not authorize.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300">
              Use a risk finding as evidence inside a policy you control. If you need a pre-trade
              assessment plus continuous monitoring in one workflow, use Decision Integrity.
            </p>
            <Link
              href="/decision-integrity"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-blue-300"
            >
              Explore Decision Integrity <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
