'use client';

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
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { safeDivide } from '../utils/helpers';

interface VRFStats {
  requests24h: number;
  successRate: number;
  avgResponseTime: number;
  gasUsed: number;
  activeSubscriptions: number;
  totalFunded: number;
}

interface VRFRequest {
  id: string;
  consumer: string;
  randomWords: string[];
  status: 'pending' | 'fulfilled' | 'failed';
  timestamp: Date;
  gasUsed?: number;
}

interface VRFSubscription {
  id: number;
  balance: number;
  consumers: number;
  owner: string;
}

interface UseCaseDistribution {
  name: string;
  percentage: number;
  count: number;
  icon: React.ReactNode;
  color: string;
}

const mockVRFStats: VRFStats = {
  requests24h: 45678,
  successRate: 99.92,
  avgResponseTime: 2.3,
  gasUsed: 125000000,
  activeSubscriptions: 2847,
  totalFunded: 4580000,
};

const mockRequests: VRFRequest[] = [
  {
    id: '0x1a2b3c4d...',
    consumer: '0x1234...5678',
    randomWords: ['0x8f7a...', '0x3c2d...'],
    status: 'fulfilled',
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
    gasUsed: 185000,
  },
  {
    id: '0x5e6f7g8h...',
    consumer: '0xabcd...efgh',
    randomWords: ['0x1a2b...'],
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 30),
  },
  {
    id: '0x9i0j1k2l...',
    consumer: '0x9876...5432',
    randomWords: ['0x5e6f...', '0x7g8h...', '0x9i0j...'],
    status: 'fulfilled',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    gasUsed: 210000,
  },
  {
    id: '0x3m4n5o6p...',
    consumer: '0xdef0...1234',
    randomWords: [],
    status: 'failed',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '0x7q8r9s0t...',
    consumer: '0x5555...6666',
    randomWords: ['0xc1d2...'],
    status: 'fulfilled',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    gasUsed: 175000,
  },
];

const mockSubscriptions: VRFSubscription[] = [
  { id: 1234, balance: 125.5, consumers: 8, owner: '0xabcd...efgh' },
  { id: 5678, balance: 89.2, consumers: 5, owner: '0x1234...5678' },
  { id: 9012, balance: 256.8, consumers: 12, owner: '0x9876...5432' },
  { id: 3456, balance: 45.3, consumers: 3, owner: '0xdef0...1234' },
];

const useCaseDistribution: UseCaseDistribution[] = [
  {
    name: 'NFT Minting',
    percentage: 42,
    count: 19185,
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    name: 'Gaming',
    percentage: 28,
    count: 12790,
    icon: <Gamepad2 className="w-4 h-4" />,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    name: 'Lottery',
    percentage: 18,
    count: 8222,
    icon: <Gift className="w-4 h-4" />,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    name: 'Others',
    percentage: 12,
    count: 5481,
    icon: <MoreHorizontal className="w-4 h-4" />,
    color: 'text-gray-600 bg-gray-50',
  },
];

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

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('vrf.requestStats')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dice5 className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-500">
                {t('vrf.requests24h')}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(mockVRFStats.requests24h)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-500">
                {t('vrf.successRate')}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">{mockVRFStats.successRate}%</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500">
                {t('vrf.avgResponseTime')}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {mockVRFStats.avgResponseTime}s
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-gray-500">{t('vrf.gasUsed')}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatGas(mockVRFStats.gasUsed)}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('vrf.subscriptionOverview')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500">
                {t('vrf.activeSubscriptions')}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(mockVRFStats.activeSubscriptions)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-500">
                {t('vrf.totalFunded')}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatCurrency(mockVRFStats.totalFunded)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-500">{t('vrf.avgBalance')}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatCurrency(safeDivide(mockVRFStats.totalFunded, mockVRFStats.activeSubscriptions))}
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">{t('vrf.subscriptionId')}</div>
            <div className="col-span-3">{t('vrf.owner')}</div>
            <div className="col-span-3 text-right">{t('vrf.balance')}</div>
            <div className="col-span-4 text-right">
              {t('vrf.consumers')}
            </div>
          </div>
          {mockSubscriptions.map((sub, index) => (
            <div
              key={sub.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                index !== mockSubscriptions.length - 1 ? 'border-b border-gray-100' : ''
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
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('vrf.recentRequests')}
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">{t('vrf.requestId')}</div>
            <div className="col-span-2">{t('vrf.consumer')}</div>
            <div className="col-span-2 text-center">{t('vrf.randomWords')}</div>
            <div className="col-span-2 text-right">{t('vrf.gasUsed')}</div>
            <div className="col-span-3 text-center">{t('vrf.status')}</div>
          </div>
          {mockRequests.map((req, index) => (
            <div
              key={req.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                index !== mockRequests.length - 1 ? 'border-b border-gray-100' : ''
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

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('vrf.useCaseDistribution')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCaseDistribution.map((useCase) => (
            <div
              key={useCase.name}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${useCase.color}`}>{useCase.icon}</div>
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

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('vrf.v2_5Features')}
        </h3>
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
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('vrf.feature3Desc')}
              </p>
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
