'use client';

import { useState, useEffect, ReactNode } from 'react';
import { DashboardCard } from './DashboardCard';
import { UMAClient, ValidatorData } from '@/lib/oracles/uma';
import { useI18n } from '@/lib/i18n/context';
import { ValidatorPerformanceHeatmap } from './ValidatorPerformanceHeatmap';
import { ValidatorComparison } from './ValidatorComparison';

type SortField = 'name' | 'responseTime' | 'successRate' | 'reputation' | 'staked' | 'earnings';
type SortDirection = 'asc' | 'desc';

interface EarningsTrend {
  day: string;
  daily: number;
  cumulative: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toLocaleString();
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className="text-gray-900 text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function PieChart({
  data,
  title,
  subtitle,
}: {
  data: { name: string; value: number; color: string }[];
  title: string;
  subtitle?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  let currentAngle = 0;
  const segments = data.map((item) => {
    const angle = (item.value / total) * 360;
    const segment = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
    currentAngle += angle;
    return segment;
  });

  const createArcPath = (startAngle: number, endAngle: number, radius: number = 80) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-4">
        <p className="text-gray-900 text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-48 h-48">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={createArcPath(segment.startAngle, segment.endAngle)}
              fill={segment.color}
              className="transition-all duration-200 cursor-pointer"
              style={{
                opacity: hoveredIndex === index ? 1 : hoveredIndex !== null ? 0.5 : 0.9,
                transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>
      </div>

      <div className="mt-4 space-y-2">
        {segments.map((segment, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: segment.color }} />
              <span className="text-gray-600">{segment.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{segment.value}</span>
              <span className="text-gray-400">({segment.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EarningsChart({ data }: { data: EarningsTrend[] }) {
  const maxDaily = Math.max(...data.map((d) => d.daily));
  const maxCumulative = Math.max(...data.map((d) => d.cumulative));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-4">
        <p className="text-gray-900 text-sm font-semibold">验证者收益趋势</p>
        <p className="text-gray-500 text-xs mt-0.5">30天收益趋势分析</p>
      </div>

      <div className="h-64 relative">
        <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-gray-100 h-0" />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end justify-between gap-1 px-2">
          {data.map((item, index) => {
            const dailyHeight = (item.daily / maxDaily) * 100;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col justify-end items-center group relative"
              >
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-200 group-hover:bg-blue-600"
                  style={{ height: `${dailyHeight}%` }}
                />
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                  <div>{item.day}</div>
                  <div>日收益: {item.daily.toLocaleString()}</div>
                  <div>累计: {item.cumulative.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-xs text-gray-600">日收益</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">总累计收益</p>
          <p className="text-sm font-semibold text-gray-900">
            {data.length > 0 ? formatNumber(data[data.length - 1].cumulative) : '0'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ValidatorTable({
  validators,
  sortField,
  sortDirection,
  onSort,
}: {
  validators: ValidatorData[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const { t } = useI18n();

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      institution: 'bg-purple-100 text-purple-700',
      independent: 'bg-blue-100 text-blue-700',
      community: 'bg-green-100 text-green-700',
    };
    const labels: Record<string, string> = {
      institution: '机构',
      independent: '独立',
      community: '社区',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
        {labels[type] || type}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('uma.validatorAnalytics.rank')}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('name')}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t('uma.validatorAnalytics.validatorName')}
                {getSortIcon('name')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('uma.validatorAnalytics.type')}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('responseTime')}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t('uma.validatorAnalytics.response')}
                {getSortIcon('responseTime')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('successRate')}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t('uma.validatorAnalytics.successRate')}
                {getSortIcon('successRate')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('reputation')}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t('uma.validatorAnalytics.reputation')}
                {getSortIcon('reputation')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('staked')}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t('uma.validatorAnalytics.staked')}
                {getSortIcon('staked')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => onSort('earnings')}
                className="flex items-center gap-1 hover:text-gray-700 transition-colors"
              >
                {t('uma.validatorAnalytics.earnings')}
                {getSortIcon('earnings')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {validators.map((validator, index) => (
            <tr
              key={validator.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                    index < 3
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {index + 1}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-medium text-gray-900">{validator.name}</span>
              </td>
              <td className="py-3 px-4">{getTypeBadge(validator.type)}</td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-900">{validator.responseTime}ms</span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${validator.successRate}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{validator.successRate}%</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${validator.reputation}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{validator.reputation}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-900">{formatNumber(validator.staked)}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm font-medium text-green-600">
                  {formatNumber(validator.earnings)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ValidatorAnalyticsPanel() {
  const { t } = useI18n();
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [earningsTrends, setEarningsTrends] = useState<EarningsTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('reputation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const client = new UMAClient();
        const [validatorsData, earningsData] = await Promise.all([
          client.getValidators(),
          client.getEarningsTrends(),
        ]);
        setValidators(validatorsData);
        setEarningsTrends(earningsData);
      } catch (error) {
        console.error('Failed to fetch validator data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedValidators = [...validators].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'responseTime':
        comparison = a.responseTime - b.responseTime;
        break;
      case 'successRate':
        comparison = a.successRate - b.successRate;
        break;
      case 'reputation':
        comparison = a.reputation - b.reputation;
        break;
      case 'staked':
        comparison = a.staked - b.staked;
        break;
      case 'earnings':
        comparison = a.earnings - b.earnings;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalStaked = validators.reduce((sum, v) => sum + v.staked, 0);
  const avgResponseTime =
    validators.length > 0
      ? Math.round(validators.reduce((sum, v) => sum + v.responseTime, 0) / validators.length)
      : 0;
  const avgSuccessRate =
    validators.length > 0
      ? (validators.reduce((sum, v) => sum + v.successRate, 0) / validators.length).toFixed(1)
      : '0';

  const regionDistribution = validators.reduce(
    (acc, v) => {
      acc[v.region] = (acc[v.region] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const regionColors: Record<string, string> = {
    'North America': '#3B82F6',
    Europe: '#8B5CF6',
    Asia: '#10B981',
    Other: '#F59E0B',
  };

  const regionChartData = Object.entries(regionDistribution).map(([name, value]) => ({
    name,
    value,
    color: regionColors[name] || '#6B7280',
  }));

  const typeDistribution = validators.reduce(
    (acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const typeColors: Record<string, string> = {
    institution: '#8B5CF6',
    independent: '#3B82F6',
    community: '#10B981',
  };

  const typeLabels: Record<string, string> = {
    institution: '机构验证者',
    independent: '独立验证者',
    community: '社区验证者',
  };

  const typeChartData = Object.entries(typeDistribution).map(([name, value]) => ({
    name: typeLabels[name] || name,
    value,
    color: typeColors[name] || '#6B7280',
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <p className="text-gray-500 text-sm">{t('uma.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('uma.validatorAnalytics.totalActiveValidators')}
          value={validators.length.toString()}
          subtitle={t('uma.validatorAnalytics.performanceRanking')}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
        <StatCard
          title={t('uma.validatorAnalytics.avgResponseTime')}
          value={`${avgResponseTime}ms`}
          subtitle={t('uma.validatorAnalytics.performanceRanking')}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />
        <StatCard
          title={t('uma.validatorAnalytics.avgSuccessRate')}
          value={`${avgSuccessRate}%`}
          subtitle={t('uma.validatorAnalytics.performanceRanking')}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title={t('uma.validatorAnalytics.totalStaked')}
          value={formatNumber(totalStaked)}
          subtitle="UMA"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      <DashboardCard title={t('uma.validatorAnalytics.performanceRanking')}>
        <ValidatorTable
          validators={sortedValidators}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChart
          data={regionChartData}
          title={t('uma.validatorAnalytics.geographicDistribution')}
          subtitle={t('uma.validatorAnalytics.performanceRanking')}
        />
        <PieChart
          data={typeChartData}
          title={t('uma.validatorAnalytics.validatorTypes')}
          subtitle={t('uma.validatorAnalytics.performanceRanking')}
        />
      </div>

      <EarningsChart data={earningsTrends} />

      <ValidatorPerformanceHeatmap />

      <ValidatorComparison validators={validators} />
    </div>
  );
}
