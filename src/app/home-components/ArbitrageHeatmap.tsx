'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { AlertTriangle, TrendingUp, ArrowRightLeft } from 'lucide-react';

interface ChainData {
  name: string;
  price: number;
  deviation: number;
}

const tradingPairs = ['BTC/USD', 'ETH/USD', 'LINK/USD', 'SOL/USD', 'AVAX/USD'];

// Simplified chain data - only major chains
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
    { name: 'Polygon', price: 145.23, deviation: -0.30 },
  ],
  'AVAX/USD': [
    { name: 'Ethereum', price: 28.45, deviation: 0 },
    { name: 'Arbitrum', price: 28.38, deviation: -0.25 },
    { name: 'BSC', price: 28.42, deviation: -0.11 },
    { name: 'Polygon', price: 28.31, deviation: -0.49 },
  ],
};

const getDeviationColor = (deviation: number): string => {
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

export default function ArbitrageHeatmap() {
  const { t, language } = useI18n();
  const [selectedPair, setSelectedPair] = useState('BTC/USD');
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  const currentData = chainDataMap[selectedPair];
  const avgPrice = currentData.reduce((sum, chain) => sum + chain.price, 0) / currentData.length;
  const maxDeviation = Math.max(...currentData.map(c => Math.abs(c.deviation)));
  const arbitrageCount = currentData.filter(c => Math.abs(c.deviation) > 0.1).length;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full mb-4">
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-600">
              {language === 'zh' ? '跨链套利' : 'Cross-Chain Arbitrage'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {language === 'zh' ? '价格差异热力图' : 'Price Spread Heatmap'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'zh' 
              ? '实时监控同一交易对在不同区块链上的价格差异，发现潜在套利机会' 
              : 'Monitor price differences across major chains in real-time and discover arbitrage opportunities'}
          </p>
        </div>

        {/* Trading Pair Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {tradingPairs.map((pair) => (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                selectedPair === pair
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {pair}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="text-sm text-blue-600 mb-1">
              {language === 'zh' ? '平均价格' : 'Average Price'}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${avgPrice.toFixed(2)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <div className="text-sm text-amber-600 mb-1">
              {language === 'zh' ? '最大偏差' : 'Max Deviation'}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {maxDeviation.toFixed(3)}%
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${
            arbitrageCount > 0 
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
              : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'
          }`}>
            <div className={`text-sm mb-1 ${
              arbitrageCount > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}>
              {language === 'zh' ? '套利机会' : 'Arbitrage Opportunities'}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-gray-900">
                {arbitrageCount}
              </div>
              {arbitrageCount > 0 && (
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Heatmap Grid - Simplified to 4 major chains */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentData.map((chain) => {
              const isHovered = hoveredChain === chain.name;
              const isArbitrage = Math.abs(chain.deviation) > 0.1;
              
              return (
                <div
                  key={chain.name}
                  className={`
                    relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-300
                    ${getDeviationColor(chain.deviation)}
                    ${isHovered ? 'scale-105 shadow-xl' : 'shadow-sm'}
                    ${isArbitrage ? 'animate-pulse' : ''}
                  `}
                  onMouseEnter={() => setHoveredChain(chain.name)}
                  onMouseLeave={() => setHoveredChain(null)}
                >
                  {/* Flashing indicator for arbitrage */}
                  {isArbitrage && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">{chain.name}</span>
                    {isArbitrage && (
                      <TrendingUp className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="text-2xl font-bold font-mono mb-2">
                    ${chain.price.toFixed(2)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getDeviationIntensity(chain.deviation)}`} />
                    <span className="text-sm font-medium">
                      {chain.deviation > 0 ? '+' : ''}{chain.deviation.toFixed(3)}%
                    </span>
                  </div>

                  {/* Deviation bar */}
                  <div className="mt-3 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${getDeviationIntensity(chain.deviation)}`}
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

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">
                {language === 'zh' ? '低偏差 (<0.1%)' : 'Low (<0.1%)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-600">
                {language === 'zh' ? '中偏差 (0.1-0.3%)' : 'Medium (0.1-0.3%)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">
                {language === 'zh' ? '高偏差 (>0.3%)' : 'High (>0.3%)'}
              </span>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {arbitrageCount > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="font-semibold text-red-900">
                {language === 'zh' 
                  ? `检测到 ${arbitrageCount} 个潜在套利机会` 
                  : `${arbitrageCount} potential arbitrage opportunities detected`}
              </div>
              <div className="text-sm text-red-700">
                {language === 'zh' 
                  ? '部分链上价格偏差超过 0.1%，可能存在套利空间' 
                  : 'Price deviation exceeds 0.1% on some chains'}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
