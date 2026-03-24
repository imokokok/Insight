'use client';

import { useTranslations } from 'next-intl';
import { TellorDisputesViewProps } from '../types';

export function TellorDisputesView({ isLoading }: TellorDisputesViewProps) {
  const t = useTranslations();

  const disputeStats = [
    {
      label: t('tellor.disputes.totalDisputes'),
      value: '156',
      change: '+3',
    },
    {
      label: t('tellor.disputes.resolvedDisputes'),
      value: '148',
      change: '+5',
    },
    {
      label: t('tellor.disputes.pendingDisputes'),
      value: '8',
      change: '-2',
    },
    {
      label: t('tellor.disputes.avgResolutionTime'),
      value: '48h',
      change: '-12h',
    },
  ];

  const recentDisputes = [
    { id: '#0156', reporter: '0x7a2...3f9b', reason: 'Invalid price data', status: 'resolved', result: 'reporter won', timestamp: '2h ago' },
    { id: '#0155', reporter: '0x9c4...8a2d', reason: 'Delayed submission', status: 'resolved', result: 'disputer won', timestamp: '5h ago' },
    { id: '#0154', reporter: '0x3f8...1c5e', reason: 'Price deviation', status: 'pending', result: '-', timestamp: '1d ago' },
    { id: '#0153', reporter: '0x5a1...9b3c', reason: 'Invalid timestamp', status: 'resolved', result: 'reporter won', timestamp: '2d ago' },
  ];

  return (
    <div className="space-y-4">
      {/* Dispute Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {disputeStats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <span className={`text-xs ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-blue-600'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Disputes */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.disputes.recentDisputes')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.disputes.id')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.disputes.reporter')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.disputes.reason')}
                </th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.disputes.status')}
                </th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.disputes.result')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.disputes.time')}
                </th>
              </tr>
            </thead>
            <tbody>
              {recentDisputes.map((dispute, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-3 text-sm text-gray-900 font-medium">
                    {dispute.id}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 font-mono">
                    {dispute.reporter}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600">
                    {dispute.reason}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        dispute.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {dispute.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {dispute.result !== '-' ? (
                      <span
                        className={`text-sm font-medium ${
                          dispute.result.includes('reporter')
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {dispute.result}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-500 text-right">
                    {dispute.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispute Process */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.disputes.howItWorks')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold mx-auto mb-2">
              1
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {t('tellor.disputes.step1Title')}
            </h4>
            <p className="text-xs text-gray-500">
              {t('tellor.disputes.step1Desc')}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold mx-auto mb-2">
              2
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {t('tellor.disputes.step2Title')}
            </h4>
            <p className="text-xs text-gray-500">
              {t('tellor.disputes.step2Desc')}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold mx-auto mb-2">
              3
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {t('tellor.disputes.step3Title')}
            </h4>
            <p className="text-xs text-gray-500">
              {t('tellor.disputes.step3Desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
