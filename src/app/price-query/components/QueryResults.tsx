'use client';

import { useRef, useEffect, useMemo } from 'react';

import { Database, BarChart3, Clock, GitCompare, TrendingUp, TrendingDown } from 'lucide-react';

import { PriceFlash } from '@/components/ui/PriceFlash';
import { safeMax } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

import { type OnChainData, type QueryResult } from '../constants';
import { useQueryDataStable, useQueryParams } from '../contexts';

import { QueryResultsEmpty } from './QueryResultsEmpty';
import { QueryResultsLoading } from './QueryResultsLoading';
import { StatsCardsSelector } from './stats';
import { TokenIcon } from './TokenIcon';

import { PriceFreshnessMonitor, DataSourceSection, ErrorBanner } from './index';

interface QueryResultsProps {
  onChainData: OnChainData;
}

export function QueryResults({ onChainData }: QueryResultsProps) {
  const { selectedSymbol, isCompareMode } = useQueryParams();
  const {
    queryResults,
    compareQueryResults,
    isLoading,
    queryDuration,
    queryErrors,
    retryDataSource,
    retryAllErrors,
    clearErrors,
    refetch,
    stats,
  } = useQueryDataStable();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const previousPriceValueRef = useRef<number | null>(null);
  const wasLoadingRef = useRef(false);

  const { avgPrice, standardDeviation, standardDeviationPercent } = stats;

  const {
    diaOnChainData,
    winklinkOnChainData,
    redstoneOnChainData,
    supraOnChainData,
    twapOnChainData,
    reflectorOnChainData,
    flareOnChainData,
  } = onChainData;

  const currentPriceValue = useMemo(() => {
    if (queryResults.length === 0) return avgPrice > 0 ? avgPrice : 0;
    const prices = queryResults
      .map((r) => r.priceData?.price)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    if (prices.length === 0) return avgPrice > 0 ? avgPrice : 0;
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [queryResults, avgPrice]);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && currentPriceValue > 0) {
      previousPriceValueRef.current = currentPriceValue;
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, currentPriceValue]);

  if (isLoading) {
    return <QueryResultsLoading />;
  }

  if (queryResults.length === 0) {
    return <QueryResultsEmpty />;
  }

  return (
    <div className="space-y-4">
      {queryErrors.length > 0 && (
        <ErrorBanner
          errors={queryErrors}
          onRetry={retryDataSource}
          onRetryAll={retryAllErrors}
          onDismiss={clearErrors}
        />
      )}

      <div className="editorial-panel border-y border-slate-900/15 bg-white/35 overflow-hidden">
        <div className="px-5 py-6 sm:px-6 sm:py-7 border-b border-slate-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <TokenIcon symbol={selectedSymbol} />
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">
                  {selectedSymbol}
                </h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  {queryResults.length} Data Sources
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                Observed consensus
              </p>
              <div className="flex items-baseline gap-3 sm:justify-end">
                <PriceFlash
                  value={currentPriceValue}
                  // eslint-disable-next-line react-hooks/refs -- previousPriceValueRef is updated in an effect after render; reading it here passes the pre-update value to PriceFlash for the flash animation, then the effect updates it for the next cycle.
                  previousValue={previousPriceValueRef.current ?? undefined}
                >
                  <span className="font-mono text-4xl sm:text-5xl font-semibold text-slate-950 tracking-[-0.045em]">
                    {formatPrice(currentPriceValue)}
                  </span>
                </PriceFlash>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 border-b border-slate-900/10 bg-blue-50/20 sm:px-6">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-900/10 border-y border-slate-900/10 md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
            <StatsCardsSelector
              currentResult={queryResults[0]}
              diaOnChainData={diaOnChainData}
              winklinkOnChainData={winklinkOnChainData}
              redstoneOnChainData={redstoneOnChainData}
              supraOnChainData={supraOnChainData}
              twapOnChainData={twapOnChainData}
              reflectorOnChainData={reflectorOnChainData}
              flareOnChainData={flareOnChainData}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-slate-500">
              <BarChart3 className="w-4 h-4" />
              <span>
                Standard Deviation:{' '}
                <span className="font-medium text-slate-700">
                  {standardDeviation > 0 ? `${standardDeviationPercent.toFixed(4)}%` : '-'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Database className="w-4 h-4" />
              <span>
                Data Points:{' '}
                <span className="font-medium text-slate-700">{queryResults.length}</span>
              </span>
            </div>
            {queryDuration !== null && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-4 h-4" />
                <span>
                  Query Duration:{' '}
                  <span className="font-medium text-slate-700">{queryDuration} ms</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6" ref={chartContainerRef}>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px w-8 bg-blue-600"></div>
            <h3 className="text-sm font-semibold text-slate-800">Data Freshness Tracker</h3>
            <span className="text-xs text-slate-400 ml-2">Live data age tracking</span>
          </div>
          <div className="border-y border-slate-900/10 bg-white/25 p-4">
            <PriceFreshnessMonitor queryResults={queryResults} avgPrice={avgPrice} />
          </div>
        </div>
      </div>

      {isCompareMode && compareQueryResults.length > 0 && (
        <CompareResultsSection primaryResults={queryResults} compareResults={compareQueryResults} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
        <DataSourceSection
          results={queryResults}
          lastUpdated={
            queryResults.length > 0
              ? new Date(safeMax(queryResults.map((r) => r.priceData.timestamp)))
              : null
          }
          onRefresh={refetch}
          isLoading={isLoading}
          chartContainerRef={chartContainerRef}
        />
      </div>
    </div>
  );
}

function CompareResultsSection({
  primaryResults,
  compareResults,
}: {
  primaryResults: QueryResult[];
  compareResults: QueryResult[];
}) {
  const primaryByChain = new Map(primaryResults.map((r) => [`${r.provider}_${r.chain}`, r]));
  const compareByChain = new Map(compareResults.map((r) => [`${r.provider}_${r.chain}`, r]));

  const allKeys = Array.from(new Set([...primaryByChain.keys(), ...compareByChain.keys()]));

  const comparisonRows = allKeys.map((key) => {
    const primary = primaryByChain.get(key);
    const compare = compareByChain.get(key);
    const primaryPrice = primary?.priceData?.price ?? 0;
    const comparePrice = compare?.priceData?.price ?? 0;
    const priceDiff = primaryPrice > 0 && comparePrice > 0 ? primaryPrice - comparePrice : 0;
    const priceDiffPercent =
      primaryPrice > 0 && comparePrice > 0 ? (priceDiff / comparePrice) * 100 : 0;

    return {
      key,
      provider: primary?.provider ?? compare?.provider ?? '',
      chain: primary?.chain ?? compare?.chain ?? '',
      primaryPrice,
      comparePrice,
      priceDiff,
      priceDiffPercent,
    };
  });

  return (
    <div className="editorial-panel border-y border-slate-900/15 bg-white/35 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-900/10 flex items-center gap-2">
        <GitCompare className="w-4 h-4 text-blue-700" />
        <h3 className="text-sm font-semibold text-slate-800">Price Comparison</h3>
        <span className="text-xs text-slate-400 ml-2">
          {primaryResults.length} primary vs {compareResults.length} compare
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-900/10 bg-blue-50/20">
              <th className="text-left py-2.5 px-4 font-medium text-slate-500 text-xs">Oracle</th>
              <th className="text-left py-2.5 px-4 font-medium text-slate-500 text-xs">Chain</th>
              <th className="text-right py-2.5 px-4 font-medium text-slate-500 text-xs">
                Primary Price
              </th>
              <th className="text-right py-2.5 px-4 font-medium text-slate-500 text-xs">
                Compare Price
              </th>
              <th className="text-right py-2.5 px-4 font-medium text-slate-500 text-xs">
                Difference
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/10">
            {comparisonRows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-4">
                  <span className="font-medium text-slate-900">{row.provider}</span>
                </td>
                <td className="py-2.5 px-4 text-slate-600">{row.chain}</td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                  {row.primaryPrice > 0 ? formatPrice(row.primaryPrice) : '-'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                  {row.comparePrice > 0 ? formatPrice(row.comparePrice) : '-'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {row.priceDiffPercent !== 0 ? (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                        Math.abs(row.priceDiffPercent) > 1
                          ? 'text-red-600'
                          : Math.abs(row.priceDiffPercent) > 0.5
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {row.priceDiffPercent > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {row.priceDiffPercent > 0 ? '+' : ''}
                      {row.priceDiffPercent.toFixed(4)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
