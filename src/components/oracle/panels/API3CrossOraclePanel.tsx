'use client';

import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { OracleProvider } from '@/types/oracle';
import { chartColors } from '@/lib/config/colors';

interface CrossOracleMetric {
  oracle: OracleProvider;
  name: string;
  responseTime: number;
  accuracy: number;
  availability: number;
  costEfficiency: number;
  updateFrequency: number;
}

interface API3CrossOraclePanelProps {
  data?: CrossOracleMetric[];
}

const defaultMetrics: CrossOracleMetric[] = [
  {
    oracle: OracleProvider.API3,
    name: 'API3',
    responseTime: 200,
    accuracy: 99.8,
    availability: 99.8,
    costEfficiency: 85,
    updateFrequency: 10,
  },
  {
    oracle: OracleProvider.CHAINLINK,
    name: 'Chainlink',
    responseTime: 245,
    accuracy: 99.9,
    availability: 99.9,
    costEfficiency: 70,
    updateFrequency: 60,
  },
  {
    oracle: OracleProvider.PYTH,
    name: 'Pyth',
    responseTime: 100,
    accuracy: 99.9,
    availability: 99.9,
    costEfficiency: 90,
    updateFrequency: 1,
  },
  {
    oracle: OracleProvider.BAND_PROTOCOL,
    name: 'Band',
    responseTime: 150,
    accuracy: 99.5,
    availability: 99.85,
    costEfficiency: 80,
    updateFrequency: 30,
  },
  {
    oracle: OracleProvider.DIA,
    name: 'DIA',
    responseTime: 150,
    accuracy: 99.7,
    availability: 99.8,
    costEfficiency: 88,
    updateFrequency: 60,
  },
];

function ComparisonBar({
  label,
  value,
  max,
  color,
  unit = '',
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {value}
          {unit}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ResponseTimeComparison({ data }: { data: CrossOracleMetric[] }) {
  const { t } = useI18n();
  const maxTime = Math.max(...data.map((d) => d.responseTime));

  return (
    <DashboardCard title={t('api3.crossOracle.responseTime.title')}>
      <div className="space-y-1">
        {data.map((metric) => (
          <ComparisonBar
            key={metric.oracle}
            label={metric.name}
            value={metric.responseTime}
            max={maxTime}
            color={metric.oracle === OracleProvider.API3 ? 'bg-green-500' : 'bg-gray-400'}
            unit="ms"
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">{t('api3.crossOracle.responseTime.description')}</p>
    </DashboardCard>
  );
}

function AccuracyComparison({ data }: { data: CrossOracleMetric[] }) {
  const { t } = useI18n();

  return (
    <DashboardCard title={t('api3.crossOracle.accuracy.title')}>
      <div className="space-y-1">
        {data.map((metric) => (
          <ComparisonBar
            key={metric.oracle}
            label={metric.name}
            value={metric.accuracy}
            max={100}
            color={metric.oracle === OracleProvider.API3 ? 'bg-green-500' : 'bg-gray-400'}
            unit="%"
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">{t('api3.crossOracle.accuracy.description')}</p>
    </DashboardCard>
  );
}

function AvailabilityComparison({ data }: { data: CrossOracleMetric[] }) {
  const { t } = useI18n();

  return (
    <DashboardCard title={t('api3.crossOracle.availability.title')}>
      <div className="space-y-1">
        {data.map((metric) => (
          <ComparisonBar
            key={metric.oracle}
            label={metric.name}
            value={metric.availability}
            max={100}
            color={metric.oracle === OracleProvider.API3 ? 'bg-green-500' : 'bg-gray-400'}
            unit="%"
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">{t('api3.crossOracle.availability.description')}</p>
    </DashboardCard>
  );
}

function CostEfficiencyComparison({ data }: { data: CrossOracleMetric[] }) {
  const { t } = useI18n();

  return (
    <DashboardCard title={t('api3.crossOracle.costEfficiency.title')}>
      <div className="space-y-1">
        {data.map((metric) => (
          <ComparisonBar
            key={metric.oracle}
            label={metric.name}
            value={metric.costEfficiency}
            max={100}
            color={metric.oracle === OracleProvider.API3 ? 'bg-green-500' : 'bg-gray-400'}
            unit="/100"
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {t('api3.crossOracle.costEfficiency.description')}
      </p>
    </DashboardCard>
  );
}

function UpdateFrequencyComparison({ data }: { data: CrossOracleMetric[] }) {
  const { t } = useI18n();
  const maxFreq = Math.max(...data.map((d) => d.updateFrequency));

  return (
    <DashboardCard title={t('api3.crossOracle.updateFrequency.title')}>
      <div className="space-y-1">
        {data.map((metric) => (
          <ComparisonBar
            key={metric.oracle}
            label={metric.name}
            value={metric.updateFrequency}
            max={maxFreq}
            color={metric.oracle === OracleProvider.API3 ? 'bg-green-500' : 'bg-gray-400'}
            unit="s"
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {t('api3.crossOracle.updateFrequency.description')}
      </p>
    </DashboardCard>
  );
}

function API3AdvantagesSummary({ data }: { data: CrossOracleMetric[] }) {
  const { t } = useI18n();
  const api3Metric = data.find((d) => d.oracle === OracleProvider.API3);

  if (!api3Metric) return null;

  const advantages = [
    {
      label: t('api3.crossOracle.advantages.firstParty'),
      value: t('api3.crossOracle.advantages.firstPartyValue'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: t('api3.crossOracle.advantages.quantifiableSecurity'),
      value: t('api3.crossOracle.advantages.quantifiableSecurityValue'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      label: t('api3.crossOracle.advantages.dapi'),
      value: t('api3.crossOracle.advantages.dapiValue'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
      ),
    },
  ];

  return (
    <DashboardCard title={t('api3.crossOracle.advantages.title')}>
      <div className="space-y-3">
        {advantages.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-green-50 border border-green-200"
          >
            <div className="p-2 bg-green-100 text-green-600">{item.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-600">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function API3CrossOraclePanel({ data }: API3CrossOraclePanelProps) {
  const { t } = useI18n();
  const metrics = data ?? defaultMetrics;

  return (
    <div className="space-y-6">
      <div className="bg-gray-100 border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {t('api3.crossOracle.overview.title')}
            </h4>
            <p className="text-sm text-gray-600">{t('api3.crossOracle.overview.description')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponseTimeComparison data={metrics} />
        <AccuracyComparison data={metrics} />
        <AvailabilityComparison data={metrics} />
        <CostEfficiencyComparison data={metrics} />
        <UpdateFrequencyComparison data={metrics} />
        <API3AdvantagesSummary data={metrics} />
      </div>
    </div>
  );
}
