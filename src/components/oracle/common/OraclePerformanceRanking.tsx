'use client';

import { useMemo } from 'react';
import { OracleProvider } from '@/types/oracle';
import { DashboardCard } from './DashboardCard';
import { useTranslations } from 'next-intl';
import { chartColors } from '@/lib/config/colors';

export interface OraclePerformanceData {
  provider: OracleProvider;
  name: string;
  responseTime: number;
  accuracy: number;
  stability: number;
  dataSources?: number;
  supportedChains?: number;
  color?: string;
}

export interface RankingChange {
  provider: OracleProvider;
  previousRank: number;
  currentRank: number;
}

interface OraclePerformanceRankingProps {
  performanceData: OraclePerformanceData[];
  previousRankings?: RankingChange[];
  className?: string;
}

interface CalculatedRanking {
  provider: OracleProvider;
  name: string;
  overallScore: number;
  rank: number;
  rankChange: number;
  dimensionScores: {
    responseTime: number;
    accuracy: number;
    stability: number;
    dataSources: number;
    supportedChains: number;
  };
  rawMetrics: {
    responseTime: number;
    accuracy: number;
    stability: number;
    dataSources?: number;
    supportedChains?: number;
  };
  color?: string;
}

const WEIGHTS = {
  responseTime: 0.35,
  accuracy: 0.35,
  stability: 0.3,
  dataSources: 0,
  supportedChains: 0,
};

const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.TELLOR]: 'Tellor',
  [OracleProvider.CHRONICLE]: 'Chronicle',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.PYTH]: chartColors.oracle['pyth'],
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: chartColors.oracle.dia,
  [OracleProvider.TELLOR]: chartColors.oracle.tellor,
  [OracleProvider.CHRONICLE]: chartColors.oracle.chronicle,
  [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
};

function normalizeResponseTime(responseTime: number, allResponseTimes: number[]): number {
  const min = Math.min(...allResponseTimes);
  const max = Math.max(...allResponseTimes);
  if (max === min) return 100;
  return Math.max(0, Math.min(100, 100 - ((responseTime - min) / (max - min)) * 100));
}

function normalizeAccuracy(accuracy: number): number {
  return Math.max(0, Math.min(100, accuracy));
}

function normalizeStability(stability: number, allStability: number[]): number {
  const min = Math.min(...allStability);
  const max = Math.max(...allStability);
  if (max === min) return 100;
  return Math.max(0, Math.min(100, ((stability - min) / (max - min)) * 100));
}

function normalizeDataSources(
  dataSources: number | undefined,
  allDataSources: (number | undefined)[]
): number {
  const validSources = allDataSources.filter((s): s is number => s !== undefined);
  if (validSources.length === 0 || dataSources === undefined) return 50; // 默认值
  const min = Math.min(...validSources);
  const max = Math.max(...validSources);
  if (max === min) return 100;
  return Math.max(0, Math.min(100, ((dataSources - min) / (max - min)) * 100));
}

function normalizeSupportedChains(
  chains: number | undefined,
  allChains: (number | undefined)[]
): number {
  const validChains = allChains.filter((c): c is number => c !== undefined);
  if (validChains.length === 0 || chains === undefined) return 50; // 默认值
  const min = Math.min(...validChains);
  const max = Math.max(...validChains);
  if (max === min) return 100;
  return Math.max(0, Math.min(100, ((chains - min) / (max - min)) * 100));
}

function getRankBadgeStyle(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-warning-100 border border-yellow-200 text-yellow-800 rounded shadow-sm';
    case 2:
      return 'bg-gray-100 border border-gray-200 text-gray-800 rounded shadow-sm';
    case 3:
      return 'bg-amber-100 border border-amber-200 text-amber-800 rounded shadow-sm';
    default:
      return 'bg-gray-100 text-gray-600 rounded';
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success-600';
  if (score >= 80) return 'text-primary-600';
  if (score >= 70) return 'text-warning-600';
  if (score >= 60) return 'text-warning-600';
  return 'text-danger-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-success-50 border-green-200';
  if (score >= 80) return 'bg-primary-50 border-primary-200';
  if (score >= 70) return 'bg-warning-50 border-yellow-200';
  if (score >= 60) return 'bg-warning-50 border-orange-200';
  return 'bg-danger-50 border-danger-200';
}

function RankChangeIndicator({ change, t }: { change: number; t: (key: string) => string }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        <span>→</span>
        <span>{t('oraclePerformanceRanking.unchanged')}</span>
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-success-50 text-success-700">
        <span>↑</span>
        <span>+{change}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-danger-50 text-danger-700">
      <span>↓</span>
      <span>{change}</span>
    </span>
  );
}

function DimensionScoreBar({
  label,
  score,
  weight,
  color = 'blue',
}: {
  label: string;
  score: number;
  weight: number;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-primary-500',
    green: 'bg-success-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{score.toFixed(1)}</span>
          <span className="text-gray-400">({(weight * 100).toFixed(0)}%)</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-500 ${colorClasses[color]}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function OraclePerformanceRanking({
  performanceData,
  previousRankings = [],
  className = '',
}: OraclePerformanceRankingProps) {
  const t = useTranslations();
  const rankings = useMemo(() => {
    const allResponseTimes = performanceData.map((d) => d.responseTime);
    const allStability = performanceData.map((d) => d.stability);
    const allDataSources = performanceData.map((d) => d.dataSources);
    const allChains = performanceData.map((d) => d.supportedChains);

    const calculated: CalculatedRanking[] = performanceData.map((data) => {
      const responseTimeScore = normalizeResponseTime(data.responseTime, allResponseTimes);
      const accuracyScore = normalizeAccuracy(data.accuracy);
      const stabilityScore = normalizeStability(data.stability, allStability);
      const dataSourcesScore = normalizeDataSources(data.dataSources, allDataSources);
      const chainsScore = normalizeSupportedChains(data.supportedChains, allChains);

      // 根据是否有数据源和链数数据动态调整权重
      const hasDataSources = data.dataSources !== undefined;
      const hasChains = data.supportedChains !== undefined;
      const availableWeights =
        WEIGHTS.responseTime +
        WEIGHTS.accuracy +
        WEIGHTS.stability +
        (hasDataSources ? WEIGHTS.dataSources : 0) +
        (hasChains ? WEIGHTS.supportedChains : 0);
      const normalizeFactor = availableWeights > 0 ? 1 / availableWeights : 1;

      const overallScore =
        (responseTimeScore * WEIGHTS.responseTime +
          accuracyScore * WEIGHTS.accuracy +
          stabilityScore * WEIGHTS.stability +
          dataSourcesScore * (hasDataSources ? WEIGHTS.dataSources : 0) +
          chainsScore * (hasChains ? WEIGHTS.supportedChains : 0)) *
        normalizeFactor;

      return {
        provider: data.provider,
        name: data.name || oracleNames[data.provider] || data.provider,
        overallScore,
        rank: 0,
        rankChange: 0,
        dimensionScores: {
          responseTime: responseTimeScore,
          accuracy: accuracyScore,
          stability: stabilityScore,
          dataSources: dataSourcesScore,
          supportedChains: chainsScore,
        },
        rawMetrics: {
          responseTime: data.responseTime,
          accuracy: data.accuracy,
          stability: data.stability,
          dataSources: data.dataSources ?? 0,
          supportedChains: data.supportedChains ?? 0,
        },
        color: data.color || oracleColors[data.provider],
      };
    });

    calculated.sort((a, b) => b.overallScore - a.overallScore);

    calculated.forEach((item, index) => {
      item.rank = index + 1;

      const previousRanking = previousRankings.find((r) => r.provider === item.provider);
      if (previousRanking) {
        item.rankChange = previousRanking.previousRank - item.rank;
      }
    });

    return calculated;
  }, [performanceData, previousRankings]);

  const topThree = rankings.slice(0, 3);
  const restRankings = rankings.slice(3);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('oraclePerformanceRanking.title')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{t('oraclePerformanceRanking.subtitle')}</p>
        </div>
        <div className="text-xs text-gray-400">{t('oraclePerformanceRanking.weightInfo')}</div>
      </div>

      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((item, index) => (
            <div
              key={item.provider}
              className={`relative rounded border-2 p-5 transition-all duration-300 hover:shadow-md ${
                item.rank === 1
                  ? 'border-yellow-400 bg-gradient-to-b from-yellow-50 to-white'
                  : item.rank === 2
                    ? 'border-gray-300 bg-gradient-to-b from-gray-50 to-white'
                    : 'border-amber-600 bg-gradient-to-b from-amber-50 to-white'
              }`}
            >
              <div className="absolute -top-3 left-4">
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded text-lg font-bold ${getRankBadgeStyle(item.rank)}`}
                >
                  {item.rank}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-gray-900">{item.name}</span>
                  </div>
                  <RankChangeIndicator change={item.rankChange} t={t} />
                </div>

                <div className="text-center py-4">
                  <p className={`text-4xl font-bold ${getScoreColor(item.overallScore)}`}>
                    {item.overallScore.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('oraclePerformanceRanking.overallScore')}
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <DimensionScoreBar
                    label={t('oraclePerformanceRanking.dimensionLabels.responseTime')}
                    score={item.dimensionScores.responseTime}
                    weight={WEIGHTS.responseTime}
                    color="blue"
                  />
                  <DimensionScoreBar
                    label={t('oraclePerformanceRanking.dimensionLabels.accuracy')}
                    score={item.dimensionScores.accuracy}
                    weight={WEIGHTS.accuracy}
                    color="green"
                  />
                  <DimensionScoreBar
                    label={t('oraclePerformanceRanking.dimensionLabels.stability')}
                    score={item.dimensionScores.stability}
                    weight={WEIGHTS.stability}
                    color="purple"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {restRankings.length > 0 && (
        <DashboardCard>
          <div className="space-y-3">
            {restRankings.map((item) => (
              <div
                key={item.provider}
                className="flex items-center justify-between p-4 rounded border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded text-sm font-semibold ${getRankBadgeStyle(item.rank)}`}
                  >
                    {item.rank}
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>

                  <RankChangeIndicator change={item.rankChange} t={t} />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">
                        {item.rawMetrics.responseTime}ms
                      </span>
                      <span>{t('oraclePerformanceRanking.dimensionLabels.responseTime')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-700">
                        {item.rawMetrics.accuracy.toFixed(1)}%
                      </span>
                      <span>{t('oraclePerformanceRanking.dimensionLabels.accuracy')}</span>
                    </div>
                    {item.rawMetrics.dataSources !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">
                          {item.rawMetrics.dataSources}
                        </span>
                        <span>{t('oraclePerformanceRanking.dimensionLabels.dataSources')}</span>
                      </div>
                    )}
                    {item.rawMetrics.supportedChains !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">
                          {item.rawMetrics.supportedChains}
                        </span>
                        <span>{t('oraclePerformanceRanking.dimensionLabels.supportedChains')}</span>
                      </div>
                    )}
                  </div>

                  <div className={`px-4 py-2 rounded border ${getScoreBgColor(item.overallScore)}`}>
                    <p className={`text-lg font-bold ${getScoreColor(item.overallScore)}`}>
                      {item.overallScore.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      <DashboardCard title={t('oraclePerformanceRanking.dimensionDescriptions.title')}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-3 bg-primary-50 rounded">
            <p className="text-sm font-medium text-primary-900">
              {t('oraclePerformanceRanking.dimensionDescriptions.responseTime.title')}
            </p>
            <p className="text-xs text-primary-700 mt-1">
              {t('oraclePerformanceRanking.dimensionDescriptions.responseTime.weight')}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {t('oraclePerformanceRanking.dimensionDescriptions.responseTime.description')}
            </p>
          </div>
          <div className="p-3 bg-success-50 rounded">
            <p className="text-sm font-medium text-green-900">
              {t('oraclePerformanceRanking.dimensionDescriptions.accuracy.title')}
            </p>
            <p className="text-xs text-success-700 mt-1">
              {t('oraclePerformanceRanking.dimensionDescriptions.accuracy.weight')}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {t('oraclePerformanceRanking.dimensionDescriptions.accuracy.description')}
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded">
            <p className="text-sm font-medium text-purple-900">
              {t('oraclePerformanceRanking.dimensionDescriptions.stability.title')}
            </p>
            <p className="text-xs text-purple-700 mt-1">
              {t('oraclePerformanceRanking.dimensionDescriptions.stability.weight')}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {t('oraclePerformanceRanking.dimensionDescriptions.stability.description')}
            </p>
          </div>
          <div className="p-3 bg-pink-50 rounded">
            <p className="text-sm font-medium text-pink-900">
              {t('oraclePerformanceRanking.dimensionDescriptions.dataSources.title')}
            </p>
            <p className="text-xs text-pink-700 mt-1">
              {t('oraclePerformanceRanking.dimensionDescriptions.dataSources.weight')}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {t('oraclePerformanceRanking.dimensionDescriptions.dataSources.description')}
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded">
            <p className="text-sm font-medium text-amber-900">
              {t('oraclePerformanceRanking.dimensionDescriptions.supportedChains.title')}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {t('oraclePerformanceRanking.dimensionDescriptions.supportedChains.weight')}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {t('oraclePerformanceRanking.dimensionDescriptions.supportedChains.description')}
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
