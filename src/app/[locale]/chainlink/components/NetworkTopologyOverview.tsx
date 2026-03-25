'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { cn } from '@/lib/utils';
import {
  Database,
  Server,
  FileCode,
  ArrowRight,
  Shield,
  Globe,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { formatCompactNumberWithDecimals } from '@/lib/utils/format';

interface LayerData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  metrics: {
    label: string;
    value: string;
    subValue?: string;
  }[];
  nodes: {
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    count?: number;
  }[];
}

interface NetworkTopologyOverviewProps {
  className?: string;
}

export function NetworkTopologyOverview({
  className,
}: NetworkTopologyOverviewProps) {
  const t = useTranslations();

  const layers = useMemo<LayerData[]>(() => {
    return [
      {
        id: 'dataSources',
        name: t('chainlink.network.dataSources'),
        icon: <Database className="w-5 h-5" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-100',
        metrics: [
          {
            label: t('chainlink.network.activeSources'),
            value: '2,847',
          },
          {
            label: t('chainlink.network.dataFeeds'),
            value: '1,243',
          },
        ],
        nodes: [
          { name: 'CEX APIs', status: 'healthy', count: 156 },
          { name: 'DEX Liquidity', status: 'healthy', count: 89 },
          { name: 'Aggregators', status: 'healthy', count: 234 },
          { name: 'Off-chain Data', status: 'warning', count: 45 },
        ],
      },
      {
        id: 'oracleNodes',
        name: t('chainlink.network.oracleNodes'),
        icon: <Server className="w-5 h-5" />,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 border-emerald-100',
        metrics: [
          {
            label: t('chainlink.network.activeNodes'),
            value: '1,847',
            subValue: '+23 this week',
          },
          {
            label: t('chainlink.network.avgUptime'),
            value: '99.94%',
          },
        ],
        nodes: [
          { name: 'Validator Nodes', status: 'healthy', count: 1245 },
          { name: 'Oracle Nodes', status: 'healthy', count: 523 },
          { name: 'Backup Nodes', status: 'healthy', count: 79 },
        ],
      },
      {
        id: 'consumerContracts',
        name: t('chainlink.network.consumerContracts'),
        icon: <FileCode className="w-5 h-5" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 border-purple-100',
        metrics: [
          {
            label: t('chainlink.network.activeContracts'),
            value: '4,521',
          },
          {
            label: t('chainlink.network.dailyRequests'),
            value: formatCompactNumberWithDecimals(12500000),
          },
        ],
        nodes: [
          { name: 'DeFi Protocols', status: 'healthy', count: 1892 },
          { name: 'NFT Projects', status: 'healthy', count: 756 },
          { name: 'Gaming', status: 'healthy', count: 423 },
          { name: 'Enterprise', status: 'healthy', count: 234 },
        ],
      },
    ];
  }, [t]);

  const networkStats = useMemo(
    () => [
      {
        icon: <Shield className="w-4 h-4" />,
        label: t('chainlink.network.securityScore'),
        value: '98.5',
        unit: '/100',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      },
      {
        icon: <Globe className="w-4 h-4" />,
        label: t('chainlink.network.decentralization'),
        value: '94.2',
        unit: '%',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        icon: <CheckCircle className="w-4 h-4" />,
        label: t('chainlink.network.reliability'),
        value: '99.97',
        unit: '%',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      {
        icon: <Activity className="w-4 h-4" />,
        label: t('chainlink.network.networkHealth'),
        value: 'Excellent',
        unit: '',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      },
    ],
    [t]
  );

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <DashboardCard
      title={
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <span>{t('chainlink.network.networkTopologyOverview')}</span>
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {networkStats.map((stat, index) => (
            <div
              key={index}
              className={cn(
                'p-3 border rounded-lg',
                stat.bgColor,
                stat.bgColor.replace('bg-', 'border-').replace('50', '100')
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={stat.color}>{stat.icon}</div>
                <span className={cn('text-xs', stat.color)}>{stat.label}</span>
              </div>
              <p className={cn('text-xl font-bold', stat.color)}>
                {stat.value}
                <span className="text-sm font-normal">{stat.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {layers.map((layer, index) => (
              <div key={layer.id} className="relative">
                <div
                  className={cn(
                    'p-4 border rounded-lg h-full',
                    layer.bgColor
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        'p-2 rounded-lg bg-white border',
                        layer.color,
                        layer.bgColor.replace('bg-', 'border-').replace('50', '100')
                      )}
                    >
                      {layer.icon}
                    </div>
                    <div>
                      <h4 className={cn('font-semibold', layer.color)}>
                        {layer.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {t('chainlink.network.layer')} {index + 1}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {layer.metrics.map((metric, idx) => (
                      <div key={idx}>
                        <p className="text-xs text-gray-500">{metric.label}</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {metric.value}
                        </p>
                        {metric.subValue && (
                          <p className="text-xs text-emerald-600">
                            {metric.subValue}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-200/50">
                    <p className="text-xs text-gray-500 mb-2">
                      {t('chainlink.network.components')}
                    </p>
                    <div className="space-y-1.5">
                      {layer.nodes.map((node, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                getStatusColor(node.status)
                              )}
                            />
                            <span className="text-gray-700">{node.name}</span>
                          </div>
                          {node.count && (
                            <span className="text-gray-500 text-xs">
                              {node.count.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {index < layers.length - 1 && (
                  <>
                    <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <div className="bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex md:hidden justify-center py-2">
                      <div className="bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                        <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{t('chainlink.network.healthy')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{t('chainlink.network.warning')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{t('chainlink.network.critical')}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {t('chainlink.network.dataFlow')}: {t('chainlink.network.sourcesToConsumers')}
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
