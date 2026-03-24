'use client';

import { useTranslations } from 'next-intl';
import { useDIAStaking, useDIAStakingDetails } from '@/hooks/useDIAData';

export function DIAStakingView() {
  const t = useTranslations();
  const { staking, isLoading: stakingLoading } = useDIAStaking();
  const { stakingDetails, isLoading: detailsLoading } = useDIAStakingDetails();

  const isLoading = stakingLoading || detailsLoading;

  // 统计卡片数据
  const stats = [
    {
      title: t('dia.staking.totalStaked'),
      value: staking?.totalStaked ?? 0,
      format: (v: number) => `${(v / 1e6).toFixed(2)}M DIA`,
      change: '+5.2%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: t('dia.staking.stakingApr'),
      value: staking?.stakingApr ?? 0,
      format: (v: number) => `${v.toFixed(2)}%`,
      change: '+0.3%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      title: t('dia.staking.stakerCount'),
      value: staking?.stakerCount ?? 0,
      format: (v: number) => v.toLocaleString(),
      change: '+12',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: t('dia.staking.rewardsDistributed'),
      value: staking?.rewardPool ?? 0,
      format: (v: number) => `${(v / 1e6).toFixed(2)}M DIA`,
      change: '+8.5%',
      changeType: 'positive' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
      ),
    },
  ];

  // 锁定期选项
  const lockPeriods = stakingDetails?.lockPeriods ?? [30, 90, 180, 365];
  const aprByPeriod = stakingDetails?.aprByPeriod ?? {
    30: 8.5,
    90: 12.0,
    180: 18.5,
    365: 25.0,
  };

  // 历史 APR 数据
  const historicalApr = stakingDetails?.historicalApr ?? [
    { timestamp: Date.now() - 90 * 24 * 60 * 60 * 1000, apr: 15.2 },
    { timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000, apr: 16.8 },
    { timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, apr: 18.5 },
    { timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000, apr: 19.2 },
    { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, apr: 20.5 },
    { timestamp: Date.now(), apr: staking?.stakingApr ?? 21.0 },
  ];

  return (
    <div className="space-y-4">
      {/* 顶部统计概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-indigo-500">{stat.icon}</span>
              <span
                className={`text-xs font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-emerald-600'
                    : stat.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-gray-500'
                }`}
              >
                {stat.changeType === 'positive' ? '↑' : stat.changeType === 'negative' ? '↓' : '→'}{' '}
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {isLoading ? '-' : stat.format(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* 中部质押详情面板 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('dia.staking.details')}</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：最小质押量和基本信息 */}
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-xs text-indigo-600 uppercase tracking-wider mb-1">
                {t('dia.staking.minStakeAmount')}
              </p>
              <p className="text-2xl font-bold text-indigo-900">
                {isLoading
                  ? '-'
                  : `${(stakingDetails?.minStakeAmount ?? 1000).toLocaleString()} DIA`}
              </p>
              <p className="text-xs text-indigo-500 mt-1">
                {t('dia.staking.minStakeDescription')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{t('dia.staking.unbondingPeriod')}</p>
                <p className="text-lg font-semibold text-gray-900">14 {t('dia.staking.days')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{t('dia.staking.compounding')}</p>
                <p className="text-lg font-semibold text-gray-900">{t('dia.staking.auto')}</p>
              </div>
            </div>
          </div>

          {/* 右侧：锁定期 APR 表格 */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              {t('dia.staking.lockPeriods')}
            </h4>
            <div className="space-y-2">
              {lockPeriods.map((period) => {
                const apr = aprByPeriod[period] ?? 0;
                const maxApr = Math.max(...Object.values(aprByPeriod));
                const percentage = (apr / maxApr) * 100;

                return (
                  <div
                    key={period}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 w-20">
                      {period} {t('dia.staking.days')}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-indigo-600 w-16 text-right">
                      {apr.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 底部：历史 APR 趋势 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('dia.staking.historicalApr')}
        </h3>

        <div className="space-y-4">
          {/* 简化折线图 - 使用柱状图展示 */}
          <div className="h-48 flex items-end gap-2">
            {historicalApr.map((point, index) => {
              const maxApr = Math.max(...historicalApr.map((p) => p.apr));
              const height = (point.apr / maxApr) * 100;
              const date = new Date(point.timestamp);
              const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex justify-center">
                    <div
                      className="w-full max-w-[60px] bg-indigo-100 hover:bg-indigo-200 transition-colors rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${dateLabel}: ${point.apr.toFixed(2)}%`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{dateLabel}</span>
                </div>
              );
            })}
          </div>

          {/* 历史数据表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    {t('dia.staking.date')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    {t('dia.staking.apr')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    {t('dia.staking.change')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {historicalApr.map((point, index) => {
                  const date = new Date(point.timestamp);
                  const prevApr = index > 0 ? historicalApr[index - 1].apr : point.apr;
                  const change = point.apr - prevApr;
                  const changePercent = prevApr > 0 ? (change / prevApr) * 100 : 0;

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">
                        {date.toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-indigo-600">
                        {point.apr.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        {index === 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span
                            className={
                              change >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }
                          >
                            {change >= 0 ? '+' : ''}
                            {changePercent.toFixed(2)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
