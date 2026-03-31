'use client';

import {
  ArrowRightLeft,
  Globe,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

interface CCIPStats {
  messages24h: number;
  valueTransferred24h: number;
  avgConfirmTime: number;
  activeChains: number;
  successRate: number;
}

interface CrossChainTransaction {
  id: string;
  sourceChain: string;
  destChain: string;
  type: 'message' | 'token';
  status: 'pending' | 'success' | 'failed';
  value?: number;
  timestamp: Date;
}

interface SupportedChain {
  name: string;
  logo: string;
  status: 'active' | 'coming_soon';
  messageSupported: boolean;
  tokenTransferSupported: boolean;
}

interface RMNStatus {
  nodesOnline: number;
  securityScore: number;
  lastCheck: Date;
  anomalies: number;
}

const mockCCIPStats: CCIPStats = {
  messages24h: 128456,
  valueTransferred24h: 89450000,
  avgConfirmTime: 12.5,
  activeChains: 12,
  successRate: 99.87,
};

const mockTransactions: CrossChainTransaction[] = [
  {
    id: '0x1a2b3c...',
    sourceChain: 'Ethereum',
    destChain: 'Arbitrum',
    type: 'token',
    status: 'success',
    value: 25000,
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: '0x4d5e6f...',
    sourceChain: 'Polygon',
    destChain: 'Ethereum',
    type: 'message',
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '0x7g8h9i...',
    sourceChain: 'Avalanche',
    destChain: 'Optimism',
    type: 'token',
    status: 'success',
    value: 15000,
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '0xj1k2l3...',
    sourceChain: 'BSC',
    destChain: 'Ethereum',
    type: 'token',
    status: 'failed',
    value: 5000,
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: '0xm4n5o6...',
    sourceChain: 'Ethereum',
    destChain: 'Base',
    type: 'message',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
];

const mockSupportedChains: SupportedChain[] = [
  {
    name: 'Ethereum',
    logo: '/chains/ethereum.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Arbitrum',
    logo: '/chains/arbitrum.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Optimism',
    logo: '/chains/optimism.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Polygon',
    logo: '/chains/polygon.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Avalanche',
    logo: '/chains/avalanche.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'BSC',
    logo: '/chains/bsc.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Base',
    logo: '/chains/base.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'BNB Chain',
    logo: '/chains/bnb.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'WEMIX',
    logo: '/chains/wemix.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: false,
  },
  {
    name: 'Metis',
    logo: '/chains/metis.svg',
    status: 'active',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'ZKsync',
    logo: '/chains/zksync.svg',
    status: 'coming_soon',
    messageSupported: true,
    tokenTransferSupported: true,
  },
  {
    name: 'Scroll',
    logo: '/chains/scroll.svg',
    status: 'coming_soon',
    messageSupported: true,
    tokenTransferSupported: false,
  },
];

const mockRMNStatus: RMNStatus = {
  nodesOnline: 24,
  securityScore: 98.5,
  lastCheck: new Date(Date.now() - 1000 * 30),
  anomalies: 0,
};

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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function ChainlinkCCIPView() {
  const t = useTranslations('chainlink');

  const getStatusIcon = (status: CrossChainTransaction['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: CrossChainTransaction['status']) => {
    switch (status) {
      case 'success':
        return 'text-emerald-600 bg-emerald-50';
      case 'pending':
        return 'text-amber-600 bg-amber-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('ccip.overview')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500">{t('ccip.messages24h')}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(mockCCIPStats.messages24h)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-500">{t('ccip.valueTransferred')}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatCurrency(mockCCIPStats.valueTransferred24h)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-500">{t('ccip.avgConfirmTime')}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {mockCCIPStats.avgConfirmTime}m
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-gray-500">{t('ccip.activeChains')}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">{mockCCIPStats.activeChains}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('ccip.supportedChains')}</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">{t('ccip.chainName')}</div>
            <div className="col-span-2 text-center">{t('ccip.status')}</div>
            <div className="col-span-3 text-center">{t('ccip.messaging')}</div>
            <div className="col-span-3 text-center">{t('ccip.tokenTransfer')}</div>
          </div>
          {mockSupportedChains.map((chain, index) => (
            <div
              key={chain.name}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                index !== mockSupportedChains.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">{chain.name}</span>
              </div>
              <div className="col-span-2 text-center">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    chain.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {chain.status === 'active' ? t('ccip.active') : t('ccip.comingSoon')}
                </span>
              </div>
              <div className="col-span-3 text-center">
                {chain.messageSupported ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-300 inline-block" />
                )}
              </div>
              <div className="col-span-3 text-center">
                {chain.tokenTransferSupported ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-300 inline-block" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('ccip.recentTransactions')}</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">{t('ccip.transactionId')}</div>
            <div className="col-span-2">{t('ccip.sourceChain')}</div>
            <div className="col-span-2">{t('ccip.destChain')}</div>
            <div className="col-span-1 text-center">{t('ccip.type')}</div>
            <div className="col-span-2 text-right">{t('ccip.value')}</div>
            <div className="col-span-2 text-center">{t('ccip.txStatus')}</div>
          </div>
          {mockTransactions.map((tx, index) => (
            <div
              key={tx.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                index !== mockTransactions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="col-span-3">
                <span className="text-sm font-mono text-gray-600">{tx.id}</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-gray-900">{tx.sourceChain}</span>
              </div>
              <div className="col-span-2">
                <span className="text-sm text-gray-900">{tx.destChain}</span>
              </div>
              <div className="col-span-1 text-center">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    tx.type === 'token'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {tx.type === 'token' ? 'Token' : 'Msg'}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-medium text-gray-900">
                  {tx.value ? formatCurrency(tx.value) : '-'}
                </span>
              </div>
              <div className="col-span-2 text-center">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    tx.status
                  )}`}
                >
                  {getStatusIcon(tx.status)}
                  <span className="capitalize">{tx.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('ccip.rmnStatus')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500">{t('ccip.nodesOnline')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-gray-900">
                {mockRMNStatus.nodesOnline}
              </span>
              <span className="text-xs text-gray-500">/ 24</span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-500">{t('ccip.securityScore')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-gray-900">
                {mockRMNStatus.securityScore}
              </span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-500">{t('ccip.lastCheck')}</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatTimeAgo(mockRMNStatus.lastCheck)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-gray-500">{t('ccip.anomalies')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-gray-900">{mockRMNStatus.anomalies}</span>
              {mockRMNStatus.anomalies === 0 && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('ccip.about')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('ccip.feature1Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('ccip.feature1Desc') ||
                  'Send arbitrary messages between smart contracts on different chains with guaranteed delivery.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('ccip.feature2Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('ccip.feature2Desc') ||
                  'Transfer tokens across chains using lock-and-mint or burn-and-mint mechanisms.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('ccip.feature3Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">{t('ccip.feature3Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('ccip.feature4Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('ccip.feature4Desc') ||
                  'Built-in rate limiting mechanisms to prevent network congestion and potential attacks.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('ccip.feature5Title')}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('ccip.feature5Desc') ||
                  'Support for major EVM chains including Ethereum, Arbitrum, Optimism, Polygon, and more.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
