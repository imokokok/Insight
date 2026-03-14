'use client';

import { DataSourceVerification } from '@/lib/oracles/dia';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DIADataSourceVerificationPanelProps {
  data: DataSourceVerification[];
}

export function DIADataSourceVerificationPanel({ data }: DIADataSourceVerificationPanelProps) {
  const { t } = useI18n();

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const verifiedCount = data.filter((v) => v.status === 'verified').length;
  const pendingCount = data.filter((v) => v.status === 'pending').length;
  const failedCount = data.filter((v) => v.status === 'failed').length;

  return (
    <DashboardCard title={t('dia.dataSourceVerification.title')}>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataSourceVerification.verified')}</p>
            <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataSourceVerification.pending')}</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">{t('dia.dataSourceVerification.failed')}</p>
            <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          </div>
        </div>

        {/* Verification List */}
        <div className="space-y-3">
          {data.map((verification) => (
            <div
              key={verification.verificationId}
              className={`border rounded-lg p-4 ${getStatusColor(verification.status)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(verification.status)}
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
                      <span className="opacity-75">{t('dia.dataSourceVerification.validators')}:</span>{' '}
                      <span className="font-medium">{verification.validatorCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
