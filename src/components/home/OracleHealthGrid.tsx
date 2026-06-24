'use client';

import { useMemo } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Activity, ArrowRight } from 'lucide-react';

import { useReputations } from '@/hooks/data/useReputations';
import { providerNames } from '@/lib/constants';
import { OracleProvider } from '@/types/oracle';

const ALL_PROVIDERS: OracleProvider[] = [
  OracleProvider.CHAINLINK,
  OracleProvider.PYTH,
  OracleProvider.REDSTONE,
  OracleProvider.API3,
  OracleProvider.DIA,
  OracleProvider.SUPRA,
  OracleProvider.TWAP,
  OracleProvider.FLARE,
  OracleProvider.REFLECTOR,
  OracleProvider.WINKLINK,
];

function getStatusFromScore(score: number): 'healthy' | 'degraded' | 'down' {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'degraded';
  return 'down';
}

export function OracleHealthGrid() {
  const { data: reputationData, isLoading } = useReputations();

  const { statusMap, counts } = useMemo(() => {
    const reputations = reputationData?.data ?? [];
    const map = new Map<string, { score: number; status: 'healthy' | 'degraded' | 'down' }>();
    for (const r of reputations) {
      const score = r.overall_score;
      map.set(r.provider, { score, status: getStatusFromScore(score) });
    }

    const getStatus = (provider: OracleProvider) => {
      const rep = map.get(provider);
      if (rep) return rep;
      if (isLoading) return { score: 0, status: 'healthy' as const };
      return { score: 0, status: 'down' as const };
    };

    let healthy = 0;
    let degraded = 0;
    let down = 0;
    for (const provider of ALL_PROVIDERS) {
      const { status } = getStatus(provider);
      if (status === 'healthy') healthy++;
      else if (status === 'degraded') degraded++;
      else down++;
    }

    return { statusMap: map, counts: { healthy, degraded, down, total: ALL_PROVIDERS.length } };
  }, [reputationData?.data, isLoading]);

  const getStatus = (provider: OracleProvider) => {
    const rep = statusMap.get(provider);
    if (rep) return rep;
    if (isLoading) return { score: 0, status: 'healthy' as const };
    return { score: 0, status: 'down' as const };
  };

  const statusConfig = {
    healthy: {
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-500/20',
      bg: 'bg-emerald-50/50',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Healthy',
    },
    degraded: {
      dot: 'bg-amber-500',
      ring: 'ring-amber-500/20',
      bg: 'bg-amber-50/50',
      badge: 'bg-amber-100 text-amber-700',
      label: 'Degraded',
    },
    down: {
      dot: 'bg-rose-500',
      ring: 'ring-rose-500/20',
      bg: 'bg-rose-50/50',
      badge: 'bg-rose-100 text-rose-700',
      label: 'Down',
    },
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Oracle Network Health</h2>
            <p className="text-sm text-gray-500">Real-time status across provider infrastructure</p>
          </div>
        </div>
        <Link
          href="/reputation"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Directory
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 sm:p-4">
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-tabular">
            {counts.healthy}
          </div>
          <div className="text-xs sm:text-sm text-emerald-700/80 font-medium">Healthy</div>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50/30 p-3 sm:p-4">
          <div className="text-2xl sm:text-3xl font-bold text-amber-700 font-tabular">
            {counts.degraded}
          </div>
          <div className="text-xs sm:text-sm text-amber-700/80 font-medium">Degraded</div>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50/30 p-3 sm:p-4">
          <div className="text-2xl sm:text-3xl font-bold text-rose-700 font-tabular">
            {counts.down}
          </div>
          <div className="text-xs sm:text-sm text-rose-700/80 font-medium">Down</div>
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
        {ALL_PROVIDERS.map((provider) => {
          const { score, status } = getStatus(provider);
          const config = statusConfig[status];

          return (
            <Link
              key={provider}
              href={`/reputation/${provider}`}
              className={`flex flex-col items-center gap-2 p-2 sm:p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all group ${config.bg}`}
            >
              <div className="relative">
                <Image
                  src={`/logos/oracles/${provider}.svg`}
                  alt={providerNames[provider] ?? provider}
                  width={32}
                  height={32}
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                />
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${config.dot}`}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-gray-700 group-hover:text-gray-900 capitalize truncate max-w-full">
                {provider}
              </span>
              {score > 0 && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.badge}`}
                >
                  {score.toFixed(0)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
