'use client';

import { useState, useEffect } from 'react';

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
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { getChainlinkService, type FunctionsUseCase } from '../services/chainlinkService';

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

interface FunctionsUseCaseDisplay {
  name: string;
  percentage: number;
  count: number;
  icon: React.ReactNode;
  color: string;
}

interface FunctionsData {
  stats: FunctionsStats | null;
  executions: FunctionExecution[];
  secrets: SecretStatus[];
  useCases: FunctionsUseCaseDisplay[];
}

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
  const [data, setData] = useState<FunctionsData>({
    stats: null,
    executions: [],
    secrets: [],
    useCases: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const service = getChainlinkService();
        const [stats, executions, secrets, useCasesRaw] = await Promise.all([
          service.getFunctionsStats().catch(() => null),
          service.getFunctionExecutions().catch(() => []),
          service.getFunctionSecrets().catch(() => []),
          service.getFunctionsUseCases().catch(() => []),
        ]);
        // Convert FunctionsUseCase to FunctionsUseCaseDisplay
        const useCases: FunctionsUseCaseDisplay[] = (useCasesRaw as FunctionsUseCase[]).map((uc) => ({
          name: uc.name,
          percentage: uc.percentage,
          count: uc.count,
          icon: getUseCaseIcon(uc.name),
          color: getUseCaseColor(uc.name),
        }));
        setData({ stats, executions, secrets, useCases });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load Functions data'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getUseCaseIcon = (name: string): React.ReactNode => {
    switch (name.toLowerCase()) {
      case 'data aggregation':
        return <Database className="w-4 h-4" />;
      case 'api integration':
        return <Globe className="w-4 h-4" />;
      case 'computation':
        return <Cpu className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getUseCaseColor = (name: string): string => {
    switch (name.toLowerCase()) {
      case 'data aggregation':
        return 'text-blue-600 bg-blue-50';
      case 'api integration':
        return 'text-green-600 bg-green-50';
      case 'computation':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

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
        return t('functions.success');
      case 'failed':
        return t('functions.failed');
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

  if (error && !data.stats) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('functions.dataUnavailable')}</h3>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data.stats && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('functions.executionStats')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500">{t('functions.totalCalls')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {formatNumber(data.stats.totalCalls)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-gray-500">{t('functions.successRate')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {data.stats.successRate}%
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-500">{t('functions.avgExecutionTime')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {data.stats.avgExecutionTime}s
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-gray-500">{t('functions.supportedApis')}</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                {data.stats.supportedApis}
              </div>
            </div>
          </div>
        </div>
      )}

      {data.executions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('functions.recentExecutions')}
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-3">{t('functions.requestId')}</div>
              <div className="col-span-3">{t('functions.sourceHash')}</div>
              <div className="col-span-2 text-center">{t('functions.result')}</div>
              <div className="col-span-2 text-right">{t('functions.gasUsed')}</div>
              <div className="col-span-2 text-center">{t('functions.status')}</div>
            </div>
            {data.executions.map((exec, index) => (
              <div
                key={exec.id}
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                  index !== data.executions.length - 1 ? 'border-b border-gray-100' : ''
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
      )}

      {data.secrets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('functions.secretsManagement')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.secrets.map((secret) => (
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
                      {t('functions.encrypted')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {t('functions.unencrypted')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {t('functions.expiresAt')}: {formatDaysUntil(secret.expiresAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.useCases.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('functions.useCaseDistribution')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.useCases.map((useCase) => (
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
                  {formatNumber(useCase.count)} {t('functions.calls')}
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
      )}

      {!data.stats && !data.executions.length && !data.secrets.length && !data.useCases.length && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Code className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('functions.noDataAvailable')}</h3>
          <p className="text-sm text-gray-500">{t('functions.noDataDesc')}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('functions.features')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="flex items-start gap-3">
            <Code className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-900 block mb-1">
                {t('functions.feature1Title')}
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
                {t('functions.feature2Title')}
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
                {t('functions.feature3Title')}
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
                {t('functions.feature4Title')}
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
                {t('functions.feature5Title')}
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
                {t('functions.feature6Title')}
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
