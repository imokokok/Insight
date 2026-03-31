'use client';

import { TrendingUp, PieChart, Zap, Link2, BarChart3, Globe } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface MarketSidebarProps {
  oracleData?: Array<{
    name: string;
    share: number;
    change24h: number;
    chains: number;
    color: string;
  }>;
  loading?: boolean;
}

export default function MarketSidebar({ oracleData = [], loading = false }: MarketSidebarProps) {
  const t = useTranslations('marketOverview.sidebar');

  // 计算市场集中度 (CR4 - 前4名市场份额之和)
  const marketConcentration = oracleData.slice(0, 4).reduce((sum, oracle) => sum + oracle.share, 0);

  // 获取增长最快的3个预言机
  const topGainers = [...oracleData].sort((a, b) => b.change24h - a.change24h).slice(0, 3);

  // 获取链支持最多的3个预言机
  const topChainSupporters = [...oracleData].sort((a, b) => b.chains - a.chains).slice(0, 3);

  // 计算统计数据
  const totalChains = oracleData.reduce((sum, o) => sum + o.chains, 0);
  const avgChains = oracleData.length > 0 ? totalChains / oracleData.length : 0;

  // 判断市场集中度等级
  const getConcentrationLevel = (cr4: number) => {
    if (cr4 >= 80) return { label: t('highConcentration'), color: 'text-warning-600' };
    if (cr4 >= 60) return { label: t('mediumConcentration'), color: 'text-primary-600' };
    return { label: t('lowConcentration'), color: 'text-success-600' };
  };

  const concentration = getConcentrationLevel(marketConcentration);

  return (
    <div className="h-full flex flex-col">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent animate-spin" />
        </div>
      ) : oracleData.length > 0 ? (
        <div className="space-y-4">
          {/* Market Concentration Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-gray-900">{t('marketConcentration')}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('top4Share')}</span>
                <span className={`text-lg font-bold ${concentration.color}`}>
                  {marketConcentration.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${marketConcentration >= 80 ? 'bg-warning-500' : marketConcentration >= 60 ? 'bg-primary-500' : 'bg-success-500'}`}
                  style={{ width: `${marketConcentration}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{t('concentrationLevel')}</span>
                <span className={`font-medium ${concentration.color}`}>
                  {concentration.label}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              {oracleData.slice(0, 4).map((oracle) => (
                <div key={oracle.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: oracle.color }}
                    />
                    <span className="text-gray-700">{oracle.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {oracle.share.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Top Gainers Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning-500" />
              <span className="font-medium text-gray-900">{t('topGainers')}</span>
            </div>
            <div className="space-y-2">
              {topGainers.map((oracle, index) => (
                <div
                  key={oracle.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: oracle.color }}
                    />
                    <span className="text-sm text-gray-700">{oracle.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-success-500" />
                    <span className="text-sm font-medium text-success-600">
                      +{oracle.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Chain Support Ranking Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-gray-900">{t('topChainSupporters')}</span>
            </div>
            <div className="space-y-2">
              {topChainSupporters.map((oracle, index) => (
                <div
                  key={oracle.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: oracle.color }}
                    />
                    <span className="text-sm text-gray-700">{oracle.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {oracle.chains} {t('chains')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Market Insights Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-success-600" />
              <span className="font-medium text-gray-900">{t('marketInsights')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">{t('totalChains')}</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{totalChains}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">{t('avgChainsPerOracle')}</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{avgChains.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          {t('noData')}
        </div>
      )}
    </div>
  );
}
