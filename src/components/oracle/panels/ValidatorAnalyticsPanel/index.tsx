'use client';

import { useState, useEffect, ReactNode, useCallback } from 'react';
import { DashboardCard } from '../../common/DashboardCard';
import { UMAClient, ValidatorData, ValidatorHistoryData } from '@/lib/oracles/uma';
import { useTranslations } from 'next-intl';
import { ValidatorPerformanceHeatmap } from '../../charts/ValidatorPerformanceHeatmap';
import { ValidatorComparison } from '../../charts/ValidatorComparison';
import { StakingCalculator } from '../../common/StakingCalculator';
import { createLogger } from '@/lib/utils/logger';
import { chartColors, baseColors, semanticColors, animationColors } from '@/lib/config/colors';
import { ValidatorHistoryChart } from './ValidatorHistoryChart';
import { EarningsTrendChart } from './EarningsTrendChart';
import {
  SortField,
  SortDirection,
  TimeRange,
  EarningsTrend,
  VALIDATOR_TYPE_STYLES,
  VALIDATOR_TYPE_LABELS,
} from './config';
import { SegmentedControl, DropdownSelect, MultiSelect } from '@/components/ui/selectors';
import { formatNumber } from '@/lib/utils/format';

const logger = createLogger('ValidatorAnalyticsPanel');

function formatRelativeTime(
  timestamp: number | null,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) {
    return t('panels.validatorAnalytics.secondsAgo', { seconds: diffInSeconds });
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return t('panels.validatorAnalytics.minutesAgo', { minutes });
  } else {
    const hours = Math.floor(diffInSeconds / 3600);
    return t('panels.validatorAnalytics.hoursAgo', { hours });
  }
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
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className="text-gray-900 text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: baseColors.primary[50], color: baseColors.primary[600] }}
        >
          {icon}
        </div>
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
    <div className="bg-white border border-gray-200 rounded-lg p-5">
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

function ValidatorTable({
  validators,
  sortField,
  sortDirection,
  onSort,
  onViewHistory,
}: {
  validators: ValidatorData[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onViewHistory: (validator: ValidatorData) => void;
}) {
  const t = useTranslations();

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg
        className="w-4 h-4"
        style={{ color: baseColors.primary[600] }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg
        className="w-4 h-4"
        style={{ color: baseColors.primary[600] }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${VALIDATOR_TYPE_STYLES[type] || 'bg-gray-100 text-gray-700'}`}
      >
        {VALIDATOR_TYPE_LABELS[type] || type}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t('uma.validatorAnalytics.rank')}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <button
                onClick={() => onSort('name')}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
              >
                {t('uma.validatorAnalytics.validatorName')}
                {getSortIcon('name')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t('uma.validatorAnalytics.type')}
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <button
                onClick={() => onSort('responseTime')}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
              >
                {t('uma.validatorAnalytics.response')}
                {getSortIcon('responseTime')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <button
                onClick={() => onSort('successRate')}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
              >
                {t('uma.validatorAnalytics.successRate')}
                {getSortIcon('successRate')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <button
                onClick={() => onSort('reputation')}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
              >
                {t('uma.validatorAnalytics.reputation')}
                {getSortIcon('reputation')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <button
                onClick={() => onSort('staked')}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
              >
                {t('uma.validatorAnalytics.staked')}
                {getSortIcon('staked')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <button
                onClick={() => onSort('earnings')}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
              >
                {t('uma.validatorAnalytics.earnings')}
                {getSortIcon('earnings')}
              </button>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t('uma.validatorAnalytics.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {validators.map((validator, index) => (
            <tr
              key={validator.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="py-3.5 px-4">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold ${
                    index < 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {index + 1}
                </span>
              </td>
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{validator.name}</span>
                  <a
                    href={`https://etherscan.io/address/${validator.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title={t('uma.validatorAnalytics.viewOnEtherscan')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </td>
              <td className="py-3.5 px-4">{getTypeBadge(validator.type)}</td>
              <td className="py-3.5 px-4">
                <span className="text-sm text-gray-700">{validator.responseTime}ms</span>
              </td>
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-16 h-1.5 overflow-hidden bg-gray-200">
                    <div
                      className="h-full"
                      style={{
                        width: `${validator.successRate}%`,
                        backgroundColor: semanticColors.success.DEFAULT,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {validator.successRate}%
                  </span>
                </div>
              </td>
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-16 h-1.5 overflow-hidden bg-gray-200">
                    <div
                      className="h-full"
                      style={{
                        width: `${validator.reputation}%`,
                        backgroundColor: baseColors.primary[500],
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{validator.reputation}</span>
                </div>
              </td>
              <td className="py-3.5 px-4">
                <span className="text-sm font-medium text-gray-700">
                  {formatNumber(validator.staked, true)}
                </span>
              </td>
              <td className="py-3.5 px-4">
                <span
                  className="text-sm font-semibold"
                  style={{ color: semanticColors.success.DEFAULT }}
                >
                  {formatNumber(validator.earnings)}
                </span>
              </td>
              <td className="py-3.5 px-4">
                <button
                  onClick={() => onViewHistory(validator)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  {t('uma.validatorAnalytics.viewHistory')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ValidatorAnalyticsPanel() {
  const t = useTranslations();
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [earningsTrends, setEarningsTrends] = useState<EarningsTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('reputation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [relativeTime, setRelativeTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedValidator, setSelectedValidator] = useState<ValidatorData | null>(null);
  const [validatorHistory, setValidatorHistory] = useState<ValidatorHistoryData[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showValidatorModal, setShowValidatorModal] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const client = new UMAClient();
      const [validatorsData, earningsData] = await Promise.all([
        client.getValidators(),
        client.getEarningsTrends(),
      ]);
      setValidators(validatorsData);
      setEarningsTrends(earningsData);
      setLastUpdateTime(Date.now());
    } catch (error) {
      logger.error(
        'Failed to fetch validator data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!lastUpdateTime) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(lastUpdateTime, t));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lastUpdateTime, t]);

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

  const filteredValidators = sortedValidators.filter((validator) =>
    validator.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredValidators.length / pageSize);
  const paginatedValidators = filteredValidators.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const fetchValidatorHistory = useCallback(async (validatorId: string, days: number) => {
    setIsHistoryLoading(true);
    try {
      const client = new UMAClient();
      const history = await client.getValidatorHistory(validatorId, days);
      setValidatorHistory(history);
    } catch (error) {
      logger.error(
        'Failed to fetch validator history',
        error instanceof Error ? error : new Error(String(error))
      );
      setValidatorHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const handleViewHistory = useCallback(
    (validator: ValidatorData) => {
      setSelectedValidator(validator);
      setShowValidatorModal(true);
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      fetchValidatorHistory(validator.id, days);
    },
    [timeRange, fetchValidatorHistory]
  );

  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      if (selectedValidator) {
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        fetchValidatorHistory(selectedValidator.id, days);
      }
    },
    [selectedValidator, fetchValidatorHistory]
  );

  const handleCloseModal = () => {
    setShowValidatorModal(false);
    setSelectedValidator(null);
    setValidatorHistory([]);
  };

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
    'North America': chartColors.region.northAmerica,
    Europe: chartColors.region.europe,
    Asia: chartColors.region.asia,
    Other: chartColors.region.other,
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
    institution: chartColors.validator.institution,
    independent: chartColors.validator.independent,
    community: chartColors.validator.community,
  };

  const typeLabels: Record<string, string> = {
    institution: t('panels.validatorAnalytics.institutionValidator'),
    independent: t('panels.validatorAnalytics.independentValidator'),
    community: t('panels.validatorAnalytics.communityValidator'),
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {lastUpdateTime && (
            <span className="text-sm text-gray-500">
              {t('panels.validatorAnalytics.lastUpdated')}: {relativeTime}
            </span>
          )}
          {isRefreshing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm" style={{ color: baseColors.primary[600] }}>
                {t('panels.validatorAnalytics.refreshing')}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('panels.validatorAnalytics.refreshData')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('uma.validatorAnalytics.totalActiveValidators')}
          value={validators.length.toString()}
          subtitle={t('uma.validatorAnalytics.performanceRanking')}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
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
              <path strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      <DashboardCard title={t('uma.validatorAnalytics.performanceRanking')}>
        <div className="mb-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={t('panels.validatorAnalytics.searchValidator')}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <ValidatorTable
          validators={paginatedValidators}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onViewHistory={handleViewHistory}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{t('panels.validatorAnalytics.itemsPerPage')}</span>
            <SegmentedControl
              options={[
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '50', label: '50' },
              ]}
              value={pageSize.toString()}
              onChange={(value) => handlePageSizeChange(Number(value))}
              size="sm"
            />
            <span>{t('panels.validatorAnalytics.items')}</span>
            <span className="ml-4 text-gray-400">
              {t('panels.validatorAnalytics.totalRecords', { count: filteredValidators.length })}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {t('panels.validatorAnalytics.prevPage')}
            </button>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 text-sm font-medium transition-all duration-200 ${
                      currentPage === pageNum
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {t('panels.validatorAnalytics.nextPage')}
            </button>
          </div>
        </div>
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

      <EarningsTrendChart data={earningsTrends} />

      <ValidatorPerformanceHeatmap />

      <ValidatorComparison validators={validators} />

      <StakingCalculator />

      {showValidatorModal && selectedValidator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedValidator.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('uma.validatorAnalytics.validatorDetails')}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {t('uma.validatorAnalytics.type')}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedValidator.type === 'institution'
                        ? 'bg-purple-100 text-purple-700'
                        : selectedValidator.type === 'independent'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {selectedValidator.type === 'institution'
                      ? t('panels.validatorAnalytics.institution')
                      : selectedValidator.type === 'independent'
                        ? t('panels.validatorAnalytics.independent')
                        : t('panels.validatorAnalytics.community')}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {t('uma.validatorAnalytics.region')}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{selectedValidator.region}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {t('uma.validatorAnalytics.staked')}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatNumber(selectedValidator.staked)} UMA
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {t('uma.validatorAnalytics.earnings')}
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: semanticColors.success.DEFAULT }}
                  >
                    {formatNumber(selectedValidator.earnings)} UMA
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t('uma.validatorAnalytics.address')}
                  </h4>
                  <a
                    href={`https://etherscan.io/address/${selectedValidator.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <span>{t('uma.validatorAnalytics.viewOnEtherscan')}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 break-all">
                  {selectedValidator.address}
                </div>
              </div>

              {isHistoryLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                    <p className="text-gray-500 text-sm">{t('uma.loading')}</p>
                  </div>
                </div>
              ) : (
                <ValidatorHistoryChart
                  data={validatorHistory}
                  timeRange={timeRange}
                  onTimeRangeChange={handleTimeRangeChange}
                />
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('uma.validatorAnalytics.estimatedRewards')}
                </h4>
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        {t('uma.validatorAnalytics.estimatedDaily')}
                      </p>
                      <p className="text-2xl font-bold" style={{ color: baseColors.primary[600] }}>
                        {formatNumber(Math.round(selectedValidator.earnings / 30))}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        UMA / {t('uma.validatorAnalytics.day')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        {t('uma.validatorAnalytics.estimatedMonthly')}
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: chartColors.recharts.purple }}
                      >
                        {formatNumber(selectedValidator.earnings)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        UMA / {t('uma.validatorAnalytics.month')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        {t('uma.validatorAnalytics.estimatedYearly')}
                      </p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: semanticColors.success.DEFAULT }}
                      >
                        {formatNumber(selectedValidator.earnings * 12)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        UMA / {t('uma.validatorAnalytics.year')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <p className="text-xs text-gray-500 text-center">
                      * {t('uma.validatorAnalytics.rewardEstimateNote')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
