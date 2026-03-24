'use client';

import { useTranslations } from 'next-intl';
import { TellorReportersViewProps } from '../types';

export function TellorReportersView({ isLoading }: TellorReportersViewProps) {
  const t = useTranslations();

  const reporterStats = [
    {
      label: t('tellor.reporters.totalReporters'),
      value: '72+',
      change: '+5',
    },
    {
      label: t('tellor.reporters.activeReporters'),
      value: '68',
      change: '+3',
    },
    {
      label: t('tellor.reporters.avgStake'),
      value: '2,500 TRB',
      change: '+12%',
    },
    {
      label: t('tellor.reporters.totalReports'),
      value: '1.2M+',
      change: '+8%',
    },
  ];

  const topReporters = [
    { address: '0x7a2...3f9b', reports: 45230, accuracy: 99.8, stake: 10000, reward: 1250 },
    { address: '0x9c4...8a2d', reports: 38920, accuracy: 99.7, stake: 8500, reward: 1080 },
    { address: '0x3f8...1c5e', reports: 32150, accuracy: 99.5, stake: 7200, reward: 920 },
    { address: '0x5a1...9b3c', reports: 28400, accuracy: 99.6, stake: 6500, reward: 810 },
    { address: '0x2d7...4e8a', reports: 25600, accuracy: 99.4, stake: 5800, reward: 730 },
  ];

  return (
    <div className="space-y-4">
      {/* Reporter Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reporterStats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <span className="text-xs text-emerald-600">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top Reporters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.reporters.topReporters')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.reporters.address')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.reporters.reports')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.reporters.accuracy')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.reporters.stake')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('tellor.reporters.reward')}
                </th>
              </tr>
            </thead>
            <tbody>
              {topReporters.map((reporter, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-3 text-sm text-gray-900 font-mono">
                    {reporter.address}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 text-right">
                    {reporter.reports.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm text-emerald-600 font-medium">
                      {reporter.accuracy}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 text-right">
                    {reporter.stake.toLocaleString()} TRB
                  </td>
                  <td className="py-3 px-3 text-sm text-emerald-600 text-right">
                    +{reporter.reward} TRB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reporter Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('tellor.reporters.howToBecome')}
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                1
              </span>
              <span>{t('tellor.reporters.step1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                2
              </span>
              <span>{t('tellor.reporters.step2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                3
              </span>
              <span>{t('tellor.reporters.step3')}</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('tellor.reporters.rewards')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('tellor.reporters.baseReward')}</span>
              <span className="text-sm font-medium text-gray-900">0.5 TRB / report</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('tellor.reporters.accuracyBonus')}</span>
              <span className="text-sm font-medium text-emerald-600">+20%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t('tellor.reporters.stakeBonus')}</span>
              <span className="text-sm font-medium text-emerald-600">Up to +50%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
