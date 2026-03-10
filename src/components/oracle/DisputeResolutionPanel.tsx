'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { UMAClient, DisputeData } from '@/lib/oracles/uma';
import { DashboardCard } from './DashboardCard';
import { DisputeEfficiencyAnalysis } from './DisputeEfficiencyAnalysis';

const umaClient = new UMAClient();

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
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
          >
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
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                {stat.label}
              </p>
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
            <span className="text-sm text-gray-600">{t('uma.disputeResolution.filedDisputes')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">{t('uma.disputeResolution.resolvedDisputes')}</span>
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

  const filteredDisputes = disputes.filter((dispute) => {
    if (filter === 'all') return true;
    return dispute.status === filter;
  });

  const sortedDisputes = [...filteredDisputes].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'timestamp') {
      return (a.timestamp - b.timestamp) * multiplier;
    }
    return (a.reward - b.reward) * multiplier;
  });

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
            <label className="text-sm text-gray-600">{t('uma.disputeResolution.filterByStatus')}:</label>
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
              {sortedDisputes.slice(0, 10).map((dispute) => (
                <tr
                  key={dispute.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-mono text-gray-900">
                    {dispute.id}
                  </td>
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

        {sortedDisputes.length > 10 && (
          <div className="text-center text-sm text-gray-500 pt-2">
            {`Showing first 10 of ${sortedDisputes.length} disputes`}
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [disputesData, trendsData] = await Promise.all([
          umaClient.getDisputes(),
          umaClient.getDisputeTrends(),
        ]);

        setDisputes(disputesData);
        setTrends(trendsData);

        const activeDisputes = disputesData.filter((d) => d.status === 'active').length;
        const resolvedDisputes = disputesData.filter((d) => d.status === 'resolved');
        const successRate =
          disputesData.length > 0
            ? (resolvedDisputes.length / disputesData.length) * 100
            : 0;

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
      } catch (error) {
        console.error('Failed to fetch dispute data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
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
