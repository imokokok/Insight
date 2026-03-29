'use client';

import {
  Code,
  Terminal,
  Lock,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Fuel,
  TrendingUp,
  Cpu,
  Database,
  Shield,
  Zap,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

interface FunctionsStats {
  totalCalls: number;
  successRate: number;
  avgExecutionTime: number;
  supportedApis: number;
}

interface FunctionExecution {
  id: string;
  sourceHash: string;
  result: string;
  gasUsed: number;
  status: 'success' | 'failed';
  timestamp: Date;
}

interface SecretStatus {
  id: string;
  encrypted: boolean;
  expiresAt: Date;
}

interface UseCaseDistribution {
  name: string;
  percentage: number;
  count: number;
  icon: React.ReactNode;
  color: string;
}

const mockFunctionsStats: FunctionsStats = {
  totalCalls: 128456,
  successRate: 99.87,
  avgExecutionTime: 1.8,
  supportedApis: 245,
};

const mockExecutions: FunctionExecution[] = [
  {
    id: '0xf8a9b2c1...',
    sourceHash: '0x1a2b3c4d5e6f...',
    result: '0x8f7a6b5c...',
    gasUsed: 156000,
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: '0xe7d8c9b0...',
    sourceHash: '0x2b3c4d5e6f7a...',
    result: '0x9a8b7c6d...',
    gasUsed: 189000,
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '0xd6c7b8a9...',
    sourceHash: '0x3c4d5e6f7a8b...',
    result: '',
    gasUsed: 0,
    status: 'failed',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '0xc5b6a798...',
    sourceHash: '0x4d5e6f7a8b9c...',
    result: '0xa9b8c7d6...',
    gasUsed: 142000,
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
  },
  {
    id: '0xb4a59687...',
    sourceHash: '0x5e6f7a8b9c1d...',
    result: '0xb1c2d3e4...',
    gasUsed: 178000,
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 18),
  },
];

const mockSecrets: SecretStatus[] = [
  {
    id: 'secret-001',
    encrypted: true,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  },
  {
    id: 'secret-002',
    encrypted: true,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
  },
  {
    id: 'secret-003',
    encrypted: true,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: 'secret-004',
    encrypted: false,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
  },
];

const useCaseDistribution: UseCaseDistribution[] = [
  {
    name: 'DeFi Integration',
    percentage: 38,
    count: 48813,
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    name: 'AI/ML Oracles',
    percentage: 27,
    count: 34683,
    icon: <Cpu className="w-4 h-4" />,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    name: 'Real-world Data',
    percentage: 22,
    count: 28260,
    icon: <Globe className="w-4 h-4" />,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    name: 'Custom Price Feeds',
    percentage: 13,
    count: 16700,
    icon: <Database className="w-4 h-4" />,
    color: 'text-amber-600 bg-amber-50',
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

function formatGas(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
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

function formatDaysUntil(date: Date): string {
  const days = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function ChainlinkFunctionsView() {
  const t = useTranslations('chainlink');

  const getStatusIcon = (status: FunctionExecution['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: FunctionExecution['status']) => {
    switch (status) {
      case 'success':
        return 'text-emerald-600 bg-emerald-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
    }
  };

  const getStatusLabel = (status: FunctionExecution['status']) => {
    switch (status) {
      case 'success':
        return t('functions.success') || 'Success';
      case 'failed':
        return t('functions.failed') || 'Failed';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('functions.executionStats') || 'Execution Statistics'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500">
                {t('functions.totalCalls') || 'Total Calls'}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(mockFunctionsStats.totalCalls)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-gray-500">
                {t('functions.successRate') || 'Success Rate'}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {mockFunctionsStats.successRate}%
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-500">
                {t('functions.avgExecutionTime') || 'Avg Execution Time'}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {mockFunctionsStats.avgExecutionTime}s
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-gray-500">
                {t('functions.supportedApis') || 'Supported APIs'}
              </span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {mockFunctionsStats.supportedApis}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('functions.recentExecutions') || 'Recent Executions'}
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">{t('functions.requestId') || 'Request ID'}</div>
            <div className="col-span-3">{t('functions.sourceHash') || 'Source Hash'}</div>
            <div className="col-span-2 text-center">{t('functions.result') || 'Result'}</div>
            <div className="col-span-2 text-right">{t('functions.gasUsed') || 'Gas Used'}</div>
            <div className="col-span-2 text-center">{t('functions.status') || 'Status'}</div>
          </div>
          {mockExecutions.map((exec, index) => (
            <div
              key={exec.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                index !== mockExecutions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="col-span-3">
                <span className="text-sm font-mono text-gray-600">{exec.id}</span>
                <div className="text-xs text-gray-400">{formatTimeAgo(exec.timestamp)}</div>
              </div>
              <div className="col-span-3">
                <span className="text-sm font-mono text-gray-600">{exec.sourceHash}</span>
              </div>
              <div className="col-span-2 text-center">
                {exec.result ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {exec.result.substring(0, 10)}...
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm text-gray-900">
                  {exec.gasUsed > 0 ? formatGas(exec.gasUsed) : '-'}
                </span>
              </div>
              <div className="col-span-2 text-center">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    exec.status
                  )}`}
                >
                  {getStatusIcon(exec.status)}
                  <span>{getStatusLabel(exec.status)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('functions.secretsManagement') || 'Secrets Management'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockSecrets.map((secret) => (
            <div
              key={secret.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock
                    className={`w-4 h-4 ${secret.encrypted ? 'text-emerald-600' : 'text-amber-600'}`}
                  />
                  <span className="text-sm font-medium text-gray-900">{secret.id}</span>
                </div>
                {secret.encrypted ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    {t('functions.encrypted') || 'Encrypted'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    {t('functions.unencrypted') || 'Unencrypted'}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {t('functions.expiresAt') || 'Expires'}: {formatDaysUntil(secret.expiresAt)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('functions.useCaseDistribution') || 'Use Case Distribution'}
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
                {formatNumber(useCase.count)} {t('functions.calls') || 'calls'}
              </div>
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: `${useCase.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('functions.features') || 'Key Features'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="flex items-start gap-3">
            <Code className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('functions.feature1Title') || 'Custom JavaScript'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('functions.feature1Desc') ||
                  'Write custom JavaScript code to fetch and process data from any API endpoint.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('functions.feature2Title') || 'Decentralized Execution'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('functions.feature2Desc') ||
                  'Functions are executed by multiple independent node operators for security and reliability.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('functions.feature3Title') || 'Secrets Management'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('functions.feature3Desc') ||
                  'Securely store API keys and credentials with threshold encryption for sensitive data.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('functions.feature4Title') || 'Low Latency'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('functions.feature4Desc') ||
                  'Optimized execution pipeline ensures fast response times for time-sensitive applications.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('functions.feature5Title') || 'Any API Support'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('functions.feature5Desc') ||
                  'Connect to any HTTP API, including Web2 services, without traditional oracle limitations.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Fuel className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('functions.feature6Title') || 'Gas Efficient'}
              </span>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('functions.feature6Desc') ||
                  'Off-chain computation reduces on-chain gas costs while maintaining security guarantees.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
