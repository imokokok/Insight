'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { ArrowLeft, Activity } from 'lucide-react';

import { getProviderColor } from '@/app/reputation/components/ReputationShared';
import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useReputationDetail } from '@/hooks/data/useReputations';
import { providerNames } from '@/lib/constants';
import { PROVIDER_TYPE_CONFIG } from '@/lib/oracles/services/reputationService';
import {
  getScoreBadge,
  formatTimeAgo,
  calculateLatencyScore,
  calculateDeviationScore,
} from '@/lib/oracles/utils/reputationUtils';
import { type OracleProvider } from '@/types/oracle';

import { Sidebar, ScoreBreakdown, HowItWorks } from './components/ProviderDetailSections';
import { TrendCharts } from './components/TrendCharts';

function ProviderReputationContentInner({ provider }: { provider: string }) {
  const { data, isLoading, error } = useReputationDetail(provider, {
    includeTrend: true,
    trendDays: 30,
  });

  const providerName = providerNames[provider as OracleProvider] || provider;

  const reputation = data?.reputation ?? null;
  const trend = data?.trend ?? [];

  const badge = useMemo(
    () => (reputation ? getScoreBadge(reputation.overall_score) : getScoreBadge(0)),
    [reputation]
  );

  const timeAgo = useMemo(
    () => formatTimeAgo(reputation?.last_calculated_at ?? null),
    [reputation?.last_calculated_at]
  );

  const providerConfig = PROVIDER_TYPE_CONFIG[provider as OracleProvider];
  const latencyBaseline = providerConfig?.latencyBaseline ?? 1000;

  const latencyScore = reputation
    ? calculateLatencyScore(
        reputation.avg_latency_ms,
        latencyBaseline,
        providerConfig?.type === 'onchain' ? 'onchain' : 'api'
      )
    : 0;
  const deviationScore = reputation ? calculateDeviationScore(reputation.avg_deviation_pct) : 0;

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500 animate-pulse" />
            <span className="text-sm text-gray-500 font-black">Loading reputation data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <Link
          href="/reputation"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-6 group font-bold px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50/50 transition-all"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Reputation
        </Link>
        <EmptyStateEnhanced
          type="data"
          title={`No data for ${providerName}`}
          description="Reputation data is generated automatically. Scores appear after the first calculation run."
          size="lg"
          variant="page"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Link
        href="/reputation"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-6 group font-bold px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50/50 transition-all"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Reputation
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <Sidebar
          reputation={reputation}
          provider={provider}
          providerName={providerName}
          badge={badge}
          timeAgo={timeAgo}
        />

        <div className="flex-1 min-w-0 space-y-5">
          <ScoreBreakdown
            reputation={reputation}
            latencyScore={latencyScore}
            deviationScore={deviationScore}
          />

          <TrendCharts trend={trend} providerColor={getProviderColor(provider)} />

          <HowItWorks />
        </div>
      </div>
    </div>
  );
}

export default function ProviderReputationContent({ provider }: { provider: string }) {
  return (
    <ErrorBoundary level="page" componentName={`ProviderReputation-${provider}`}>
      <ProviderReputationContentInner provider={provider} />
    </ErrorBoundary>
  );
}
