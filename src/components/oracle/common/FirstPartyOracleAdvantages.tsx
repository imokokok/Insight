'use client';

import { DashboardCard } from './DashboardCard';
import { useI18n } from '@/lib/i18n/provider';

interface FirstPartyAdvantages {
  noMiddlemen: boolean;
  sourceTransparency: boolean;
  responseTime: number;
}

interface FirstPartyOracleAdvantagesProps {
  data: FirstPartyAdvantages;
}

interface ComparisonRow {
  feature: string;
  api3: string;
  traditional: string;
  api3HasAdvantage: boolean;
}

export function FirstPartyOracleAdvantages({ data }: FirstPartyOracleAdvantagesProps) {
  const { t } = useI18n();

  const comparisonData: ComparisonRow[] = [
    {
      feature: t('api3.firstPartyOracle.dataSourceTransparency'),
      api3: t('api3.firstPartyOracle.fullTransparency'),
      traditional: t('api3.firstPartyOracle.partialTransparency'),
      api3HasAdvantage: true,
    },
    {
      feature: t('api3.firstPartyOracle.middlemen'),
      api3: t('api3.firstPartyOracle.none'),
      traditional: t('api3.firstPartyOracle.has'),
      api3HasAdvantage: true,
    },
    {
      feature: t('api3.firstPartyOracle.responseTime'),
      api3: '180ms',
      traditional: '200-500ms',
      api3HasAdvantage: true,
    },
    {
      feature: t('api3.firstPartyOracle.insuranceMechanism'),
      api3: t('api3.firstPartyOracle.hasInsurance'),
      traditional: t('api3.firstPartyOracle.noInsurance'),
      api3HasAdvantage: true,
    },
  ];

  return (
    <DashboardCard title={t('api3.firstPartyOracle.title')}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider">
                  {t('api3.firstPartyOracle.noMiddlemen')}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {data.noMiddlemen
                    ? t('api3.firstPartyOracle.directConnection')
                    : t('api3.firstPartyOracle.hasMiddlemen')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider">
                  {t('api3.firstPartyOracle.sourceTransparency')}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {data.sourceTransparency
                    ? t('api3.firstPartyOracle.traceable')
                    : t('api3.firstPartyOracle.notTransparent')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider">
                  {t('api3.firstPartyOracle.responseTime')}
                </p>
                <p className="text-lg font-semibold text-gray-900">{data.responseTime}ms</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {t('api3.firstPartyOracle.comparisonTitle')}
          </h4>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t('api3.firstPartyOracle.feature')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    API3
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t('api3.firstPartyOracle.traditionalOracle')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparisonData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.feature}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`font-semibold ${
                          row.api3HasAdvantage ? 'text-green-600' : 'text-gray-900'
                        }`}
                      >
                        {row.api3}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`font-semibold ${
                          row.api3HasAdvantage ? 'text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {row.traditional}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {t('api3.firstPartyOracle.advantagesTitle')}
              </h4>
              <p className="text-sm text-gray-600">{t('api3.firstPartyOracle.advantagesDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
