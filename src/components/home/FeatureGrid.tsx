import Link from 'next/link';

import { ArrowUpRight, Clock, Globe, ShieldCheck, Zap } from 'lucide-react';

import { FeatureCard } from './FeatureCard';

const features = [
  {
    title: 'Compare the evidence',
    description:
      'Resolve independent feeds into a consensus, then inspect the spread, freshness, and source behaviour behind it.',
    href: '/price-insight?stage=compare',
    glyph: 'layers' as const,
    tags: ['Source record', 'Cross-chain', 'Reputation'],
  },
  {
    title: 'Assess a proposed action',
    description:
      'Turn cross-oracle agreement, freshness, deviation, and peg signals into a clear pre-trade assessment before your policy decides what to do.',
    href: '/decision-integrity#pre-trade',
    glyph: 'fault' as const,
    tags: ['Pre-trade', 'Reason codes', 'Evidence'],
  },
  {
    title: 'Watch and preserve the record',
    description:
      'Monitor changing oracle conditions with Oracle Watch, retain optional attestations, and use your own policy to pause or continue.',
    href: '/decision-integrity#oracle-watch-demo',
    glyph: 'seal' as const,
    tags: ['Oracle Watch', 'Attestations', 'Your policy'],
  },
];

const referenceLinks = [
  { label: 'Oracle Evidence', href: '/price-insight?stage=observe' },
  { label: 'Position Stress Test', href: '/safety-check' },
  { label: 'Daily Reports', href: '/reports' },
  { label: 'Oracle Reputation', href: '/reputation' },
  { label: 'Build with Insight', href: '/build' },
  { label: 'Receipt Verification', href: '/verify' },
] as const;

const highlights = [
  {
    icon: Zap,
    label: '10 Providers',
    description: 'Chainlink, RedStone, API3, DIA & more',
  },
  {
    icon: Globe,
    label: 'Multi-Chain',
    description: 'Coverage across EVM, Solana and Cosmos chains',
  },
  {
    icon: Clock,
    label: '15-Min',
    description: '15-minute snapshots with on-demand price verification',
  },
  {
    icon: ShieldCheck,
    label: 'Source Verification',
    description: 'Every price includes on-chain or API verification metadata',
  },
];

export function FeatureGrid() {
  return (
    <section>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {features.map((feature, index) => (
          <div key={feature.title}>
            <FeatureCard
              title={feature.title}
              description={feature.description}
              href={feature.href}
              glyph={feature.glyph}
              tags={feature.tags}
              index={String(index + 1).padStart(2, '0')}
            />
          </div>
        ))}
      </div>

      <nav className="module-reference-index" aria-label="Additional Insight tools">
        <p>Reference index</p>
        <div>
          {referenceLinks.map((link, index) => (
            <Link key={link.href} href={link.href}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-4 grid grid-cols-1 border-l border-t border-slate-900/10 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 border-b border-r border-slate-900/10 bg-white/55 px-4 py-3"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-slate-200 bg-white">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                <div className="text-xs leading-relaxed text-slate-500">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
