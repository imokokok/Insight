'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrendingUp, Activity, Globe } from 'lucide-react';

interface ChainData {
  name: string;
  price: number;
  deviation: number;
}

const tradingPairs = ['BTC/USD', 'ETH/USD', 'LINK/USD', 'SOL/USD', 'AVAX/USD'];

const chainDataMap: Record<string, ChainData[]> = {
  'BTC/USD': [
    { name: 'Ethereum', price: 67245.32, deviation: 0 },
    { name: 'Arbitrum', price: 67238.15, deviation: -0.011 },
    { name: 'BSC', price: 67234.56, deviation: -0.016 },
    { name: 'Polygon', price: 67212.45, deviation: -0.049 },
  ],
  'ETH/USD': [
    { name: 'Ethereum', price: 3456.78, deviation: 0 },
    { name: 'Arbitrum', price: 3454.23, deviation: -0.074 },
    { name: 'BSC', price: 3455.89, deviation: -0.026 },
    { name: 'Polygon', price: 3452.67, deviation: -0.119 },
  ],
  'LINK/USD': [
    { name: 'Ethereum', price: 14.23, deviation: 0 },
    { name: 'Arbitrum', price: 14.21, deviation: -0.14 },
    { name: 'BSC', price: 14.22, deviation: -0.07 },
    { name: 'Polygon', price: 14.18, deviation: -0.35 },
  ],
  'SOL/USD': [
    { name: 'Ethereum', price: 145.67, deviation: 0 },
    { name: 'Arbitrum', price: 145.45, deviation: -0.15 },
    { name: 'BSC', price: 145.56, deviation: -0.08 },
    { name: 'Polygon', price: 145.23, deviation: -0.3 },
  ],
  'AVAX/USD': [
    { name: 'Ethereum', price: 28.45, deviation: 0 },
    { name: 'Arbitrum', price: 28.38, deviation: -0.25 },
    { name: 'BSC', price: 28.42, deviation: -0.11 },
    { name: 'Polygon', price: 28.31, deviation: -0.49 },
  ],
};

const getDeviationStyle = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (absDeviation < 0.3) return 'bg-amber-50 border-amber-200 text-amber-700';
  return 'bg-red-50 border-red-200 text-red-700';
};

const getDeviationIntensity = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-500';
  if (absDeviation < 0.3) return 'bg-amber-500';
  return 'bg-red-500';
};

const getConsistencyStatus = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'high';
  if (absDeviation < 0.3) return 'medium';
  return 'low';
};

export default function CrossChainPriceMonitor() {
  const locale = useLocale();
  const isZh = locale === 'zh-CN';
  const [selectedPair, setSelectedPair] = useState('BTC/USD');
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  const currentData = chainDataMap[selectedPair];
  const avgPrice = currentData.reduce((sum, chain) => sum + chain.price, 0) / currentData.length;
  const maxDeviation = Math.max(...currentData.map((c) => Math.abs(c.deviation)));
  const highConsistencyCount = currentData.filter((c) => Math.abs(c.deviation) < 0.1).length;
  const consistencyRate = (highConsistencyCount / currentData.length) * 100;

  return (
    <div className="bg-white border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isZh ? '跨链价格监控' : 'Cross-Chain Price Monitor'}
              </h2>
              <p className="text-sm text-gray-500">
                {isZh ? '实时追踪不同链上的价格差异' : 'Real-time price deviation tracking across chains'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{isZh ? '交易对:' : 'Trading Pair:'}</span>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tradingPairs.map((pair) => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-500">{isZh ? '平均价格' : 'Average Price'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">${avgPrice.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-gray-500">{isZh ? '最大偏差' : 'Max Deviation'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{maxDeviation.toFixed(3)}%</div>
          </div>
          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-gray-500">{isZh ? '监控链数' : 'Chains Monitored'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{currentData.length}</div>
          </div>
          <div className="bg-gray-50 p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-500">{isZh ? '一致性率' : 'Consistency Rate'}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{consistencyRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Chain Comparison Grid */}
        <div className="grid grid-cols-2 gap-4">
          {currentData.map((chain) => (
            <div
              key={chain.name}
              className={`p-4 border transition-all cursor-pointer ${getDeviationStyle(chain.deviation)} ${
                hoveredChain === chain.name ? 'ring-2 ring-blue-500' : ''
              }`}
              onMouseEnter={() => setHoveredChain(chain.name)}
              onMouseLeave={() => setHoveredChain(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{chain.name}</h3>
                  <div className="text-2xl font-bold mt-1">${chain.price.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium ${
                      chain.deviation === 0
                        ? 'bg-gray-100 text-gray-600'
                        : chain.deviation > 0
                          ? 'bg-red-100 text-red-600'
                          : 'bg-emerald-100 text-emerald-600'
                    }`}
                  >
                    {chain.deviation > 0 ? '+' : ''}
                    {chain.deviation.toFixed(3)}%
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ${getDeviationIntensity(chain.deviation)}`}
                    />
                    <span className="ml-2 text-xs capitalize">{getConsistencyStatus(chain.deviation)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">{isZh ? '高一致性 (<0.1%)' : 'High Consistency (<0.1%)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">{isZh ? '中等一致性 (0.1-0.3%)' : 'Medium Consistency (0.1-0.3%)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">{isZh ? '低一致性 (>0.3%)' : 'Low Consistency (>0.3%)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
