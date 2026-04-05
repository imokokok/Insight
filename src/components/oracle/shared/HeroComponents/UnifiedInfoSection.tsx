'use client';

import { useMemo } from 'react';

import { Activity, Zap, Clock, Server, Globe } from 'lucide-react';

export interface NetworkStatsData {
  avgResponseTime?: number;
  nodeUptime?: number;
  dataFeeds?: number;
}

export interface UnifiedInfoSectionProps {
  networkStats?: NetworkStatsData;
  healthScore: number;
  chains: string[];
  themeColor: string;
  labels?: {
    healthScore: string;
    gas: string;
    response: string;
    online: string;
    support: string;
    chains: string;
    gasLow: string;
    gasMedium: string;
    gasHigh: string;
  };
}

export function UnifiedInfoSection({
  networkStats,
  healthScore,
  chains,
  themeColor,
  labels = {
    healthScore: 'Health',
    gas: 'Gas',
    response: 'Response',
    online: 'Online',
    support: 'Chains',
    chains: 'chains',
    gasLow: 'Low',
    gasMedium: 'Medium',
    gasHigh: 'High',
  },
}: UnifiedInfoSectionProps) {
  const getHealthColor = () => {
    if (healthScore >= 90) return 'text-emerald-600';
    if (healthScore >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = () => {
    if (healthScore >= 90) return 'bg-emerald-500';
    if (healthScore >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const gasLevel = useMemo(() => {
    if (!networkStats?.avgResponseTime)
      return {
        label: labels.gasMedium,
        color: 'text-yellow-600',
        bg: 'bg-yellow-500',
        width: '50%',
      };
    const avgResponseTime = networkStats.avgResponseTime;
    if (avgResponseTime < 150)
      return {
        label: labels.gasLow,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500',
        width: '30%',
      };
    if (avgResponseTime < 300)
      return {
        label: labels.gasMedium,
        color: 'text-yellow-600',
        bg: 'bg-yellow-500',
        width: '50%',
      };
    return { label: labels.gasHigh, color: 'text-red-600', bg: 'bg-red-500', width: '80%' };
  }, [networkStats, labels]);

  const displayChains = chains.slice(0, 3);
  const remainingCount = Math.max(0, chains.length - 3);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Activity className="w-3.5 h-3.5" />
          <span>{labels.healthScore}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getHealthBgColor()}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <span className={`text-xs font-semibold ${getHealthColor()}`}>{healthScore}</span>
        </div>
      </div>

      <div className="hidden sm:block w-px h-4 bg-gray-200" />

      {networkStats && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="w-3.5 h-3.5" />
              <span>{labels.gas}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${gasLevel.bg}`}
                  style={{ width: gasLevel.width }}
                />
              </div>
              <span className={`text-[10px] font-medium ${gasLevel.color}`}>{gasLevel.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{labels.response}</span>
            <span className="text-xs font-medium text-gray-900">
              {networkStats.avgResponseTime}ms
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{labels.online}</span>
            <span className="text-xs font-medium text-gray-900">{networkStats.nodeUptime}%</span>
          </div>
        </div>
      )}

      <div className="hidden sm:block w-px h-4 bg-gray-200" />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Globe className="w-3.5 h-3.5" />
          <span>{labels.support}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: themeColor }}>
            {chains.length}+ {labels.chains}
          </span>
          <div className="flex -space-x-1">
            {displayChains.map((chain, index) => (
              <div
                key={index}
                className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-medium text-gray-600"
                title={chain}
              >
                {chain.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
          {remainingCount > 0 && (
            <span className="text-[10px] text-gray-400">+{remainingCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}
