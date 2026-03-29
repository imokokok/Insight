'use client';

import { useState } from 'react';

import {
  Globe,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export interface CrossChainMetric {
  totalChains: number;
  totalRequests24h: number;
  successRate: number;
  avgLatency: number;
}

export interface ChainDistribution {
  chain: string;
  chainName: string;
  requestCount: number;
  percentage: number;
  color: string;
}

export interface CrossChainRoute {
  from: string;
  to: string;
  latency: number;
  successRate: number;
  dailyVolume: number;
}

export interface ContractAddress {
  chain: string;
  chainName: string;
  address: string;
  explorerUrl?: string;
}

export interface ChainSuccessRate {
  chain: string;
  chainName: string;
  successRate: number;
  requestCount: number;
}

export interface WinklinkCrossChainViewProps {
  metrics?: CrossChainMetric;
  chainDistribution?: ChainDistribution[];
  crossChainRoutes?: CrossChainRoute[];
  contractAddresses?: ContractAddress[];
  chainSuccessRates?: ChainSuccessRate[];
  isLoading?: boolean;
}

const defaultMetrics: CrossChainMetric = {
  totalChains: 3,
  totalRequests24h: 156789,
  successRate: 99.87,
  avgLatency: 2.3,
};

const defaultChainDistribution: ChainDistribution[] = [
  { chain: 'tron', chainName: 'TRON', requestCount: 89456, percentage: 57.1, color: 'bg-pink-500' },
  { chain: 'bnb', chainName: 'BNB Chain', requestCount: 52341, percentage: 33.4, color: 'bg-amber-500' },
  { chain: 'bttc', chainName: 'BTTC', requestCount: 14992, percentage: 9.5, color: 'bg-blue-500' },
];

const defaultCrossChainRoutes: CrossChainRoute[] = [
  { from: 'TRON', to: 'BNB Chain', latency: 2.1, successRate: 99.92, dailyVolume: 45678 },
  { from: 'BNB Chain', to: 'TRON', latency: 2.4, successRate: 99.85, dailyVolume: 38921 },
  { from: 'TRON', to: 'BTTC', latency: 1.8, successRate: 99.95, dailyVolume: 12345 },
];

const defaultContractAddresses: ContractAddress[] = [
  {
    chain: 'tron',
    chainName: 'TRON Mainnet',
    address: 'TXzx3e9DgpyTjHeRz3LqQ5J2j9N4fPvD2s',
    explorerUrl: 'https://tronscan.org/#/contract/TXzx3e9DgpyTjHeRz3LqQ5J2j9N4fPvD2s',
  },
  {
    chain: 'bnb',
    chainName: 'BNB Chain',
    address: '0x8A5d3F2E1b7C4d6A9B0E3F5C8D7A6B5E4F3C2D1A',
    explorerUrl: 'https://bscscan.com/address/0x8A5d3F2E1b7C4d6A9B0E3F5C8D7A6B5E4F3C2D1A',
  },
  {
    chain: 'bttc',
    chainName: 'BTTC',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    explorerUrl: 'https://bttcscan.com/address/0x1234567890abcdef1234567890abcdef12345678',
  },
];

const defaultChainSuccessRates: ChainSuccessRate[] = [
  { chain: 'tron', chainName: 'TRON', successRate: 99.92, requestCount: 89456 },
  { chain: 'bnb', chainName: 'BNB Chain', successRate: 99.78, requestCount: 52341 },
  { chain: 'bttc', chainName: 'BTTC', successRate: 99.95, requestCount: 14992 },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
      title={copied ? 'Copied!' : 'Copy address'}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

export function WinklinkCrossChainView({
  metrics = defaultMetrics,
  chainDistribution = defaultChainDistribution,
  crossChainRoutes = defaultCrossChainRoutes,
  contractAddresses = defaultContractAddresses,
  chainSuccessRates = defaultChainSuccessRates,
  isLoading = false,
}: WinklinkCrossChainViewProps) {
  const t = useTranslations();

  const statsData = [
    {
      label: t('winklink.crossChain.totalChains') || 'Total Chains',
      value: metrics.totalChains.toString(),
      icon: Globe,
      change: null,
      trend: null,
    },
    {
      label: t('winklink.crossChain.totalRequests24h') || 'Total Requests (24h)',
      value: metrics.totalRequests24h.toLocaleString(),
      icon: ArrowRightLeft,
      change: '+12%',
      trend: 'up',
    },
    {
      label: t('winklink.crossChain.successRate') || 'Cross-chain Success Rate',
      value: `${metrics.successRate}%`,
      icon: CheckCircle,
      change: '+0.2%',
      trend: 'up',
    },
    {
      label: t('winklink.crossChain.avgLatency') || 'Avg Latency',
      value: `${metrics.avgLatency}s`,
      icon: Clock,
      change: '-8%',
      trend: 'down',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-2">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">{stat.value}</p>
                {stat.change && (
                  <div
                    className={`flex items-center gap-0.5 text-sm font-medium ${
                      stat.trend === 'up' ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    <TrendIcon className="w-3.5 h-3.5" />
                    <span>{stat.change}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('winklink.crossChain.chainDistribution') || 'Chain Distribution'}
          </h3>
          <div className="space-y-4">
            {chainDistribution.map((chain) => (
              <div key={chain.chain} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{chain.chainName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {chain.requestCount.toLocaleString()} requests
                    </span>
                    <span className="text-sm font-medium text-gray-900">{chain.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${chain.color}`}
                    style={{ width: `${chain.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t('winklink.crossChain.totalRequests') || 'Total Requests'}
              </span>
              <span className="font-medium text-gray-900">
                {chainDistribution.reduce((sum, c) => sum + c.requestCount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('winklink.crossChain.crossChainRoutes') || 'Cross-chain Data Transfer Metrics'}
          </h3>
          <div className="space-y-4">
            {crossChainRoutes.map((route, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{route.from}</span>
                    <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{route.to}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {route.dailyVolume.toLocaleString()} {t('winklink.crossChain.dailyVolume') || 'daily'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {t('winklink.crossChain.latency') || 'Latency'}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{route.latency}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {t('winklink.crossChain.successRate') || 'Success Rate'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">{route.successRate}%</p>
                      {route.successRate >= 99.9 && (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-5">
          {t('winklink.crossChain.contractAddresses') || 'Smart Contract Addresses'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contractAddresses.map((contract) => (
            <div
              key={contract.chain}
              className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{contract.chainName}</span>
                <CopyButton text={contract.address} />
              </div>
              <p className="text-xs font-mono text-gray-600 break-all">{contract.address}</p>
              {contract.explorerUrl && (
                <a
                  href={contract.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-pink-600 hover:text-pink-700 mt-2 inline-block"
                >
                  {t('winklink.crossChain.viewOnExplorer') || 'View on Explorer'} →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-5">
          {t('winklink.crossChain.successRateIndicators') || 'Cross-chain Success Rate Indicators'}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 bg-gradient-to-br from-pink-50 to-white rounded-xl border border-pink-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">
                {t('winklink.crossChain.overallSuccessRate') || 'Overall Success Rate'}
              </span>
              <span className="text-2xl font-bold text-pink-600">{metrics.successRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-pink-500 to-pink-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${metrics.successRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {t('winklink.crossChain.overallDesc') ||
                'Based on all cross-chain transactions in the last 30 days'}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">
              {t('winklink.crossChain.perChainBreakdown') || 'Per-chain Success Rate Breakdown'}
            </h4>
            {chainSuccessRates.map((chain) => (
              <div key={chain.chain} className="flex items-center gap-4">
                <div className="w-24 flex-shrink-0">
                  <span className="text-sm text-gray-600">{chain.chainName}</span>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        chain.successRate >= 99.9
                          ? 'bg-emerald-500'
                          : chain.successRate >= 99
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${chain.successRate}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className="text-sm font-medium text-gray-900">{chain.successRate}%</span>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{t('winklink.crossChain.legend') || 'Legend'}:</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{'≥99.9%'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{'≥99%'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{'<99%'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
