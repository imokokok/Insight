'use client';

import { motion } from 'framer-motion';
import {
  Cloud,
  Database,
  Layers,
  Lock,
  RefreshCw,
  Server,
  Shield,
  Timer,
  Workflow,
} from 'lucide-react';

const layers = [
  {
    icon: Server,
    title: 'Frontend',
    subtitle: 'Next.js App Router',
    description:
      'Server-first rendering with App Router, colocated API routes, and optimized static generation for marketing and docs pages. Client components handle interactive dashboards.',
  },
  {
    icon: Cloud,
    title: 'Client State',
    subtitle: 'React Query + Zustand',
    description:
      'React Query caches and synchronizes server state (prices, reputations, reports). Zustand manages lightweight UI state such as auth session and user preferences.',
  },
  {
    icon: Database,
    title: 'Backend & Database',
    subtitle: 'Supabase PostgreSQL',
    description:
      'PostgreSQL stores price records, oracle feeds, alerts, API keys, reputation history, and daily reports. Row Level Security, database functions, and cron jobs run inside the database.',
  },
  {
    icon: Workflow,
    title: 'Oracle Client Layer',
    subtitle: 'Factory + BaseOracleClient',
    description:
      'A unified abstraction wraps 10 oracle providers. Each client handles chain-specific calls, retries, TTL caching, and normalization into a common PriceData format.',
  },
  {
    icon: Shield,
    title: 'API Layer',
    subtitle: 'REST + API Key Auth',
    description:
      'Public v1 endpoints expose prices, batch queries, history, and reports. Internal endpoints power stablecoin depeg, wrapped-asset tracking, and protocol-health features.',
  },
  {
    icon: Timer,
    title: 'Automation',
    subtitle: 'pg_cron + GitHub Actions',
    description:
      'Supabase pg_cron dispatches six product-critical workflows through pg_net using a token encrypted in Vault. Dependency-free GitHub runners perform the heavy work, guarded native schedules provide fallback, and a 30-day ledger records completion. Vercel is not used for background compute.',
  },
];

const tables = [
  { name: 'price_records', purpose: 'Raw and normalized prices with TTL' },
  { name: 'oracle_feeds', purpose: 'Active feed metadata per provider + chain' },
  {
    name: 'hourly_price_snapshots',
    purpose: 'Hourly-grain snapshots (upsert, 120-day retention)',
  },
  {
    name: 'price_snapshots',
    purpose: '15-min-grain snapshots for ML / anomaly detection (120-day retention)',
  },
  { name: 'reputation_history', purpose: 'Per-fetch samples for scoring' },
  { name: 'oracle_reputation', purpose: 'Aggregated 7-day provider scores' },
  { name: 'price_alerts', purpose: 'User alert configurations' },
  { name: 'alert_events', purpose: 'Triggered alert history' },
  { name: 'api_keys', purpose: 'Key-based API authentication' },
  { name: 'daily_reports', purpose: 'Generated market snapshots' },
];

const cronJobs = [
  {
    name: 'snapshot-collect',
    schedule: '15 min',
    purpose: 'Collect price snapshots from all oracle feeds (dual-writes hourly + 15-min tables)',
  },
  {
    name: 'oracle-watch-collect',
    schedule: '30 min',
    purpose: 'Persist the Oracle Watch credibility history and trust signal',
  },
  {
    name: 'reputation',
    schedule: 'Hourly',
    purpose: 'Fetch provider samples and recompute 7-day rolling scores (GitHub Actions)',
  },
  {
    name: 'feed-cadence',
    schedule: 'Daily',
    purpose: 'Refresh per-feed observed staleness baselines (GitHub Actions)',
  },
  {
    name: 'safety-outcome',
    schedule: '2 hours',
    purpose: 'Backfill outcome labels for pre-trade safety checks',
  },
  {
    name: 'protocol-metrics (tvl)',
    schedule: '4 hours',
    purpose: 'Sync protocol TVL from DefiLlama',
  },
  {
    name: 'protocol-metrics (risk-params)',
    schedule: '6 hours',
    purpose: 'Sync per-asset risk parameters from lending protocols',
  },
  {
    name: 'feed-reactivation',
    schedule: '12 hours',
    purpose: 'Re-probe deactivated feeds and revive recovered ones',
  },
  {
    name: 'daily-report/publish',
    schedule: 'Daily',
    purpose: 'Generate and persist the daily report',
  },
  {
    name: 'billing',
    schedule: 'Daily',
    purpose:
      'Grant subscription credit allowances, downgrade expired subs, clean up zombie invoices',
  },
  {
    name: 'feed-discovery',
    schedule: 'Weekly',
    purpose: 'Discover new oracle feeds from each provider\u2019s official API',
  },
  {
    name: 'ml-train',
    schedule: '3 days',
    purpose: 'Retrain the oracle-risk ML model and trigger a Vercel redeploy',
  },
];

const securityItems = [
  {
    title: 'Input Validation',
    description:
      'Zod schemas validate PriceData and API requests. Invalid payloads are rejected before reaching business logic.',
  },
  {
    title: 'Error Taxonomy',
    description:
      'AppError and OracleServiceError classify failures (network, timeout, unsupported symbol, stale data) for observability and retries.',
  },
  {
    title: 'API Key Rate Limiting',
    description:
      'Each API key carries a plan-based rate limit. Usage is logged per endpoint for billing and abuse detection.',
  },
  {
    title: 'Row Level Security',
    description:
      'Supabase RLS policies ensure users can only read their own alerts, API keys, and profile data.',
  },
];

const providers = [
  'Chainlink',
  'API3',
  'RedStone',
  'DIA',
  'WINkLink',
  'Supra',
  'TWAP',
  'Reflector',
  'Flare',
  'Switchboard',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutExpo },
  },
};

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`border-y border-slate-900/15 bg-white/55 p-6 sm:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="py-16 sm:py-20 scroll-mt-20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="border border-blue-200 bg-blue-100 p-2.5">
              <Layers className="w-6 h-6 text-blue-700" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Architecture
            </h2>
          </div>
          <p className="text-slate-600 leading-relaxed max-w-3xl">
            Insight is a full-stack oracle analytics platform built for reliability, 15-minute
            assessment, and multi-provider comparison across blockchains.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="space-y-6"
        >
          {/* System layers */}
          <SectionCard>
            <h3 className="text-xl font-bold text-slate-900 mb-6">System Layers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {layers.map((layer) => (
                <div
                  key={layer.title}
                  className="group border-b border-slate-900/10 p-5 transition-colors last:border-b-0 hover:bg-blue-50/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-blue-200 bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                      <layer.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{layer.title}</h4>
                        <span className="text-xs text-slate-500">{layer.subtitle}</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{layer.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Data model */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="border border-blue-200 bg-blue-50 p-2">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Core Data Model</h3>
            </div>
            <div className="max-w-full overflow-x-auto border-y border-slate-900/15">
              <table className="min-w-[36rem] text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tables.map((table) => (
                    <tr key={table.name} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900 font-mono">
                        {table.name}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{table.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Oracle client layer */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="border border-emerald-200 bg-emerald-50 p-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Oracle Client Layer</h3>
            </div>
            <p className="text-slate-600 leading-relaxed mb-5">
              The{' '}
              <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">
                OracleClientFactory
              </code>{' '}
              creates singleton provider clients that inherit from{' '}
              <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">BaseOracleClient</code>.
              Each implementation translates provider-specific identifiers (feed addresses, price
              IDs, dAPI names) into the unified PriceData shape.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {providers.map((provider) => (
                <div
                  key={provider}
                  className="border-b border-slate-900/10 bg-slate-50 px-3 py-2.5 text-center text-sm font-medium text-slate-700 transition-colors last:border-b-0 hover:bg-emerald-50/30"
                >
                  {provider}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Cron jobs */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="border border-amber-200 bg-amber-50 p-2">
                <Timer className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Automation & Cron Jobs</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cronJobs.map((job) => (
                <div
                  key={job.name}
                  className="border-b border-slate-900/10 p-4 transition-colors last:border-b-0 hover:bg-amber-50/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-slate-900">{job.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                      {job.schedule}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{job.purpose}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Security */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="border border-red-200 bg-red-50 p-2">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Security & Reliability</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {securityItems.map((item) => (
                <div
                  key={item.title}
                  className="border-b border-slate-900/10 p-5 transition-colors last:border-b-0 hover:bg-red-50/25"
                >
                  <h4 className="font-semibold text-slate-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </section>
  );
}
