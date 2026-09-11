import Link from 'next/link';

import { ArrowUpRight, Clock, Globe, ShieldCheck, Zap } from 'lucide-react';

import { FeatureCard } from './FeatureCard';

const features = [
  {
    title: 'Compare the evidence',
    description:
      'Resolve independent feeds into a consensus, then inspect the spread, freshness, and source behaviour behind it.',
    href: '/price-insight',
    glyph: 'layers' as const,
    tags: ['Price Query', 'Cross-chain', 'Reputation'],
  },
  {
    title: 'Model the consequence',
    description:
      'Stress-test a live or manual position against oracle deviation before a liquidation engine has to react.',
    href: '/safety-check',
    glyph: 'fault' as const,
    tags: ['Safety Check', 'Depeg monitors', 'What-if'],
  },
  {
    title: 'Prove the decision',
    description:
      'Put signed receipts, Oracle Watch halt signals, and pre-trade gates directly into an agent or protocol workflow.',
    href: '/sdk',
    glyph: 'seal' as const,
    tags: ['Guard SDK', 'REST API', 'Signed receipt'],
  },
];

const referenceLinks = [
  { label: 'Price Query', href: '/price-query' },
  { label: 'Daily Reports', href: '/reports' },
  { label: 'Oracle Reputation', href: '/reputation' },
  { label: 'Developer API', href: '/api' },
  { label: 'Receipt Verification', href: '/verify' },
] as const;

const highlights = [
  {
    icon: Zap,
    label: '10+ Providers',
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
