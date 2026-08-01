'use client';

import { useMemo, useState } from 'react';

import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

import { oracleColors, providerNames } from '@/lib/constants';
import type { DailyReportData, ProviderRanking } from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

import { PanelInsight } from './ReportShared';

export function ProviderRankingTable({ rankings }: { rankings: ProviderRanking[] }) {
  const [showAll, setShowAll] = useState(false);
  const maxScore = useMemo(() => Math.max(1, ...rankings.map((r) => r.score)), [rankings]);

  const abnormalRankings = useMemo(
    () =>
      rankings.filter((r) => r.anomalyCount > 0 || r.successRate < 95 || r.avgDeviationPct >= 0.5),
    [rankings]
  );

  const visibleRankings =
    abnormalRankings.length > 0 ? (showAll ? rankings : abnormalRankings) : rankings.slice(0, 5);
  const canExpand =
    abnormalRankings.length > 0 ? rankings.length > abnormalRankings.length : rankings.length > 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {abnormalRankings.length > 0
            ? `${abnormalRankings.length} provider(s) with anomalies`
            : `Top ${Math.min(5, rankings.length)} providers by score`}
        </p>
        {canExpand && (
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Show all {rankings.length}
              </>
            )}
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
                Provider
              </th>
              <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-40">
                Score
              </th>
              <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
                Success
              </th>
              <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
                Avg Dev
              </th>
              <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
                Latency
              </th>
              <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-24">
                Anomalies
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRankings.map((ranking, index) => {
              const color = oracleColors[ranking.provider] ?? '#9CA3AF';
              const scorePct = (ranking.score / maxScore) * 100;
              const devTone =
                ranking.avgDeviationPct >= 0.5
                  ? 'text-red-600'
                  : ranking.avgDeviationPct >= 0.2
                    ? 'text-amber-600'
                    : 'text-emerald-600';
              return (
                <tr
                  key={ranking.provider}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold',
                        index < 3 ? 'bg-gray-100 text-gray-900' : 'text-gray-500'
                      )}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-gray-900">
                        {providerNames[ranking.provider] ?? ranking.provider}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 font-tabular w-8">
                        {ranking.score.toFixed(0)}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${scorePct}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={cn(
                        'text-sm font-tabular',
                        ranking.successRate >= 99
                          ? 'text-emerald-600'
                          : ranking.successRate >= 95
                            ? 'text-amber-600'
                            : 'text-red-600'
                      )}
                    >
                      {ranking.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className={cn('px-5 py-3.5 text-right text-sm font-tabular', devTone)}>
                    {ranking.avgDeviationPct.toFixed(3)}%
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-gray-700 font-tabular">
                    {ranking.avgLatencyMs}ms
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {ranking.anomalyCount > 0 ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700">
                        {ranking.anomalyCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProviderRankingTableInsight({ rankings }: { rankings: ProviderRanking[] }) {
  if (rankings.length === 0) {
    return null;
  }

  const worst = rankings[rankings.length - 1];
  const abnormalCount = rankings.filter(
    (r) => r.anomalyCount > 0 || r.successRate < 95 || r.avgDeviationPct >= 0.5
  ).length;

  if (abnormalCount === 0) {
    return (
      <PanelInsight tone="good">
        All tracked providers performed within healthy success-rate and deviation bands today.
      </PanelInsight>
    );
  }

  if (worst.successRate < 95 || worst.avgDeviationPct >= 0.5) {
    return (
      <PanelInsight tone="warning">
        {providerNames[worst.provider] ?? worst.provider} is the weakest performer today (
        {worst.successRate.toFixed(1)}% success, {worst.avgDeviationPct.toFixed(3)}% avg deviation).
        {abnormalCount > 1
          ? ` ${abnormalCount - 1} other provider(s) also showed anomalies.`
          : ''}{' '}
        Evaluate its weight in consensus calculations.
      </PanelInsight>
    );
  }

  if (worst.avgLatencyMs > 2000) {
    return (
      <PanelInsight tone="warning">
        {providerNames[worst.provider] ?? worst.provider} showed the highest average latency ({' '}
        {worst.avgLatencyMs} ms). Consider whether this introduces stale-price risk.
      </PanelInsight>
    );
  }

  return (
    <PanelInsight tone="good">
      Provider network is healthy; minor latency differences are within acceptable range.
    </PanelInsight>
  );
}

export function AssetTable({ assets }: { assets: DailyReportData['topAssets'] }) {
  const [showAll, setShowAll] = useState(false);
  const maxVolatility = useMemo(
    () => Math.max(0.01, ...assets.map((a) => a.volatilityPct)),
    [assets]
  );

  const abnormalAssets = useMemo(
    () => assets.filter((a) => a.volatilityPct >= 0.5 || a.maxDeviationPct >= 0.5),
    [assets]
  );

  const visibleAssets =
    abnormalAssets.length > 0 ? (showAll ? assets : abnormalAssets) : assets.slice(0, 5);
  const canExpand =
    abnormalAssets.length > 0 ? assets.length > abnormalAssets.length : assets.length > 5;

  if (assets.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No asset data available for this report.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {abnormalAssets.length > 0
            ? `${abnormalAssets.length} asset(s) with notable volatility or deviation`
            : `Top ${Math.min(5, assets.length)} assets by volatility`}
        </p>
        {canExpand && (
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Show all {assets.length}
              </>
            )}
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-24">
                Asset
              </th>
              <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-36">
                Consensus
              </th>
              <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
                Range vs Consensus
              </th>
              <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-40">
                Volatility
              </th>
              <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-28">
                Max Dev
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleAssets.map((asset) => {
              const volatilityPct = Math.min(100, (asset.volatilityPct / maxVolatility) * 100);
              const rangeWidthPct =
                asset.avgConsensusPrice > 0
                  ? Math.min(
                      100,
                      ((asset.maxPrice - asset.minPrice) / asset.avgConsensusPrice) * 100
                    )
                  : 0;
              const volTone =
                asset.volatilityPct >= 1
                  ? 'bg-red-500'
                  : asset.volatilityPct >= 0.5
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';
              return (
                <tr
                  key={asset.symbol}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">{asset.symbol}</td>
                  <td className="px-5 py-3.5 text-right text-gray-700 font-tabular">
                    {formatPrice(asset.avgConsensusPrice)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-tabular w-20 text-right">
                        {formatPrice(asset.minPrice)}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className="h-full rounded-full bg-gray-300"
                          style={{ width: `${rangeWidthPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-tabular w-20">
                        {formatPrice(asset.maxPrice)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
                        <div
                          className={cn('h-full rounded-full transition-all', volTone)}
                          style={{ width: `${volatilityPct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-xs font-semibold font-tabular w-14 text-right',
                          asset.volatilityPct >= 1
                            ? 'text-red-600'
                            : asset.volatilityPct >= 0.5
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        )}
                      >
                        {asset.volatilityPct.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={cn(
                        'text-sm font-tabular',
                        asset.maxDeviationPct >= 1
                          ? 'text-red-600'
                          : asset.maxDeviationPct >= 0.5
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      )}
                    >
                      {asset.maxDeviationPct.toFixed(3)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AssetTableInsight({ assets }: { assets: DailyReportData['topAssets'] }) {
  if (assets.length === 0) {
    return null;
  }

  const abnormalAssets = assets.filter((a) => a.volatilityPct >= 0.5 || a.maxDeviationPct >= 0.5);
  const mostVolatile = assets[0];

  if (abnormalAssets.length === 0) {
    return (
      <PanelInsight tone="good">
        Asset volatility and cross-provider deviation stayed within normal ranges today.
      </PanelInsight>
    );
  }

  if (mostVolatile.volatilityPct >= 5) {
    return (
      <PanelInsight tone="warning">
        {mostVolatile.symbol} is the most volatile asset today (
        {mostVolatile.volatilityPct.toFixed(2)}% intraday range). Consider TWAP or multi-source
        aggregation during volatile periods.
      </PanelInsight>
    );
  }

  const topDev = abnormalAssets.sort((a, b) => b.maxDeviationPct - a.maxDeviationPct)[0];
  return (
    <PanelInsight tone={topDev.maxDeviationPct >= 1 ? 'warning' : 'neutral'}>
      {abnormalAssets.length} asset(s) showed notable volatility or deviation. Largest max
      deviation: {topDev.symbol} at {topDev.maxDeviationPct.toFixed(3)}%.
    </PanelInsight>
  );
}

export function CoverageMatrix({ matrix }: { matrix: DailyReportData['coverageMatrix'] }) {
  const [showAll, setShowAll] = useState(false);

  const abnormalCells = useMemo(
    () =>
      matrix.filter((m) => m.failed > 0 || m.avgDeviationPct >= 0.5 || m.maxDeviationPct >= 0.5),
    [matrix]
  );

  const visibleMatrix = showAll ? matrix : abnormalCells;

  const providers = useMemo(
    () => [...new Set(visibleMatrix.map((m) => m.provider))].sort(),
    [visibleMatrix]
  );
  const assets = useMemo(
    () => [...new Set(visibleMatrix.map((m) => m.symbol))].sort(),
    [visibleMatrix]
  );

  if (matrix.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No coverage data available.</p>;
  }

  if (abnormalCells.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No coverage anomalies</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            All provider/asset pairs stayed within tolerance with no failed snapshots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {showAll ? (
            <>Showing all {matrix.length} provider/asset pairs.</>
          ) : (
            <>
              Showing {abnormalCells.length} anomalous pair
              {abnormalCells.length > 1 ? 's' : ''}.{' '}
              <button
                onClick={() => setShowAll(true)}
                className="text-gray-900 underline hover:text-primary-600"
              >
                Show all
              </button>
            </>
          )}
        </p>
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show anomalies only
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show all
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left font-medium text-gray-500 px-4 py-3 sticky left-0 bg-gray-50">
                Provider
              </th>
              {assets.map((asset) => (
                <th
                  key={asset}
                  className="text-center font-medium text-gray-500 px-3 py-3 min-w-[70px]"
                >
                  {asset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                  {providerNames[provider] ?? provider}
                </td>
                {assets.map((asset) => {
                  const cell = matrix.find((m) => m.provider === provider && m.symbol === asset);
                  const isVisible = visibleMatrix.some(
                    (m) => m.provider === provider && m.symbol === asset
                  );
                  return (
                    <td key={asset} className="px-3 py-3 text-center align-middle">
                      {cell && isVisible ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              'font-tabular font-semibold',
                              cell.failed > 0 ? 'text-amber-600' : 'text-emerald-600'
                            )}
                          >
                            {cell.success}/{cell.total}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {cell.avgDeviationPct.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CoverageMatrixInsight({ matrix }: { matrix: DailyReportData['coverageMatrix'] }) {
  const failedCells = matrix.filter((m) => m.failed > 0);
  const highDevCells = matrix.filter((m) => m.maxDeviationPct >= 0.5 && m.failed === 0);

  if (failedCells.length === 0 && highDevCells.length === 0) {
    return (
      <PanelInsight tone="good">
        All provider/asset pairs stayed within tolerance with no failed snapshots.
      </PanelInsight>
    );
  }

  if (failedCells.length > 0) {
    const totalFailures = failedCells.reduce((sum, m) => sum + m.failed, 0);
    return (
      <PanelInsight tone="warning">
        {failedCells.length} provider/asset pair(s) recorded failures ({totalFailures} total failed
        snapshots). Investigate the affected combinations in the matrix above.
      </PanelInsight>
    );
  }

  return (
    <PanelInsight tone="warning">
      {highDevCells.length} provider/asset pair(s) showed elevated deviation but no failures. Review
      whether these pairs remain within your acceptable tolerance.
    </PanelInsight>
  );
}

export function FailureBreakdown({
  breakdown,
}: {
  breakdown: DailyReportData['failureBreakdown'];
}) {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="space-y-3">
      {breakdown.slice(0, 10).map((item) => (
        <div
          key={`${item.provider}-${item.symbol}`}
          className="flex items-start justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {providerNames[item.provider] ?? item.provider} · {item.symbol}
            </p>
            {item.topError && <p className="text-xs text-gray-500 truncate">{item.topError}</p>}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-100 flex-shrink-0">
            {item.failureCount}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FailureBreakdownInsight({
  breakdown,
}: {
  breakdown: DailyReportData['failureBreakdown'];
}) {
  if (!breakdown || breakdown.length === 0) {
    return null;
  }

  const top = breakdown[0];
  const totalFailures = breakdown.reduce((sum, item) => sum + item.failureCount, 0);

  return (
    <PanelInsight tone="warning">
      {breakdown.length} provider/asset pair(s) failed today ({totalFailures} total failures). Top
      issue: {providerNames[top.provider] ?? top.provider} / {top.symbol} ({top.failureCount} times
      {top.topError ? `: ${top.topError}` : ''}). Investigate this pair first.
    </PanelInsight>
  );
}
