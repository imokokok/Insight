'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
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
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [selectedPair, setSelectedPair] = useState('BTC/USD');
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  const currentData = chainDataMap[selectedPair];
  const avgPrice = currentData.reduce((sum, chain) => sum + chain.price, 0) / currentData.length;
  const maxDeviation = Math.max(...currentData.map((c) => Math.abs(c.deviation)));
  const highConsistencyCount = currentData.filter((c) => Math.abs(c.deviation) < 0.1).length;
  const consistencyRate = (highConsistencyCount / currentData.length) * 100;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 mb-4">
            <Globe className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">
              {isZh ? '跨链监控' : 'Cross-Chain Monitor'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {isZh ? '跨链价格一致性' : 'Cross-Chain Price Consistency'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isZh
              ? '监控同一交易对在不同区块链上的价格一致性，评估预言机数据质量'
              : 'Monitor price consistency of the same trading pair across different blockchains and assess oracle data quality'}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tradingPairs.map((pair) => (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair)}
              className={`px-4 py-2 font-medium transition-colors duration-200 border ${
                selectedPair === pair
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {pair}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">
              {isZh ? '参考价格' : 'Reference Price'}
            </div>
            <div className="text-2xl font-bold text-gray-900">${avgPrice.toFixed(2)}</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">{isZh ? '最大偏差' : 'Max Deviation'}</div>
            <div className="text-2xl font-bold text-gray-900">{maxDeviation.toFixed(3)}%</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-1">
              {isZh ? '一致性率' : 'Consistency Rate'}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-gray-900">{consistencyRate.toFixed(0)}%</div>
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentData.map((chain) => {
              const isHovered = hoveredChain === chain.name;
              const consistencyStatus = getConsistencyStatus(chain.deviation);

              return (
                <div
                  key={chain.name}
                  className={`
                    relative border p-4 cursor-pointer transition-colors duration-200
                    ${getDeviationStyle(chain.deviation)}
                    ${isHovered ? 'border-gray-900' : ''}
                  `}
                  onMouseEnter={() => setHoveredChain(chain.name)}
                  onMouseLeave={() => setHoveredChain(null)}
                >
                  {consistencyStatus === 'high' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500" />
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">{chain.name}</span>
                    {consistencyStatus === 'high' && (
                      <Activity className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>

                  <div className="text-2xl font-bold font-mono mb-2">${chain.price.toFixed(2)}</div>

                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${getDeviationIntensity(chain.deviation)}`} />
                    <span className="text-sm font-medium">
                      {chain.deviation > 0 ? '+' : ''}
                      {chain.deviation.toFixed(3)}%
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 bg-white border border-gray-200 overflow-hidden">
                    <div
                      className={`h-full ${getDeviationIntensity(chain.deviation)}`}
                      style={{
                        width: `${Math.min(Math.abs(chain.deviation) * 10, 100)}%`,
                        marginLeft: chain.deviation < 0 ? 'auto' : '0',
                        marginRight: chain.deviation > 0 ? 'auto' : '0',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500" />
              <span className="text-sm text-gray-600">
                {isZh ? '高一致性 (<0.1%)' : 'High Consistency (<0.1%)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500" />
              <span className="text-sm text-gray-600">
                {isZh ? '中等一致性 (0.1-0.3%)' : 'Medium Consistency (0.1-0.3%)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500" />
              <span className="text-sm text-gray-600">
                {isZh ? '低一致性 (>0.3%)' : 'Low Consistency (>0.3%)'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 p-4 flex items-center gap-4">
          <div className="p-2 bg-blue-100">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-blue-900">
              {isZh ? '价格一致性分析' : 'Price Consistency Analysis'}
            </div>
            <div className="text-sm text-blue-700">
              {isZh
                ? '偏差值反映不同链上预言机价格的差异程度，低偏差表示数据质量高、一致性好'
                : 'Deviation values reflect the difference in oracle prices across chains. Low deviation indicates high data quality and consistency'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
