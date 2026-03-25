'use client';

import { useTranslations } from '@/i18n';
import { DashboardCard } from '../common/DashboardCard';
import { chartColors } from '@/lib/config/colors';

interface DAPICoverage {
  totalDapis: number;
  byAssetType: {
    crypto: number;
    forex: number;
    commodities: number;
    stocks: number;
  };
  byChain: {
    ethereum: number;
    arbitrum: number;
    polygon: number;
  };
  updateFrequency: {
    high: number;
    medium: number;
    low: number;
  };
}

interface DapiCoveragePanelProps {
  data: DAPICoverage;
}

function TotalDapisCard({ total }: { total: number }) {
  const t = useTranslations();

  return (
    <div className="bg-gray-100 border border-gray-200  p-6 text-white ">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-primary-100 text-sm uppercase tracking-wider mb-2">
            {t('dapiCoverage.totalDapis')}
          </p>
          <p className="text-5xl font-bold mb-1">{total}</p>
          <p className="text-primary-200 text-sm">{t('dapiCoverage.activeDataSources')}</p>
        </div>
        <div className="p-3 bg-primary-500 bg-opacity-30 ">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function DistributionBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = (value / total) * 100;

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
        </div>
      </div>
      <div className="w-full h-3 bg-gray-100  overflow-hidden">
        <div
          className={`h-full ${color}  transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ChainDistribution({ data }: { data: DAPICoverage['byChain'] }) {
  const t = useTranslations();
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const chains = [
    { key: 'ethereum', label: 'Ethereum', value: data.ethereum, color: 'bg-indigo-500' },
    { key: 'arbitrum', label: 'Arbitrum', value: data.arbitrum, color: 'bg-cyan-500' },
    { key: 'polygon', label: 'Polygon', value: data.polygon, color: 'bg-purple-500' },
  ];

  return (
    <DashboardCard title={t('dapiCoverage.byChainDistribution')}>
      <div className="space-y-1">
        {chains.map((chain) => (
          <DistributionBar
            key={chain.key}
            label={chain.label}
            value={chain.value}
            total={total}
            color={chain.color}
          />
        ))}
      </div>
    </DashboardCard>
  );
}

function UpdateFrequencyDistribution({ data }: { data: DAPICoverage['updateFrequency'] }) {
  const t = useTranslations();
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const frequencies = [
    {
      key: 'high',
      label: t('dapiCoverage.highFrequency'),
      sublabel: t('dapiCoverage.perSecondUpdate'),
      value: data.high,
      color: 'bg-success-500',
    },
    {
      key: 'medium',
      label: t('dapiCoverage.mediumFrequency'),
      sublabel: t('dapiCoverage.perMinuteUpdate'),
      value: data.medium,
      color: 'bg-warning-500',
    },
    {
      key: 'low',
      label: t('dapiCoverage.lowFrequency'),
      sublabel: t('dapiCoverage.perHourUpdate'),
      value: data.low,
      color: 'bg-red-400',
    },
  ];

  return (
    <DashboardCard title={t('dapiCoverage.updateFrequencyDistribution')}>
      <div className="space-y-1">
        {frequencies.map((freq) => (
          <div key={freq.key} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-gray-700">{freq.label}</span>
                <span className="text-xs text-gray-400 ml-2">{freq.sublabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{freq.value}</span>
                <span className="text-xs text-gray-500">
                  ({((freq.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-100  overflow-hidden">
              <div
                className={`h-full ${freq.color}  transition-all duration-500 ease-out`}
                style={{ width: `${(freq.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function DonutChart({ data }: { data: DAPICoverage['byAssetType'] }) {
  const t = useTranslations();
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const segments = [
    { key: 'crypto', value: data.crypto, color: chartColors.recharts.primary },
    { key: 'forex', value: data.forex, color: chartColors.semantic.success },
    { key: 'commodities', value: data.commodities, color: chartColors.recharts.warning },
    { key: 'stocks', value: data.stocks, color: chartColors.recharts.purple },
  ];

  let cumulativePercentage = 0;
  const gradientStops = segments.map((segment) => {
    const startPercentage = cumulativePercentage;
    const percentage = (segment.value / total) * 100;
    cumulativePercentage += percentage;
    return {
      color: segment.color,
      start: startPercentage,
      end: cumulativePercentage,
    };
  });

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={chartColors.recharts.grid}
          strokeWidth="12"
        />
        {gradientStops.map((stop, index) => {
          const circumference = 2 * Math.PI * 40;
          const strokeDasharray = `${((stop.end - stop.start) * circumference) / 100} ${circumference}`;
          const strokeDashoffset = (-stop.start * circumference) / 100;

          return (
            <circle
              key={index}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={stop.color}
              strokeWidth="12"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500">{t('dapiCoverage.total')}</span>
      </div>
    </div>
  );
}

function AssetTypeDonut({ data }: { data: DAPICoverage['byAssetType'] }) {
  const t = useTranslations();
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const legend = [
    { label: t('dapiCoverage.crypto'), value: data.crypto, color: 'bg-primary-500' },
    { label: t('dapiCoverage.forex'), value: data.forex, color: 'bg-success-500' },
    { label: t('dapiCoverage.commodities'), value: data.commodities, color: 'bg-warning-500' },
    { label: t('dapiCoverage.stocks'), value: data.stocks, color: 'bg-purple-500' },
  ];

  return (
    <DashboardCard title={t('dapiCoverage.byAssetTypeDistribution')}>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <DonutChart data={data} />
        <div className="flex-1 space-y-3">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3  ${item.color}`} />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                <span className="text-xs text-gray-500">
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

export function DapiCoveragePanel({ data }: DapiCoveragePanelProps) {
  return (
    <div className="space-y-6">
      <TotalDapisCard total={data.totalDapis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssetTypeDonut data={data.byAssetType} />
        <ChainDistribution data={data.byChain} />
      </div>

      <UpdateFrequencyDistribution data={data.updateFrequency} />
    </div>
  );
}

export type { DAPICoverage };
