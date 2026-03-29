'use client';

import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Activity,
  Shield,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export interface AccuracyMetric {
  score: number;
  label: string;
  description: string;
}

export interface PriceDeviationRecord {
  date: string;
  deviation: number;
}

export interface OracleComparison {
  name: string;
  winPrice: number;
  deviation: number;
  lastUpdate: string;
  status: 'accurate' | 'warning' | 'error';
}

export interface HistoricalRecord {
  date: string;
  symbol: string;
  winklinkPrice: number;
  referencePrice: number;
  deviation: number;
  status: 'accurate' | 'warning' | 'error';
}

export interface WinklinkAccuracyViewProps {
  accuracyMetrics?: {
    overallScore: number;
    avgPriceDeviation: number;
    dataFreshness: number;
    comparisonSources: number;
  };
  priceDeviationHistory?: PriceDeviationRecord[];
  oracleComparisons?: OracleComparison[];
  dataAccuracy?: {
    priceAccuracy: number;
    updateTimeliness: number;
    sourceConsistency: number;
    historicalReliability: number;
  };
  historicalRecords?: HistoricalRecord[];
  isLoading?: boolean;
}

const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'text-emerald-600';
  if (absDeviation < 0.5) return 'text-amber-600';
  return 'text-red-600';
};

const getDeviationBgColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-50';
  if (absDeviation < 0.5) return 'bg-amber-50';
  return 'bg-red-50';
};

const getStatusIcon = (status: 'accurate' | 'warning' | 'error') => {
  switch (status) {
    case 'accurate':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'error':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
};

const getStatusLabel = (status: 'accurate' | 'warning' | 'error'): string => {
  switch (status) {
    case 'accurate':
      return 'Accurate';
    case 'warning':
      return 'Warning';
    case 'error':
      return 'Error';
  }
};

const DEFAULT_DEVIATION_HISTORY: PriceDeviationRecord[] = [
  { date: '2024-01-01', deviation: 0.12 },
  { date: '2024-01-02', deviation: 0.08 },
  { date: '2024-01-03', deviation: 0.15 },
  { date: '2024-01-04', deviation: 0.06 },
  { date: '2024-01-05', deviation: 0.09 },
  { date: '2024-01-06', deviation: 0.11 },
  { date: '2024-01-07', deviation: 0.07 },
  { date: '2024-01-08', deviation: 0.13 },
  { date: '2024-01-09', deviation: 0.05 },
  { date: '2024-01-10', deviation: 0.1 },
  { date: '2024-01-11', deviation: 0.08 },
  { date: '2024-01-12', deviation: 0.14 },
  { date: '2024-01-13', deviation: 0.06 },
  { date: '2024-01-14', deviation: 0.09 },
  { date: '2024-01-15', deviation: 0.11 },
  { date: '2024-01-16', deviation: 0.07 },
  { date: '2024-01-17', deviation: 0.12 },
  { date: '2024-01-18', deviation: 0.05 },
  { date: '2024-01-19', deviation: 0.08 },
  { date: '2024-01-20', deviation: 0.1 },
  { date: '2024-01-21', deviation: 0.06 },
  { date: '2024-01-22', deviation: 0.13 },
  { date: '2024-01-23', deviation: 0.09 },
  { date: '2024-01-24', deviation: 0.07 },
  { date: '2024-01-25', deviation: 0.11 },
  { date: '2024-01-26', deviation: 0.05 },
  { date: '2024-01-27', deviation: 0.08 },
  { date: '2024-01-28', deviation: 0.1 },
  { date: '2024-01-29', deviation: 0.06 },
  { date: '2024-01-30', deviation: 0.09 },
];

export function WinklinkAccuracyView({
  accuracyMetrics,
  priceDeviationHistory,
  oracleComparisons,
  dataAccuracy,
  historicalRecords,
  isLoading = false,
}: WinklinkAccuracyViewProps) {
  const t = useTranslations();

  const metrics = accuracyMetrics || {
    overallScore: 96.8,
    avgPriceDeviation: 0.08,
    dataFreshness: 98.5,
    comparisonSources: 5,
  };

  const deviationHistory = priceDeviationHistory || DEFAULT_DEVIATION_HISTORY;

  const comparisons = oracleComparisons || [
    {
      name: 'WINkLink',
      winPrice: 0.0000892,
      deviation: 0.05,
      lastUpdate: '2 sec ago',
      status: 'accurate' as const,
    },
    {
      name: 'Chainlink',
      winPrice: 0.0000895,
      deviation: 0.12,
      lastUpdate: '5 sec ago',
      status: 'accurate' as const,
    },
    {
      name: 'Band Protocol',
      winPrice: 0.000089,
      deviation: 0.08,
      lastUpdate: '8 sec ago',
      status: 'accurate' as const,
    },
    {
      name: 'Pyth',
      winPrice: 0.0000898,
      deviation: 0.18,
      lastUpdate: '3 sec ago',
      status: 'warning' as const,
    },
  ];

  const accuracy = dataAccuracy || {
    priceAccuracy: 97.2,
    updateTimeliness: 98.5,
    sourceConsistency: 95.8,
    historicalReliability: 96.1,
  };

  const records = historicalRecords || [
    {
      date: '2024-01-15 14:32:00',
      symbol: 'WIN/USDT',
      winklinkPrice: 0.0000892,
      referencePrice: 0.0000891,
      deviation: 0.11,
      status: 'accurate' as const,
    },
    {
      date: '2024-01-15 14:30:00',
      symbol: 'TRX/USDT',
      winklinkPrice: 0.1256,
      referencePrice: 0.1255,
      deviation: 0.08,
      status: 'accurate' as const,
    },
    {
      date: '2024-01-15 14:28:00',
      symbol: 'BTT/USDT',
      winklinkPrice: 0.0000012,
      referencePrice: 0.00000118,
      deviation: 1.69,
      status: 'warning' as const,
    },
    {
      date: '2024-01-15 14:25:00',
      symbol: 'JST/USDT',
      winklinkPrice: 0.0312,
      referencePrice: 0.0311,
      deviation: 0.32,
      status: 'accurate' as const,
    },
    {
      date: '2024-01-15 14:22:00',
      symbol: 'SUN/USDT',
      winklinkPrice: 0.0156,
      referencePrice: 0.0155,
      deviation: 0.65,
      status: 'warning' as const,
    },
    {
      date: '2024-01-15 14:20:00',
      symbol: 'WIN/USDT',
      winklinkPrice: 0.000089,
      referencePrice: 0.0000892,
      deviation: 0.22,
      status: 'accurate' as const,
    },
    {
      date: '2024-01-15 14:18:00',
      symbol: 'TRX/USDT',
      winklinkPrice: 0.1254,
      referencePrice: 0.1256,
      deviation: 0.16,
      status: 'accurate' as const,
    },
    {
      date: '2024-01-15 14:15:00',
      symbol: 'BTT/USDT',
      winklinkPrice: 0.00000119,
      referencePrice: 0.0000012,
      deviation: 0.84,
      status: 'warning' as const,
    },
    {
      date: '2024-01-15 14:12:00',
      symbol: 'JST/USDT',
      winklinkPrice: 0.0313,
      referencePrice: 0.0312,
      deviation: 0.32,
      status: 'accurate' as const,
    },
    {
      date: '2024-01-15 14:10:00',
      symbol: 'SUN/USDT',
      winklinkPrice: 0.0157,
      referencePrice: 0.0156,
      deviation: 0.64,
      status: 'warning' as const,
    },
  ];

  const statsItems = [
    {
      label: t('winklink.accuracy.overallScore') || 'Overall Accuracy Score',
      value: `${metrics.overallScore.toFixed(1)}%`,
      icon: Target,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      label: t('winklink.accuracy.avgDeviation') || 'Avg Price Deviation',
      value: `${metrics.avgPriceDeviation.toFixed(2)}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: t('winklink.accuracy.dataFreshness') || 'Data Freshness',
      value: `${metrics.dataFreshness.toFixed(1)}%`,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: t('winklink.accuracy.comparisonSources') || 'Comparison Sources',
      value: metrics.comparisonSources.toString(),
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const accuracyItems = [
    {
      label: t('winklink.accuracy.priceAccuracy') || 'Price Accuracy',
      score: accuracy.priceAccuracy,
      icon: Target,
      color: 'bg-emerald-500',
    },
    {
      label: t('winklink.accuracy.updateTimeliness') || 'Update Timeliness',
      score: accuracy.updateTimeliness,
      icon: Clock,
      color: 'bg-blue-500',
    },
    {
      label: t('winklink.accuracy.sourceConsistency') || 'Source Consistency',
      score: accuracy.sourceConsistency,
      icon: Activity,
      color: 'bg-purple-500',
    },
    {
      label: t('winklink.accuracy.historicalReliability') || 'Historical Reliability',
      score: accuracy.historicalReliability,
      icon: Shield,
      color: 'bg-amber-500',
    },
  ];

  const maxDeviation = Math.max(...deviationHistory.map((d) => Math.abs(d.deviation)), 0.5);
  const chartHeight = 200;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="py-2">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                    {item.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {t('winklink.accuracy.deviationHistory') || 'Price Deviation History'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('winklink.accuracy.deviationHistoryDesc') || 'Last 30 days price deviation trend'}
            </p>
          </div>
          <span className="text-sm text-gray-500">30 days</span>
        </div>

        <div className="relative" style={{ height: chartHeight }}>
          <div className="absolute inset-0 flex items-end">
            <div className="w-full h-full relative">
              <div
                className="absolute left-0 right-0 border-t border-dashed border-emerald-300 z-10"
                style={{ bottom: `${(0.1 / maxDeviation) * 100}%` }}
              >
                <span className="absolute -left-8 -top-2 text-xs text-emerald-500">0.1%</span>
              </div>
              <div
                className="absolute left-0 right-0 border-t border-dashed border-amber-300 z-10"
                style={{ bottom: `${(0.5 / maxDeviation) * 100}%` }}
              >
                <span className="absolute -left-8 -top-2 text-xs text-amber-500">0.5%</span>
              </div>
              <div
                className="absolute left-0 right-0 border-t border-dashed border-red-300 z-10"
                style={{ bottom: `${(1 / maxDeviation) * 100}%` }}
              >
                <span className="absolute -left-8 -top-2 text-xs text-red-500">1%</span>
              </div>

              <svg
                className="w-full h-full"
                viewBox={`0 0 ${deviationHistory.length * 10} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(236, 72, 153)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(236, 72, 153)" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <path
                  d={`M 0 ${chartHeight} ${deviationHistory
                    .map((d, i) => {
                      const x = i * 10 + 5;
                      const y = chartHeight - (Math.abs(d.deviation) / maxDeviation) * chartHeight;
                      return `L ${x} ${y}`;
                    })
                    .join(' ')} L ${(deviationHistory.length - 1) * 10 + 5} ${chartHeight} Z`}
                  fill="url(#deviationGradient)"
                />

                <path
                  d={`M 5 ${chartHeight - (Math.abs(deviationHistory[0].deviation) / maxDeviation) * chartHeight} ${deviationHistory
                    .slice(1)
                    .map((d, i) => {
                      const x = (i + 1) * 10 + 5;
                      const y = chartHeight - (Math.abs(d.deviation) / maxDeviation) * chartHeight;
                      return `L ${x} ${y}`;
                    })
                    .join(' ')}`}
                  fill="none"
                  stroke="rgb(236, 72, 153)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {deviationHistory.map((d, i) => {
                  const x = i * 10 + 5;
                  const y = chartHeight - (Math.abs(d.deviation) / maxDeviation) * chartHeight;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="rgb(236, 72, 153)"
                      className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
          <span>{formatDate(deviationHistory[0].date)}</span>
          <span>{formatDate(deviationHistory[Math.floor(deviationHistory.length / 2)].date)}</span>
          <span>{formatDate(deviationHistory[deviationHistory.length - 1].date)}</span>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {t('winklink.accuracy.oracleComparison') || 'Oracle Comparison'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('winklink.accuracy.oracleComparisonDesc') || 'Cross-oracle price comparison'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.oracle') || 'Oracle'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.winPrice') || 'WIN Price'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.deviation') || 'Deviation'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.lastUpdate') || 'Last Update'}
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.status') || 'Status'}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((oracle, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">{oracle.name}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900">
                    ${oracle.winPrice.toFixed(7)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getDeviationBgColor(oracle.deviation)} ${getDeviationColor(oracle.deviation)}`}
                    >
                      {oracle.deviation > 0 ? '+' : ''}
                      {oracle.deviation.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-500">
                    {oracle.lastUpdate}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {getStatusIcon(oracle.status)}
                      <span className={`text-sm ${getDeviationColor(oracle.deviation)}`}>
                        {getStatusLabel(oracle.status)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {t('winklink.accuracy.dataAccuracyMetrics') || 'Data Accuracy Metrics'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('winklink.accuracy.dataAccuracyDesc') ||
                'Comprehensive accuracy assessment scores'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {accuracyItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {item.score.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-right">/ 100</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {t('winklink.accuracy.historicalRecords') || 'Historical Accuracy Records'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('winklink.accuracy.historicalRecordsDesc') || 'Recent price verification records'}
            </p>
          </div>
          <span className="text-sm text-gray-500">Last 10 records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.date') || 'Date'}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.symbol') || 'Symbol'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.winklinkPrice') || 'WINkLink Price'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.referencePrice') || 'Reference Price'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.deviation') || 'Deviation'}
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  {t('winklink.accuracy.status') || 'Status'}
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-gray-500">{record.date}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">{record.symbol}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900">
                    ${record.winklinkPrice.toFixed(record.winklinkPrice < 0.001 ? 7 : 4)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900">
                    ${record.referencePrice.toFixed(record.referencePrice < 0.001 ? 7 : 4)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getDeviationBgColor(record.deviation)} ${getDeviationColor(record.deviation)}`}
                    >
                      {record.deviation > 0 ? '+' : ''}
                      {record.deviation.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {getStatusIcon(record.status)}
                      <span className={`text-sm ${getDeviationColor(record.deviation)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-center justify-between py-2">
        <p className="text-xs text-gray-500">
          {t('winklink.accuracy.lastUpdated') || 'Last updated'}: {new Date().toLocaleString()}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{t('winklink.accuracy.accurate') || 'Accurate'} (&lt;0.1%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{t('winklink.accuracy.warning') || 'Warning'} (&lt;0.5%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{t('winklink.accuracy.error') || 'Error'} (&gt;0.5%)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
