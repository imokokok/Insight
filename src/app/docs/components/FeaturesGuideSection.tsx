import Link from 'next/link';

import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Award,
  BarChart3,
  Clock,
  FileText,
  GitCompare,
  Layers,
  Search,
  Shield,
  ShieldCheck,
} from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  highlights: string[];
  accent: 'blue' | 'emerald' | 'amber' | 'violet' | 'red' | 'cyan';
}

const features: Feature[] = [
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Safety Check',
    description:
      'Calculate the exact oracle price deviation that would trigger liquidation for your DeFi lending positions across multiple protocols.',
    href: '/safety-check',
    highlights: [
      'Multi-asset collateral and borrow support',
      'Health factor gauge and safety buffer analysis',
      'Protocol-derived liquidation thresholds',
    ],
    accent: 'emerald',
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: 'Stablecoin Depeg Tracker',
    description:
      '15-minute stablecoin depeg tracking across oracle providers and chains with protocol impact analysis.',
    href: '/stablecoin-depeg',
    highlights: [
      'Multi-oracle consensus price and deviation tracking',
      'Affected protocol mapping for collateral and borrow roles',
      'Risk level classification with duration tracking',
    ],
    accent: 'amber',
  },
  {
    icon: <Anchor className="w-6 h-6" />,
    title: 'Wrapped Asset Peg Tracker',
    description:
      'Track WBTC, wstETH, cbETH, and other wrapped or liquid-staking tokens for deviations against their underlying assets.',
    href: '/wrapped-assets',
    highlights: [
      'On-chain LST exchange rate integration',
      'Cross-source deviation heatmap',
      'Collateral impact mapping across lending protocols',
    ],
    accent: 'cyan',
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Price Query',
    description:
      'Query current prices from any oracle provider with on-chain data, confidence intervals, and auto-refresh.',
    href: '/price-query',
    highlights: [
      '11 oracle providers with cascade filtering',
      'On-chain data and confidence intervals',
      'Auto-refresh and keyboard shortcuts',
    ],
    accent: 'blue',
  },
  {
    icon: <GitCompare className="w-6 h-6" />,
    title: 'Price Insight',
    description:
      'Compare oracle prices across providers and blockchains with consensus price, divergence signals, and risk analysis.',
    href: '/price-insight',
    highlights: [
      'By Oracle / By Chain dimension switching',
      '4 consensus algorithms and divergence signals',
      'Risk analysis, feed health, and reliability ranking',
    ],
    accent: 'violet',
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: 'Oracle Reputation',
    description:
      'Persistent 7-day rolling reputation scores with accuracy, uptime, reliability, latency, and freshness metrics.',
    href: '/reputation',
    highlights: [
      '7-day rolling aggregated scores',
      '5-metric evaluation framework',
      'Provider detail pages with trend charts',
    ],
    accent: 'red',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Daily Reports',
    description:
      'Daily aggregated oracle market snapshots with consensus prices, provider rankings, and stablecoin or wrapped-asset peg risk highlights.',
    href: '/reports',
    highlights: [
      'Daily consensus price and deviation summaries',
      'Stablecoin depeg and wrapped asset peg summaries',
      'Provider rankings and risk highlights',
    ],
    accent: 'blue',
  },
];

const accentStyles = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'group-hover:border-blue-200',
    dot: 'bg-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'group-hover:border-emerald-200',
    dot: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'group-hover:border-amber-200',
    dot: 'bg-amber-500',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'group-hover:border-violet-200',
    dot: 'bg-violet-500',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'group-hover:border-red-200',
    dot: 'bg-red-500',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'group-hover:border-cyan-200',
    dot: 'bg-cyan-500',
  },
};

const quickCards = [
  {
    icon: Clock,
    title: 'Auto-Refresh',
    description: 'Live on-demand price polling',
    tone: 'blue',
  },
  {
    icon: Shield,
    title: '10 Oracle Providers',
    description: 'Chainlink, API3, RedStone, DIA, and more',
    tone: 'emerald',
  },
  {
    icon: ShieldCheck,
    title: 'Safety & Risk',
    description: 'Position, stablecoin, and wrapped asset tracking',
    tone: 'amber',
  },
  {
    icon: BarChart3,
    title: 'Multi-format Export',
    description: 'CSV, JSON, Excel, PDF, PNG',
    tone: 'violet',
  },
];

const quickCardStyles: Record<string, string> = {
  blue: 'bg-blue-50/60 border-blue-100 hover:border-blue-200',
  emerald: 'bg-emerald-50/60 border-emerald-100 hover:border-emerald-200',
  amber: 'bg-amber-50/60 border-amber-100 hover:border-amber-200',
  violet: 'bg-violet-50/60 border-violet-100 hover:border-violet-200',
};

const quickIconStyles: Record<string, string> = {
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  violet: 'text-violet-600',
};

export default function FeaturesGuideSection() {
  return (
    <section id="features" className="py-16 scroll-mt-20 border-t border-slate-100">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Layers className="w-5 h-5 text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Features Guide</h2>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Explore the core capabilities of the Insight oracle data platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.map((feature, index) => {
          const accent = accentStyles[feature.accent];
          return (
            <Link
              key={index}
              href={feature.href}
              className={`group block bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-all ${accent.border}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 ${accent.bg} rounded-xl flex items-center justify-center ${accent.text} flex-shrink-0 group-hover:scale-105 transition-transform`}
                >
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {feature.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className={`w-1.5 h-1.5 rounded-full ${accent.dot} flex-shrink-0`} />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                Learn More
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${quickCardStyles[card.tone]}`}
            >
              <Icon className={`w-5 h-5 ${quickIconStyles[card.tone]} flex-shrink-0`} />
              <div>
                <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                <p className="text-xs text-slate-600">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
