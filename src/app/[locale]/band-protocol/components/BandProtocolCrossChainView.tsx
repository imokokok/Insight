'use client';

import { useState } from 'react';

import { useBandCrossChainTrend, useBandCrossChainComparison } from '@/hooks/oracles/band';
import { useTranslations } from '@/i18n';
import type {
  TrendPeriod,
  CrossChainTrend,
  CrossChainComparison,
} from '@/lib/oracles/bandProtocol';

import { type BandProtocolCrossChainViewProps } from '../types';

function TrendChart({ data, isLoading }: { data: CrossChainTrend[]; isLoading: boolean }) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="animate-pulse text-gray-400">
          {t('band.bandProtocol.crossChain.loading')}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-gray-400">{t('band.bandProtocol.crossChain.noData')}</div>
      </div>
    );
  }

  const maxRequests = Math.max(...data.map((d) => d.requestCount));
  const chartHeight = 200;
  const barWidth = Math.max(8, Math.min(40, (600 - data.length * 4) / data.length));

  return (
    <div className="h-64 flex items-end gap-1 px-4 py-4 bg-gray-50 rounded-lg overflow-x-auto">
      {data.map((item, index) => {
        const height = (item.requestCount / maxRequests) * chartHeight;
        const successRate = (item.successCount / item.requestCount) * 100;

        return (
          <div
            key={item.date}
            className="flex flex-col items-center group relative"
            style={{ minWidth: `${barWidth}px` }}
          >
            <div
              className="w-full bg-purple-500 rounded-t transition-all duration-200 hover:bg-purple-600 cursor-pointer relative"
              style={{ height: `${height}px` }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                <div>{item.date}</div>
                <div>
                  {t('band.bandProtocol.crossChain.requests')}: {item.requestCount.toLocaleString()}
                </div>
                <div>
                  {t('band.bandProtocol.crossChain.successRate')}: {successRate.toFixed(1)}%
                </div>
                <div>
                  {t('band.bandProtocol.crossChain.latency')}: {item.avgLatency}ms
                </div>
              </div>
            </div>
            {index % Math.ceil(data.length / 7) === 0 && (
              <span className="text-xs text-gray-500 mt-2 whitespace-nowrap">
                {item.date.slice(5)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComparisonCard({
  comparison,
  isLoading,
}: {
  comparison: CrossChainComparison | undefined;
  isLoading: boolean;
}) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!comparison) return null;

  const formatChange = (value: number, isPositiveGood: boolean = true) => {
    const isPositive = value >= 0;
    const colorClass = isPositiveGood
      ? isPositive
        ? 'text-emerald-600'
        : 'text-red-600'
      : isPositive
        ? 'text-red-600'
        : 'text-emerald-600';

    return (
      <span className={colorClass}>
        {isPositive ? '+' : ''}
        {value.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-500 mb-1">
          {t('band.bandProtocol.crossChain.currentPeriod')}
        </p>
        <p className="text-xl font-bold text-gray-900">
          {comparison.currentTotal.toLocaleString()}
        </p>
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-500 mb-1">
          {t('band.bandProtocol.crossChain.previousPeriod')}
        </p>
        <p className="text-xl font-bold text-gray-900">
          {comparison.previousTotal.toLocaleString()}
        </p>
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-500 mb-1">
          {t('band.bandProtocol.crossChain.requestChange')}
        </p>
        <p className="text-xl font-bold text-gray-900">{formatChange(comparison.changePercent)}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-500 mb-1">
          {t('band.bandProtocol.crossChain.latencyChange')}
        </p>
        <p className="text-xl font-bold text-gray-900">
          {formatChange(comparison.avgLatencyChange, false)}
        </p>
      </div>
    </div>
  );
}

export function BandProtocolCrossChainView({ crossChainStats }: BandProtocolCrossChainViewProps) {
  const t = useTranslations();
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>('7d');

  const { crossChainTrend, isLoading: trendLoading } = useBandCrossChainTrend({
    period: selectedPeriod,
  });

  const { crossChainComparison, isLoading: comparisonLoading } = useBandCrossChainComparison({
    period: selectedPeriod,
  });

  const stats = crossChainStats
    ? [
        {
          label: t('band.bandProtocol.crossChain.totalRequests24h'),
          value: crossChainStats.totalRequests24h.toLocaleString(),
          change: null,
        },
        {
          label: t('band.bandProtocol.crossChain.totalRequests7d'),
          value: crossChainStats.totalRequests7d.toLocaleString(),
          change: null,
        },
        {
          label: t('band.bandProtocol.crossChain.totalRequests30d'),
          value: crossChainStats.totalRequests30d.toLocaleString(),
          change: null,
        },
        {
          label: t('band.bandProtocol.crossChain.supportedChains'),
          value: crossChainStats.chains.length.toString(),
          change: null,
        },
      ]
    : [
        {
          label: t('band.bandProtocol.crossChain.totalRequests24h'),
          value: '-',
          change: null,
        },
        {
          label: t('band.bandProtocol.crossChain.totalRequests7d'),
          value: '-',
          change: null,
        },
        {
          label: t('band.bandProtocol.crossChain.totalRequests30d'),
          value: '-',
          change: null,
        },
        { label: t('band.bandProtocol.crossChain.supportedChains'), value: '-', change: null },
      ];

  const chains = crossChainStats?.chains ?? [];

  const getChainIcon = (chainName: string) => {
    const iconMap: Record<string, string> = {
      'Cosmos Hub': '⚛️',
      Osmosis: '🌊',
      Ethereum: '🔷',
      Polygon: '💜',
      Avalanche: '⛰️',
      Fantom: '👻',
      Cronos: '🦁',
      Juno: '🚀',
    };
    return iconMap[chainName] || '🔗';
  };

  const totalRequests = chains.reduce((sum, chain) => sum + chain.requestCount24h, 0);

  const periodOptions: { value: TrendPeriod; label: string }[] = [
    { value: '7d', label: t('band.bandProtocol.crossChain.last7Days') },
    { value: '30d', label: t('band.bandProtocol.crossChain.last30Days') },
    { value: '90d', label: t('band.bandProtocol.crossChain.last90Days') },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Section - Inline Layout */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">{stat.label}</p>
                {stat.change && (
                  <span className="text-xs font-medium text-emerald-600">{stat.change}</span>
                )}
              </div>
            </div>
            {index < stats.length - 1 && (
              <div className="hidden sm:block w-px h-10 bg-gray-200 ml-4" />
            )}
          </div>
        ))}
      </div>

      {/* Trend Section */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            {t('band.bandProtocol.crossChain.requestTrend')}
          </h3>
          <div className="flex gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedPeriod(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === option.value
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <TrendChart data={crossChainTrend} isLoading={trendLoading} />
      </div>

      {/* Historical Comparison Section */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t('band.bandProtocol.crossChain.historicalComparison')}
        </h3>
        <ComparisonCard comparison={crossChainComparison} isLoading={comparisonLoading} />
      </div>

      {/* Chain List Section */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t('band.bandProtocol.crossChain.supportedChains')}
        </h3>
        {chains.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            {t('common.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    {t('band.bandProtocol.crossChain.chain')}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    {t('band.bandProtocol.crossChain.chainId')}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    {t('band.bandProtocol.crossChain.requests24h')}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    {t('band.bandProtocol.crossChain.requests7d')}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    {t('band.bandProtocol.crossChain.avgGasCost')}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    {t('band.bandProtocol.crossChain.supportedAssets')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {chains.map((chain, idx) => (
                  <tr
                    key={chain.chainId}
                    className={`${idx !== chains.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50/50`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span>{getChainIcon(chain.chainName)}</span>
                        <span className="font-medium text-gray-900">{chain.chainName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-gray-500 font-mono text-xs">{chain.chainId}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900">
                      {chain.requestCount24h.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900">
                      {chain.requestCount7d.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900">
                      {chain.avgGasCost.toFixed(4)} BAND
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {chain.supportedSymbols.slice(0, 4).map((symbol) => (
                          <span
                            key={symbol}
                            className="inline-flex items-center px-1.5 py-0.5 text-xs text-gray-600 bg-gray-100 rounded"
                          >
                            {symbol}
                          </span>
                        ))}
                        {chain.supportedSymbols.length > 4 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400">
                            +{chain.supportedSymbols.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Distribution - Progress Bars */}
      {chains.length > 0 && (
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {t('band.bandProtocol.crossChain.requestDistribution')}
          </h3>
          <div className="space-y-3">
            {chains
              .sort((a, b) => b.requestCount24h - a.requestCount24h)
              .map((chain) => {
                const percentage =
                  totalRequests > 0 ? (chain.requestCount24h / totalRequests) * 100 : 0;
                return (
                  <div key={chain.chainId} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <span>{getChainIcon(chain.chainName)}</span>
                      <span className="text-sm text-gray-700 truncate">{chain.chainName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right shrink-0">
                      <span className="text-sm font-medium text-gray-900">
                        {chain.requestCount24h.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
