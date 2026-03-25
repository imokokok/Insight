'use client';

import { useTranslations } from '@/i18n';
import { TRONEcosystem, TRONNetworkGrowth } from '@/lib/oracles/winklink';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Zap } from 'lucide-react';
import { Users } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Gamepad2 } from 'lucide-react';
import { Coins } from 'lucide-react';
import { Image } from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { TrendingDown } from 'lucide-react';

interface WINkLinkTRONEcosystemPanelProps {
  data: TRONEcosystem & {
    networkGrowth?: TRONNetworkGrowth[];
    marketShare?: {
      oracleUsage: number;
      totalDapps: number;
      integratedDapps: number;
    };
  };
}

export function WINkLinkTRONEcosystemPanel({ data }: WINkLinkTRONEcosystemPanelProps) {
  const t = useTranslations();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'gaming':
        return <Gamepad2 className="w-4 h-4" />;
      case 'defi':
        return <Coins className="w-4 h-4" />;
      case 'nft':
        return <Image className="w-4 h-4" />;
      case 'social':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gaming':
        return 'bg-purple-100 text-purple-700';
      case 'defi':
        return 'bg-success-100 text-success-700';
      case 'nft':
        return 'bg-pink-100 text-pink-700';
      case 'social':
        return 'bg-primary-100 text-primary-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-100 text-success-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatNumber = (value: number) => {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(0)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(0)}K`;
    } else {
      return value.toLocaleString();
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Stats */}
      <DashboardCard title={t('winklink.tron.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-pink-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.totalTransactions')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {formatNumber(data.networkStats.totalTransactions)}
            </p>
          </div>
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-warning-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.tps')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {data.networkStats.tps}
            </p>
          </div>
          <div className="py-2 border-r border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.totalAccounts')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {formatNumber(data.networkStats.totalAccounts)}
            </p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-success-600" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('winklink.tron.dailyTransactions')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {formatNumber(data.dailyTransactions)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
          <div className="py-2 border-r border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.tron.tvl')}
            </p>
            <p className="text-lg font-bold text-gray-900 tracking-tight">
              {formatCurrency(data.totalValueLocked)}
            </p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('winklink.tron.integrationCoverage')}
            </p>
            <p className="text-lg font-bold text-gray-900 tracking-tight">
              {data.integrationCoverage}%
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* Integrated DApps */}
      <DashboardCard title={t('winklink.tron.integratedDApps')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.integratedDApps.map((dapp, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded-md ${getCategoryColor(dapp.category)}`}>
                    {getCategoryIcon(dapp.category)}
                  </span>
                  <h4 className="font-semibold text-gray-900">{dapp.name}</h4>
                </div>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getStatusColor(dapp.status)}`}
                >
                  {dapp.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 capitalize mb-3">{dapp.category}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('winklink.tron.users')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {dapp.users.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('winklink.tron.volume24h')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${(dapp.volume24h / 1e6).toFixed(2)}M
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 truncate">{dapp.contractAddress}</p>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Network Growth */}
      {data.networkGrowth && (
        <DashboardCard title={t('winklink.tron.networkGrowth')}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                    {t('winklink.tron.month')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('winklink.tron.transactions')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('winklink.tron.accounts')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('winklink.tron.tvl')}
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">
                    {t('winklink.tron.growth')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.networkGrowth.map((month, index) => {
                  const prevMonth = index > 0 ? data.networkGrowth![index - 1] : null;
                  const monthTvl = month.tvl ?? 0;
                  const prevMonthTvl = prevMonth?.tvl ?? 0;
                  const tvlGrowth =
                    prevMonth && prevMonthTvl > 0
                      ? (((monthTvl - prevMonthTvl) / prevMonthTvl) * 100).toFixed(1)
                      : '0';
                  const isPositive = parseFloat(tvlGrowth) >= 0;
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm text-gray-900">{month.month}</td>
                      <td className="py-2 px-3 text-sm text-right text-gray-900">
                        {formatNumber(month.transactions)}
                      </td>
                      <td className="py-2 px-3 text-sm text-right text-gray-900">
                        {formatNumber(month.accounts)}
                      </td>
                      <td className="py-2 px-3 text-sm text-right text-gray-900">
                        {formatCurrency(monthTvl)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {index > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${isPositive ? 'text-success-600' : 'text-danger-600'}`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {isPositive ? '+' : ''}
                            {tvlGrowth}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      )}

      {/* Market Share */}
      {data.marketShare && (
        <DashboardCard title={t('winklink.tron.marketShare')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-pink-600">{data.marketShare.oracleUsage}%</p>
              <p className="text-xs text-gray-500 mt-1">{t('winklink.tron.oracleUsage')}</p>
              <p className="text-sm text-gray-600 mt-2">{t('winklink.tron.ofTRONDApps')}</p>
            </div>
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">{data.marketShare.integratedDapps}</p>
              <p className="text-xs text-gray-500 mt-1">{t('winklink.tron.integratedDapps')}</p>
              <p className="text-sm text-gray-600 mt-2">
                {t('winklink.tron.outOf')} {data.marketShare.totalDapps}
              </p>
            </div>
            <div className="text-center py-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-success-600">{data.integrationCoverage}%</p>
              <p className="text-xs text-gray-500 mt-1">{t('winklink.tron.integrationCoverage')}</p>
              <p className="text-sm text-gray-600 mt-2">{t('winklink.tron.dataCoverage')}</p>
            </div>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
