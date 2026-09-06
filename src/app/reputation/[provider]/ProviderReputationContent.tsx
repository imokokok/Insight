'use client';

import { useMemo } from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { ArrowLeft, Activity } from 'lucide-react';

import { getProviderColor } from '@/app/reputation/components/ReputationShared';
import { EditorialWorkspaceHeader } from '@/components/editorial';
import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useReputationDetail } from '@/hooks/data/useReputations';
import { providerNames } from '@/lib/constants';
import { PROVIDER_TYPE_CONFIG } from '@/lib/oracles/reputationMetadata';
import {
  getScoreBadge,
  formatTimeAgo,
  calculateLatencyScore,
  calculateDeviationScore,
} from '@/lib/oracles/utils/reputationUtils';
import { type OracleProvider } from '@/types/oracle';

import {
  Sidebar,
  ScoreBreakdown,
  HowItWorks,
  ProviderProfile,
} from './components/ProviderDetailSections';

const TrendCharts = dynamic(() => import('./components/TrendCharts').then((m) => m.TrendCharts), {
  ssr: false,
});

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
    ? calculateLatencyScore(reputation.avg_latency_ms, latencyBaseline)
    : 0;
  const deviationScore = reputation ? calculateDeviationScore(reputation.avg_deviation_pct) : 0;

  if (isLoading) {
    return (
      <div className="editorial-workspace min-h-screen">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12">
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500 animate-pulse" />
              <span className="text-sm text-gray-500 font-black">Loading reputation data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className="editorial-workspace min-h-screen">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <Link
            href="/reputation"
            className="group mb-6 inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-600"
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
      </div>
    );
  }

  return (
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28">
        <EditorialWorkspaceHeader
          index="04.1"
          stage="Provider record"
          eyebrow={`${providerName} · ${provider} · Rolling seven-day evidence`}
          title={`${providerName}, examined as a record.`}
          description="Read the overall score together with its accuracy, uptime, latency, deviation, coverage, and sample history. No single number stands alone."
          evidence={['Score composition', 'Observed trend', 'Coverage context']}
          action={
            <Link
              href="/reputation"
              className="group inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Provider directory
            </Link>
          }
        />

        <div className="grid gap-8 pt-7 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12">
          <Sidebar
            reputation={reputation}
            provider={provider}
            providerName={providerName}
            badge={badge}
            timeAgo={timeAgo}
          />

          <section className="min-w-0 space-y-5" aria-label={`${providerName} reputation evidence`}>
            <div className="flex items-center justify-between border-b border-slate-900/15 pb-3">
              <p className="editorial-index">02 — Inspect the evidence</p>
              <span className="font-mono text-[10px] text-slate-400">30 DAY VIEW</span>
            </div>
            <ProviderProfile provider={provider} />

            <ScoreBreakdown
              reputation={reputation}
              latencyScore={latencyScore}
              deviationScore={deviationScore}
            />

            <TrendCharts trend={trend} providerColor={getProviderColor(provider)} />

            <HowItWorks />
          </section>
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
