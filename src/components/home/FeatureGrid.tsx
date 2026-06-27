'use client';

import Link from 'next/link';

import { GitCompare, Award, Shield, FileText, ArrowRight, Zap, Globe, Clock } from 'lucide-react';

const features = [
  {
    title: 'Price Insight',
    description: 'Compare asset prices across multiple oracle providers and chains in one view.',
    href: '/price-insight',
    icon: GitCompare,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
  {
    title: 'Daily Reports',
    description: 'Daily aggregated oracle market snapshots and historical trend archives.',
    href: '/reports',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    title: 'Reputation',
    description: 'Oracle rankings, health scores and historical performance metrics.',
    href: '/reputation',
    icon: Award,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    title: 'Safety Check',
    description: 'Estimate liquidation risk and position safety using oracle deviation scenarios.',
    href: '/safety-check',
    icon: Shield,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
];

const highlights = [
  {
    icon: Zap,
    label: '10+ Providers',
    description: 'Chainlink, Pyth, RedStone, API3, DIA & more',
  },
  {
    icon: Globe,
    label: 'Multi-Chain',
    description: 'Coverage across EVM, Solana and Cosmos chains',
  },
  {
    icon: Clock,
    label: 'Real-Time',
    description: 'Continuous aggregation with 30s refresh cycles',
  },
];

export function FeatureGrid() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Explore the Platform</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tools built for oracle-aware DeFi workflows
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div
                className={`w-11 h-11 rounded-lg ${feature.bg} ${feature.border} border flex items-center justify-center mb-4`}
              >
                <Icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{feature.description}</p>
              <div className="flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                Explore
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/70 border border-gray-100"
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
