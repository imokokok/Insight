'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

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
  type LucideIcon,
} from 'lucide-react';

import { OracleLogo } from '@/app/reputation/components/ReputationShared';
import { ErrorBoundary, SectionErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useReputations, useRecalculateReputation } from '@/hooks/data/useReputations';
import { oracleColors, providerNames } from '@/lib/constants';
import { PROVIDER_TYPE_CONFIG } from '@/lib/oracles/services/reputationService';
import { getScoreColor } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

import { NextUpdateCountdown, ComparisonInfo } from './components/ReputationStats';

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

interface OracleCardReputation {
  overall_score: number;
  supported_symbols_count: number;
  supported_chains_count: number;
  total_queries: number;
  last_calculated_at: string | null;
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

const TYPE_CONFIG: Record<ProviderType, { label: string; icon: LucideIcon; cls: string }> = {
  onchain: {
    label: 'On-chain',
    icon: Shield,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  api: { label: 'API', icon: Zap, cls: 'bg-blue-50 text-blue-700 border-blue-200/80' },
  hybrid: {
    label: 'Hybrid',
    icon: Layers,
    cls: 'bg-purple-50 text-purple-700 border-purple-200/80',
  },
};

function OracleCard({
  provider,
  reputation,
}: {
  provider: OracleProvider;
  reputation?: OracleCardReputation;
}) {
  const profile = PROVIDER_PROFILES[provider];
  const color = oracleColors[provider] || '#888888';
  const providerType = PROVIDER_TYPE_CONFIG[provider]?.type || 'api';
  const typeConf = TYPE_CONFIG[providerType];
  const hasScore = reputation && reputation.overall_score > 0;
  const TypeIcon = typeConf.icon;

  return (
    <Link href={`/reputation/${encodeURIComponent(provider)}`} className="group block">
      <div
        className={cn(
          'relative bg-white rounded-2xl border overflow-hidden transition-all duration-300',
          'border-gray-200/70 hover:border-gray-300',
          'shadow-sm hover:shadow-xl hover:shadow-gray-200/40',
          'hover:-translate-y-1'
        )}
      >
        <div
          className="relative px-5 pt-5 pb-4"
          style={{
            background: `linear-gradient(135deg, ${color}08 0%, ${color}03 50%, transparent 100%)`,
          }}
        >
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-gray-100"
              style={{ backgroundColor: `${color}0A` }}
            >
              <OracleLogo provider={provider} size={30} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-[15px] font-black text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                  {providerNames[provider] || provider}
                </h3>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded text-[9px] font-bold border uppercase tracking-wider flex-shrink-0',
                    typeConf.cls
                  )}
                >
                  <TypeIcon className="w-2.5 h-2.5" />
                  {typeConf.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-semibold leading-tight">
                {profile.tagline}
              </p>
            </div>
            {hasScore && (
              <div
                className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${getScoreColor(reputation.overall_score)}10`,
                  boxShadow: `0 0 0 2px ${getScoreColor(reputation.overall_score)}30`,
                }}
              >
                <span
                  className="text-sm font-black font-mono"
                  style={{ color: getScoreColor(reputation.overall_score) }}
                >
                  {reputation.overall_score.toFixed(0)}
                </span>
              </div>
            )}
          </div>

          <p className="text-[12px] text-gray-500 leading-relaxed mt-3 line-clamp-2">
            {profile.description}
          </p>
        </div>

        <div className="px-5 pb-1">
          <div className="grid grid-cols-4 gap-0 divide-x divide-gray-100 border-t border-gray-100">
            {profile.features.map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center py-2.5 first:pl-0 last:pr-0 px-1"
              >
                <span className="text-[13px] font-black text-gray-800 font-mono">{f.value}</span>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pt-2 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {profile.highlights.map((h) => (
              <span
                key={h}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100"
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        <div
          className={cn(
            'flex items-center justify-between px-5 py-2.5 border-t transition-colors duration-200',
            'bg-gray-50/50 group-hover:bg-primary-50/50 border-gray-100 group-hover:border-primary-100'
          )}
        >
          {hasScore ? (
            <div className="flex items-center gap-2.5 text-[10px] text-gray-400 font-medium">
              <span className="flex items-center gap-0.5">
                <Layers className="w-3 h-3" />
                {reputation.supported_symbols_count}
              </span>
              <span className="flex items-center gap-0.5">
                <Globe className="w-3 h-3" />
                {reputation.supported_chains_count}
              </span>
              <span className="flex items-center gap-0.5">
                <Database className="w-3 h-3" />
                {reputation.total_queries.toLocaleString()}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-400 font-medium">Awaiting data</span>
          )}
          <span className="flex items-center gap-0.5 text-[11px] font-bold text-gray-400 group-hover:text-primary-600 transition-colors">
            Details
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

type FilterType = 'all' | ProviderType;

function ReputationContentInner() {
  const { data, isLoading, error } = useReputations();
  const recalculate = useRecalculateReputation();

  const reputations = useMemo(() => data?.data ?? [], [data?.data]);
  const isCalculating = data?.calculating ?? false;
  const calcMessage = data?.message;
  const nextRecalcAt = data?.nextRecalcAt;

  const [filterType, setFilterType] = useState<FilterType>('all');

  const reputationMap = useMemo(() => {
    const map = new Map<string, (typeof reputations)[0]>();
    for (const r of reputations) {
      map.set(r.provider, r);
    }
    return map;
  }, [reputations]);

  const providers = useMemo(() => {
    const entries = Object.entries(PROVIDER_PROFILES) as [OracleProvider, ProviderProfile][];
    return entries.filter(([provider]) => {
      if (filterType === 'all') return true;
      const pType = PROVIDER_TYPE_CONFIG[provider]?.type;
      return pType === filterType;
    });
  }, [filterType]);

  const allUnrated = reputations.length > 0 && reputations.every((r) => r.overall_score <= 0);

  const ratedCount = reputations.filter((r) => r.overall_score > 0).length;
  const onchainCount = Object.entries(PROVIDER_TYPE_CONFIG).filter(
    ([, v]) => v.type === 'onchain'
  ).length;
  const apiCount = Object.entries(PROVIDER_TYPE_CONFIG).filter(([, v]) => v.type === 'api').length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-200/30">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Oracle Directory</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Explore oracle providers and their unique capabilities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCalculating && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-xs font-bold text-blue-700">
                {calcMessage || 'Recalculating...'}
              </span>
            </div>
          )}
          {!isCalculating && (
            <>
              <NextUpdateCountdown nextRecalcAt={nextRecalcAt} />
              <button
                onClick={() => recalculate.mutate()}
                disabled={recalculate.isPending || isCalculating}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  recalculate.isPending || isCalculating
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                )}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', recalculate.isPending && 'animate-spin')} />
                {recalculate.isPending ? 'Calculating...' : 'Refresh'}
              </button>
            </>
          )}
        </div>
      </div>

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-bold">
                {Object.keys(PROVIDER_PROFILES).length} providers · {ratedCount} with reputation
                data
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-bold mr-1">Type:</span>
              {(
                [
                  ['all', 'All', null],
                  ['onchain', 'On-chain', Shield],
                  ['api', 'API', Zap],
                ] as const
              ).map(([type, label, Icon]) => {
                const active = filterType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type as FilterType)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                      active
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {label}
                    {type === 'all'
                      ? Object.keys(PROVIDER_PROFILES).length
                      : type === 'onchain'
                        ? onchainCount
                        : apiCount}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {providers.map(([provider]) => (
              <SectionErrorBoundary key={provider} componentName={`OracleCard-${provider}`}>
                <OracleCard
                  provider={provider}
                  reputation={reputationMap.get(provider) as OracleCardReputation | undefined}
                />
              </SectionErrorBoundary>
            ))}
          </div>
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

export default function ReputationContent() {
  return (
    <ErrorBoundary level="page" componentName="ReputationContent">
      <ReputationContentInner />
    </ErrorBoundary>
  );
}
