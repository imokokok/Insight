'use client';

import { useMemo, useState } from 'react';
import { DashboardCard } from './DashboardCard';

export interface BandChainPriceData {
  chain: string;
  chainId: string;
  price: number;
  deviationPercent: number;
  deviationDirection: 'up' | 'down' | 'neutral';
  latency: number;
  lastUpdate: string;
  status: 'normal' | 'warning' | 'critical';
  updateCount: number;
  confidence: number;
}

export interface BandCrossChainPriceConsistencyProps {
  className?: string;
}

const BAND_SUPPORTED_CHAINS = [
  { name: 'Cosmos Hub', chainId: 'cosmoshub-4', icon: '⚛️', color: '#2E3359' },
  { name: 'Osmosis', chainId: 'osmosis-1', icon: '💧', color: '#9945FF' },
  { name: 'Ethereum', chainId: '1', icon: '⟠', color: '#627EEA' },
  { name: 'Polygon', chainId: '137', icon: '⬡', color: '#8247E5' },
  { name: 'Avalanche', chainId: '43114', icon: '🔺', color: '#E84142' },
  { name: 'Fantom', chainId: '250', icon: '👻', color: '#1969FF' },
];

const SYMBOLS = ['BTC/USD', 'ETH/USD', 'USDC/USD'];

const DEVIATION_THRESHOLDS = {
  normal: 0.1,
  warning: 0.5,
};

function generateMockPriceData(): Map<string, BandChainPriceData[]> {
  const basePrices: Record<string, number> = {
    'BTC/USD': 67842.35,
    'ETH/USD': 3456.78,
    'USDC/USD': 1.0001,
  };

  const priceDataMap = new Map<string, BandChainPriceData[]>();

  SYMBOLS.forEach((symbol) => {
    const basePrice = basePrices[symbol] || 100.0;
    const chainData: BandChainPriceData[] = BAND_SUPPORTED_CHAINS.map((chain, index) => {
      const deviationFactor = index === 0 ? 0 : (Math.random() - 0.5) * 0.8;
      const price = basePrice * (1 + deviationFactor / 100);
      const deviationPercent = index === 0 ? 0 : deviationFactor;
      const latency = Math.floor(Math.random() * 100 + 50);

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
        deviationDirection: deviationPercent > 0 ? 'up' : deviationPercent < 0 ? 'down' : 'neutral',
        latency,
        lastUpdate: `${Math.floor(Math.random() * 5 + 1)}s ago`,
        status,
        updateCount: Math.floor(Math.random() * 30 + 50),
        confidence: Math.floor(Math.random() * 5 + 95),
      };
    });
    priceDataMap.set(symbol, chainData);
  });

  return priceDataMap;
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

function getDeviationBgColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < DEVIATION_THRESHOLDS.normal) {
    return 'bg-green-100';
  }
  if (absDeviation < DEVIATION_THRESHOLDS.warning) {
    return 'bg-yellow-100';
  }
  return 'bg-red-100';
}

function getChainInfo(chainName: string) {
  return BAND_SUPPORTED_CHAINS.find((c) => c.name === chainName);
}

interface PriceDeviationHeatmapProps {
  priceDataMap: Map<string, BandChainPriceData[]>;
  selectedSymbol: string;
}

function PriceDeviationHeatmap({ priceDataMap, selectedSymbol }: PriceDeviationHeatmapProps) {
  const symbols = SYMBOLS;
  const chains = BAND_SUPPORTED_CHAINS;

  const getDeviationIntensity = (deviation: number): { bg: string; text: string } => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation < 0.05) return { bg: 'bg-green-100', text: 'text-green-700' };
    if (absDeviation < 0.1) return { bg: 'bg-green-200', text: 'text-green-800' };
    if (absDeviation < 0.3) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (absDeviation < 0.5) return { bg: 'bg-yellow-200', text: 'text-yellow-800' };
    return { bg: 'bg-red-200', text: 'text-red-800' };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">价格偏离热力图</p>
          <p className="text-gray-500 text-xs mt-0.5">各链价格与基准链（Cosmos Hub）的偏离程度</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>低</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <div className="w-4 h-4 bg-green-200 rounded"></div>
            <div className="w-4 h-4 bg-yellow-100 rounded"></div>
            <div className="w-4 h-4 bg-yellow-200 rounded"></div>
            <div className="w-4 h-4 bg-red-200 rounded"></div>
          </div>
          <span>高</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-24">代币</th>
              {chains.map((chain) => (
                <th
                  key={chain.chainId}
                  className="text-center py-2 px-2 text-xs font-medium text-gray-500 min-w-[80px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-base">{chain.icon}</span>
                    <span className="text-[10px] truncate">{chain.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const chainData = priceDataMap.get(symbol) || [];
              const isSelected = symbol === selectedSymbol;
              return (
                <tr
                  key={symbol}
                  className={`border-t border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-3 px-3">
                    <span
                      className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}
                    >
                      {symbol}
                    </span>
                  </td>
                  {chainData.map((data, index) => {
                    const intensity = getDeviationIntensity(data.deviationPercent);
                    return (
                      <td key={data.chainId} className="py-3 px-2 text-center">
                        <div
                          className={`group relative inline-flex items-center justify-center w-14 h-10 rounded-lg ${intensity.bg} cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all`}
                        >
                          <span className={`text-xs font-mono font-medium ${intensity.text}`}>
                            {index === 0
                              ? '-'
                              : `${data.deviationPercent >= 0 ? '+' : ''}${data.deviationPercent.toFixed(2)}%`}
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                            {data.chain}: ${data.price.toFixed(4)}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BandCrossChainPriceConsistency({
  className = '',
}: BandCrossChainPriceConsistencyProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  const priceDataMap = useMemo(() => generateMockPriceData(), []);
  const chainData = priceDataMap.get(selectedSymbol) || [];

  const baseChain = chainData[0];
  const basePrice = baseChain?.price || 0;

  const maxDeviation = Math.max(...chainData.map((c) => Math.abs(c.deviationPercent)));
  const avgLatency = Math.round(
    chainData.reduce((sum, c) => sum + c.latency, 0) / chainData.length
  );
  const hasWarnings = chainData.some((c) => c.status !== 'normal');

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">跨链价格一致性监控</h3>
            <p className="text-sm text-gray-500 mt-1">Band Protocol 各链价格同步状态</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            {SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedSymbol === symbol
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {hasWarnings && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
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
                  部分链的价格与基准价格（Cosmos Hub）存在偏差，请关注价格一致性。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">基准价格</p>
            <p className="text-lg font-bold text-purple-700">${basePrice.toFixed(2)}</p>
            <p className="text-xs text-purple-500 mt-1">Cosmos Hub</p>
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
              {avgLatency < 100 ? '更新及时' : '更新正常'}
            </p>
          </div>
        </div>

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
              {chainData.map((chain, index) => {
                const chainInfo = getChainInfo(chain.chain);
                return (
                  <tr key={chain.chainId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{chainInfo?.icon}</span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{chain.chain}</span>
                          {index === 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
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
                            className={`h-full rounded-full transition-all ${
                              Math.abs(chain.deviationPercent) < DEVIATION_THRESHOLDS.normal
                                ? 'bg-green-500'
                                : Math.abs(chain.deviationPercent) < DEVIATION_THRESHOLDS.warning
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min((Math.abs(chain.deviationPercent) / 0.5) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">
                          {Math.min(
                            Math.round((Math.abs(chain.deviationPercent) / 0.5) * 100),
                            100
                          )}
                          %
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-3">
                      <span
                        className={`text-sm ${chain.latency < 100 ? 'text-green-600' : 'text-gray-600'}`}
                      >
                        {chain.latency}ms
                      </span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          chain.status === 'normal'
                            ? 'bg-green-100 text-green-700'
                            : chain.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {chain.status === 'normal'
                          ? '正常'
                          : chain.status === 'warning'
                            ? '警告'
                            : '异常'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PriceDeviationHeatmap priceDataMap={priceDataMap} selectedSymbol={selectedSymbol} />

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0"
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
            <h4 className="text-sm font-medium text-purple-800">Band Protocol 跨链价格机制</h4>
            <ul className="text-sm text-purple-700 mt-2 space-y-1">
              <li>• Band Protocol 基于 Cosmos IBC 实现跨链数据传输</li>
              <li>• Cosmos Hub 作为主要数据源，通过 IBC 向其他链传输价格数据</li>
              <li>• 支持 EVM 链（Ethereum、Polygon 等）通过 Band Bridge 获取数据</li>
              <li>• 价格偏离阈值：&lt;0.1% 为正常，0.1%-0.5% 为警告，&gt;0.5% 需关注</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
