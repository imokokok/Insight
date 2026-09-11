import Link from 'next/link';

import { ArrowRight, ArrowUpRight, CircleDot, ScanSearch, ShieldCheck } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Observe',
    text: 'Start with the market price and the feeds that produced it.',
    href: '/price-query',
    label: 'Price Query',
  },
  {
    number: '02',
    title: 'Compare',
    text: 'Expose divergence, freshness, coverage, and source-level context.',
    href: '/price-insight',
    label: 'Price Insight',
  },
  {
    number: '03',
    title: 'Act',
    text: 'Stress-test the consequence before a trade or liquidation can execute.',
    href: '/safety-check',
    label: 'Safety Check',
  },
] as const;

const proofPoints = [
  'Independent source comparison',
  'Freshness and spread context',
  'Portable signed receipts',
] as const;

export function OracleQuestionSection() {
  return (
    <section className="border-y border-slate-900/10 py-16 sm:py-20 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="home-kicker">02 — Inspect the evidence</p>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-600">
            A displayed price looks final. In reality, it is a chain of assumptions: sources,
            timestamps, thresholds, and execution rules.
          </p>
        </div>
        <div>
          <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
            A price is only useful when you can inspect what stands behind it.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: ScanSearch, label: 'Where did it come from?' },
              { icon: CircleDot, label: 'Does it agree elsewhere?' },
              { icon: ShieldCheck, label: 'What happens if it moves?' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="border-t border-slate-900/15 pt-4">
                <Icon className="h-4 w-4 text-blue-700" />
                <p className="mt-4 text-sm font-medium leading-relaxed text-slate-800">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function OracleProcessSection() {
  return (
    <section className="relative overflow-hidden border-y border-slate-900/10 bg-slate-950 px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-14 lg:py-20">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.28),transparent_62%)]" />
      <div className="relative grid gap-12 lg:grid-cols-[0.9fr_1.7fr] lg:gap-20">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">
            03 — Model the consequence
          </p>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
            From a signal to a decision you can defend.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
            Insight separates observation from action, so a risk decision is grounded in source
            context rather than one opaque number.
          </p>
        </div>
        <ol className="grid gap-0 border-l border-white/15 sm:grid-cols-3 sm:border-l-0 sm:border-t sm:pt-7">
          {steps.map((step, index) => (
            <li
              key={step.number}
              className="group relative border-white/15 py-6 pl-7 sm:border-l sm:px-7 sm:py-0 first:sm:border-l-0"
            >
              <span className="absolute -left-[5px] top-8 h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_0_5px_rgba(37,99,235,0.16)] sm:-top-[5px] sm:left-7" />
              <p className="font-mono text-xs text-blue-300">{step.number}</p>
              <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{step.title}</h3>
              <p className="mt-3 min-h-12 text-sm leading-relaxed text-slate-300">{step.text}</p>
              <Link
                href={step.href}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-blue-300"
              >
                {step.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {index < steps.length - 1 ? null : <span className="sr-only">Final step</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function OracleClosingSection() {
  return (
    <section className="final-evidence home-view-reveal">
      <div className="final-evidence-index" aria-hidden="true">
        <span>Source</span>
        <i />
        <span>Consensus</span>
        <i />
        <span>Decision</span>
        <i />
        <span>Proof</span>
      </div>
      <div className="final-evidence-copy">
        <p className="instrument-label">Final checkpoint</p>
        <h2>Let every price come with a way to question it.</h2>
      </div>
      <div className="final-evidence-actions">
        <ol>
          {proofPoints.map((point, index) => (
            <li key={point}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {point}
            </li>
          ))}
        </ol>
        <div>
          <Link href="/register" className="is-primary">
            Start building <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/docs">Read the docs</Link>
        </div>
      </div>
    </section>
  );
}
