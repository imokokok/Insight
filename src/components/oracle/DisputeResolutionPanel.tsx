'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { UMAClient, DisputeData } from '@/lib/oracles/uma';
import { DashboardCard } from './DashboardCard';
import { DisputeEfficiencyAnalysis } from './DisputeEfficiencyAnalysis';

const umaClient = new UMAClient();

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒前`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分钟前`;
  } else {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}小时前`;
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
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
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
            strokeLinecap="round"
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
            strokeLinecap="round"
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
            strokeLinecap="round"
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{stat.label}</p>
              <p className="text-gray-900 text-2xl font-bold">{stat.value}</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DisputeTrendChart({ trends }: { trends: DisputeTrend[] }) {
  const { t } = useI18n();

  const maxValue = Math.max(...trends.flatMap((d) => [d.filed, d.resolved]));

  const getHeight = (value: number) => {
    return (value / maxValue) * 100;
  };

  return (
    <DashboardCard title={t('uma.disputeResolution.disputeTrends')}>
      <div className="space-y-4">
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              {t('uma.disputeResolution.filedDisputes')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              {t('uma.disputeResolution.resolvedDisputes')}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 h-48">
          {trends.map((trend, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center gap-1 h-40">
                <div
                  className="w-3 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${getHeight(trend.filed)}%` }}
                  title={`${t('uma.disputeResolution.filedDisputes')}: ${trend.filed}`}
                ></div>
                <div
                  className="w-3 bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                  style={{ height: `${getHeight(trend.resolved)}%` }}
                  title={`${t('uma.disputeResolution.resolvedDisputes')}: ${trend.resolved}`}
                ></div>
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
        <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
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
                <div className={`w-3 h-3 ${segment.color} rounded-full`}></div>
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
  const [sortBy, setSortBy] = useState<'timestamp' | 'reward'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchId, setSearchId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const filteredDisputes = disputes.filter((dispute) => {
    if (filter !== 'all' && dispute.status !== filter) return false;
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
  }, [filter, sortBy, sortOrder, searchId]);

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
        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
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
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('uma.disputeResolution.allStatus')}</option>
              <option value="active">{t('uma.disputeResolution.statusActive')}</option>
              <option value="resolved">{t('uma.disputeResolution.statusResolved')}</option>
              <option value="rejected">{t('uma.disputeResolution.statusRejected')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t('uma.disputeResolution.sortBy')}:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'reward')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="timestamp">{t('uma.disputeResolution.timestamp')}</option>
              <option value="reward">{t('uma.disputeResolution.reward')}</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-600">搜索ID:</label>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="输入争议ID"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
            {searchId && (
              <button
                onClick={() => setSearchId('')}
                className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                清除
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
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('uma.disputeResolution.reward')} (UMA)
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
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                    {dispute.reward.toLocaleString()}
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
              显示 {startIndex + 1}-{endIndex} 条，共 {sortedDisputes.length} 条
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  首页
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
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
                        className={`w-8 h-8 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  末页
                </button>

                <div className="flex items-center gap-2 ml-3">
                  <span className="text-sm text-gray-600">跳转至</span>
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
                    className="w-14 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <span className="text-sm text-gray-600">页</span>
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

      setDisputes(disputesData);
      setTrends(trendsData);

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

      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Failed to fetch dispute data:', error);
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
      setRelativeTime(formatRelativeTime(lastUpdateTime));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {lastUpdateTime && (
            <span className="text-sm text-gray-500">最后更新: {relativeTime}</span>
          )}
          {isRefreshing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm text-blue-600">刷新中...</span>
            </div>
          )}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          刷新数据
        </button>
      </div>

      <DisputeOverviewCard overview={overview} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DisputeTrendChart trends={trends} />
        <DisputeDistributionChart disputes={disputes} />
      </div>

      <DisputeEfficiencyAnalysis />

      <DisputeTable disputes={disputes} />
    </div>
  );
}
