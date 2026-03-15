'use client';

import { useI18n } from '@/lib/i18n/provider';
import { TRONEcosystem, TRONDApp } from '@/lib/oracles/winklink';
import { Globe, Zap, Users, Activity, Gamepad2, Coins, Image, MessageSquare } from 'lucide-react';

interface WINkLinkTRONEcosystemPanelProps {
  data: TRONEcosystem;
}

export function WINkLinkTRONEcosystemPanel({ data }: WINkLinkTRONEcosystemPanelProps) {
  const { t } = useI18n();

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
        return 'bg-green-100 text-green-700';
      case 'nft':
        return 'bg-pink-100 text-pink-700';
      case 'social':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
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
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('winklink.tron.title')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-pink-600" />
              <p className="text-xs text-gray-500">{t('winklink.tron.totalTransactions')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(data.networkStats.totalTransactions)}
            </p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-gray-500">{t('winklink.tron.tps')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.networkStats.tps}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">{t('winklink.tron.totalAccounts')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(data.networkStats.totalAccounts)}
            </p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">{t('winklink.tron.dailyTransactions')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(data.dailyTransactions)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-500">{t('winklink.tron.tvl')}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(data.totalValueLocked)}
            </p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-500">{t('winklink.tron.integrationCoverage')}</p>
            <p className="text-lg font-bold text-gray-900">{data.integrationCoverage}%</p>
          </div>
        </div>
      </div>

      {/* Integrated DApps */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('winklink.tron.integratedDApps')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.integratedDApps.map((dapp, index) => (
            <div key={index} className="py-4 border-b border-gray-100 last:border-0">
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
      </div>
    </div>
  );
}
