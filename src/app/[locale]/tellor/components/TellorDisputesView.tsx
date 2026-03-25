'use client';

import { useTranslations } from '@/i18n';
import { TellorDisputesViewProps } from '../types';
import { AlertTriangle, CheckCircle2, Clock, TrendingDown, TrendingUp, Scale } from 'lucide-react';

export function TellorDisputesView({ isLoading }: TellorDisputesViewProps) {
  const t = useTranslations();

  const disputeStats = [
    {
      label: t('tellor.disputes.totalDisputes'),
      value: '156',
      change: '+3',
      trend: 'up',
    },
    {
      label: t('tellor.disputes.resolvedDisputes'),
      value: '148',
      change: '+5',
      trend: 'up',
    },
    {
      label: t('tellor.disputes.pendingDisputes'),
      value: '8',
      change: '-2',
      trend: 'down',
    },
    {
      label: t('tellor.disputes.avgResolutionTime'),
      value: '48h',
      change: '-12h',
      trend: 'down',
    },
  ];

  const recentDisputes = [
    { id: '#0156', reporter: '0x7a2...3f9b', reason: 'Invalid price data', status: 'resolved', result: 'reporter won', timestamp: '2h ago' },
    { id: '#0155', reporter: '0x9c4...8a2d', reason: 'Delayed submission', status: 'resolved', result: 'disputer won', timestamp: '5h ago' },
    { id: '#0154', reporter: '0x3f8...1c5e', reason: 'Price deviation', status: 'pending', result: '-', timestamp: '1d ago' },
    { id: '#0153', reporter: '0x5a1...9b3c', reason: 'Invalid timestamp', status: 'resolved', result: 'reporter won', timestamp: '2d ago' },
    { id: '#0152', reporter: '0x2d7...4e8a', reason: 'Data manipulation', status: 'resolved', result: 'disputer won', timestamp: '3d ago' },
    { id: '#0151', reporter: '0x8f3...2a1d', reason: 'Network delay', status: 'resolved', result: 'reporter won', timestamp: '4d ago' },
  ];

  return (
    <div className="space-y-8">
      {/* 争议统计 - 简洁内联布局 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {disputeStats.map((stat, index) => {
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">{stat.value}</p>
                <div className={`flex items-center gap-0.5 text-sm font-medium ${
                  stat.trend === 'up' ? 'text-emerald-600' : 'text-blue-600'
                }`}>
                  <TrendIcon className="w-3.5 h-3.5" />
                  <span>{stat.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 最近争议 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4 h-4 text-gray-500" />
          <h3 className="text-base font-medium text-gray-900">
            {t('tellor.disputes.recentDisputes')}
          </h3>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1">{t('tellor.disputes.id')}</div>
            <div className="col-span-3">{t('tellor.disputes.reporter')}</div>
            <div className="col-span-3">{t('tellor.disputes.reason')}</div>
            <div className="col-span-2 text-center">{t('tellor.disputes.status')}</div>
            <div className="col-span-2 text-center">{t('tellor.disputes.result')}</div>
            <div className="col-span-1 text-right">{t('tellor.disputes.time')}</div>
          </div>
          {/* 争议行 */}
          {recentDisputes.map((dispute, index) => (
            <div
              key={index}
              className={`grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors ${
                index !== recentDisputes.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="col-span-1 text-sm font-medium text-gray-900">
                {dispute.id}
              </div>
              <div className="col-span-3 text-sm text-gray-900 font-mono">
                {dispute.reporter}
              </div>
              <div className="col-span-3 text-sm text-gray-600">
                {dispute.reason}
              </div>
              <div className="col-span-2 text-center">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    dispute.status === 'resolved'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {dispute.status === 'resolved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {dispute.status}
                </span>
              </div>
              <div className="col-span-2 text-center">
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
              </div>
              <div className="col-span-1 text-sm text-gray-500 text-right">
                {dispute.timestamp}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 争议流程 */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-4 h-4 text-gray-500" />
          <h3 className="text-base font-medium text-gray-900">
            {t('tellor.disputes.howItWorks')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {t('tellor.disputes.step1Title')}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('tellor.disputes.step1Desc')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {t('tellor.disputes.step2Title')}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('tellor.disputes.step2Desc')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {t('tellor.disputes.step3Title')}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('tellor.disputes.step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
