'use client';

import { useMemo } from 'react';
import { DashboardCard } from './DashboardCard';

export interface ChainPriceData {
  chain: string;
  chainId: string;
  price: number;
  deviationPercent: number;
  latency: number;
  lastUpdate: string;
  status: 'normal' | 'warning' | 'critical';
  updateCount: number;
  confidence: number;
}

export interface CrossChainPriceConsistencyProps {
  symbol?: string;
  className?: string;
}

const PYTH_SUPPORTED_CHAINS = [
  { name: 'Solana', chainId: 'solana-mainnet', icon: '◎' },
  { name: 'Ethereum', chainId: 'ethereum-mainnet', icon: '⟠' },
  { name: 'Arbitrum', chainId: 'arbitrum-one', icon: '⬡' },
];

const DEVIATION_THRESHOLDS = {
  normal: 0.1,
  warning: 0.3,
};

function generateMockPriceData(symbol: string): ChainPriceData[] {
  const basePrices: Record<string, number> = {
    'BTC/USD': 67842.35,
    'ETH/USD': 3456.78,
    'SOL/USD': 142.56,
  };

  const basePrice = basePrices[symbol] || 100.0;

  return PYTH_SUPPORTED_CHAINS.map((chain, index) => {
    const deviationFactor = index === 0 ? 0 : (Math.random() - 0.5) * 0.6;
    const price = basePrice * (1 + deviationFactor / 100);
    const deviationPercent = index === 0 ? 0 : deviationFactor;
    const latency = Math.floor(Math.random() * 150 + 30);

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    const absDeviation = Math.abs(deviationPercent);
    if (absDeviation >= DEVIATION_THRESHOLDS.warning) {
      status = 'critical';
    } else if (absDeviation >= DEVIATION_THRESHOLDS.normal) {
      status = 'warning';
    }

    return {
      chain: chain.name,
      chainId: chain.chainId,
      price: Number(price.toFixed(4)),
      deviationPercent: Number(deviationPercent.toFixed(4)),
      latency,
      lastUpdate: `${Math.floor(Math.random() * 3 + 1)}s ago`,
      status,
      updateCount: Math.floor(Math.random() * 50 + 100),
      confidence: Math.floor(Math.random() * 5 + 95),
    };
  });
}

function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < DEVIATION_THRESHOLDS.normal) {
    return 'text-green-600';
  }
  if (absDeviation < DEVIATION_THRESHOLDS.warning) {
    return 'text-yellow-600';
  }
  return 'text-red-600';
}

function getDeviationBarColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < DEVIATION_THRESHOLDS.normal) {
    return 'bg-green-500';
  }
  if (absDeviation < DEVIATION_THRESHOLDS.warning) {
    return 'bg-yellow-500';
  }
  return 'bg-red-500';
}

function getStatusBadgeColor(status: 'normal' | 'warning' | 'critical'): string {
  switch (status) {
    case 'normal':
      return 'bg-green-100 text-green-700';
    case 'warning':
      return 'bg-yellow-100 text-yellow-700';
    case 'critical':
      return 'bg-red-100 text-red-700';
  }
}

function getStatusLabel(status: 'normal' | 'warning' | 'critical'): string {
  switch (status) {
    case 'normal':
      return '正常';
    case 'warning':
      return '警告';
    case 'critical':
      return '异常';
  }
}

function getChainIcon(chainName: string): string {
  const chain = PYTH_SUPPORTED_CHAINS.find((c) => c.name === chainName);
  return chain?.icon || '●';
}

export function CrossChainPriceConsistency({
  symbol = 'BTC/USD',
  className = '',
}: CrossChainPriceConsistencyProps) {
  const chainData = useMemo(() => generateMockPriceData(symbol), [symbol]);

  const baseChain = chainData[0];
  const basePrice = baseChain?.price || 0;

  const maxDeviation = Math.max(...chainData.map((c) => Math.abs(c.deviationPercent)));
  const avgLatency = Math.round(
    chainData.reduce((sum, c) => sum + c.latency, 0) / chainData.length
  );
  const hasWarnings = chainData.some((c) => c.status !== 'normal');

  const maxBarDeviation = 0.5;

  return (
    <DashboardCard
      title="跨链价格一致性监控"
      className={className}
      headerAction={
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{symbol}</span>
          <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
            Pyth
          </span>
        </div>
      }
    >
      <div className="space-y-5">
        {hasWarnings && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">检测到跨链价格偏差</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  部分链的价格与基准价格（Solana）存在较大偏差，请关注价格一致性。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">基准价格</p>
            <p className="text-lg font-bold text-blue-700">${basePrice.toFixed(2)}</p>
            <p className="text-xs text-blue-500 mt-1">Solana</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">最大偏差</p>
            <p className={`text-lg font-bold ${getDeviationColor(maxDeviation)}`}>
              {maxDeviation.toFixed(3)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {maxDeviation < DEVIATION_THRESHOLDS.normal
                ? '一致性良好'
                : maxDeviation < DEVIATION_THRESHOLDS.warning
                  ? '存在轻微偏差'
                  : '偏差较大'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">平均延迟</p>
            <p className="text-lg font-bold text-gray-700">{avgLatency}ms</p>
            <p className="text-xs text-gray-500 mt-1">
              {avgLatency < 100 ? '更新及时' : avgLatency < 200 ? '更新正常' : '延迟较高'}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">各链价格对比</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">链</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">价格</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">偏差</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-32">
                    偏差可视化
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">延迟</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {chainData.map((chain, index) => (
                  <tr key={chain.chainId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getChainIcon(chain.chain)}</span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{chain.chain}</span>
                          {index === 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              基准
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-3">
                      <span className="text-sm font-mono text-gray-900">
                        ${chain.price.toFixed(4)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3">
                      <span
                        className={`text-sm font-mono font-medium ${getDeviationColor(chain.deviationPercent)}`}
                      >
                        {index === 0
                          ? '-'
                          : `${chain.deviationPercent >= 0 ? '+' : ''}${chain.deviationPercent.toFixed(3)}%`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getDeviationBarColor(chain.deviationPercent)}`}
                            style={{
                              width: `${Math.min((Math.abs(chain.deviationPercent) / maxBarDeviation) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">
                          {Math.min(
                            Math.round((Math.abs(chain.deviationPercent) / maxBarDeviation) * 100),
                            100
                          )}
                          %
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-3">
                      <span
                        className={`text-sm ${chain.latency < 100 ? 'text-green-600' : chain.latency < 200 ? 'text-gray-600' : 'text-yellow-600'}`}
                      >
                        {chain.latency}ms
                      </span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(chain.status)}`}
                      >
                        {getStatusLabel(chain.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">价格偏差条形图</h4>
          <div className="space-y-3">
            {chainData.map((chain, index) => (
              <div key={chain.chainId} className="flex items-center gap-3">
                <div className="w-20 flex items-center gap-1.5">
                  <span className="text-sm">{getChainIcon(chain.chain)}</span>
                  <span className="text-sm text-gray-700">{chain.chain}</span>
                </div>
                <div className="flex-1 relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
                  <div className="flex items-center justify-center h-6">
                    <div
                      className={`h-4 rounded transition-all ${getDeviationBarColor(chain.deviationPercent)}`}
                      style={{
                        width: `${Math.min((Math.abs(chain.deviationPercent) / maxBarDeviation) * 50, 50)}%`,
                        marginLeft:
                          chain.deviationPercent >= 0
                            ? '50%'
                            : `${50 - Math.min((Math.abs(chain.deviationPercent) / maxBarDeviation) * 50, 50)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span
                    className={`text-xs font-mono ${getDeviationColor(chain.deviationPercent)}`}
                  >
                    {index === 0
                      ? '基准'
                      : `${chain.deviationPercent >= 0 ? '+' : ''}${chain.deviationPercent.toFixed(3)}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-xs text-gray-500">
            <span className="mr-8">← 低于基准</span>
            <span>基准线</span>
            <span className="ml-8">高于基准 →</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">更新延迟分布</h4>
            <div className="space-y-2">
              {chainData.map((chain) => (
                <div key={chain.chainId} className="flex items-center gap-2">
                  <span className="text-sm">{getChainIcon(chain.chain)}</span>
                  <span className="text-sm text-gray-700 w-16">{chain.chain}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        chain.latency < 100
                          ? 'bg-green-500'
                          : chain.latency < 200
                            ? 'bg-blue-500'
                            : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((chain.latency / 200) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-12 text-right">{chain.latency}ms</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">偏差阈值说明</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-sm text-gray-600">偏差 &lt; 0.1%：一致性良好</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span className="text-sm text-gray-600">0.1% ≤ 偏差 &lt; 0.3%：轻微偏差</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-sm text-gray-600">偏差 ≥ 0.3%：偏差较大，需关注</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Pyth 通过 Wormhole 实现跨链价格传输，Solana 作为主链发布价格， 其他链通过 Wormhole
                消息接收价格更新。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-pink-800">Pyth 跨链价格机制</h4>
              <ul className="text-sm text-pink-700 mt-2 space-y-1">
                <li>• Solana 作为 Pyth 的主链，价格首先在 Solana 上发布</li>
                <li>• 通过 Wormhole 跨链消息传递，价格同步到 Ethereum、Arbitrum 等链</li>
                <li>• 各链价格应保持高度一致，偏差通常应小于 0.1%</li>
                <li>• 较大偏差可能表示网络拥堵或跨链消息延迟</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
