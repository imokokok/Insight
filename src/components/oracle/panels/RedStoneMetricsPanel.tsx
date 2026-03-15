'use client';

import { useState, useEffect } from 'react';
import { RedStoneClient, RedStoneMetrics, RedStoneProviderInfo } from '@/lib/oracles';
import { DashboardCard } from '../common/DashboardCard';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('RedStoneMetricsPanel');

interface RedStoneMetricsPanelProps {
  client: RedStoneClient;
}

export function RedStoneMetricsPanel({ client }: RedStoneMetricsPanelProps) {
  const [metrics, setMetrics] = useState<RedStoneMetrics | null>(null);
  const [providers, setProviders] = useState<RedStoneProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRedStoneData() {
      try {
        setLoading(true);
        const [metricsData, providersData] = await Promise.all([
          client.getRedStoneMetrics(),
          client.getDataProviders(),
        ]);
        setMetrics(metricsData);
        setProviders(providersData);
      } catch (error) {
        logger.error('Failed to fetch RedStone metrics', error as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchRedStoneData();
    const interval = setInterval(fetchRedStoneData, 30000);
    return () => clearInterval(interval);
  }, [client]);

  if (loading) {
    return (
      <DashboardCard title="RedStone 核心指标">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title="模块化费用" className="bg-gradient-to-br from-red-50 to-orange-50">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">
              {metrics ? `$${metrics.modularFee.toFixed(4)}` : '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">每次数据拉取</p>
            <div className="mt-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              比传统模式节省 70%
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="数据新鲜度分数" className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {metrics ? `${metrics.dataFreshnessScore.toFixed(1)}` : '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">/ 100</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.dataFreshnessScore ?? 0}%` }}
              ></div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="数据提供者数量"
          className="bg-gradient-to-br from-purple-50 to-pink-50"
        >
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {metrics ? metrics.providerCount : '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">活跃提供者</p>
            <div className="mt-2 inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              去中心化网络
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="平均声誉评分"
          className="bg-gradient-to-br from-green-50 to-emerald-50"
        >
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {metrics ? `${(metrics.avgProviderReputation * 100).toFixed(0)}%` : '-'}
            </p>
            <p className="text-sm text-gray-500 mt-1">提供者信誉</p>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round((metrics?.avgProviderReputation ?? 0) * 5)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* 数据提供者列表 */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">数据提供者详情</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  提供者名称
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  声誉评分
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  数据点数
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后更新
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-600 font-medium text-sm">
                          {provider.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900">
                        {(provider.reputation * 100).toFixed(0)}%
                      </span>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${provider.reputation * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {provider.dataPoints.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {new Date(provider.lastUpdate).toLocaleTimeString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RedStone 架构说明 */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">RedStone 模块化架构</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">数据层</h4>
            <p className="text-sm text-gray-600">
              独立的数据提供者网络，通过签名数据包提供高质量价格数据
            </p>
          </div>

          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto bg-orange-500 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">按需拉取</h4>
            <p className="text-sm text-gray-600">
              Pull-based 数据模型，仅在需要时获取数据，大幅降低 Gas 成本
            </p>
          </div>

          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto bg-yellow-500 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">数据验证</h4>
            <p className="text-sm text-gray-600">
              所有数据经过多重签名验证，确保数据的准确性和抗篡改性
            </p>
          </div>
        </div>
      </div>

      {/* 资产覆盖范围 */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">资产覆盖范围</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-gray-900">1000+</p>
            <p className="text-sm text-gray-600">总资产数</p>
          </div>
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-blue-600">500+</p>
            <p className="text-sm text-gray-600">加密货币</p>
          </div>
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-green-600">200+</p>
            <p className="text-sm text-gray-600">长尾资产</p>
          </div>
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-purple-600">50+</p>
            <p className="text-sm text-gray-600">RWA 资产</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'UNI', 'AAVE', 'SNX', 'CRV', 'LDO'].map(
            (asset) => (
              <span
                key={asset}
                className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full"
              >
                {asset}
              </span>
            )
          )}
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
            +990 更多
          </span>
        </div>
      </div>
    </div>
  );
}
