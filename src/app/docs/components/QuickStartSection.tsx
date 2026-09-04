import Link from 'next/link';

import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle,
  Layers,
  MapPin,
  Rocket,
  Search,
  TrendingUp,
} from 'lucide-react';

interface StatBadgeProps {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: 'neutral' | 'blue' | 'emerald' | 'amber';
}

function StatBadge({ icon: Icon, label, value, tone = 'neutral' }: StatBadgeProps) {
  const toneStyles = {
    neutral: 'bg-white border-slate-200 text-slate-900',
    blue: 'bg-blue-50/60 border-blue-100 text-blue-900',
    emerald: 'bg-emerald-50/60 border-emerald-100 text-emerald-900',
    amber: 'bg-amber-50/60 border-amber-100 text-amber-900',
  };

  return (
    <div
      className={`flex items-center gap-3 border-l-2 border-y border-r px-4 py-3 ${toneStyles[tone]}`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-slate-900/15 bg-white">
        <Icon className="w-4 h-4 text-slate-600" />
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <div className="text-sm font-semibold font-tabular">{value}</div>
      </div>
    </div>
  );
}

const platformHighlights = [
  { icon: Layers, label: 'Oracle Providers', value: '10+', tone: 'blue' as const },
  { icon: MapPin, label: 'Blockchains', value: '40+', tone: 'emerald' as const },
  { icon: BarChart3, label: 'Consensus Algorithms', value: '4', tone: 'blue' as const },
];

const steps = [
  {
    icon: Search,
    title: 'Query Prices',
    description:
      'Select an oracle provider, blockchain, and token to get current prices with on-chain verification metadata.',
  },
  {
    icon: TrendingUp,
    title: 'Compare & Analyze',
    description:
      'Cross-oracle comparison with consensus price, cross-chain heatmap, and divergence signals.',
  },
  {
    icon: Bell,
    title: 'Track & Act',
    description:
      'Track oracle reputation over time and track stablecoin or wrapped-asset depeg risks.',
  },
];

const ctas = [
  { href: '/price-query', label: 'Start Searching', primary: true },
  { href: '/price-insight', label: 'Compare Oracles', primary: false },
  { href: '/reputation', label: 'View Reputation', primary: false },
];

export default function QuickStartSection() {
  return (
    <section id="quickstart" className="py-16 scroll-mt-20">
      {/* Header bar */}
      <div className="mb-8 border-y border-slate-900/15 bg-white/55 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 border border-blue-200 bg-blue-50 p-2.5">
              <Rocket className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Quick Start Guide</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Get started with Insight in three steps. The platform aggregates price data from
                major oracle providers across 40+ blockchain networks for comprehensive market
                intelligence.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            {platformHighlights.map((stat) => (
              <StatBadge
                key={stat.label}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                tone={stat.tone}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        <div className="absolute left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] top-12 hidden h-px bg-blue-200 md:block" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group border-b border-slate-900/10 bg-white/55 p-6 transition-colors last:border-b-0 hover:bg-blue-50/30"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center border border-blue-200 bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                  <step.icon className="w-6 h-6" />
                </div>
                <span className="w-7 h-7 bg-slate-100 text-slate-500 text-xs font-bold rounded-full flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature checklist */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          'On-chain verification links',
          'Auto-refresh & keyboard shortcuts',
          'CSV / JSON / Excel / PDF exports',
        ].map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-slate-900/10 bg-white/55 p-4 last:border-b-0"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="text-sm text-slate-700">{item}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap gap-3">
        {ctas.map((cta) =>
          cta.primary ? (
            <Link
              key={cta.href}
              href={cta.href}
              className="inline-flex items-center gap-2 border border-blue-600 bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              {cta.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              key={cta.href}
              href={cta.href}
              className="inline-flex items-center gap-2 border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-700"
            >
              {cta.label}
            </Link>
          )
        )}
      </div>
    </section>
  );
}
