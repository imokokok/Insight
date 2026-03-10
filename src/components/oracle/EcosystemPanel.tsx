'use client';

import { useMemo } from 'react';
import { DashboardCard } from './DashboardCard';
import { IntegratedProtocols } from './IntegratedProtocols';
import { DataSourceCoverage } from './DataSourceCoverage';
import { DataSourceTrend } from './DataSourceTrend';

interface EcosystemStats {
  totalProtocols: number;
  totalTVL: number;
  supportedChains: number;
  totalDataSources: number;
}

const mockStats: EcosystemStats = {
  totalProtocols: 250,
  totalTVL: 45000000000,
  supportedChains: 40,
  totalDataSources: 550,
};

function formatTVL(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className="text-gray-900 text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg text-purple-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function EcosystemPanel() {
  const stats = useMemo(() => mockStats, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="集成协议总数"
          value={stats.totalProtocols.toString()}
          subtitle="使用 Pyth 数据的协议"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
        />
        <StatCard
          title="总锁仓价值 (TVL)"
          value={formatTVL(stats.totalTVL)}
          subtitle="所有协议 TVL 总和"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="支持链数量"
          value={stats.supportedChains.toString()}
          subtitle="跨链覆盖范围"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          }
        />
        <StatCard
          title="数据源总数"
          value={stats.totalDataSources.toString()}
          subtitle="实时价格数据源"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataSourceCoverage />
        <DataSourceTrend />
      </div>

      <IntegratedProtocols />
    </div>
  );
}
