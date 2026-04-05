'use client';

import { useState, useEffect } from 'react';

import {
  Zap,
  Dice5,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  Fuel,
  Users,
  Wallet,
  Gift,
  Gamepad2,
  Sparkles,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { getChainlinkService } from '../services/chainlinkService';
import type { VRFStats, VRFRequest, VRFSubscription, UseCaseDistribution } from '../data';
import { safeDivide } from '../utils/helpers';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatCurrency(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num}`;
}

function formatGas(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  return formatNumber(num);
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ChainlinkVRFView() {
  const t = useTranslations('chainlink');

  const [stats, setStats] = useState<VRFStats | null>(null);
  const [requests, setRequests] = useState<VRFRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<VRFSubscription[]>([]);
  const [useCaseDistribution, setUseCaseDistribution] = useState<UseCaseDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const service = getChainlinkService();
        const [vrfStats, reqs, subs, useCases] = await Promise.all([
          service.getVRFStats().catch(() => null),
          service.getVRFRequests().catch(() => []),
          service.getVRFSubscriptions().catch(() => []),
          service.getUseCaseDistribution().catch(() => []),
        ]);
        setStats(vrfStats);
        setRequests(reqs);
        setSubscriptions(subs);
        setUseCaseDistribution(useCases);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load VRF data'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusIcon = (status: VRFRequest['status']) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: VRFRequest['status']) => {
    switch (status) {
      case 'fulfilled':
        return 'text-emerald-600 bg-emerald-50';
      case 'pending':
        return 'text-amber-600 bg-amber-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
    }
  };

  const getStatusLabel = (status: VRFRequest['status']) => {
    switch (status) {
      case 'fulfilled':
        return t('vrf.fulfilled');
      case 'pending':
        return t('vrf.pending');
      case 'failed':
        return t('vrf.failed');
    }
  };

  const getUseCaseIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'nft minting':
        return <Sparkles className="w-4 h-4" />;
      case 'gaming':
        return <Gamepad2 className="w-4 h-4" />;
      case 'lottery':
        return <Gift className="w-4 h-4" />;
      default:
        return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  const getUseCaseColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'nft minting':
        return 'text-purple-600 bg-purple-50';
      case 'gaming':
        return 'text-blue-600 bg-blue-50';
      case 'lottery':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">{t('common.loading')}</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('vrf.dataUnavailable')}</h3>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {stats && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('vrf.requestStats')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Dice5 className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-500">{t('vrf.requests24h')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(stats.requests24h)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-gray-500">{t('vrf.successRate')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">{stats.successRate}%</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500">{t('vrf.avgResponseTime')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {stats.avgResponseTime}s
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-gray-500">{t('vrf.gasUsed')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {formatGas(stats.gasUsed)}
              </div>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('vrf.subscriptionOverview')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500">{t('vrf.activeSubscriptions')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(stats.activeSubscriptions)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-gray-500">{t('vrf.totalFunded')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {formatCurrency(stats.totalFunded)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-500">{t('vrf.avgBalance')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {formatCurrency(
                  safeDivide(stats.totalFunded, stats.activeSubscriptions)
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {subscriptions.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">{t('vrf.subscriptionId')}</div>
            <div className="col-span-3">{t('vrf.owner')}</div>
            <div className="col-span-3 text-right">{t('vrf.balance')}</div>
            <div className="col-span-4 text-right">{t('vrf.consumers')}</div>
          </div>
          {subscriptions.map((sub, index) => (
            <div
              key={sub.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                index !== subscriptions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="col-span-2">
                <span className="text-sm font-medium text-gray-900">#{sub.id}</span>
              </div>
              <div className="col-span-3">
                <span className="text-sm font-mono text-gray-600">{sub.owner}</span>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {sub.balance.toFixed(2)}
                </span>
              </div>
              <div className="col-span-4 text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {sub.consumers} {t('vrf.contracts')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {requests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('vrf.recentRequests')}</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">{t('vrf.requestId')}</div>
              <div className="col-span-2">{t('vrf.consumer')}</div>
              <div className="col-span-2 text-center">{t('vrf.randomWords')}</div>
              <div className="col-span-2 text-right">{t('vrf.gasUsed')}</div>
              <div className="col-span-3 text-center">{t('vrf.status')}</div>
            </div>
            {requests.map((req, index) => (
              <div
                key={req.id}
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                  index !== requests.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="col-span-3">
                  <span className="text-sm font-mono text-gray-600">{req.id}</span>
                  <div className="text-xs text-gray-400">{formatTimeAgo(req.timestamp)}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-mono text-gray-600">{req.consumer}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {req.randomWords.length > 0 ? `${req.randomWords.length} words` : '-'}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-900">
                    {req.gasUsed ? formatNumber(req.gasUsed) : '-'}
                  </span>
                </div>
                <div className="col-span-3 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      req.status
                    )}`}
                  >
                    {getStatusIcon(req.status)}
                    <span>{getStatusLabel(req.status)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {useCaseDistribution.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('vrf.useCaseDistribution')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {useCaseDistribution.map((useCase) => (
              <div
                key={useCase.name}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${getUseCaseColor(useCase.name)}`}>
                    {getUseCaseIcon(useCase.name)}
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{useCase.percentage}%</span>
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">{useCase.name}</div>
                <div className="text-xs text-gray-500">
                  {formatNumber(useCase.count)} {t('vrf.requests')}
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    style={{ width: `${useCase.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!stats && !requests.length && !subscriptions.length && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Dice5 className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('vrf.noDataAvailable')}</h3>
          <p className="text-sm text-gray-500">{t('vrf.noDataDesc')}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('vrf.v2_5Features')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="flex items-start gap-3">
            <Wallet className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('vrf.feature1Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('vrf.feature1Desc') ||
                  'Pay for VRF requests directly with LINK tokens without wrapping or additional conversions.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Dice5 className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('vrf.feature2Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('vrf.feature2Desc') ||
                  'Request multiple random numbers in a single on-chain transaction for improved efficiency.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Fuel className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('vrf.feature3Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">{t('vrf.feature3Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('vrf.feature4Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('vrf.feature4Desc') ||
                  'Optimized coordinator contracts for reduced latency and faster random number delivery.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('vrf.feature5Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('vrf.feature5Desc') ||
                  'Cryptographic proof verification ensures randomness cannot be manipulated by any party.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('vrf.feature6Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('vrf.feature6Desc') ||
                  'Manage funds and consumer contracts efficiently through subscription-based billing.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
