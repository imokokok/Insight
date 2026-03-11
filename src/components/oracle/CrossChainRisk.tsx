'use client';

import { useMemo } from 'react';
import { DashboardCard } from './DashboardCard';

interface ChainPriceData {
  chain: string;
  chainId: number;
  price: number;
  deviation: number;
  deviationPercent: number;
  latency: number;
  lastUpdate: string;
  status: 'normal' | 'warning' | 'critical';
}

interface ArbitrageOpportunity {
  buyChain: string;
  sellChain: string;
  priceDiff: number;
  priceDiffPercent: number;
  estimatedProfit: string;
}

const ARBITRAGE_THRESHOLD = 0.5;

function generateMockChainData(): ChainPriceData[] {
  const basePrice = 14.52;
  const chains = [
    { name: 'Ethereum', chainId: 1 },
    { name: 'Solana', chainId: 0 },
    { name: 'Polygon', chainId: 137 },
    { name: 'Arbitrum', chainId: 42161 },
    { name: 'Avalanche', chainId: 43114 },
    { name: 'Optimism', chainId: 10 },
    { name: 'BSC', chainId: 56 },
  ];

  return chains.map((chain) => {
    const deviation = (Math.random() - 0.5) * 0.8;
    const price = basePrice * (1 + deviation / 100);
    const deviationPercent = Number(deviation.toFixed(3));
    const latency = Math.floor(Math.random() * 200 + 50);

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (Math.abs(deviationPercent) >= 1.0) {
      status = 'critical';
    } else if (Math.abs(deviationPercent) >= ARBITRAGE_THRESHOLD) {
      status = 'warning';
    }

    return {
      chain: chain.name,
      chainId: chain.chainId,
      price: Number(price.toFixed(4)),
      deviation: Number((price - basePrice).toFixed(4)),
      deviationPercent,
      latency,
      lastUpdate: `${Math.floor(Math.random() * 5 + 1)}s ago`,
      status,
    };
  });
}

function findArbitrageOpportunities(chainData: ChainPriceData[]): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (let i = 0; i < chainData.length; i++) {
    for (let j = i + 1; j < chainData.length; j++) {
      const priceDiff = Math.abs(chainData[i].price - chainData[j].price);
      const avgPrice = (chainData[i].price + chainData[j].price) / 2;
      const priceDiffPercent = (priceDiff / avgPrice) * 100;

      if (priceDiffPercent >= ARBITRAGE_THRESHOLD) {
        const lowerChain = chainData[i].price < chainData[j].price ? chainData[i] : chainData[j];
        const higherChain = chainData[i].price < chainData[j].price ? chainData[j] : chainData[i];

        opportunities.push({
          buyChain: lowerChain.chain,
          sellChain: higherChain.chain,
          priceDiff: Number(priceDiff.toFixed(4)),
          priceDiffPercent: Number(priceDiffPercent.toFixed(3)),
          estimatedProfit: `~${(priceDiffPercent * 100).toFixed(0)} bps`,
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.priceDiffPercent - a.priceDiffPercent).slice(0, 5);
}

function getStatusColor(status: 'normal' | 'warning' | 'critical'): string {
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

export function CrossChainRisk() {
  const chainData = useMemo(() => generateMockChainData(), []);
  const arbitrageOpportunities = useMemo(() => findArbitrageOpportunities(chainData), [chainData]);

  const avgLatency = Math.round(
    chainData.reduce((sum, c) => sum + c.latency, 0) / chainData.length
  );
  const maxDeviation = Math.max(...chainData.map((c) => Math.abs(c.deviationPercent)));
  const warningCount = chainData.filter((c) => c.status !== 'normal').length;

  return (
    <DashboardCard title="跨链一致性风险分析">
      <div className="space-y-6">
        {arbitrageOpportunities.length > 0 && (
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">发现跨链套利机会</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  检测到 {arbitrageOpportunities.length} 个价差超过 {ARBITRAGE_THRESHOLD}%
                  的跨链套利机会， 这可能表示跨链价格不一致。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">支持链数量</p>
            <p className="text-xl font-bold text-gray-900">{chainData.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">平均延迟</p>
            <p className="text-xl font-bold text-gray-900">{avgLatency}ms</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">最大价差</p>
            <p
              className={`text-xl font-bold ${maxDeviation >= 1 ? 'text-red-600' : maxDeviation >= ARBITRAGE_THRESHOLD ? 'text-yellow-600' : 'text-gray-900'}`}
            >
              {maxDeviation.toFixed(3)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">异常链数</p>
            <p
              className={`text-xl font-bold ${warningCount > 0 ? 'text-yellow-600' : 'text-gray-900'}`}
            >
              {warningCount}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">各链价格详情</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">链</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">价格</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">偏差</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">延迟</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    更新时间
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {chainData.map((chain) => (
                  <tr key={chain.chain} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{chain.chain}</span>
                        <span className="text-xs text-gray-400">#{chain.chainId || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 text-sm font-mono text-gray-900">
                      ${chain.price.toFixed(4)}
                    </td>
                    <td
                      className={`text-right py-2 px-3 text-sm font-mono ${chain.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {chain.deviation >= 0 ? '+' : ''}
                      {chain.deviationPercent.toFixed(3)}%
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-600">
                      {chain.latency}ms
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-500">
                      {chain.lastUpdate}
                    </td>
                    <td className="text-center py-2 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(chain.status)}`}
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

        {arbitrageOpportunities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">跨链套利机会</h4>
            <div className="space-y-2">
              {arbitrageOpportunities.map((opp, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900">{opp.buyChain}</span>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">{opp.sellChain}</span>
                    </div>
                    <span className="text-xs text-gray-500">买入 → 卖出</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">价差</p>
                      <p className="text-sm font-medium text-yellow-600">
                        {opp.priceDiffPercent.toFixed(3)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">预估收益</p>
                      <p className="text-sm font-medium text-green-600">{opp.estimatedProfit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">跨链延迟风险</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">平均延迟</span>
                <span className="text-sm font-medium text-gray-900">{avgLatency}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">最大延迟</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.max(...chainData.map((c) => c.latency))}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">最小延迟</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.min(...chainData.map((c) => c.latency))}ms
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${avgLatency < 100 ? 'bg-green-500' : avgLatency < 200 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min((avgLatency / 300) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {avgLatency < 100
                  ? '跨链延迟较低，价格同步及时'
                  : avgLatency < 200
                    ? '跨链延迟适中，价格同步基本正常'
                    : '跨链延迟较高，可能影响价格准确性'}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">跨链一致性说明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pyth 通过 Wormhole 实现跨链价格传输</li>
              <li>• 理想情况下，各链价格应保持一致</li>
              <li>• 价差超过 {ARBITRAGE_THRESHOLD}% 可能存在套利机会</li>
              <li>• 高延迟可能导致价格更新不及时</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
