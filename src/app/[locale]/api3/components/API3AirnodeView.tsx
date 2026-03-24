'use client';

import { useTranslations } from 'next-intl';
import { AirnodeDeploymentPanel } from '@/components/oracle/panels/AirnodeDeploymentPanel';
import { API3AirnodeViewProps } from '../types';

export function API3AirnodeView({
  airnodeStats,
  firstParty,
  isLoading,
}: API3AirnodeViewProps) {
  const t = useTranslations();

  const airnodeData = firstParty
    ? {
        deployments: firstParty.airnodeDeployments,
        networkStats: {
          activeAirnodes: airnodeStats?.activeAirnodes ?? 50,
          nodeUptime: airnodeStats?.nodeUptime ?? 99.8,
          avgResponseTime: airnodeStats?.avgResponseTime ?? 200,
          dapiUpdateFrequency: airnodeStats?.dapiUpdateFrequency ?? 10,
        },
      }
    : {
        deployments: {
          total: 50,
          byRegion: {
            northAmerica: 20,
            europe: 18,
            asia: 10,
            others: 2,
          },
          byChain: {
            ethereum: 25,
            arbitrum: 15,
            polygon: 10,
          },
          byProviderType: {
            exchanges: 30,
            traditionalFinance: 15,
            others: 5,
          },
        },
        networkStats: {
          activeAirnodes: 50,
          nodeUptime: 99.8,
          avgResponseTime: 200,
          dapiUpdateFrequency: 10,
        },
      };

  const advantages = [
    {
      title: t('api3.advantages.firstParty.title'),
      description: t('api3.advantages.firstParty.description'),
      metrics: '99.8% Uptime',
    },
    {
      title: t('api3.advantages.transparency.title'),
      description: t('api3.advantages.transparency.description'),
      metrics: 'Full Source Traceability',
    },
    {
      title: t('api3.advantages.security.title'),
      description: t('api3.advantages.security.description'),
      metrics: 'Decentralized Coverage',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.airnode.activeNodes')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {airnodeStats?.activeAirnodes ?? 50}+
          </p>
          <p className="text-xs text-emerald-600 mt-1">+3%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.airnode.avgResponseTime')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {airnodeStats?.avgResponseTime ?? 200}ms
          </p>
          <p className="text-xs text-emerald-600 mt-1">-5%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.airnode.updateFrequency')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {airnodeStats?.dapiUpdateFrequency ?? 10}s
          </p>
          <p className="text-xs text-gray-500 mt-1">Real-time</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.airnode.uptime')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {airnodeStats?.nodeUptime ?? 99.8}%
          </p>
          <p className="text-xs text-emerald-600 mt-1">+0.1%</p>
        </div>
      </div>

      <AirnodeDeploymentPanel data={airnodeData.deployments} />

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('api3.firstPartyAdvantages')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {advantages.map((advantage, index) => (
            <div key={index} className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">{advantage.title}</h4>
              <p className="text-xs text-gray-600 mb-3">{advantage.description}</p>
              {advantage.metrics && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                  {advantage.metrics}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
