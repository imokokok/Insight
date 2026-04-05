'use client';

import { useState, useMemo } from 'react';

import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import GaugeChart from '@/components/GaugeChart';
import { ProgressRing } from '@/components/oracle/charts/ProgressRing';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import type { CoveragePoolDetails, CoveragePoolClaim } from '@/lib/oracles/api3';

interface CoveragePoolDashboardProps {
  coveragePoolDetails?: CoveragePoolDetails | null;
  claims?: CoveragePoolClaim[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

export function CoveragePoolDashboard({
  coveragePoolDetails,
  claims = [],
  isLoading = false,
}: CoveragePoolDashboardProps) {
  const t = useTranslations();
  const [claimFilter, setClaimFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'amount' | 'submittedAt'>('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const getHealthStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          icon: <CheckCircle className="w-5 h-5" />,
          label: t('api3.coveragePool.healthy') || 'Healthy',
        };
      case 'warning':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: t('api3.coveragePool.warning') || 'Warning',
        };
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: t('api3.coveragePool.critical') || 'Critical',
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: <Shield className="w-5 h-5" />,
          label: t('api3.coveragePool.unknown') || 'Unknown',
        };
    }
  };

  const getClaimStatusConfig = (type: string) => {
    switch (type) {
      case 'pending':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          label: t('api3.coveragePool.claimPending') || 'Pending',
        };
      case 'processing':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: t('api3.coveragePool.claimProcessing') || 'Processing',
        };
      case 'approved':
        return {
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          label: t('api3.coveragePool.claimApproved') || 'Approved',
        };
      case 'rejected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: t('api3.coveragePool.claimRejected') || 'Rejected',
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: type,
        };
    }
  };

  const filteredClaims = useMemo(() => {
    let filtered = claims;
    if (claimFilter !== 'all') {
      filtered = claims.filter((claim) => claim.type === claimFilter);
    }

    return [...filtered].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'amount') {
        return multiplier * (a.amount - b.amount);
      }
      return multiplier * (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    });
  }, [claims, claimFilter, sortField, sortDirection]);

  const toggleSort = (field: 'amount' | 'submittedAt') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  const healthConfig = coveragePoolDetails
    ? getHealthStatusConfig(coveragePoolDetails.healthStatus)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.coveragePool.title') || 'Coverage Pool Dashboard'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.coveragePool.subtitle') ||
              'Real-time monitoring of coverage pool health and claims'}
          </p>
        </div>
        {healthConfig && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${healthConfig.bgColor} ${healthConfig.borderColor}`}
          >
            <span className={healthConfig.color}>{healthConfig.icon}</span>
            <span className={`text-sm font-medium ${healthConfig.color}`}>
              {healthConfig.label}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {t('api3.coveragePool.solvencyGauge') || 'Solvency Gauge'}
          </h3>
          <div className="flex justify-center">
            <GaugeChart
              value={coveragePoolDetails?.collateralizationRatio || 0}
              maxValue={200}
              label={t('api3.coveragePool.collateralizationRatio') || 'Collateralization Ratio'}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {t('api3.coveragePool.targetRatio') || 'Target Ratio'}
              </span>
              <span className="font-medium text-gray-900">
                {coveragePoolDetails?.targetCollateralization || 150}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    ((coveragePoolDetails?.collateralizationRatio || 0) /
                      (coveragePoolDetails?.targetCollateralization || 150)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {t('api3.coveragePool.keyMetrics') || 'Key Metrics'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">
                  {t('api3.coveragePool.totalValueLocked') || 'Total Value Locked'}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(coveragePoolDetails?.totalValueLocked || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500">
                <Users className="w-4 h-4" />
                <span className="text-xs">{t('api3.coveragePool.stakerCount') || 'Stakers'}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(coveragePoolDetails?.stakerCount || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs">
                  {t('api3.coveragePool.pendingClaims') || 'Pending Claims'}
                </span>
              </div>
              <p className="text-xl font-bold text-amber-600">
                {coveragePoolDetails?.pendingClaims || 0}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">
                  {t('api3.coveragePool.totalPayouts') || 'Total Payouts'}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(coveragePoolDetails?.totalPayouts || 0)}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-500 mb-3">
              {t('api3.coveragePool.healthIndicators') || 'Health Indicators'}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <ProgressRing
                  value={(coveragePoolDetails?.collateralizationRatio || 0) / 2}
                  max={100}
                  size={80}
                  strokeWidth={6}
                  color="#10b981"
                  formatValue={(v) => `${v.toFixed(0)}%`}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('api3.coveragePool.collateralHealth') || 'Collateral Health'}
                </p>
              </div>
              <div className="text-center">
                <ProgressRing
                  value={100 - (coveragePoolDetails?.pendingClaims || 0) * 10}
                  max={100}
                  size={80}
                  strokeWidth={6}
                  color="#3b82f6"
                  formatValue={(v) => `${Math.max(0, v).toFixed(0)}%`}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('api3.coveragePool.claimHealth') || 'Claim Health'}
                </p>
              </div>
              <div className="text-center">
                <ProgressRing
                  value={
                    coveragePoolDetails?.stakerCount
                      ? Math.min(coveragePoolDetails.stakerCount / 50, 100)
                      : 0
                  }
                  max={100}
                  size={80}
                  strokeWidth={6}
                  color="#8b5cf6"
                  formatValue={(v) => `${v.toFixed(0)}%`}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('api3.coveragePool.participation') || 'Participation'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">
            {t('api3.coveragePool.claimsList') || 'Claims Status'}
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={claimFilter}
              onChange={(e) => setClaimFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('api3.coveragePool.allClaims') || 'All Claims'}</option>
              <option value="pending">{t('api3.coveragePool.filterPending') || 'Pending'}</option>
              <option value="processing">
                {t('api3.coveragePool.filterProcessing') || 'Processing'}
              </option>
              <option value="approved">
                {t('api3.coveragePool.filterApproved') || 'Approved'}
              </option>
              <option value="rejected">
                {t('api3.coveragePool.filterRejected') || 'Rejected'}
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('api3.coveragePool.claimId') || 'ID'}
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('api3.coveragePool.claimStatus') || 'Status'}
                </th>
                <th
                  className="text-left text-xs font-medium text-gray-500 pb-3 cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    {t('api3.coveragePool.claimAmount') || 'Amount'}
                    {sortField === 'amount' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('api3.coveragePool.claimRequester') || 'Requester'}
                </th>
                <th
                  className="text-left text-xs font-medium text-gray-500 pb-3 cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('submittedAt')}
                >
                  <div className="flex items-center gap-1">
                    {t('api3.coveragePool.claimDate') || 'Date'}
                    {sortField === 'submittedAt' &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 pb-3">
                  {t('api3.coveragePool.claimVotes') || 'Votes'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.slice(0, 5).map((claim) => {
                const statusConfig = getClaimStatusConfig(claim.type);
                return (
                  <tr key={claim.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 text-sm font-mono text-gray-600">{claim.id}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(claim.amount)}
                    </td>
                    <td className="py-3 text-sm text-gray-600 font-mono">
                      {formatAddress(claim.requester)}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(claim.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600">+{formatNumber(claim.votesFor)}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-red-600">-{formatNumber(claim.votesAgainst)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>



      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          {t('api3.coveragePool.historicalPayouts') || 'Historical Payouts'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">
              {t('api3.coveragePool.totalProcessedClaims') || 'Total Processed Claims'}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {coveragePoolDetails?.processedClaims || 0}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">
              {t('api3.coveragePool.avgStakeAmount') || 'Average Stake Amount'}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(coveragePoolDetails?.avgStakeAmount || 0)} API3
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">
              {t('api3.coveragePool.lastUpdate') || 'Last Updated'}
            </p>
            <p className="text-lg font-medium text-gray-900">
              {coveragePoolDetails?.lastUpdateTime
                ? new Date(coveragePoolDetails.lastUpdateTime).toLocaleString()
                : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoveragePoolDashboard;
