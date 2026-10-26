import Link from 'next/link';

import { ArrowRight, BadgeCheck, CirclePause, Code2, Eye, Radar, ShieldCheck } from 'lucide-react';

import { OracleWatchDemo } from '@/app/ai/components/OracleWatchDemo';
import { PreTradeSafetyDemo } from '@/app/ai/components/PreTradeSafetyDemo';
import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Decision Integrity — Pre-Trade Oracle Assessment | Insight',
  description:
    'Inspect oracle evidence before an action, run a pre-trade assessment, monitor changing conditions with Oracle Watch, and retain optional verifiable attestations.',
  keywords: [
    'decision integrity',
    'decision-input integrity',
    'pre-trade assessment',
    'oracle watch',
    'oracle risk',
    'AI agent safety',
  ],
  openGraph: {
    title: 'Decision Integrity — Pre-Trade Oracle Assessment | Insight',
    description:
      'Inspect the oracle record, assess a proposed action, watch for changed conditions, and retain evidence.',
    type: 'website',
  },
};

const responsibilityCards = [
  {
    icon: Eye,
    title: 'Insight evaluates evidence',
    body: 'Cross-source agreement, deviation, freshness, peg signals, and reason codes are returned as an assessment—not a promise that a price is correct.',
  },
  {
    icon: ShieldCheck,
    title: 'Your policy decides',
    body: 'Your person, agent, or application decides whether to proceed, request review, reduce exposure, or halt. Insight never controls your signer.',
  },
  {
    icon: BadgeCheck,
    title: 'Evidence remains inspectable',
    body: 'Where attestation issuance is configured, the returned assessment can include an independently verifiable record of the evaluation.',
  },
] as const;

export default function DecisionIntegrityPage() {
  return (
    <div className="editorial-workspace evidence-workbench developer-workbench min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="01"
          stage="Decide"
          eyebrow="Decision-input integrity · Oracle evidence before action"
          title="Know what your action is about to trust."
          description="Insight turns source-level oracle context into an explainable assessment before a person, application, or agent acts. Monitor the same conditions between actions and keep evidence that can be checked independently when issuance is enabled."
          evidence={['Pre-trade assessment', 'Continuous watch', 'Optional attestation']}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="#pre-trade"
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Run a pre-trade assessment
              </a>
              <Link
                href="/price-insight?stage=observe"
                className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700"
              >
                Inspect oracle evidence
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        />

        <EvidenceProcessRail
          label="Decision integrity loop"
          items={[
            { label: 'Observe', detail: 'Sources · freshness · coverage' },
            { label: 'Assess', detail: 'Proposed action · reason codes' },
            { label: 'Watch', detail: 'Changing conditions · halt signal' },
            { label: 'Verify', detail: 'Optional attestation · inspection' },
          ]}
        />
      </section>

      <section className="border-y border-slate-900/10 bg-white/45 py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — Responsibility boundary</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Evidence in. Your decision and execution out.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
                This page is an assessment surface, not an authorization or transaction-execution
                surface. It makes the oracle inputs legible so your own policy can make the next
                decision.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 border-y border-slate-900/15 md:grid-cols-3">
            {responsibilityCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="border-b border-r border-slate-900/10 bg-white/35 p-6 last:border-b-0 md:last:border-b-0"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <span className="font-mono text-xs text-blue-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pre-trade" className="scroll-mt-20 py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="mb-10 border-b border-slate-900/15 pb-5">
            <p className="editorial-index mb-4">02 — Assess before submitting</p>
            <div className="mb-4 inline-flex items-center gap-2 border-l-2 border-emerald-500 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Interactive assessment
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Pre-Trade Oracle Assessment</h2>
            <p className="max-w-3xl text-lg text-slate-600">
              Describe the asset, chain, action, and size. Insight evaluates observable oracle
              conditions and returns a machine-readable verdict with the factors behind it. Your
              policy decides how to respond.
            </p>
          </div>

          <div className="agent-demo-instrument border-y border-slate-900/15 bg-white/50 p-6 md:p-8">
            <PreTradeSafetyDemo />
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            The same assessment is available through the REST API, MCP tool, and Guard SDK.
          </p>
        </div>
      </section>

      <section
        id="oracle-watch-demo"
        className="scroll-mt-20 border-y border-slate-900/10 bg-white/45 py-14 sm:py-20"
      >
        <div className="editorial-frame mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="mb-10 border-b border-slate-900/15 pb-5">
            <p className="editorial-index mb-4">03 — Watch between actions</p>
            <div className="mb-4 inline-flex items-center gap-2 border-l-2 border-blue-600 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Radar className="h-3.5 w-3.5" />
              Ongoing signal
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Oracle Watch</h2>
            <p className="max-w-3xl text-lg text-slate-600">
              A pre-trade assessment captures one moment. Oracle Watch exposes changed conditions
              for long-running workflows so an operator or policy can choose to pause, continue, or
              investigate.
            </p>
          </div>

          <div className="agent-demo-instrument border-y border-slate-900/15 bg-white/50 p-6 md:p-8">
            <OracleWatchDemo />
          </div>
        </div>
      </section>

      <section className="developer-cta-record border-y border-slate-900/15 bg-blue-50/55 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <CirclePause className="mx-auto mb-5 h-8 w-8 text-blue-700" />
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Put the assessment where your workflow needs it.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Use REST from your stack, MCP for an agent runtime, or Guard SDK for a bounded
            integration path. Each option leaves policy, signing, and submission under your control.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/build"
              className="inline-flex items-center gap-2 border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-950"
            >
              <Code2 className="h-4 w-4" />
              Choose an integration path
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
            >
              Verify an assessment record
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
