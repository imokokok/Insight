'use client';

import { useState, useEffect } from 'react';
import { DashboardCard } from './DashboardCard';
import { UMAClient, DisputeEfficiencyStats } from '@/lib/oracles/uma';
import { useI18n } from '@/lib/i18n/provider';

export function DisputeEfficiencyAnalysis() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DisputeEfficiencyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const client = new UMAClient();
        const data = await client.getDisputeEfficiencyStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dispute efficiency stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <DashboardCard title={t('uma.disputeResolution.efficiencyAnalysis')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DashboardCard>
    );
  }

  const maxCount = Math.max(...stats.resolutionTimeDistribution.map((d) => d.count));
  const maxRate = Math.max(...stats.successRateTrend.map((d) => d.rate));
  const minRate = Math.min(...stats.successRateTrend.map((d) => d.rate));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('uma.disputeResolution.avgResolutionTime')}
          </p>
          <p className="text-gray-900 text-2xl font-bold">{stats.avgResolutionTime.toFixed(1)}h</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('uma.disputeResolution.medianResolutionTime')}
          </p>
          <p className="text-gray-900 text-2xl font-bold">
            {stats.medianResolutionTime.toFixed(1)}h
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('uma.disputeResolution.stdDeviation')}
          </p>
          <p className="text-gray-900 text-2xl font-bold">{stats.stdDeviation.toFixed(1)}h</p>
        </div>
      </div>

      <DashboardCard title={t('uma.disputeResolution.resolutionTimeDistribution')}>
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2 h-48">
            {stats.resolutionTimeDistribution.map((item, index) => {
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center h-40">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 relative group cursor-pointer"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                        {item.count} {t('uma.disputeResolution.disputes')}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{item.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title={t('uma.disputeResolution.successRateTrend')}>
        <div className="space-y-4">
          <div className="h-48 relative">
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b border-gray-100 h-0" />
              ))}
            </div>

            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="successRateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d={`M 0 ${((maxRate - stats.successRateTrend[0].rate) / (maxRate - minRate)) * 100}% 
                    ${stats.successRateTrend
                      .map((point, index) => {
                        const x = (index / (stats.successRateTrend.length - 1)) * 100;
                        const y = ((maxRate - point.rate) / (maxRate - minRate)) * 100;
                        return `L ${x}% ${y}%`;
                      })
                      .join(' ')} 
                    L 100% 100% L 0 100% Z`}
                fill="url(#successRateGradient)"
              />

              <path
                d={`M 0 ${((maxRate - stats.successRateTrend[0].rate) / (maxRate - minRate)) * 100}% 
                    ${stats.successRateTrend
                      .map((point, index) => {
                        const x = (index / (stats.successRateTrend.length - 1)) * 100;
                        const y = ((maxRate - point.rate) / (maxRate - minRate)) * 100;
                        return `L ${x}% ${y}%`;
                      })
                      .join(' ')}`}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />

              {stats.successRateTrend.map((point, index) => {
                const x = (index / (stats.successRateTrend.length - 1)) * 100;
                const y = ((maxRate - point.rate) / (maxRate - minRate)) * 100;
                return (
                  <circle
                    key={index}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="#3B82F6"
                    className="cursor-pointer hover:r-6 transition-all"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            {stats.successRateTrend
              .filter((_, i) => i % 2 === 0)
              .map((point, index) => (
                <span key={index}>{point.date}</span>
              ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
