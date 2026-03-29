'use client';

import { useState, useEffect, useMemo } from 'react';

import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Skeleton } from '@/components/ui';
import { getDIADataService } from '@/lib/oracles';
import { Blockchain } from '@/types/oracle';

const DIA_CHAIN_NAMES: Partial<Record<Blockchain, string>> = {
  [Blockchain.ETHEREUM]: 'Ethereum',
  [Blockchain.ARBITRUM]: 'Arbitrum',
  [Blockchain.POLYGON]: 'Polygon',
  [Blockchain.AVALANCHE]: 'Avalanche',
  [Blockchain.BNB_CHAIN]: 'BNB Chain',
  [Blockchain.BASE]: 'Base',
  [Blockchain.OPTIMISM]: 'Optimism',
};

const CHAIN_COLORS: Partial<Record<Blockchain, string>> = {
  [Blockchain.ETHEREUM]: '#627eea',
  [Blockchain.ARBITRUM]: '#28a0f0',
  [Blockchain.POLYGON]: '#8247e5',
  [Blockchain.AVALANCHE]: '#e84142',
  [Blockchain.BNB_CHAIN]: '#f3ba2f',
  [Blockchain.BASE]: '#0052ff',
  [Blockchain.OPTIMISM]: '#ff0420',
};

interface ChainPriceData {
  chain: Blockchain;
  price: number;
  change24h: number;
  change24hPercent: number;
  timestamp: number;
  confidence: number;
  source: string;
}

interface CrossChainPriceComparisonProps {
  symbol: string;
  chains?: Blockchain[];
  priceThreshold?: number;
  onArbitrageOpportunity?: (opportunity: ArbitrageOpportunity) => void;
}

export interface ArbitrageOpportunity {
  symbol: string;
  buyChain: Blockchain;
  sellChain: Blockchain;
  buyPrice: number;
  sellPrice: number;
  priceDifference: number;
  priceDifferencePercent: number;
  timestamp: number;
}

interface PricePoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

export function CrossChainPriceComparison({
  symbol,
  chains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.BASE,
  ],
  priceThreshold = 0.5,
  onArbitrageOpportunity,
}: CrossChainPriceComparisonProps) {
  const [priceData, setPriceData] = useState<ChainPriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChains, setExpandedChains] = useState<Set<Blockchain>>(new Set(chains));

  const diaService = useMemo(() => getDIADataService(), []);

  const fetchData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const results: ChainPriceData[] = [];
      const historicalResults: Map<Blockchain, PricePoint[]> = new Map();

      await Promise.all(
        chains.map(async (chain) => {
          try {
            const price = await diaService.getAssetPrice(symbol, chain);
            if (price) {
              results.push({
                chain,
                price: price.price,
                change24h: price.change24h || 0,
                change24hPercent: price.change24hPercent || 0,
                timestamp: price.timestamp,
                confidence: price.confidence || 0.95,
                source: price.source || 'DIA API',
              });
            }

            const historical = await diaService.getHistoricalPrices(symbol, chain, 24);
            if (historical && historical.length > 0) {
              historicalResults.set(chain, historical.map((p) => ({
                timestamp: p.timestamp,
                time: new Date(p.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                [DIA_CHAIN_NAMES[chain] || chain]: p.price,
              })));
            }
          } catch (err) {
            console.warn(`Failed to fetch data for ${symbol} on ${chain}:`, err);
          }
        })
      );

      setPriceData(results);

      if (historicalResults.size > 0) {
        const mergedData = mergeHistoricalData(historicalResults);
        setHistoricalData(mergedData);
      }

      checkArbitrageOpportunities(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cross-chain prices');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const mergeHistoricalData = (data: Map<Blockchain, PricePoint[]>): PricePoint[] => {
    const merged: PricePoint[] = [];
    const allTimestamps = new Set<number>();

    data.forEach((points) => {
      points.forEach((p) => allTimestamps.add(p.timestamp));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    sortedTimestamps.forEach((timestamp) => {
      const point: PricePoint = {
        timestamp,
        time: new Date(timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      data.forEach((points, chain) => {
        const matchingPoint = points.find((p) => p.timestamp === timestamp);
        if (matchingPoint) {
          const chainName = DIA_CHAIN_NAMES[chain] || chain;
          point[chainName] = matchingPoint[chainName] as number;
        }
      });

      merged.push(point);
    });

    return merged;
  };

  const checkArbitrageOpportunities = (prices: ChainPriceData[]) => {
    if (prices.length < 2) return;

    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const price1 = prices[i].price;
        const price2 = prices[j].price;
        const diffPercent = Math.abs((price1 - price2) / Math.min(price1, price2)) * 100;

        if (diffPercent >= priceThreshold) {
          const opportunity: ArbitrageOpportunity = {
            symbol,
            buyChain: price1 < price2 ? prices[i].chain : prices[j].chain,
            sellChain: price1 < price2 ? prices[j].chain : prices[i].chain,
            buyPrice: Math.min(price1, price2),
            sellPrice: Math.max(price1, price2),
            priceDifference: Math.abs(price1 - price2),
            priceDifferencePercent: diffPercent,
            timestamp: Date.now(),
          };

          onArbitrageOpportunity?.(opportunity);
        }
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol, chains.join(',')]);

  const toggleChain = (chain: Blockchain) => {
    setExpandedChains((prev) => {
      const next = new Set(prev);
      if (next.has(chain)) {
        next.delete(chain);
      } else {
        next.add(chain);
      }
      return next;
    });
  };

  const avgPrice = useMemo(() => {
    if (!priceData || priceData.length === 0) return 0;
    return priceData.reduce((sum, p) => sum + p.price, 0) / priceData.length;
  }, [priceData]);

  const priceRange = useMemo(() => {
    if (!priceData || priceData.length === 0) return { min: 0, max: 0, spread: 0 };
    const prices = priceData.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, spread: min > 0 ? ((max - min) / min) * 100 : 0 };
  }, [priceData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {chains.map((chain) => (
            <Skeleton key={chain} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Cross-Chain Price Comparison
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {symbol} prices across {priceData?.length || 0} chains
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Price</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            ${avgPrice.toFixed(4)}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Lowest</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">
            ${priceRange.min.toFixed(4)}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Highest</p>
          <p className="text-xl font-semibold text-red-600 mt-1">
            ${priceRange.max.toFixed(4)}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Spread</p>
          <p className={`text-xl font-semibold mt-1 ${priceRange.spread > priceThreshold ? 'text-amber-600' : 'text-gray-900'}`}>
            {priceRange.spread.toFixed(3)}%
          </p>
        </div>
      </div>

      {priceRange.spread > priceThreshold && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Price difference exceeds {priceThreshold}% threshold. Potential arbitrage opportunity.
          </span>
        </div>
      )}

      {(!priceData || priceData.length === 0) ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p>No cross-chain price data available</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chain
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h Change
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  vs Avg
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {priceData.map((data) => {
                const isPositive = data.change24hPercent >= 0;
                const vsAvg = avgPrice > 0 ? ((data.price - avgPrice) / avgPrice) * 100 : 0;

                return (
                  <tr key={data.chain} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHAIN_COLORS[data.chain] || '#gray' }}
                        />
                        <span className="font-medium text-gray-900">
                          {DIA_CHAIN_NAMES[data.chain] || data.chain}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">
                        ${data.price.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          isPositive ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {isPositive ? '+' : ''}
                        {data.change24hPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm ${
                          Math.abs(vsAvg) > priceThreshold / 2
                            ? vsAvg > 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {vsAvg > 0 ? '+' : ''}
                        {vsAvg.toFixed(3)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${(data.confidence || 0.95) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {((data.confidence || 0.95) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {historicalData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Price Trend by Chain
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, '']}
                />
                <Legend />
                {chains.map((chain) => {
                  const chainName = DIA_CHAIN_NAMES[chain] || chain;
                  return (
                    <Line
                      key={chain}
                      type="monotone"
                      dataKey={chainName}
                      stroke={CHAIN_COLORS[chain] || '#gray'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrossChainPriceComparison;
