'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n';
import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';

interface ServiceData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'beta' | 'coming_soon';
  metrics: {
    label: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
  }[];
  features: string[];
  useCases: string[];
  color: string;
  icon: React.ReactNode;
}

const getServicesData = (t: ReturnType<typeof useTranslations>): ServiceData[] => [
  {
    id: 'ccip',
    name: t('chainlink.services.ccip.name'),
    description: t('chainlink.services.ccip.description'),
    status: 'active',
    metrics: [
      {
        label: 'chainlink.services.ccip.messagesTransferred',
        value: '2.4M+',
        change: '+18%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.ccip.valueTransferred',
        value: '$12.8B+',
        change: '+25%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.ccip.avgTransferTime',
        value: '< 15 min',
        change: '-20%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.ccip.supportedChains',
        value: '18',
        change: '+3',
        changeType: 'positive',
      },
    ],
    features: [
      t('chainlink.services.ccip.feature1', { defaultValue: 'Arbitrary messaging across chains' }),
      t('chainlink.services.ccip.feature2', { defaultValue: 'Token transfers with lock-and-mint' }),
      t('chainlink.services.ccip.feature3', { defaultValue: 'Programmable token bridge' }),
      t('chainlink.services.ccip.feature4', { defaultValue: 'Rate limiting for security' }),
      t('chainlink.services.ccip.feature5', { defaultValue: 'Risk management network' }),
    ],
    useCases: [
      t('chainlink.services.ccip.useCase1', { defaultValue: 'Cross-chain DeFi' }),
      t('chainlink.services.ccip.useCase2', { defaultValue: 'Multi-chain NFTs' }),
      t('chainlink.services.ccip.useCase3', { defaultValue: 'Cross-chain governance' }),
      t('chainlink.services.ccip.useCase4', { defaultValue: 'Interoperable gaming' }),
    ],
    color: 'blue',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  },
  {
    id: 'functions',
    name: t('chainlink.services.functions.name'),
    description: t('chainlink.services.functions.description'),
    status: 'active',
    metrics: [
      {
        label: 'chainlink.services.functions.totalCalls',
        value: '8.5M+',
        change: '+42%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.functions.avgExecutionTime',
        value: '< 3s',
        change: '-15%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.functions.supportedApis',
        value: '10,000+',
        change: '+500',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.functions.successRate',
        value: '99.8%',
        change: '+0.2%',
        changeType: 'positive',
      },
    ],
    features: [
      t('chainlink.services.functions.feature1', { defaultValue: 'Connect to any API' }),
      t('chainlink.services.functions.feature2', {
        defaultValue: 'Custom JavaScript computations',
      }),
      t('chainlink.services.functions.feature3', { defaultValue: 'Decentralized execution' }),
      t('chainlink.services.functions.feature4', { defaultValue: 'Secrets management' }),
      t('chainlink.services.functions.feature5', { defaultValue: 'Serverless architecture' }),
    ],
    useCases: [
      t('chainlink.services.functions.useCase1', { defaultValue: 'DeFi integrations' }),
      t('chainlink.services.functions.useCase2', { defaultValue: 'AI/ML oracles' }),
      t('chainlink.services.functions.useCase3', { defaultValue: 'Real-world data' }),
      t('chainlink.services.functions.useCase4', { defaultValue: 'Custom price feeds' }),
    ],
    color: 'purple',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
  },
  {
    id: 'automation',
    name: t('chainlink.services.automation.name'),
    description: t('chainlink.services.automation.description'),
    status: 'active',
    metrics: [
      {
        label: 'chainlink.services.automation.tasksRegistered',
        value: '125K+',
        change: '+35%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.automation.dailyExecutions',
        value: '2.1M+',
        change: '+28%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.automation.gasSavings',
        value: '35%',
        change: '+5%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.automation.uptime',
        value: '99.99%',
        change: '0%',
        changeType: 'neutral',
      },
    ],
    features: [
      t('chainlink.services.automation.feature1', { defaultValue: 'Time-based triggers' }),
      t('chainlink.services.automation.feature2', { defaultValue: 'Custom logic triggers' }),
      t('chainlink.services.automation.feature3', { defaultValue: 'Log-based triggers' }),
      t('chainlink.services.automation.feature4', { defaultValue: 'Off-chain computation' }),
      t('chainlink.services.automation.feature5', { defaultValue: 'Gas-optimized execution' }),
    ],
    useCases: [
      t('chainlink.services.automation.useCase1', { defaultValue: 'Liquidation bots' }),
      t('chainlink.services.automation.useCase2', { defaultValue: 'Yield harvesting' }),
      t('chainlink.services.automation.useCase3', { defaultValue: 'Rebalancing' }),
      t('chainlink.services.automation.useCase4', { defaultValue: 'Reward distribution' }),
    ],
    color: 'green',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'vrf',
    name: t('chainlink.services.vrf.name'),
    description: t('chainlink.services.vrf.description'),
    status: 'active',
    metrics: [
      {
        label: 'chainlink.services.vrf.requestsFulfilled',
        value: '15.2M+',
        change: '+55%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.vrf.v2_5Adoption',
        value: '78%',
        change: '+12%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.vrf.avgFulfillmentTime',
        value: '< 60s',
        change: '-10%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.vrf.gamingUsage',
        value: '45%',
        change: '+8%',
        changeType: 'positive',
      },
    ],
    features: [
      t('chainlink.services.vrf.feature1', { defaultValue: 'Cryptographically proven randomness' }),
      t('chainlink.services.vrf.feature2', { defaultValue: 'On-chain verification' }),
      t('chainlink.services.vrf.feature3', { defaultValue: 'VRF V2.5 with native payment' }),
      t('chainlink.services.vrf.feature4', { defaultValue: 'Custom callback gas limit' }),
      t('chainlink.services.vrf.feature5', { defaultValue: 'Multiple random numbers per request' }),
    ],
    useCases: [
      t('chainlink.services.vrf.useCase1', { defaultValue: 'NFT minting' }),
      t('chainlink.services.vrf.useCase2', { defaultValue: 'Gaming & gambling' }),
      t('chainlink.services.vrf.useCase3', { defaultValue: 'Random giveaways' }),
      t('chainlink.services.vrf.useCase4', { defaultValue: 'Fair selection' }),
    ],
    color: 'pink',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
  },
  {
    id: 'por',
    name: t('chainlink.services.por.name'),
    description: t('chainlink.services.por.description'),
    status: 'active',
    metrics: [
      {
        label: 'chainlink.services.por.assetsMonitored',
        value: '25+',
        change: '+5',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.por.valueAttested',
        value: '$45B+',
        change: '+15%',
        changeType: 'positive',
      },
      {
        label: 'chainlink.services.por.auditFrequency',
        value: 'Real-time',
        change: '-',
        changeType: 'neutral',
      },
      {
        label: 'chainlink.services.por.integratedProtocols',
        value: '12',
        change: '+2',
        changeType: 'positive',
      },
    ],
    features: [
      t('chainlink.services.por.feature1', { defaultValue: 'Real-time reserve monitoring' }),
      t('chainlink.services.por.feature2', { defaultValue: 'Multi-signature verification' }),
      t('chainlink.services.por.feature3', { defaultValue: 'Automated attestations' }),
      t('chainlink.services.por.feature4', { defaultValue: 'Cross-chain reserve tracking' }),
      t('chainlink.services.por.feature5', { defaultValue: 'DeFi collateral verification' }),
    ],
    useCases: [
      t('chainlink.services.por.useCase1', { defaultValue: 'Stablecoin transparency' }),
      t('chainlink.services.por.useCase2', { defaultValue: 'Wrapped assets' }),
      t('chainlink.services.por.useCase3', { defaultValue: 'Cross-chain bridges' }),
      t('chainlink.services.por.useCase4', { defaultValue: 'DeFi collateral' }),
    ],
    color: 'amber',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

const getCcipChainData = (t: ReturnType<typeof useTranslations>) => [
  { name: t('chains.ethereum', { defaultValue: 'Ethereum' }), messages: 850000, value: 5200000000 },
  { name: t('chains.arbitrum', { defaultValue: 'Arbitrum' }), messages: 420000, value: 1800000000 },
  { name: t('chains.optimism', { defaultValue: 'Optimism' }), messages: 380000, value: 1500000000 },
  { name: t('chains.polygon', { defaultValue: 'Polygon' }), messages: 320000, value: 1200000000 },
  { name: t('chains.base', { defaultValue: 'Base' }), messages: 280000, value: 980000000 },
  {
    name: t('chains.avalanche', { defaultValue: 'Avalanche' }),
    messages: 150000,
    value: 650000000,
  },
];

export function ChainlinkServicesPanel() {
  const t = useTranslations();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const servicesData = getServicesData(t);
  const ccipChainData = getCcipChainData(t);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
      case 'beta':
        return 'bg-amber-50 border border-amber-200 text-amber-700';
      case 'coming_soon':
        return 'bg-gray-50 border border-gray-200 text-gray-500';
      default:
        return 'bg-gray-50 border border-gray-200 text-gray-500';
    }
  };

  const getServiceColor = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; lightBg: string }> =
      {
        blue: {
          bg: 'bg-primary-50',
          border: 'border-primary-200',
          text: 'text-primary-700',
          lightBg: 'bg-primary-50/50',
        },
        purple: {
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          text: 'text-indigo-700',
          lightBg: 'bg-indigo-50/50',
        },
        green: {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          lightBg: 'bg-emerald-50/50',
        },
        pink: {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-700',
          lightBg: 'bg-rose-50/50',
        },
        amber: {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          lightBg: 'bg-amber-50/50',
        },
      };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* Services Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title={t('chainlink.services.totalServices')}>
          <div className="text-3xl font-bold text-gray-900">5</div>
          <div className="text-sm text-gray-500 mt-1">{t('chainlink.services.activeServices')}</div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.services.totalRequests')}>
          <div className="text-3xl font-bold text-gray-900">26.6M+</div>
          <div className="text-sm text-success-600 mt-1">
            +35% {t('chainlink.services.thisMonth')}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.services.totalValueSecured')}>
          <div className="text-3xl font-bold text-gray-900">$58B+</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.services.acrossAllServices')}
          </div>
        </DashboardCard>

        <DashboardCard title={t('chainlink.services.avgUptime')}>
          <div className="text-3xl font-bold text-success-600">99.97%</div>
          <div className="text-sm text-gray-500 mt-1">
            {t('chainlink.services.serviceAvailability')}
          </div>
        </DashboardCard>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {servicesData.map((service) => {
          const colors = getServiceColor(service.color);
          return (
            <DashboardCard
              key={service.id}
              title={
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {service.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{service.name}</div>
                    <span className={`px-2 py-0.5 text-xs ${getStatusColor(service.status)}`}>
                      {t(`chainlink.services.status.${service.status}`)}
                    </span>
                  </div>
                </div>
              }
              className={`cursor-pointer transition-all ${
                selectedService === service.id
                  ? `border-primary-400 ${colors.lightBg}`
                  : 'hover:border-gray-300'
              }`}
            >
              <p className="text-sm text-gray-600 mb-4">{service.description}</p>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {service.metrics.slice(0, 2).map((metric, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500">{t(metric.label)}</div>
                    <div className="text-lg font-semibold text-gray-900 tracking-tight">
                      {metric.value}
                    </div>
                    {metric.change && (
                      <div
                        className={`text-xs font-medium ${
                          metric.changeType === 'positive' ? 'text-emerald-600' : 'text-danger-600'
                        }`}
                      >
                        {metric.change}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-700">
                  {t('chainlink.services.keyFeatures')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {service.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-50 border border-gray-100 text-gray-600 text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </DashboardCard>
          );
        })}
      </div>

      {/* CCIP Cross-Chain Activity */}
      <DashboardCard title={t('chainlink.services.ccip.crossChainActivity')}>
        <div className="space-y-4">
          {ccipChainData.map((chain) => (
            <div key={chain.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary-600"></div>
                <span className="text-sm text-gray-700">{chain.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {(chain.messages / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('chainlink.services.ccip.messages')}
                  </div>
                </div>
                <div className="w-32 h-1.5 bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-primary-600"
                    style={{ width: `${(chain.messages / 850000) * 100}%` }}
                  ></div>
                </div>
                <div className="text-right w-20">
                  <div className="text-sm font-semibold text-gray-900">
                    ${(chain.value / 1e9).toFixed(1)}B
                  </div>
                  <div className="text-xs text-gray-500">{t('chainlink.services.ccip.value')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Service Comparison Table */}
      <DashboardCard title={t('chainlink.services.comparison')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-gray-600 font-medium">
                  {t('chainlink.services.serviceName')}
                </th>
                <th className="text-right py-3 text-gray-600 font-medium">
                  {t('chainlink.services.requests')}
                </th>
                <th className="text-right py-3 text-gray-600 font-medium">
                  {t('chainlink.services.avgResponse')}
                </th>
                <th className="text-center py-3 text-gray-600 font-medium">
                  {t('chainlink.services.status.status')}
                </th>
                <th className="text-left py-3 text-gray-600 font-medium">
                  {t('chainlink.services.topUseCases')}
                </th>
              </tr>
            </thead>
            <tbody>
              {servicesData.map((service) => (
                <tr key={service.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={getServiceColor(service.color).text}>{service.icon}</span>
                      <span className="font-medium text-gray-900">{service.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-600">{service.metrics[0].value}</td>
                  <td className="py-3 text-right text-gray-600">{service.metrics[2].value}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-1 text-xs ${getStatusColor(service.status)}`}>
                      {t(`chainlink.services.status.${service.status}`)}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {service.useCases.slice(0, 2).map((useCase, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-50 border border-gray-100 text-gray-600 text-xs"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
