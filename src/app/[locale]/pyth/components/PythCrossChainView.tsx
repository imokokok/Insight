'use client';

import { useMemo } from 'react';
import {
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type PythCrossChainViewProps, type ChainPriceData } from '../types';

const CHAIN_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  solana: { name: 'Solana', color: '#9945FF', icon: '◎' },
  ethereum: { name: 'Ethereum', color: '#627EEA', icon: 'Ξ' },
  arbitrum: { name: 'Arbitrum', color: '#28A0F0', icon: '🔷' },
  optimism: { name: 'Optimism', color: '#FF0420', icon: '🔴' },
  polygon: { name: 'Polygon', color: '#8247E5', icon: '⬡' },
  base: { name: 'Base', color: '#0052FF', icon: '🔵' },
  avalanche: { name: 'Avalanche', color: '#E84142', icon: '🔺' },
  bsc: { name: 'BNB Chain', color: '#F0B90B', icon: '⬛' },
};

function generateMockChainData(): ChainPriceData[] {
  const basePrice = 0.45;
  const chains = Object.keys(CHAIN_CONFIG);

  return chains.map((chain) => {
    const deviation = (Math.random() - 0.5) * 0.8;
    const latency = Math.floor(Math.random() * 300) + 50;
    const statusRandom = Math.random();
    let status: 'online' | 'degraded' | 'offline' = 'online';
    if (statusRandom > 0.95) status = 'offline';
    else if (statusRandom > 0.85) status = 'degraded';

    return {
      chain,
      price: basePrice * (1 + deviation / 100),
      deviation,
      latency,
      status,
      lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 60000)),
    };
  });
}

function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-500';
  if (absDeviation < 0.2) return 'bg-emerald-400';
  if (absDeviation < 0.3) return 'bg-lime-400';
  if (absDeviation < 0.4) return 'bg-yellow-400';
  if (absDeviation < 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

function getDeviationTextColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.2) return 'text-emerald-600';
  if (absDeviation < 0.4) return 'text-amber-600';
  return 'text-red-600';
}

function getStatusIndicator(status: 'online' | 'degraded' | 'offline') {
  switch (status) {
    case 'online':
      return { color: 'bg-emerald-500', pulse: false };
    case 'degraded':
      return { color: 'bg-amber-500', pulse: true };
    case 'offline':
      return { color: 'bg-red-500', pulse: false };
  }
}

function getLatencyColor(latency: number): string {
  if (latency < 100) return 'bg-emerald-500';
  if (latency < 200) return 'bg-amber-500';
  return 'bg-red-500';
}

export function PythCrossChainView({ isLoading }: PythCrossChainViewProps) {
  const t = useTranslations();

  const chainData = useMemo(() => generateMockChainData(), []);

  const wormholeStatus = useMemo(() => {
    const onlineCount = chainData.filter((c) => c.status === 'online').length;
    const totalChains = chainData.length;
    return {
      connected: onlineCount,
      total: totalChains,
      status: onlineCount === totalChains ? 'healthy' : onlineCount > totalChains * 0.8 ? 'degraded' : 'critical',
      lastGuardianUpdate: new Date(Date.now() - Math.floor(Math.random() * 300000)),
    };
  }, [chainData]);

  const stats = useMemo(() => {
    const avgDeviation =
      chainData.reduce((sum, c) => sum + Math.abs(c.deviation), 0) / chainData.length;
    const maxDeviationChain = chainData.reduce((max, c) =>
      Math.abs(c.deviation) > Math.abs(max.deviation) ? c : max
    );
    const onlineCount = chainData.filter((c) => c.status === 'online').length;
    const successRate = (onlineCount / chainData.length) * 100;

    return {
      avgDeviation: avgDeviation.toFixed(3),
      maxDeviationChain: CHAIN_CONFIG[maxDeviationChain.chain]?.name || maxDeviationChain.chain,
      maxDeviationValue: Math.abs(maxDeviationChain.deviation).toFixed(3),
      successRate: successRate.toFixed(1),
    };
  }, [chainData]);

  const sortedByDeviation = useMemo(
    () => [...chainData].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)),
    [chainData]
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">{t('pyth.crossChain.avgDeviation') || '平均价格偏差'}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {stats.avgDeviation}%
          </p>
        </div>

        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{t('pyth.crossChain.maxDeviation') || '最大偏差链'}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {stats.maxDeviationChain}
          </p>
          <p className="text-sm text-red-600">{stats.maxDeviationValue}%</p>
        </div>

        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{t('pyth.crossChain.successRate') || '更新成功率'}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {stats.successRate}%
          </p>
        </div>

        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-sm">{t('pyth.crossChain.wormholeStatus') || 'Wormhole状态'}</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-semibold text-gray-900 tracking-tight">
              {wormholeStatus.connected}/{wormholeStatus.total}
            </p>
            <span
              className={`w-2 h-2 rounded-full ${
                wormholeStatus.status === 'healthy'
                  ? 'bg-emerald-500'
                  : wormholeStatus.status === 'degraded'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">
            {t('pyth.crossChain.priceComparison') || '多链价格对比'}
          </h3>
          <span className="text-sm text-gray-500">
            {t('pyth.crossChain.basePrice') || '基准价格'}: $0.4500
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('pyth.crossChain.chain') || '链'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('pyth.crossChain.price') || '价格'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('pyth.crossChain.deviation') || '偏差'}
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  {t('pyth.crossChain.status') || '状态'}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('pyth.crossChain.latency') || '延迟'}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  {t('pyth.crossChain.lastUpdate') || '最后更新'}
                </th>
              </tr>
            </thead>
            <tbody>
              {chainData.map((data) => {
                const config = CHAIN_CONFIG[data.chain];
                const statusInfo = getStatusIndicator(data.status);
                const timeAgo = Math.floor((Date.now() - data.lastUpdate.getTime()) / 1000);

                return (
                  <tr key={data.chain} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{config?.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{config?.name}</p>
                          <p className="text-xs text-gray-400">{data.chain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-mono text-gray-900">
                        ${data.price.toFixed(4)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className={`w-2 h-2 rounded-full ${getDeviationColor(data.deviation)}`} />
                        <span className={`text-sm font-medium ${getDeviationTextColor(data.deviation)}`}>
                          {data.deviation >= 0 ? '+' : ''}
                          {data.deviation.toFixed(3)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} ${
                            statusInfo.pulse ? 'animate-pulse' : ''
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${getLatencyColor(data.latency)}`}
                            style={{ width: `${Math.min((data.latency / 350) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-mono">{data.latency}ms</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs text-gray-400">
                        {timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('pyth.crossChain.deviationHeatmap') || '价格偏差热力图'}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {sortedByDeviation.map((data) => {
              const config = CHAIN_CONFIG[data.chain];
              const intensity = Math.min(Math.abs(data.deviation) / 0.5, 1);

              return (
                <div
                  key={data.chain}
                  className="relative p-4 rounded-lg border border-gray-200"
                  style={{
                    background: `linear-gradient(135deg, 
                      rgba(16, 185, 129, ${0.1 * (1 - intensity)}) 0%, 
                      rgba(239, 68, 68, ${0.2 * intensity}) 100%)`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{config?.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{config?.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-lg font-semibold ${getDeviationTextColor(data.deviation)}`}
                    >
                      {data.deviation >= 0 ? '+' : ''}
                      {data.deviation.toFixed(3)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getDeviationColor(data.deviation)}`}
                      style={{ width: `${Math.min(Math.abs(data.deviation) * 200, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-xs text-gray-500">&lt;0.1%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-400" />
              <span className="text-xs text-gray-500">0.1-0.3%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-xs text-gray-500">&gt;0.3%</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('pyth.crossChain.wormholeInfo') || 'Wormhole跨链状态'}
          </h3>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-violet-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {t('pyth.crossChain.guardianNetwork') || 'Guardian网络'}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    wormholeStatus.status === 'healthy'
                      ? 'bg-emerald-100 text-emerald-700'
                      : wormholeStatus.status === 'degraded'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {wormholeStatus.status === 'healthy'
                    ? t('pyth.crossChain.healthy') || '健康'
                    : wormholeStatus.status === 'degraded'
                      ? t('pyth.crossChain.degraded') || '降级'
                      : t('pyth.crossChain.critical') || '异常'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">{t('pyth.crossChain.activeGuardians') || '活跃Guardians'}</p>
                  <p className="text-lg font-semibold text-gray-900">19/19</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('pyth.crossChain.vaaLatency') || 'VAA延迟'}</p>
                  <p className="text-lg font-semibold text-gray-900">~3s</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('pyth.crossChain.crossChainFlow') || '跨链数据流'}
              </h4>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">◎</span>
                  <span className="text-gray-600">Solana</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <span className="text-lg">Ξ</span>
                  <span className="text-gray-600">Ethereum</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {t('pyth.crossChain.avgTransferTime') || '平均传输时间'}: ~5s
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('pyth.crossChain.updateLatency') || '链上更新延迟对比'}
              </h4>
              <div className="space-y-3">
                {chainData.slice(0, 4).map((data) => {
                  const config = CHAIN_CONFIG[data.chain];
                  return (
                    <div key={data.chain} className="flex items-center gap-3">
                      <span className="text-sm">{config?.icon}</span>
                      <span className="text-sm text-gray-600 w-20">{config?.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getLatencyColor(data.latency)}`}
                          style={{ width: `${Math.min((data.latency / 350) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">{data.latency}ms</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('pyth.crossChain.consistencyScore') || '价格一致性评分'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('pyth.crossChain.overallScore') || '总体评分'}
              </span>
              <span className="text-2xl font-bold text-emerald-600">98.5</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '98.5%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {t('pyth.crossChain.excellent') || '优秀 - 跨链价格高度一致'}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('pyth.crossChain.updateSync') || '更新同步率'}
              </span>
              <span className="text-2xl font-bold text-violet-600">99.2%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-violet-500 h-2 rounded-full" style={{ width: '99.2%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {t('pyth.crossChain.chainsSynced') || '所有链在1秒内同步更新'}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {t('pyth.crossChain.arbOpportunity') || '套利机会'}
              </span>
              <span className="text-2xl font-bold text-amber-600">0.12%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: '24%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {t('pyth.crossChain.lowArb') || '低套利空间 - 市场效率高'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
