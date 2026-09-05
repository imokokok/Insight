import {
  Bot,
  FileText,
  GitCompare,
  Key,
  Server,
  Shield,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
} from 'lucide-react';

import { FeatureCard } from './FeatureCard';

const features = [
  {
    title: 'Price Insight',
    description:
      'Verify cross-oracle price consistency across providers and chains in a single transparent view.',
    href: '/price-insight',
    icon: GitCompare,
    size: 'large' as const,
    tags: ['10+ providers', 'Cross-chain', 'Spread analysis'],
  },
  {
    title: 'Safety Check',
    description:
      'Stress-test how oracle deviations impact your positions before liquidation engines trigger.',
    href: '/safety-check',
    icon: Shield,
    size: 'large' as const,
    tags: ['Protocol thresholds', 'Deviation stress', 'What-if'],
  },
  {
    title: 'Agent Guard SDK',
    description:
      'Give DeFi agents one guarded workflow: pre-trade gates, Oracle Watch halts, and verified execution receipts.',
    href: '/sdk',
    icon: Bot,
    size: 'small' as const,
    tags: ['Gate before submit', 'Watch halt', 'Signed receipt'],
  },
  {
    title: 'Daily Reports',
    description: 'Daily oracle transparency snapshots and historical trend archives.',
    href: '/reports',
    icon: FileText,
    size: 'small' as const,
    tags: ['Email digest', 'Archive'],
  },
  {
    title: 'Reputation',
    description: 'Benchmark accuracy, uptime, deviation, and coverage scores across every oracle.',
    href: '/reputation',
    icon: Server,
    size: 'small' as const,
    tags: ['Uptime', 'Deviation', 'Coverage'],
  },
  {
    title: 'Developer API',
    description: 'Integrate verified prices and risk signals into your dApp or trading bot.',
    href: '/api',
    icon: Key,
    size: 'small' as const,
    tags: ['REST v1', 'Verified metadata'],
  },
];

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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        {features.map((feature) => (
          <div key={feature.title} className={feature.size === 'large' ? 'md:col-span-2' : ''}>
            <FeatureCard
              title={feature.title}
              description={feature.description}
              href={feature.href}
              icon={feature.icon}
              size={feature.size}
              tags={feature.tags}
            />
          </div>
        ))}
      </div>

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
