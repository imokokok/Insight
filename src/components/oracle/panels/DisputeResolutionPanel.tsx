'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  UMAClient,
  DisputeData,
  DisputeType,
  DisputeTypeLabels,
  DisputeTypeStyles,
  DisputeTypeChartColors,
  PriceDisputeIcon,
  StateDisputeIcon,
  LiquidationDisputeIcon,
  OtherDisputeIcon,
} from '@/lib/oracles/uma';
import { DashboardCard } from '../common/DashboardCard';
import { DisputeEfficiencyAnalysis } from '../common/DisputeEfficiencyAnalysis';
import { DisputeAmountDistribution } from '../common/DisputeAmountDistribution';
import {
  DisputeVotingPanel,
  generateMockVotingData,
  DisputeVotingData,
} from './DisputeVotingPanel';
import { useUMARealtimeDisputes, UMADisputeUpdate } from '@/hooks/useUMARealtime';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DisputeResolutionPanel');

const umaClient = new UMAClient();

function formatRelativeTime(
  timestamp: number | null,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) {
    return t('dataQuality.secondsAgo', { seconds: diffInSeconds });
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return t('dataQuality.minutesAgo', { minutes });
  } else {
    const hours = Math.floor(diffInSeconds / 3600);
    return t('dataQuality.hoursAgo', { hours });
  }
}

interface DisputeOverview {
  totalDisputes: number;
  activeDisputes: number;
  successRate: number;
  avgResolutionTime: number;
}

interface DisputeTrend {
  date: string;
  filed: number;
  resolved: number;
  byType?: {
    price: number;
    state: number;
    liquidation: number;
    other: number;
  };
}

function DisputeOverviewCard({
  overview,
  loading,
}: {
  overview: DisputeOverview | null;
  loading: boolean;
}) {
  const { t } = useI18n();

  if (loading || !overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200  p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: t('uma.disputeResolution.totalDisputes'),
      value: overview.totalDisputes.toLocaleString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      label: t('uma.disputeResolution.activeDisputes'),
      value: overview.activeDisputes.toLocaleString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: t('uma.disputeResolution.successRate'),
      value: `${overview.successRate.toFixed(1)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: t('uma.disputeResolution.avgResolutionTime'),
      value: `${overview.avgResolutionTime.toFixed(1)}h`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200  p-5 hover:border-gray-300 transition-colors duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{stat.label}</p>
              <p className="text-gray-900 text-2xl font-bold">{stat.value}</p>
            </div>
            <div className="p-2.5 bg-blue-50  text-blue-600">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DisputeTrendChart({ trends }: { trends: DisputeTrend[] }) {
  const { t } = useI18n();
  const [showByType, setShowByType] = useState(false);

  const maxValue = Math.max(...trends.flatMap((d) => [d.filed, d.resolved]));
  const maxByTypeValue = showByType
    ? Math.max(...trends.flatMap((d) => (d.byType ? Object.values(d.byType) : [0])))
    : 0;

  const getHeight = (value: number, max = maxValue) => {
    return max > 0 ? (value / max) * 100 : 0;
  };

  // 使用统一的争议类型样式配置
  const typeColors = {
    price: 'bg-blue-500',
    state: 'bg-emerald-500',
    liquidation: 'bg-amber-500',
    other: 'bg-slate-500',
  };

  const typeBgColors = {
    price: 'bg-blue-50',
    state: 'bg-emerald-50',
    liquidation: 'bg-amber-50',
    other: 'bg-slate-50',
  };

  const typeLabels: Record<DisputeType, string> = {
    price: t('uma.disputeTypes.price'),
    state: t('uma.disputeTypes.state'),
    liquidation: t('uma.disputeTypes.liquidation'),
    other: t('uma.disputeTypes.other'),
  };

  // 获取争议类型图标
  const getTypeChartIcon = (type: DisputeType, className = 'w-4 h-4') => {
    switch (type) {
      case 'price':
        return <PriceDisputeIcon className={className} />;
      case 'state':
        return <StateDisputeIcon className={className} />;
      case 'liquidation':
        return <LiquidationDisputeIcon className={className} />;
      case 'other':
        return <OtherDisputeIcon className={className} />;
      default:
        return null;
    }
  };

  return (
    <DashboardCard title={t('uma.disputeResolution.disputeTrends')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {!showByType ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 "></div>
                  <span className="text-sm text-gray-600">
                    {t('uma.disputeResolution.filedDisputes')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 "></div>
                  <span className="text-sm text-gray-600">
                    {t('uma.disputeResolution.resolvedDisputes')}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 flex-wrap">
                {(Object.keys(typeColors) as Array<keyof typeof typeColors>).map((type) => (
                  <div
                    key={type}
                    className={`flex items-center gap-2 px-3 py-1.5  ${typeBgColors[type]} border border-opacity-20`}
                    style={{ borderColor: DisputeTypeChartColors[type] }}
                  >
                    <div className={`${typeColors[type]} text-white  p-0.5`}>
                      {getTypeChartIcon(type, 'w-3 h-3')}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{typeLabels[type]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowByType(!showByType)}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            {showByType
              ? t('disputeResolution.showOverallTrend')
              : t('disputeResolution.groupByType')}
          </button>
        </div>

        <div className="flex items-end justify-between gap-2 h-48">
          {trends.map((trend, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center gap-1 h-40">
                {!showByType ? (
                  <>
                    <div
                      className="w-3 bg-blue-500  transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${getHeight(trend.filed)}%` }}
                      title={`${t('uma.disputeResolution.filedDisputes')}: ${trend.filed}`}
                    ></div>
                    <div
                      className="w-3 bg-emerald-500  transition-all duration-300 hover:bg-emerald-600"
                      style={{ height: `${getHeight(trend.resolved)}%` }}
                      title={`${t('uma.disputeResolution.resolvedDisputes')}: ${trend.resolved}`}
                    ></div>
                  </>
                ) : (
                  trend.byType &&
                  (Object.keys(typeColors) as Array<keyof typeof typeColors>).map((type) => (
                    <div
                      key={type}
                      className={`w-2 ${typeColors[type]}  transition-all duration-300 hover:opacity-80`}
                      style={{ height: `${getHeight(trend.byType![type], maxByTypeValue)}%` }}
                      title={`${typeLabels[type]}: ${trend.byType![type]}`}
                    ></div>
                  ))
                )}
              </div>
              <span className="text-xs text-gray-500">{trend.date}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function DisputeDistributionChart({ disputes }: { disputes: DisputeData[] }) {
  const { t } = useI18n();

  const distribution = {
    active: disputes.filter((d) => d.status === 'active').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    rejected: disputes.filter((d) => d.status === 'rejected').length,
  };

  const total = disputes.length;
  const percentages = {
    active: total > 0 ? ((distribution.active / total) * 100).toFixed(1) : '0',
    resolved: total > 0 ? ((distribution.resolved / total) * 100).toFixed(1) : '0',
    rejected: total > 0 ? ((distribution.rejected / total) * 100).toFixed(1) : '0',
  };

  const segments = [
    {
      label: t('uma.disputeResolution.statusActive'),
      value: distribution.active,
      percentage: percentages.active,
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
    },
    {
      label: t('uma.disputeResolution.statusResolved'),
      value: distribution.resolved,
      percentage: percentages.resolved,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      textColor: 'text-green-700',
    },
    {
      label: t('uma.disputeResolution.statusRejected'),
      value: distribution.rejected,
      percentage: percentages.rejected,
      color: 'bg-red-500',
      lightColor: 'bg-red-100',
      textColor: 'text-red-700',
    },
  ];

  return (
    <DashboardCard title={t('uma.disputeResolution.disputeDistribution')}>
      <div className="space-y-4">
        <div className="h-4  overflow-hidden flex bg-gray-100">
          {segments.map((segment, index) => (
            <div
              key={index}
              className={`${segment.color} transition-all duration-300`}
              style={{ width: `${segment.percentage}%` }}
            ></div>
          ))}
        </div>

        <div className="space-y-3">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 ${segment.color} `}></div>
                <span className="text-sm text-gray-600">{segment.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${segment.textColor}`}>
                  {segment.value}
                </span>
                <span className="text-xs text-gray-500">({segment.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function DisputeTable({ disputes }: { disputes: DisputeData[] }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<DisputeType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'reward'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchId, setSearchId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const typeLabels: Record<DisputeType, string> = {
    price: t('uma.disputeTypes.price'),
    state: t('uma.disputeTypes.state'),
    liquidation: t('uma.disputeTypes.liquidation'),
    other: t('uma.disputeTypes.other'),
  };

  const filteredDisputes = disputes.filter((dispute) => {
    if (filter !== 'all' && dispute.status !== filter) return false;
    if (typeFilter !== 'all' && dispute.type !== typeFilter) return false;
    if (searchId.trim() && dispute.id !== searchId.trim()) return false;
    return true;
  });

  const sortedDisputes = [...filteredDisputes].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'timestamp') {
      return (a.timestamp - b.timestamp) * multiplier;
    }
    return (a.reward - b.reward) * multiplier;
  });

  const totalPages = Math.ceil(sortedDisputes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedDisputes.length);
  const paginatedDisputes = sortedDisputes.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, typeFilter, sortBy, sortOrder, searchId]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateIntl = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels = {
      active: t('uma.disputeResolution.statusActive'),
      resolved: t('uma.disputeResolution.statusResolved'),
      rejected: t('uma.disputeResolution.statusRejected'),
    };
    return (
      <span
        className={`px-2.5 py-1 text-xs font-medium  border ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  // 获取争议类型图标
  const getTypeIcon = (type: DisputeType, className = 'w-3.5 h-3.5') => {
    switch (type) {
      case 'price':
        return <PriceDisputeIcon className={className} />;
      case 'state':
        return <StateDisputeIcon className={className} />;
      case 'liquidation':
        return <LiquidationDisputeIcon className={className} />;
      case 'other':
        return <OtherDisputeIcon className={className} />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: DisputeType) => {
    const styles = DisputeTypeStyles[type];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium  border ${styles.bgColor} ${styles.color} ${styles.borderColor} ${styles.hoverBgColor} transition-colors duration-200`}
      >
        {getTypeIcon(type, 'w-3.5 h-3.5')}
        {typeLabels[type]}
      </span>
    );
  };

  return (
    <DashboardCard title={t('uma.disputeResolution.disputeList')}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">
              {t('uma.disputeResolution.filterByStatus')}:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300  focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('uma.disputeResolution.allStatus')}</option>
              <option value="active">{t('uma.disputeResolution.statusActive')}</option>
              <option value="resolved">{t('uma.disputeResolution.statusResolved')}</option>
              <option value="rejected">{t('uma.disputeResolution.statusRejected')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t('disputeResolution.filterByType')}:</label>
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as DisputeType | 'all')}
                className="px-3 py-1.5 pl-9 text-sm border border-gray-300  focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[120px]"
              >
                <option value="all">{t('validatorPanel.all')}</option>
                <option value="price">{t('uma.disputeTypes.price')}</option>
                <option value="state">{t('uma.disputeTypes.state')}</option>
                <option value="liquidation">{t('uma.disputeTypes.liquidation')}</option>
                <option value="other">{t('uma.disputeTypes.other')}</option>
              </select>
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {typeFilter === 'all' ? (
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <span className={DisputeTypeStyles[typeFilter].color}>
                    {getTypeIcon(typeFilter, 'w-4 h-4')}
                  </span>
                )}
              </div>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t('uma.disputeResolution.sortBy')}:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'reward')}
              className="px-3 py-1.5 text-sm border border-gray-300  focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="timestamp">{t('uma.disputeResolution.timestamp')}</option>
              <option value="reward">{t('uma.disputeResolution.reward')}</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 text-sm border border-gray-300  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-600">{t('disputeResolution.searchId')}:</label>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={t('disputeResolution.enterDisputeId')}
              className="px-3 py-1.5 text-sm border border-gray-300  focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
            {searchId && (
              <button
                onClick={() => setSearchId('')}
                className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100  transition-colors"
              >
                {t('disputeResolution.clear')}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('uma.disputeResolution.disputeId')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('uma.disputeResolution.timestamp')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('uma.disputeResolution.status')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('disputeResolution.type')}
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('disputeResolution.reward')} (UMA)
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('disputeResolution.transaction')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDisputes.map((dispute) => (
                <tr
                  key={dispute.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-mono text-gray-900">{dispute.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(dispute.timestamp)}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(dispute.status)}</td>
                  <td className="py-3 px-4">{getTypeBadge(dispute.type)}</td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                    {dispute.reward.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <a
                      href={`https://etherscan.io/tx/${dispute.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50  transition-colors"
                      title={t('disputeResolution.viewOnChain')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedDisputes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t('uma.disputeResolution.noDisputes')}
          </div>
        )}

        {sortedDisputes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-sm text-gray-500">
              {t('disputeResolution.showing', {
                start: startIndex + 1,
                end: endIndex,
                total: sortedDisputes.length,
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 text-sm border border-gray-300  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('disputeResolution.firstPage')}
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 text-sm border border-gray-300  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('disputeResolution.previousPage')}
                </button>

                <div className="flex items-center gap-1 mx-2">
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => goToPage(page as number)}
                        className={`w-8 h-8 text-sm  focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 text-sm border border-gray-300  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('disputeResolution.nextPage')}
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 text-sm border border-gray-300  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('disputeResolution.lastPage')}
                </button>

                <div className="flex items-center gap-2 ml-3">
                  <span className="text-sm text-gray-600">{t('disputeResolution.jumpTo')}</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        goToPage(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseInt((e.target as HTMLInputElement).value);
                        if (!isNaN(value)) {
                          goToPage(value);
                        }
                      }
                    }}
                    className="w-14 px-2 py-1 text-sm border border-gray-300  focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <span className="text-sm text-gray-600">{t('disputeResolution.page')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

export function DisputeResolutionPanel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [trends, setTrends] = useState<DisputeTrend[]>([]);
  const [overview, setOverview] = useState<DisputeOverview | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [relativeTime, setRelativeTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [votingData, setVotingData] = useState<DisputeVotingData | null>(null);
  const [realtimeNotifications, setRealtimeNotifications] = useState<UMADisputeUpdate[]>([]);
  const [showNotifications, setShowNotifications] = useState(true);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [disputesData, trendsData] = await Promise.all([
        umaClient.getDisputes(),
        umaClient.getDisputeTrends(),
      ]);

      // 为趋势数据添加类型分组信息
      const trendsWithType = trendsData.map((trend) => {
        const dateDisputes = disputesData.filter((d) => {
          const disputeDate = new Date(d.timestamp).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          });
          return disputeDate === trend.date;
        });

        return {
          ...trend,
          byType: {
            price: dateDisputes.filter((d) => d.type === 'price').length,
            state: dateDisputes.filter((d) => d.type === 'state').length,
            liquidation: dateDisputes.filter((d) => d.type === 'liquidation').length,
            other: dateDisputes.filter((d) => d.type === 'other').length,
          },
        };
      });

      setDisputes(disputesData);
      setTrends(trendsWithType);

      const activeDisputes = disputesData.filter((d) => d.status === 'active').length;
      const resolvedDisputes = disputesData.filter((d) => d.status === 'resolved');
      const successRate =
        disputesData.length > 0 ? (resolvedDisputes.length / disputesData.length) * 100 : 0;

      const avgResolutionTime =
        resolvedDisputes.length > 0
          ? resolvedDisputes.reduce((sum, d) => sum + (d.resolutionTime || 0), 0) /
            resolvedDisputes.length
          : 0;

      setOverview({
        totalDisputes: disputesData.length,
        activeDisputes,
        successRate,
        avgResolutionTime,
      });

      // Generate mock voting data for demonstration
      setVotingData(generateMockVotingData(disputesData[0]?.id || 'dispute-1'));

      setLastUpdateTime(Date.now());
    } catch (error) {
      logger.error(
        'Failed to fetch dispute data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // UMA 实时争议数据订阅
  const {
    connectionStatus: disputeConnectionStatus,
    activeCount: realtimeActiveCount,
    resolvedCount: realtimeResolvedCount,
    rejectedCount: realtimeRejectedCount,
  } = useUMARealtimeDisputes({
    enabled: true,
    onDisputeUpdate: useCallback(
      (disputeUpdate: UMADisputeUpdate) => {
        // 添加通知
        setRealtimeNotifications((prev) => {
          const newNotifications = [disputeUpdate, ...prev].slice(0, 5); // 只保留最近5条
          return newNotifications;
        });

        // 更新争议列表
        setDisputes((prevDisputes) => {
          const existingIndex = prevDisputes.findIndex((d) => d.id === disputeUpdate.id);
          if (existingIndex >= 0) {
            // 更新现有争议
            const newDisputes = [...prevDisputes];
            newDisputes[existingIndex] = disputeUpdate;
            return newDisputes.sort((a, b) => b.timestamp - a.timestamp);
          } else {
            // 添加新争议
            return [disputeUpdate, ...prevDisputes].sort((a, b) => b.timestamp - a.timestamp);
          }
        });

        // 更新概览数据
        setOverview((prevOverview) => {
          if (!prevOverview) return null;

          const isNewDispute = !disputes.find((d) => d.id === disputeUpdate.id);
          const wasActive = disputeUpdate.previousStatus === 'active';
          const isNowActive = disputeUpdate.status === 'active';

          let activeDisputes = prevOverview.activeDisputes;
          let totalDisputes = prevOverview.totalDisputes;
          let successRate = prevOverview.successRate;

          if (isNewDispute && isNowActive) {
            activeDisputes++;
            totalDisputes++;
          } else if (wasActive && !isNowActive) {
            activeDisputes--;
          }

          // 重新计算成功率
          // Note: realtimeResolvedCount and realtimeRejectedCount are not available here
          // due to temporal dead zone. Calculate from dispute status instead.
          const resolvedDisputes = disputes.filter((d) => d.status === 'resolved').length;
          const rejectedDisputes = disputes.filter((d) => d.status === 'rejected').length;
          if (resolvedDisputes + rejectedDisputes > 0) {
            successRate = (resolvedDisputes / (resolvedDisputes + rejectedDisputes)) * 100;
          }

          return {
            ...prevOverview,
            activeDisputes,
            totalDisputes,
            successRate,
          };
        });

        setLastUpdateTime(Date.now());
      },
      [disputes]
    ),
  });

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

  // 自动清除通知
  useEffect(() => {
    if (realtimeNotifications.length === 0) return;

    const timer = setTimeout(() => {
      setRealtimeNotifications((prev) => prev.slice(0, -1));
    }, 10000); // 10秒后自动清除最旧的通知

    return () => clearTimeout(timer);
  }, [realtimeNotifications]);

  return (
    <div className="space-y-6">
      {/* 实时通知面板 */}
      {showNotifications && realtimeNotifications.length > 0 && (
        <div ref={notificationsRef} className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
          {realtimeNotifications.map((notification, index) => (
            <div
              key={`${notification.id}-${index}`}
              className={`p-4   border-l-4 animate-slide-in-right ${
                notification.updateType === 'new'
                  ? 'bg-blue-50 border-blue-500'
                  : notification.updateType === 'status_change'
                    ? notification.status === 'resolved'
                      ? 'bg-green-50 border-green-500'
                      : notification.status === 'rejected'
                        ? 'bg-red-50 border-red-500'
                        : 'bg-yellow-50 border-yellow-500'
                    : 'bg-gray-50 border-gray-500'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2  ${
                        notification.updateType === 'new'
                          ? 'bg-blue-500'
                          : notification.status === 'resolved'
                            ? 'bg-green-500'
                            : notification.status === 'rejected'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {notification.updateType === 'new'
                        ? '新争议'
                        : notification.updateType === 'status_change'
                          ? '状态变更'
                          : '争议更新'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">争议 ID: {notification.id}</p>
                  <p className="text-xs text-gray-600">
                    类型: {DisputeTypeLabels[notification.type]}
                  </p>
                  {notification.previousStatus && (
                    <p className="text-xs text-gray-600">
                      状态: {notification.previousStatus} → {notification.status}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    奖励: {notification.reward.toLocaleString()} UMA
                  </p>
                </div>
                <button
                  onClick={() =>
                    setRealtimeNotifications((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {lastUpdateTime && (
            <span className="text-sm text-gray-500">最后更新: {relativeTime}</span>
          )}
          {isRefreshing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin  h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm text-blue-600">刷新中...</span>
            </div>
          )}
          {/* 实时连接状态指示器 */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 ">
            <span
              className={`w-2 h-2  ${
                disputeConnectionStatus === 'connected'
                  ? 'bg-green-500 animate-pulse'
                  : disputeConnectionStatus === 'connecting' ||
                      disputeConnectionStatus === 'reconnecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-600">
              {disputeConnectionStatus === 'connected'
                ? '实时'
                : disputeConnectionStatus === 'connecting'
                  ? '连接中'
                  : disputeConnectionStatus === 'reconnecting'
                    ? '重连中'
                    : '断开'}
            </span>
          </div>
          {/* 实时统计 */}
          {disputeConnectionStatus === 'connected' && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 ">
                活跃: {realtimeActiveCount}
              </span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 ">
                已解决: {realtimeResolvedCount}
              </span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 ">
                已拒绝: {realtimeRejectedCount}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm  transition-colors ${
              showNotifications
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            通知
            {realtimeNotifications.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs ">
                {realtimeNotifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            刷新数据
          </button>
        </div>
      </div>

      <DisputeOverviewCard overview={overview} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DisputeTrendChart trends={trends} />
        <DisputeDistributionChart disputes={disputes} />
      </div>

      <DisputeEfficiencyAnalysis />

      {/* Dispute Amount Distribution Analysis */}
      <DisputeAmountDistribution />

      {/* Voting Distribution Panel */}
      {votingData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('uma.disputeResolution.votingDistribution') || '争议投票分布'}
            </h3>
            <span className="text-sm text-gray-500">争议 ID: {votingData.disputeId}</span>
          </div>
          <DisputeVotingPanel votingData={votingData} loading={loading} />
        </div>
      )}

      <DisputeTable disputes={disputes} />
    </div>
  );
}
