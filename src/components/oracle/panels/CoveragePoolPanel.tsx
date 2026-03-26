'use client';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';

export interface CoveragePoolData {
  totalValue: number;
  coverageRatio: number;
  historicalPayouts: number;
}

interface CoveragePoolPanelProps {
  data: CoveragePoolData;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function CoveragePoolPanel({ data }: CoveragePoolPanelProps) {
  const t = useTranslations();

  const getCoverageStatus = (ratio: number) => {
    if (ratio >= 50)
      return {
        label: t('coveragePool.status.excellent'),
        color: 'text-success-600',
        bgColor: 'bg-success-100',
      };
    if (ratio >= 30)
      return {
        label: t('coveragePool.status.good'),
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
      };
    if (ratio >= 20)
      return {
        label: t('coveragePool.status.fair'),
        color: 'text-warning-600',
        bgColor: 'bg-warning-100',
      };
    return {
      label: t('coveragePool.status.low'),
      color: 'text-danger-600',
      bgColor: 'bg-danger-100',
    };
  };

  const coverageStatus = getCoverageStatus(data.coverageRatio);

  return (
    <DashboardCard title={t('coveragePool.title')}>
      <div className="space-y-5">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-sm text-gray-600">{t('coveragePool.totalValue')}</span>
          </div>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(data.totalValue)}</span>
        </div>

        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="text-sm text-gray-600">{t('coveragePool.coverageRatio')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-emerald-600">{data.coverageRatio}%</span>
              <span
                className={`text-xs px-2 py-0.5  font-medium ${coverageStatus.bgColor} ${coverageStatus.color}`}
              >
                {coverageStatus.label}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-100  h-3 overflow-hidden">
            <div
              className="h-full  bg-gray-100 border border-gray-200 transition-all duration-500"
              style={{ width: `${data.coverageRatio}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {t('coveragePool.coverageDescription', { ratio: data.coverageRatio })}
          </p>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">{t('coveragePool.historicalPayouts')}</span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(data.historicalPayouts)}
          </span>
        </div>

        <div className="bg-gray-100 border border-gray-200  p-4 border border-green-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-success-100 ">
              <svg
                className="w-5 h-5 text-success-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {t('coveragePool.mechanismTitle')}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('coveragePool.mechanismDescription')}
              </p>
            </div>
          </div>
        </div>

        <button className="w-full py-3 px-4 bg-gray-100 border border-gray-200 text-white font-medium  hover:from-green-700 hover:to-emerald-700 transition-all duration-200  hover:">
          {t('coveragePool.participateButton')}
        </button>
        <p className="text-xs text-gray-400 text-center">{t('coveragePool.participateDesc')}</p>
      </div>
    </DashboardCard>
  );
}
