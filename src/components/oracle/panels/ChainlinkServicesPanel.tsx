'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';

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

const servicesData: ServiceData[] = [
  {
    id: 'ccip',
    name: 'CCIP',
    description:
      'Cross-Chain Interoperability Protocol for secure cross-chain messaging and token transfers',
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
      'Arbitrary messaging across chains',
      'Token transfers with lock-and-mint',
      'Programmable token bridge',
      'Rate limiting for security',
      'Risk management network',
    ],
    useCases: [
      'Cross-chain DeFi',
      'Multi-chain NFTs',
      'Cross-chain governance',
      'Interoperable gaming',
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
    name: 'Functions',
    description:
      'Serverless Web3 platform for fetching data from any API and running custom computations',
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
      'Connect to any API',
      'Custom JavaScript computations',
      'Decentralized execution',
      'Secrets management',
      'Serverless architecture',
    ],
    useCases: ['DeFi integrations', 'AI/ML oracles', 'Real-world data', 'Custom price feeds'],
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
    name: 'Automation',
    description: 'Reliable and performant smart contract automation for conditional execution',
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
      'Time-based triggers',
      'Custom logic triggers',
      'Log-based triggers',
      'Off-chain computation',
      'Gas-optimized execution',
    ],
    useCases: ['Liquidation bots', 'Yield harvesting', 'Rebalancing', 'Reward distribution'],
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
    name: 'VRF',
    description: 'Verifiable Random Function for provably fair and tamper-proof randomness',
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
      'Cryptographically proven randomness',
      'On-chain verification',
      'VRF V2.5 with native payment',
      'Custom callback gas limit',
      'Multiple random numbers per request',
    ],
    useCases: ['NFT minting', 'Gaming & gambling', 'Random giveaways', 'Fair selection'],
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
    name: 'Proof of Reserve',
    description: 'Transparent on-chain attestation of off-chain or cross-chain asset reserves',
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
      'Real-time reserve monitoring',
      'Multi-signature verification',
      'Automated attestations',
      'Cross-chain reserve tracking',
      'DeFi collateral verification',
    ],
    useCases: [
      'Stablecoin transparency',
      'Wrapped assets',
      'Cross-chain bridges',
      'DeFi collateral',
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

const ccipChainData = [
  { name: 'Ethereum', messages: 850000, value: 5200000000 },
  { name: 'Arbitrum', messages: 420000, value: 1800000000 },
  { name: 'Optimism', messages: 380000, value: 1500000000 },
  { name: 'Polygon', messages: 320000, value: 1200000000 },
  { name: 'Base', messages: 280000, value: 980000000 },
  { name: 'Avalanche', messages: 150000, value: 650000000 },
];

export function ChainlinkServicesPanel() {
  const t = useTranslations();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'beta':
        return 'bg-yellow-100 text-yellow-700';
      case 'coming_soon':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getServiceColor = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
      pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600' },
      amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
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
          <div className="text-sm text-green-600 mt-1">
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
          <div className="text-3xl font-bold text-green-600">99.97%</div>
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
                  <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>{service.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{service.name}</div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getStatusColor(service.status)}`}
                    >
                      {t(`chainlink.services.status.${service.status}`)}
                    </span>
                  </div>
                </div>
              }
              className={`cursor-pointer transition-all ${
                selectedService === service.id
                  ? `ring-2 ring-blue-500 ${colors.bg}`
                  : 'hover:shadow-md'
              }`}
            >
              <p className="text-sm text-gray-600 mb-4">{service.description}</p>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {service.metrics.slice(0, 2).map((metric, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">{t(metric.label)}</div>
                    <div className="text-lg font-semibold text-gray-900">{metric.value}</div>
                    {metric.change && (
                      <div
                        className={`text-xs ${
                          metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
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
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
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
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">{chain.name}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {(chain.messages / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('chainlink.services.ccip.messages')}
                  </div>
                </div>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(chain.messages / 850000) * 100}%` }}
                  ></div>
                </div>
                <div className="text-right w-20">
                  <div className="text-sm font-medium text-gray-900">
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
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(service.status)}`}>
                      {t(`chainlink.services.status.${service.status}`)}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {service.useCases.slice(0, 2).map((useCase, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
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
