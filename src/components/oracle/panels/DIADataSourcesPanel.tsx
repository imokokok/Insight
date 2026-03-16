'use client';

import { DataSourceTransparency, DataSourceVerification } from '@/lib/oracles/dia';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DIADataSourcesPanelProps {
  transparencyData: DataSourceTransparency[];
  verificationData: DataSourceVerification[];
}

export function DIADataSourcesPanel({
  transparencyData,
  verificationData,
}: DIADataSourcesPanelProps) {
  const t = useTranslations();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'exchange':
        return t('dia.dataSourceType.exchange');
      case 'defi_protocol':
        return t('dia.dataSourceType.defi');
      case 'aggregator':
        return t('dia.dataSourceType.aggregator');
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'suspended':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 90) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'pending':
        return (
          <svg
            className="w-5 h-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const verifiedCount = verificationData.filter((v) => v.status === 'verified').length;
  const pendingCount = verificationData.filter((v) => v.status === 'pending').length;
  const failedCount = verificationData.filter((v) => v.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Data Sources Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dia.dataSources.title')}</h3>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataTransparency.totalSources')}</p>
            <p className="text-2xl font-bold text-indigo-600">{transparencyData.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataTransparency.activeSources')}</p>
            <p className="text-2xl font-bold text-green-600">
              {transparencyData.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataTransparency.avgCredibility')}</p>
            <p className="text-2xl font-bold text-blue-600">
              {(
                transparencyData.reduce((acc, s) => acc + s.credibilityScore, 0) /
                transparencyData.length
              ).toFixed(1)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataSourceVerification.verified')}</p>
            <p className="text-2xl font-bold text-purple-600">{verifiedCount}</p>
          </div>
        </div>

        {/* Data Sources Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">
                  {t('dia.dataTransparency.sourceName')}
                </th>
                <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">
                  {t('dia.dataTransparency.type')}
                </th>
                <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">
                  {t('dia.dataTransparency.credibility')}
                </th>
                <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">
                  {t('dia.dataTransparency.status')}
                </th>
                <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">
                  {t('dia.dataTransparency.dataPoints')}
                </th>
                <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">
                  {t('dia.dataTransparency.verification')}
                </th>
              </tr>
            </thead>
            <tbody>
              {transparencyData.map((source) => (
                <tr key={source.sourceId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <div className="font-medium text-gray-900">{source.name}</div>
                    <div className="text-xs text-gray-500">{source.sourceId}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      {getTypeLabel(source.type)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-semibold ${getCredibilityColor(source.credibilityScore)}`}
                    >
                      {source.credibilityScore}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(source.status)}`} />
                      <span className="text-sm text-gray-700 capitalize">{source.status}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-700">
                    {source.dataPoints.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600">{source.verificationMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Records */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dia.dataSourceVerification.title')}
        </h3>

        {/* Verification Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataSourceVerification.verified')}</p>
            <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataSourceVerification.pending')}</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataSourceVerification.failed')}</p>
            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          </div>
        </div>

        {/* Verification List */}
        <div className="space-y-3">
          {verificationData.map((verification) => (
            <div
              key={verification.verificationId}
              className={`border rounded-lg p-4 ${getVerificationStatusColor(verification.status)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  {getVerificationStatusIcon(verification.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{verification.verificationId}</h4>
                    <span className="text-xs opacity-75">
                      {formatDistanceToNow(verification.timestamp, {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                  <p className="text-sm opacity-90 mb-2">{verification.details}</p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span>
                      <span className="opacity-75">{t('dia.dataSourceVerification.source')}:</span>{' '}
                      <span className="font-medium">{verification.sourceId}</span>
                    </span>
                    <span>
                      <span className="opacity-75">{t('dia.dataSourceVerification.method')}:</span>{' '}
                      <span className="font-medium">{verification.method}</span>
                    </span>
                    <span>
                      <span className="opacity-75">
                        {t('dia.dataSourceVerification.validators')}:
                      </span>{' '}
                      <span className="font-medium">{verification.validatorCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
