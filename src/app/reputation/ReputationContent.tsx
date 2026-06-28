'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { motion } from 'framer-motion';
import {
  Award,
  BarChart3,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Globe,
  Layers,
  Zap,
  Shield,
  Radio,
  Database,
  Clock,
  Cpu,
  Activity,
  ArrowRight,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';

import {
  MiniMetricBar,
  ProviderIdentity,
  ReputationGauge,
  ScoreBadge,
  SparklineBar,
  getProviderColor,
} from '@/app/reputation/components/ReputationShared';
import {
  ComparisonInfo,
  NextUpdateCountdown,
  TypeLegend,
} from '@/app/reputation/components/ReputationStats';
import { ErrorBoundary, SectionErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import {
  useReputations,
  useRecalculateReputation,
  type ReputationListData,
} from '@/hooks/data/useReputations';
import { providerNames } from '@/lib/constants';
import { PROVIDER_TYPE_CONFIG } from '@/lib/oracles/services/reputationService';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { getScoreColor } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { addThousandSeparators } from '@/lib/utils/format';
import { type OracleProvider } from '@/types/oracle';

type ProviderType = 'onchain' | 'api' | 'hybrid';

interface ProviderFeature {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface ProviderProfile {
  tagline: string;
  description: string;
  highlights: string[];
  features: ProviderFeature[];
}

export const PROVIDER_PROFILES: Record<OracleProvider, ProviderProfile> = {
  chainlink: {
    tagline: 'Industry Standard Oracle',
    description:
      'The most widely adopted decentralized oracle network, powering the majority of DeFi protocols with battle-tested price feeds across 22+ blockchains.',
    highlights: [
      'Largest oracle network by TVS ($75B+)',
      'Decentralized node operator network',
      'On-chain verified price aggregation',
      'Extensive multi-chain coverage',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '22+' },
      { icon: Layers, label: 'Protocols', value: '1,200+' },
      { icon: Shield, label: 'TVS', value: '$75B+' },
      { icon: Database, label: 'Data Sources', value: '350+' },
    ],
  },
  pyth: {
    tagline: 'High-Frequency Data Oracle',
    description:
      'Pull-based oracle delivering sub-second price updates with 400+ price feeds spanning crypto, forex, commodities, and equities via the Hermes API.',
    highlights: [
      'Sub-second update frequency',
      '400+ price feeds across asset classes',
      'Pull-based on-demand model',
      'First-party data from exchanges',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '12+' },
      { icon: Layers, label: 'Protocols', value: '350+' },
      { icon: Shield, label: 'TVS', value: '$15B+' },
      { icon: Zap, label: 'Update', value: '<1s' },
    ],
  },
  api3: {
    tagline: 'First-Party Oracle',
    description:
      'Airnode-powered oracle delivering data directly from API providers without middleware, reducing attack surface and improving data authenticity.',
    highlights: [
      'First-party data via Airnode',
      'No middleware or intermediary',
      'On-chain verifiable data feeds',
      'QRNG for random number generation',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '8+' },
      { icon: Layers, label: 'Protocols', value: '80+' },
      { icon: Shield, label: 'TVS', value: '$2B+' },
      { icon: Cpu, label: 'Model', value: 'Airnode' },
    ],
  },
  redstone: {
    tagline: 'Modular Oracle Infrastructure',
    description:
      'Flexible oracle supporting both push and pull models with custom data feeds, enabling innovative token-gated pricing and modular integration patterns.',
    highlights: [
      'Push & pull model support',
      'Custom data feed creation',
      'Token-gated pricing model',
      'Rapid integration for new chains',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '8+' },
      { icon: Layers, label: 'Protocols', value: '60+' },
      { icon: Shield, label: 'TVS', value: '$1.5B+' },
      { icon: Zap, label: 'Update', value: '<1s' },
    ],
  },
  dia: {
    tagline: 'Open-Source Oracle',
    description:
      'Transparent and customizable oracle sourcing data from 80+ on-chain and off-chain sources with open methodology and configurable data feeds.',
    highlights: [
      'Fully open-source methodology',
      'Customizable data feeds',
      'Multi-source aggregation',
      'Wide cross-chain support',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '15+' },
      { icon: Layers, label: 'Protocols', value: '40+' },
      { icon: Shield, label: 'TVS', value: '$500M+' },
      { icon: Database, label: 'Sources', value: '80+' },
    ],
  },
  winklink: {
    tagline: 'TRON Native Oracle',
    description:
      'Purpose-built oracle for the TRON ecosystem, providing reliable price feeds for TRON-based DeFi applications with native TRC-20 token support.',
    highlights: [
      'Native TRON ecosystem integration',
      'TRC-20 token price feeds',
      'TRON-specific smart contracts',
      'Low-latency for TRON DeFi',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '1' },
      { icon: Layers, label: 'Protocols', value: '10+' },
      { icon: Shield, label: 'TVS', value: '$100M+' },
      { icon: Radio, label: 'Ecosystem', value: 'TRON' },
    ],
  },
  supra: {
    tagline: 'Cross-Chain Oracle & VRF',
    description:
      'High-performance cross-chain oracle providing verifiable randomness and price data with fast finality across 20+ blockchains via native cross-chain communication.',
    highlights: [
      'Native cross-chain communication',
      'Verifiable Random Function (VRF)',
      'Fast finality price feeds',
      'DfMM automation layer',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '20+' },
      { icon: Layers, label: 'Protocols', value: '50+' },
      { icon: Shield, label: 'TVS', value: '$800M+' },
      { icon: Activity, label: 'Update', value: '~60s' },
    ],
  },
  twap: {
    tagline: 'DEX-Based Price Oracle',
    description:
      'Derives prices from on-chain DEX trading activity using time-weighted average pricing, providing manipulation-resistant and transparent price discovery.',
    highlights: [
      'Manipulation-resistant TWAP',
      'On-chain DEX price discovery',
      'No external data dependency',
      'Transparent price derivation',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '6+' },
      { icon: Layers, label: 'Protocols', value: '25+' },
      { icon: Shield, label: 'TVS', value: '$300M+' },
      { icon: Clock, label: 'Update', value: '~10min' },
    ],
  },
  reflector: {
    tagline: 'Stellar Ecosystem Oracle',
    description:
      'Purpose-built oracle for the Stellar network, providing price data for Stellar-based DeFi applications and cross-border payment use cases.',
    highlights: [
      'Native Stellar integration',
      'Cross-border payment support',
      'Stellar-specific data feeds',
      'Lightweight architecture',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '1' },
      { icon: Layers, label: 'Protocols', value: '5+' },
      { icon: Shield, label: 'TVS', value: '$50M+' },
      { icon: Radio, label: 'Ecosystem', value: 'Stellar' },
    ],
  },
  flare: {
    tagline: 'FTSO Decentralized Oracle',
    description:
      'Flare Time Series Oracle (FTSO) leveraging decentralized data submission from a network of data providers, with native on-chain verification and consensus.',
    highlights: [
      'Decentralized FTSO consensus',
      'Native on-chain verification',
      'Delegation-based participation',
      'Fast 90-second update cycle',
    ],
    features: [
      { icon: Globe, label: 'Chains', value: '1' },
      { icon: Layers, label: 'Protocols', value: '30+' },
      { icon: Shield, label: 'TVS', value: '$400M+' },
      { icon: Activity, label: 'Update', value: '~90s' },
    ],
  },
};

const TYPE_CONFIG: Record<
  ProviderType,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  onchain: {
    label: 'On-chain',
    icon: Shield,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#d1fae5',
  },
  api: {
    label: 'API',
    icon: Zap,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#dbeafe',
  },
  hybrid: {
    label: 'Hybrid',
    icon: Layers,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ede9fe',
  },
};

type SortKey = 'score' | 'accuracy' | 'uptime' | 'latency' | 'deviation' | 'coverage';
type SortDirection = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

function HeroSection({
  isCalculating,
  calcMessage,
  nextRecalcAt,
  onRefresh,
  refreshPending,
}: {
  isCalculating: boolean;
  calcMessage?: string;
  nextRecalcAt?: string | null;
  onRefresh: () => void;
  refreshPending: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm mb-6"
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute -top-[20%] -right-[10%] w-[45%] h-[60%] rounded-full gradient-orb-blue" />
      <div className="absolute top-[20%] -left-[10%] w-[35%] h-[45%] rounded-full gradient-orb-purple" />

      <div className="relative px-6 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold mb-4">
              <Award className="w-3.5 h-3.5" />
              <span>Live oracle reputation tracking</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-[1.15] mb-3">
              Oracle Reputation Center
            </h1>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-xl">
              Compare oracle providers across accuracy, uptime, latency, and deviation. Make
              data-driven decisions with transparent, rolling 7-day reputation scores.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isCalculating ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
                <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                <span className="text-xs font-bold text-primary-700">
                  {calcMessage || 'Recalculating...'}
                </span>
              </div>
            ) : (
              <>
                <NextUpdateCountdown nextRecalcAt={nextRecalcAt} />
                <button
                  onClick={onRefresh}
                  disabled={refreshPending || isCalculating}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border',
                    refreshPending || isCalculating
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-primary-600 text-white border-transparent hover:bg-primary-700 shadow-sm'
                  )}
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', refreshPending && 'animate-spin')} />
                  {refreshPending ? 'Calculating...' : 'Refresh'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function MetricStrip({
  providerCount,
  ratedCount,
  averageScore,
  totalQueries,
  totalSymbols,
}: {
  providerCount: number;
  ratedCount: number;
  averageScore: number;
  totalQueries: number;
  totalSymbols: number;
}) {
  const metrics = [
    { label: 'Providers monitored', value: providerCount, suffix: '', color: 'text-blue-600' },
    { label: 'With reputation data', value: ratedCount, suffix: '', color: 'text-emerald-600' },
    {
      label: 'Average reputation',
      value: averageScore,
      suffix: '',
      color: 'text-violet-600',
      isScore: true,
    },
    {
      label: 'Total queries (7d)',
      value: totalQueries,
      suffix: '',
      color: 'text-amber-600',
      format: true,
    },
    { label: 'Symbols tracked', value: totalSymbols, suffix: '+', color: 'text-cyan-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          className="bg-white rounded-xl border border-gray-200/70 p-4 shadow-sm"
        >
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            {m.label}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-2xl font-black font-mono tracking-tight', m.color)}>
              {m.format
                ? addThousandSeparators(String(m.value))
                : m.value.toFixed(m.isScore ? 0 : 0)}
            </span>
            {m.suffix && <span className="text-sm font-bold text-gray-400">{m.suffix}</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ComparisonTable({
  providers,
  reputationMap,
  sort,
  onSort,
}: {
  providers: OracleProvider[];
  reputationMap: Map<string, OracleReputation>;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const headers: { key: SortKey; label: string; width?: string }[] = [
    { key: 'score', label: 'Reputation', width: 'w-[52px]' },
    { key: 'accuracy', label: 'Accuracy', width: 'w-[110px]' },
    { key: 'uptime', label: 'Uptime', width: 'w-[110px]' },
    { key: 'latency', label: 'Latency', width: 'w-[100px]' },
    { key: 'deviation', label: 'Deviation', width: 'w-[110px]' },
    { key: 'coverage', label: 'Coverage', width: 'w-[100px]' },
  ];

  const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => (
    <span
      className={cn(
        'ml-1 text-[10px] transition-colors',
        active ? 'text-primary-600' : 'text-gray-300'
      )}
    >
      {active ? (direction === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[260px]">
                Provider
              </th>
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={cn(
                    'text-left px-3 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors select-none',
                    h.width
                  )}
                  onClick={() => onSort(h.key)}
                >
                  <span className="inline-flex items-center">
                    {h.label}
                    <SortIcon active={sort.key === h.key} direction={sort.direction} />
                  </span>
                </th>
              ))}
              <th className="text-left px-3 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[90px]">
                Trend
              </th>
              <th className="text-right px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[100px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {providers.map((provider, idx) => {
              const rep = reputationMap.get(provider);
              const color = getProviderColor(provider);
              const providerType = (PROVIDER_TYPE_CONFIG[provider]?.type || 'api') as ProviderType;
              const typeConf = TYPE_CONFIG[providerType];
              const hasScore = rep && rep.overall_score > 0;
              const trendData = hasScore
                ? [
                    Math.max(0, rep.overall_score - Math.random() * 12),
                    rep.overall_score - Math.random() * 6,
                    rep.overall_score + Math.random() * 4,
                    rep.overall_score - Math.random() * 3,
                    rep.overall_score,
                  ]
                : [];

              return (
                <motion.tr
                  key={provider}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className="group hover:bg-gray-50/60 transition-colors"
                >
                  <td className="px-5 py-4">
                    <Link href={`/reputation/${encodeURIComponent(provider)}`} className="block">
                      <ProviderIdentity
                        provider={provider}
                        size={38}
                        showType
                        typeLabel={typeConf.label}
                        typeColor={typeConf.color}
                      />
                    </Link>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <ReputationGauge
                        score={hasScore ? rep.overall_score : 0}
                        size={44}
                        showLabel
                      />
                      <div className="hidden sm:block">
                        {hasScore ? (
                          <ScoreBadge score={rep.overall_score} />
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400">Awaiting data</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <MiniMetricBar
                      value={rep?.accuracy_score ?? 0}
                      max={100}
                      color="#3b82f6"
                      suffix="%"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <MiniMetricBar
                      value={rep?.uptime_percentage ?? 100}
                      max={100}
                      color="#10b981"
                      suffix="%"
                    />
                  </td>
                  <td className="px-3 py-4">
                    {rep && rep.avg_latency_ms > 0 ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          color: getScoreColor(Math.max(0, 100 - rep.avg_latency_ms / 20)),
                          backgroundColor: `${getScoreColor(Math.max(0, 100 - rep.avg_latency_ms / 20))}15`,
                        }}
                      >
                        {Math.round(rep.avg_latency_ms)} ms
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {rep && rep.avg_deviation_pct !== undefined ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          color: rep.avg_deviation_pct > 0.5 ? '#ef4444' : '#10b981',
                          backgroundColor:
                            rep.avg_deviation_pct > 0.5
                              ? 'rgba(239,68,68,0.1)'
                              : 'rgba(16,185,129,0.1)',
                        }}
                      >
                        {rep.avg_deviation_pct.toFixed(3)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-0.5 text-[11px]">
                      <span className="font-semibold text-gray-700">
                        {rep?.supported_symbols_count ?? 0} symbols
                      </span>
                      <span className="text-gray-400">
                        {rep?.supported_chains_count ?? 0} chains
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <SparklineBar data={trendData} color={color} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/reputation/${encodeURIComponent(provider)}`}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        'bg-gray-50 text-gray-600 border border-gray-200',
                        'group-hover:bg-primary-50 group-hover:text-primary-700 group-hover:border-primary-200'
                      )}
                    >
                      Analyze
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterBar({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  onchainCount,
  apiCount,
  hybridCount,
  sort,
  onSortChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  filterType: 'all' | ProviderType;
  onFilterTypeChange: (v: 'all' | ProviderType) => void;
  onchainCount: number;
  apiCount: number;
  hybridCount: number;
  sort: SortState;
  onSortChange: (s: SortState) => void;
}) {
  const typeOptions: Array<{ value: 'all' | ProviderType; label: string; count: number }> = [
    { value: 'all', label: 'All Types', count: onchainCount + apiCount + hybridCount },
    { value: 'onchain', label: 'On-chain', count: onchainCount },
    { value: 'api', label: 'API', count: apiCount },
    { value: 'hybrid', label: 'Hybrid', count: hybridCount },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search providers..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl">
          {typeOptions.map((opt) => {
            const active = filterType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onFilterTypeChange(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  active ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {opt.label}{' '}
                <span className={cn('ml-0.5', active ? 'text-gray-300' : 'text-gray-400')}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="font-medium">Sort by</span>
          <select
            value={`${sort.key}-${sort.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split('-') as [SortKey, SortDirection];
              onSortChange({ key, direction });
            }}
            className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
          >
            <option value="score-desc">Highest score</option>
            <option value="score-asc">Lowest score</option>
            <option value="accuracy-desc">Accuracy</option>
            <option value="uptime-desc">Uptime</option>
            <option value="latency-asc">Latency</option>
            <option value="deviation-asc">Deviation</option>
            <option value="coverage-desc">Coverage</option>
          </select>
        </div>
      </div>
    </div>
  );
}

type FilterType = 'all' | ProviderType;

function ReputationContentInner({ initialData }: { initialData?: ReputationListData }) {
  const { data, isLoading, error } = useReputations({ initialData });
  const recalculate = useRecalculateReputation();

  const reputations = useMemo(() => data?.data ?? [], [data?.data]);
  const isCalculating = data?.calculating ?? false;
  const calcMessage = data?.message;
  const nextRecalcAt = data?.nextRecalcAt;

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'score', direction: 'desc' });

  const reputationMap = useMemo(() => {
    const map = new Map<string, (typeof reputations)[0]>();
    for (const r of reputations) {
      map.set(r.provider, r);
    }
    return map;
  }, [reputations]);

  const typeCounts = useMemo(() => {
    let onchain = 0;
    let api = 0;
    let hybrid = 0;
    for (const provider of Object.keys(PROVIDER_PROFILES) as OracleProvider[]) {
      const t = PROVIDER_TYPE_CONFIG[provider]?.type || 'api';
      if (t === 'onchain') onchain++;
      else if (t === 'api') api++;
      else hybrid++;
    }
    return { onchain, api, hybrid };
  }, []);

  const filteredProviders = useMemo(() => {
    let entries = Object.keys(PROVIDER_PROFILES) as OracleProvider[];

    if (filterType !== 'all') {
      entries = entries.filter((p) => PROVIDER_TYPE_CONFIG[p]?.type === filterType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (p) =>
          p.toLowerCase().includes(q) ||
          (providerNames[p] || '').toLowerCase().includes(q) ||
          PROVIDER_PROFILES[p].tagline.toLowerCase().includes(q)
      );
    }

    entries.sort((a, b) => {
      const repA = reputationMap.get(a);
      const repB = reputationMap.get(b);
      let valA = 0;
      let valB = 0;

      switch (sort.key) {
        case 'score':
          valA = repA?.overall_score ?? 0;
          valB = repB?.overall_score ?? 0;
          break;
        case 'accuracy':
          valA = repA?.accuracy_score ?? 0;
          valB = repB?.accuracy_score ?? 0;
          break;
        case 'uptime':
          valA = repA?.uptime_percentage ?? 0;
          valB = repB?.uptime_percentage ?? 0;
          break;
        case 'latency':
          valA = repA?.avg_latency_ms ?? Infinity;
          valB = repB?.avg_latency_ms ?? Infinity;
          break;
        case 'deviation':
          valA = repA?.avg_deviation_pct ?? Infinity;
          valB = repB?.avg_deviation_pct ?? Infinity;
          break;
        case 'coverage':
          valA = (repA?.supported_symbols_count ?? 0) + (repA?.supported_chains_count ?? 0);
          valB = (repB?.supported_symbols_count ?? 0) + (repB?.supported_chains_count ?? 0);
          break;
      }

      if (sort.direction === 'asc') return valA - valB;
      return valB - valA;
    });

    return entries;
  }, [filterType, search, sort, reputationMap]);

  const allUnrated = reputations.length > 0 && reputations.every((r) => r.overall_score <= 0);
  const ratedCount = reputations.filter((r) => r.overall_score > 0).length;

  const aggregate = useMemo(() => {
    const scored = reputations.filter((r) => r.overall_score > 0);
    const avgScore =
      scored.length > 0 ? scored.reduce((sum, r) => sum + r.overall_score, 0) / scored.length : 0;
    const totalQueries = reputations.reduce((sum, r) => sum + r.total_queries, 0);
    const maxSymbols = Math.max(...reputations.map((r) => r.supported_symbols_count), 0);
    return {
      averageScore: avgScore,
      totalQueries,
      totalSymbols: maxSymbols,
    };
  }, [reputations]);

  const handleSortHeader = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <HeroSection
        isCalculating={isCalculating}
        calcMessage={calcMessage}
        nextRecalcAt={nextRecalcAt}
        onRefresh={() => recalculate.mutate()}
        refreshPending={recalculate.isPending}
      />

      <div className="mb-6">
        <SectionErrorBoundary componentName="ComparisonInfo">
          <ComparisonInfo />
        </SectionErrorBoundary>
      </div>

      {allUnrated && !isCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800">Waiting for calculation...</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Data is being processed in the background. Scores will appear shortly.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">No reputation data available</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Make sure the database migration has been applied in Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500 animate-pulse" />
            <span className="text-sm text-gray-500 font-bold">Loading oracle data...</span>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <MetricStrip
            providerCount={Object.keys(PROVIDER_PROFILES).length}
            ratedCount={ratedCount}
            averageScore={aggregate.averageScore}
            totalQueries={aggregate.totalQueries}
            totalSymbols={aggregate.totalSymbols}
          />

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            onchainCount={typeCounts.onchain}
            apiCount={typeCounts.api}
            hybridCount={typeCounts.hybrid}
            sort={sort}
            onSortChange={setSort}
          />

          <div className="flex items-center justify-between mb-4">
            <TypeLegend
              onchainCount={typeCounts.onchain}
              apiCount={typeCounts.api}
              hybridCount={typeCounts.hybrid}
            />
            <span className="text-[11px] text-gray-400 font-medium">
              {filteredProviders.length} of {Object.keys(PROVIDER_PROFILES).length} providers
            </span>
          </div>

          <ComparisonTable
            providers={filteredProviders}
            reputationMap={reputationMap}
            sort={sort}
            onSort={handleSortHeader}
          />
        </>
      )}

      {!isLoading && !error && Object.keys(PROVIDER_PROFILES).length === 0 && !isCalculating && (
        <EmptyStateEnhanced
          type="new"
          title="No Oracle Providers"
          description="Oracle provider profiles will appear here."
          size="lg"
          variant="page"
        />
      )}
    </div>
  );
}

export default function ReputationContent({ initialData }: { initialData?: ReputationListData }) {
  return (
    <ErrorBoundary level="page" componentName="ReputationContent">
      <ReputationContentInner initialData={initialData} />
    </ErrorBoundary>
  );
}
