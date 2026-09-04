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
    title: 'AI Agents',
    description:
      'Give AI agents a pre-trade oracle safety checkpoint — PASS/CAUTION/DANGER/BLOCK before any on-chain trade, plus 34 MCP tools.',
    href: '/ai',
    icon: Bot,
    size: 'small' as const,
    tags: ['Pre-trade safety', 'MCP server', 'Claude / Cursor'],
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-[0_1px_1px_rgba(15,23,42,0.02)]"
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm">
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
