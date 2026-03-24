'use client';

import { useTranslations } from 'next-intl';
import { ChainlinkDataTable } from './ChainlinkDataTable';
import { NodeData } from '../types';

const mockNodes: NodeData[] = [
  { id: '1', name: 'LinkPool', region: 'North America', responseTime: 120, successRate: 99.9, reputation: 98.5, stakedAmount: 2500000 },
  { id: '2', name: 'Certus One', region: 'Europe', responseTime: 135, successRate: 99.8, reputation: 97.2, stakedAmount: 1800000 },
  { id: '3', name: 'Fiews', region: 'North America', responseTime: 110, successRate: 99.9, reputation: 96.8, stakedAmount: 2200000 },
  { id: '4', name: 'Everstake', region: 'Europe', responseTime: 145, successRate: 99.7, reputation: 95.5, stakedAmount: 1500000 },
  { id: '5', name: 'Figment', region: 'North America', responseTime: 125, successRate: 99.8, reputation: 94.9, stakedAmount: 1900000 },
  { id: '6', name: 'Staked', region: 'Asia', responseTime: 155, successRate: 99.6, reputation: 93.8, stakedAmount: 1200000 },
  { id: '7', name: 'Blockdaemon', region: 'Europe', responseTime: 140, successRate: 99.7, reputation: 93.2, stakedAmount: 1600000 },
  { id: '8', name: 'Chorus One', region: 'Europe', responseTime: 130, successRate: 99.8, reputation: 92.5, stakedAmount: 1400000 },
];

const regionStats = [
  { region: 'North America', count: 4, percentage: 50 },
  { region: 'Europe', count: 3, percentage: 37.5 },
  { region: 'Asia', count: 1, percentage: 12.5 },
];

export function ChainlinkNodesView() {
  const t = useTranslations();

  const columns = [
    { key: 'name', header: t('chainlink.nodes.name'), sortable: true },
    { key: 'region', header: t('chainlink.nodes.region'), sortable: true },
    {
      key: 'responseTime',
      header: t('chainlink.nodes.responseTime'),
      sortable: true,
      render: (item: NodeData) => `${item.responseTime}ms`,
    },
    {
      key: 'successRate',
      header: t('chainlink.nodes.successRate'),
      sortable: true,
      render: (item: NodeData) => `${item.successRate}%`,
    },
    {
      key: 'reputation',
      header: t('chainlink.nodes.reputation'),
      sortable: true,
      render: (item: NodeData) => (
        <span className={`font-medium ${item.reputation >= 95 ? 'text-emerald-600' : item.reputation >= 90 ? 'text-amber-600' : 'text-gray-600'}`}>
          {item.reputation}
        </span>
      ),
    },
    {
      key: 'stakedAmount',
      header: t('chainlink.nodes.staked'),
      sortable: true,
      render: (item: NodeData) => `${(item.stakedAmount / 1e6).toFixed(2)}M LINK`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <ChainlinkDataTable data={mockNodes as unknown as Record<string, unknown>[]} columns={columns as unknown as Array<{key: string; header: string; width?: string; sortable?: boolean; render?: (item: Record<string, unknown>) => React.ReactNode}>} />
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('chainlink.nodes.regionDistribution')}
            </h3>
            <div className="space-y-3">
              {regionStats.map((stat, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{stat.region}</span>
                    <span className="font-medium text-gray-900">{stat.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('chainlink.nodes.overview')}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.nodes.total')}</span>
                <span className="font-medium">{mockNodes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.nodes.avgResponse')}</span>
                <span className="font-medium">
                  {Math.round(mockNodes.reduce((acc, n) => acc + n.responseTime, 0) / mockNodes.length)}ms
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.nodes.avgSuccess')}</span>
                <span className="font-medium text-emerald-600">
                  {(mockNodes.reduce((acc, n) => acc + n.successRate, 0) / mockNodes.length).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('chainlink.nodes.totalStaked')}</span>
                <span className="font-medium">
                  {(mockNodes.reduce((acc, n) => acc + n.stakedAmount, 0) / 1e6).toFixed(2)}M LINK
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
