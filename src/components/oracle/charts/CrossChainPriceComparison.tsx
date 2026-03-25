'use client';

import { useMemo } from 'react';
import { Blockchain } from '@/types/oracle';
import { chainNames, chainColors } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { TrendingDown } from 'lucide-react';
import { Minus } from 'lucide-react';

interface ChainPriceData {
  chain: Blockchain;
  price: number;
  timestamp: number;
  confidence?: number;
}

interface CrossChainPriceComparisonProps {
  symbol: string;
  priceData: ChainPriceData[];
  className?: string;
  highlightBest?: boolean;
}

export function CrossChainPriceComparison({
  symbol,
  priceData,
  className,
  highlightBest = true,
}: CrossChainPriceComparisonProps) {
  // 计算统计数据
  const stats = useMemo(() => {
    if (priceData.length === 0) return null;

    const prices = priceData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceRange = maxPrice - minPrice;
    const priceRangePercent = (priceRange / avgPrice) * 100;

    // 计算相对于平均价格的偏差
    const dataWithDeviation = priceData.map((data) => ({
      ...data,
      deviation: ((data.price - avgPrice) / avgPrice) * 100,
    }));

    // 按价格排序
    const sortedByPrice = [...dataWithDeviation].sort((a, b) => b.price - a.price);

    return {
      minPrice,
      maxPrice,
      avgPrice,
      priceRange,
      priceRangePercent,
      dataWithDeviation,
      sortedByPrice,
      cheapest: sortedByPrice[sortedByPrice.length - 1],
      mostExpensive: sortedByPrice[0],
    };
  }, [priceData]);

  if (!stats || priceData.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <div className="text-center text-gray-400 py-8">
          <p>暂无跨链价格数据</p>
        </div>
      </div>
    );
  }

  const { dataWithDeviation, avgPrice, priceRangePercent, cheapest, mostExpensive } = stats;

  // 获取偏差颜色和图标
  const getDeviationInfo = (deviation: number) => {
    if (deviation > 1) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        icon: TrendingUp,
        label: '偏高',
      };
    }
    if (deviation < -1) {
      return {
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        icon: TrendingDown,
        label: '偏低',
      };
    }
    return {
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      icon: Minus,
      label: '正常',
    };
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {/* 标题和统计 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {symbol} 跨链价格对比
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              跨链价格差异: {priceRangePercent.toFixed(2)}%
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {formatPrice(avgPrice)}
            </div>
            <div className="text-xs text-gray-500">平均价格</div>
          </div>
        </div>
      </div>

      {/* 价格表格 */}
      <div className="divide-y divide-gray-100">
        {dataWithDeviation
          .sort((a, b) => b.price - a.price)
          .map((data, index) => {
            const deviationInfo = getDeviationInfo(data.deviation);
            const Icon = deviationInfo.icon;
            const isCheapest = data.chain === cheapest.chain;
            const isMostExpensive = data.chain === mostExpensive.chain;

            return (
              <div
                key={data.chain}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  'hover:bg-gray-50 transition-colors',
                  highlightBest && isCheapest && 'bg-emerald-50/50',
                  highlightBest && isMostExpensive && 'bg-red-50/50'
                )}
              >
                {/* 链信息 */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${chainColors[data.chain]}20` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chainColors[data.chain] }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {chainNames[data.chain]}
                      </span>
                      {isCheapest && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded">
                          最低
                        </span>
                      )}
                      {isMostExpensive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                          最高
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded flex items-center gap-1',
                          deviationInfo.bgColor,
                          deviationInfo.color
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {data.deviation > 0 ? '+' : ''}
                        {data.deviation.toFixed(2)}%
                      </span>
                      {data.confidence && (
                        <span className="text-xs text-gray-400">
                          置信度: {(data.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 价格 */}
                <div className="text-right">
                  <div className="text-base font-semibold text-gray-900">
                    {formatPrice(data.price)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500">最高价格</div>
            <div className="text-sm font-semibold text-red-600">
              {formatPrice(mostExpensive.price)}
            </div>
            <div className="text-[10px] text-gray-400">
              {chainNames[mostExpensive.chain]}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">平均价格</div>
            <div className="text-sm font-semibold text-gray-900">
              {formatPrice(avgPrice)}
            </div>
            <div className="text-[10px] text-gray-400">所有链</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">最低价格</div>
            <div className="text-sm font-semibold text-emerald-600">
              {formatPrice(cheapest.price)}
            </div>
            <div className="text-[10px] text-gray-400">
              {chainNames[cheapest.chain]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 格式化价格
function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toFixed(4)}`;
}

export default CrossChainPriceComparison;
