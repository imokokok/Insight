'use client';

import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';

interface AirnodeDeployments {
  total: number;
  byRegion: {
    northAmerica: number;
    europe: number;
    asia: number;
    others: number;
  };
  byChain: {
    ethereum: number;
    arbitrum: number;
    polygon: number;
  };
  byProviderType: {
    exchanges: number;
    traditionalFinance: number;
    others: number;
  };
}

interface AirnodeDeploymentPanelProps {
  data: AirnodeDeployments;
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
  const percentage = ((value / total) * 100).toFixed(1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{value}</span>
          <span className="text-xs text-gray-400">({percentage}%)</span>
        </div>
      </div>
      <div className="w-full h-2.5 bg-gray-100 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function RegionDistribution({ data }: { data: AirnodeDeployments['byRegion'] }) {
  const { t } = useI18n();
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const regions = [
    {
      label: t('airnodeDeployment.regions.northAmerica'),
      value: data.northAmerica,
      color: 'bg-blue-500',
    },
    { label: t('airnodeDeployment.regions.europe'), value: data.europe, color: 'bg-blue-400' },
    { label: t('airnodeDeployment.regions.asia'), value: data.asia, color: 'bg-blue-600' },
    { label: t('airnodeDeployment.regions.others'), value: data.others, color: 'bg-blue-300' },
  ];

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('airnodeDeployment.regionDistribution.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('airnodeDeployment.regionDistribution.subtitle')}
          </p>
        </div>
        <div className="p-2 bg-gray-100 border border-gray-200">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        {regions.map((region) => (
          <DistributionBar
            key={region.label}
            label={region.label}
            value={region.value}
            total={total}
            color={region.color}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-4 gap-2">
          {regions.map((region) => (
            <div key={region.label} className="text-center">
              <div className={`w-3 h-3 ${region.color} mx-auto mb-1`} />
              <p className="text-xs text-gray-500">{region.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChainDistribution({ data }: { data: AirnodeDeployments['byChain'] }) {
  const { t } = useI18n();
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const chains = [
    { label: 'Ethereum', value: data.ethereum, color: 'bg-purple-500' },
    { label: 'Arbitrum', value: data.arbitrum, color: 'bg-purple-400' },
    { label: 'Polygon', value: data.polygon, color: 'bg-purple-600' },
  ];

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('airnodeDeployment.chainDistribution.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('airnodeDeployment.chainDistribution.subtitle')}
          </p>
        </div>
        <div className="p-2 bg-gray-100 border border-gray-200">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        {chains.map((chain) => (
          <DistributionBar
            key={chain.label}
            label={chain.label}
            value={chain.value}
            total={total}
            color={chain.color}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-2">
          {chains.map((chain) => (
            <div key={chain.label} className="text-center">
              <div className={`w-3 h-3 ${chain.color} mx-auto mb-1`} />
              <p className="text-xs text-gray-500">{chain.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProviderTypeDistribution({ data }: { data: AirnodeDeployments['byProviderType'] }) {
  const { t } = useI18n();
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const providers = [
    {
      label: t('airnodeDeployment.providerTypes.exchanges'),
      value: data.exchanges,
      color: 'bg-green-500',
    },
    {
      label: t('airnodeDeployment.providerTypes.traditionalFinance'),
      value: data.traditionalFinance,
      color: 'bg-green-400',
    },
    {
      label: t('airnodeDeployment.providerTypes.others'),
      value: data.others,
      color: 'bg-green-300',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('airnodeDeployment.providerTypeDistribution.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('airnodeDeployment.providerTypeDistribution.subtitle')}
          </p>
        </div>
        <div className="p-2 bg-gray-100 border border-gray-200">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => (
          <DistributionBar
            key={provider.label}
            label={provider.label}
            value={provider.value}
            total={total}
            color={provider.color}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-2">
          {providers.map((provider) => (
            <div key={provider.label} className="text-center">
              <div className={`w-3 h-3 ${provider.color} mx-auto mb-1`} />
              <p className="text-xs text-gray-500">{provider.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AirnodeDeploymentPanel({ data }: AirnodeDeploymentPanelProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <DashboardCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
              {t('airnodeDeployment.totalAirnodes')}
            </p>
            <p className="text-3xl font-bold text-gray-900">{data.total.toLocaleString()}</p>
            <p className="text-gray-400 text-xs mt-2">
              {t('airnodeDeployment.globallyDeployedNodes')}
            </p>
          </div>
          <div className="p-4 bg-gray-100 border border-gray-200">
            <svg
              className="w-10 h-10 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
          </div>
        </div>
      </DashboardCard>

      <RegionDistribution data={data.byRegion} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChainDistribution data={data.byChain} />
        <ProviderTypeDistribution data={data.byProviderType} />
      </div>
    </div>
  );
}

export type { AirnodeDeployments };
