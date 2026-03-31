'use client';

import { useState } from 'react';

import { Activity, Server, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

import { AirnodeGeoMap, type AirnodeNode } from '@/components/oracle/charts/AirnodeGeoMap';
import {
  NetworkTopologyChart,
  type NetworkNode,
  type NetworkConnection,
} from '@/components/oracle/charts/NetworkTopologyChart';
import { useTranslations } from '@/i18n';

import { type API3NetworkViewProps } from '../types';

const mockAirnodes: AirnodeNode[] = [
  {
    id: 'airnode-1',
    name: 'Airnode-US-East',
    region: 'North America',
    coordinates: [-74.006, 40.7128],
    responseTime: 45,
    successRate: 99.9,
    reputation: 98,
    stakedAmount: 125000,
    status: 'active',
    chains: ['Ethereum', 'Arbitrum', 'Optimism'],
  },
  {
    id: 'airnode-2',
    name: 'Airnode-US-West',
    region: 'North America',
    coordinates: [-122.4194, 37.7749],
    responseTime: 52,
    successRate: 99.8,
    reputation: 96,
    stakedAmount: 98000,
    status: 'active',
    chains: ['Ethereum', 'Polygon'],
  },
  {
    id: 'airnode-3',
    name: 'Airnode-EU-Frankfurt',
    region: 'Europe',
    coordinates: [8.6821, 50.1109],
    responseTime: 38,
    successRate: 99.95,
    reputation: 99,
    stakedAmount: 156000,
    status: 'active',
    chains: ['Ethereum', 'Avalanche', 'Base'],
  },
  {
    id: 'airnode-4',
    name: 'Airnode-EU-London',
    region: 'Europe',
    coordinates: [-0.1276, 51.5074],
    responseTime: 42,
    successRate: 99.85,
    reputation: 97,
    stakedAmount: 89000,
    status: 'active',
    chains: ['Ethereum', 'BNB Chain'],
  },
  {
    id: 'airnode-5',
    name: 'Airnode-Asia-Singapore',
    region: 'Asia',
    coordinates: [103.8198, 1.3521],
    responseTime: 65,
    successRate: 99.7,
    reputation: 94,
    stakedAmount: 75000,
    status: 'active',
    chains: ['Ethereum', 'Polygon', 'Avalanche'],
  },
  {
    id: 'airnode-6',
    name: 'Airnode-Asia-Tokyo',
    region: 'Asia',
    coordinates: [139.6917, 35.6895],
    responseTime: 58,
    successRate: 99.8,
    reputation: 95,
    stakedAmount: 112000,
    status: 'active',
    chains: ['Ethereum', 'Arbitrum'],
  },
  {
    id: 'airnode-7',
    name: 'Airnode-EU-Amsterdam',
    region: 'Europe',
    coordinates: [4.9041, 52.3676],
    responseTime: 40,
    successRate: 99.88,
    reputation: 96,
    stakedAmount: 95000,
    status: 'degraded',
    chains: ['Ethereum', 'Optimism'],
  },
  {
    id: 'airnode-8',
    name: 'Airnode-US-Chicago',
    region: 'North America',
    coordinates: [-87.6298, 41.8781],
    responseTime: 48,
    successRate: 99.75,
    reputation: 93,
    stakedAmount: 67000,
    status: 'active',
    chains: ['Ethereum', 'Base'],
  },
];

const mockTopologyNodes: NetworkNode[] = [
  {
    id: 'source-1',
    name: 'Binance',
    type: 'source',
    status: 'active',
    x: 100,
    y: 100,
    connections: ['airnode-1'],
    metadata: { provider: 'Binance' },
  },
  {
    id: 'source-2',
    name: 'Coinbase',
    type: 'source',
    status: 'active',
    x: 100,
    y: 200,
    connections: ['airnode-1'],
    metadata: { provider: 'Coinbase' },
  },
  {
    id: 'source-3',
    name: 'Kraken',
    type: 'source',
    status: 'active',
    x: 100,
    y: 300,
    connections: ['airnode-2'],
    metadata: { provider: 'Kraken' },
  },
  {
    id: 'airnode-1',
    name: 'Airnode US-East',
    type: 'airnode',
    status: 'active',
    x: 300,
    y: 150,
    connections: ['dapi-eth'],
    metadata: { responseTime: 45, reliability: 99.9 },
  },
  {
    id: 'airnode-2',
    name: 'Airnode EU-Frankfurt',
    type: 'airnode',
    status: 'active',
    x: 300,
    y: 300,
    connections: ['dapi-eth'],
    metadata: { responseTime: 38, reliability: 99.95 },
  },
  {
    id: 'dapi-eth',
    name: 'ETH/USD dAPI',
    type: 'dapi',
    status: 'active',
    x: 500,
    y: 225,
    connections: ['chain-eth', 'chain-arb'],
    metadata: { reliability: 99.98 },
  },
  {
    id: 'chain-eth',
    name: 'Ethereum',
    type: 'chain',
    status: 'active',
    x: 700,
    y: 150,
    connections: [],
    metadata: { chain: 'Ethereum' },
  },
  {
    id: 'chain-arb',
    name: 'Arbitrum',
    type: 'chain',
    status: 'active',
    x: 700,
    y: 300,
    connections: [],
    metadata: { chain: 'Arbitrum' },
  },
];

const mockTopologyConnections: NetworkConnection[] = [
  { id: 'conn-1', source: 'source-1', target: 'airnode-1', status: 'healthy', latency: 15 },
  { id: 'conn-2', source: 'source-2', target: 'airnode-1', status: 'healthy', latency: 12 },
  { id: 'conn-3', source: 'source-3', target: 'airnode-2', status: 'healthy', latency: 18 },
  { id: 'conn-4', source: 'airnode-1', target: 'dapi-eth', status: 'healthy', latency: 25 },
  { id: 'conn-5', source: 'airnode-2', target: 'dapi-eth', status: 'healthy', latency: 22 },
  { id: 'conn-6', source: 'dapi-eth', target: 'chain-eth', status: 'healthy', latency: 150 },
  { id: 'conn-7', source: 'dapi-eth', target: 'chain-arb', status: 'healthy', latency: 80 },
];

export function API3NetworkView({ config, networkStats }: API3NetworkViewProps) {
  const t = useTranslations();
  const [selectedAirnode, setSelectedAirnode] = useState<AirnodeNode | null>(null);

  const networkData = networkStats || config.networkData;

  const metrics = [
    {
      label: t('api3.network.activeAirnodes'),
      value: networkData.activeNodes?.toLocaleString() || '50',
      change: '+3%',
      trend: 'up',
      icon: Server,
    },
    {
      label: t('api3.network.dapiFeeds'),
      value: networkData.dataFeeds?.toLocaleString() || '150',
      change: '+8%',
      trend: 'up',
      icon: Activity,
    },
    {
      label: t('api3.network.responseTime'),
      value: `${networkData.avgResponseTime || 200}ms`,
      change: '-5%',
      trend: 'down',
      icon: Clock,
    },
    {
      label: t('api3.network.uptime'),
      value: `${networkData.nodeUptime || 99.8}%`,
      change: null,
      trend: null,
      icon: CheckCircle,
    },
  ];

  const overviewStats = [
    { label: t('api3.network.totalRequests'), value: '1.2M' },
    { label: t('api3.network.avgGas'), value: '62,340' },
    { label: t('api3.network.activeChains'), value: '8' },
    { label: t('api3.network.nodeOperators'), value: '85' },
  ];

  const handleAirnodeClick = (node: AirnodeNode) => {
    setSelectedAirnode(node);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  {metric.value}
                </p>
                {metric.change && (
                  <div
                    className={`flex items-center gap-0.5 text-sm font-medium ${
                      metric.trend === 'up'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <TrendIcon className="w-3.5 h-3.5" />
                    <span>{metric.change}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
          {t('api3.airnode.regionDistribution')}
        </h3>
        <AirnodeGeoMap nodes={mockAirnodes} onNodeClick={handleAirnodeClick} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
          {t('api3.network.topology')}
        </h3>
        <NetworkTopologyChart nodes={mockTopologyNodes} connections={mockTopologyConnections} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              {t('api3.network.hourlyActivity')}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">24h</span>
          </div>
          <div className="h-40 flex items-end gap-0.5">
            {config.networkData.hourlyActivity?.map((value, index) => {
              const max = Math.max(...(config.networkData.hourlyActivity || []));
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 dark:bg-emerald-500/30 dark:hover:bg-emerald-500/40 transition-colors rounded-t"
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${value.toLocaleString()} requests`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-5">
            {t('api3.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('api3.network.successRate')}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">99.8%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.8%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('api3.network.availability')}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">99.9%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('api3.network.latency')}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">200ms avg</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
          {t('api3.network.overview')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {overviewStats.map((stat, index) => (
            <div key={index}>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
