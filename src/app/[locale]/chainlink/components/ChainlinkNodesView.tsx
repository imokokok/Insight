'use client';

import { useState, useEffect } from 'react';

import {
  Server,
  TrendingUp,
  Globe,
  Award,
  Activity,
  Clock,
  Shield,
  Wallet,
  BarChart3,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type NodeData, type ChainlinkDataTableProps } from '../types';
import { getChainlinkService } from '../services/chainlinkService';

import { ChainlinkDataTable } from './ChainlinkDataTable';
import { NodeEarningsPanel } from './NodeEarningsPanel';
import { NodePerformanceTrends } from './NodePerformanceTrends';
import { StakingRewardsCalculator } from './StakingRewardsCalculator';

export function ChainlinkNodesView() {
  const t = useTranslations();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchNodes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const service = getChainlinkService();
        const nodeData = await service.getNodes();
        setNodes(nodeData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load node data'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchNodes();
  }, []);

  const regionStats = nodes.reduce((acc, node) => {
    const region = node.region;
    const existing = acc.find((r) => r.region === region);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ region, count: 1, percentage: 0 });
    }
    return acc;
  }, [] as { region: string; count: number; percentage: number }[]);

  regionStats.forEach((r) => {
    r.percentage = nodes.length > 0 ? Math.round((r.count / nodes.length) * 100) : 0;
  });

  const columns: ChainlinkDataTableProps<NodeData>['columns'] = [
    { key: 'name', header: t('chainlink.nodes.name'), sortable: true },
    { key: 'region', header: t('chainlink.nodes.region'), sortable: true },
    {
      key: 'responseTime',
      header: t('chainlink.nodes.responseTime'),
      sortable: true,
      render: (item) => `${item.responseTime}ms`,
    },
    {
      key: 'successRate',
      header: t('chainlink.nodes.successRate'),
      sortable: true,
      render: (item) => `${item.successRate}%`,
    },
    {
      key: 'reputation',
      header: t('chainlink.nodes.reputation'),
      sortable: true,
      render: (item) => (
        <span
          className={`font-medium ${item.reputation >= 95 ? 'text-emerald-600' : item.reputation >= 90 ? 'text-amber-600' : 'text-gray-600'}`}
        >
          {item.reputation}
        </span>
      ),
    },
    {
      key: 'stakedAmount',
      header: t('chainlink.nodes.staked'),
      sortable: true,
      render: (item) => `${(item.stakedAmount / 1e6).toFixed(2)}M LINK`,
    },
  ];

  const totalStaked = nodes.reduce((acc, n) => acc + n.stakedAmount, 0);
  const avgSuccessRate =
    nodes.length > 0
      ? (nodes.reduce((acc, n) => acc + n.successRate, 0) / nodes.length).toFixed(1)
      : '0';
  const avgResponseTime =
    nodes.length > 0
      ? Math.round(nodes.reduce((acc, n) => acc + n.responseTime, 0) / nodes.length)
      : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">{t('common.loading')}</span>
      </div>
    );
  }

  if (error && nodes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('chainlink.nodes.dataUnavailable')}</h3>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Server className="w-10 h-10 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('chainlink.nodes.noNodesFound')}</h3>
        <p className="text-sm text-gray-500">{t('chainlink.nodes.noNodesDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.total')}</span>
          <span className="text-lg font-semibold text-gray-900">{nodes.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.avgResponse')}</span>
          <span className="text-lg font-semibold text-gray-900">{avgResponseTime}ms</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.avgSuccess')}</span>
          <span className="text-lg font-semibold text-emerald-600">{avgSuccessRate}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">{t('chainlink.nodes.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {(totalStaked / 1e6).toFixed(1)}M LINK
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-medium text-gray-900">
              {t('chainlink.nodes.activeNodes')}
            </h2>
          </div>
          <ChainlinkDataTable<NodeData> data={nodes} columns={columns} />
        </div>

        <div className="space-y-8">
          <section>
            <StakingRewardsCalculator />
          </section>

          {regionStats.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">
                  {t('chainlink.nodes.regionDistribution')}
                </h3>
              </div>
              <div className="space-y-4">
                {regionStats.map((stat, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600">{stat.region}</span>
                      <span className="font-medium text-gray-900">
                        {stat.count} <span className="text-gray-400">({stat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gray-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">{t('chainlink.nodes.overview')}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chainlink.nodes.avgReputation')}</span>
                <span className="font-medium text-gray-900">
                  {nodes.length > 0
                    ? (nodes.reduce((acc, n) => acc + n.reputation, 0) / nodes.length).toFixed(1)
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chainlink.nodes.topPerformers')}</span>
                <span className="font-medium text-gray-900">
                  {nodes.filter((n) => n.reputation >= 95).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('chainlink.nodes.regions')}</span>
                <span className="font-medium text-gray-900">{regionStats.length}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-gray-200 my-8" />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-medium text-gray-900">
            {t('chainlink.nodes.earningsAnalysis')}
          </h2>
        </div>
        <NodeEarningsPanel nodes={nodes} />
      </section>

      <div className="border-t border-gray-200 my-8" />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-medium text-gray-900">
            {t('chainlink.nodes.performanceTrends')}
          </h2>
        </div>
        <NodePerformanceTrends nodes={nodes} />
      </section>
    </div>
  );
}
