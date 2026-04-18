'use client';

import { memo, useState, useMemo } from 'react';

import { TrendingUp, Filter } from 'lucide-react';

import type { OracleProvider, PriceData } from '@/types/oracle';

import {
  MarketConsensusCard,
  PriceDispersionCard,
  ChartTabSwitcher,
  type ChartTabType,
  PriceDistributionHistogram,
  DeviationScatterChart,
  MultiOracleTrendChart,
  MarketDepthSimulator,
} from '../price-comparison';
import { SimplePriceTable } from '../SimplePriceTable';

import type { PriceAnomaly } from '../../hooks/usePriceAnomalyDetection';

interface SimplePriceComparisonTabProps {
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  avgPrice: number;
  validPrices: number[];
  anomalies: PriceAnomaly[];
  historicalData?: Partial<Record<OracleProvider, Array<{ timestamp: number; price: number }>>>;
  oracleColors: Record<OracleProvider, string>;
}

function SimplePriceComparisonTabComponent({
  priceData,
  selectedOracles: _selectedOracles,
  selectedSymbol,
  medianPrice,
  minPrice,
  maxPrice,
  priceRange: _priceRange,
  standardDeviation,
  standardDeviationPercent: _standardDeviationPercent,
  avgPrice,
  validPrices,
  anomalies,
  historicalData,
  oracleColors,
}: SimplePriceComparisonTabProps) {
  const [baseAsset, quoteAsset] = selectedSymbol.split('/');
  const [activeChartTab, setActiveChartTab] = useState<ChartTabType>('distribution');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'critical'>(
    'all'
  );

  const stats = useMemo(() => {
    const oracleCount = priceData.length;
    const anomalyCount = anomalies.length;
    return { oracleCount, anomalyCount };
  }, [priceData, anomalies]);

  const renderChartContent = () => {
    switch (activeChartTab) {
      case 'distribution':
        return (
          <PriceDistributionHistogram
            priceData={priceData}
            medianPrice={medianPrice}
            anomalies={anomalies}
          />
        );
      case 'scatter':
        return (
          <DeviationScatterChart
            priceData={priceData}
            medianPrice={medianPrice}
            anomalies={anomalies}
          />
        );
      case 'trend':
        return (
          <MultiOracleTrendChart
            historicalData={historicalData || {}}
            oracleColors={oracleColors}
          />
        );
      case 'depth':
        return <MarketDepthSimulator priceData={priceData} medianPrice={medianPrice} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded text-[10px] font-medium text-emerald-700 uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
              </span>
              Live
            </span>
            {stats.anomalyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 rounded text-[10px] font-medium text-red-700">
                {stats.anomalyCount} anomalies detected
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">{baseAsset}</span>
            <span className="text-base text-gray-400 font-medium">/{quoteAsset}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Oracle Count</p>
            <p className="text-lg font-semibold text-gray-900">{stats.oracleCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarketConsensusCard
          medianPrice={medianPrice}
          minPrice={minPrice}
          maxPrice={maxPrice}
          symbol={selectedSymbol}
        />
        <PriceDispersionCard
          standardDeviation={standardDeviation}
          avgPrice={avgPrice}
          oracleCount={stats.oracleCount}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            Price Comparison
          </h4>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="normal">Normal</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <SimplePriceTable
          priceData={priceData}
          medianPrice={medianPrice}
          validPrices={validPrices}
          anomalies={anomalies}
          statusFilter={statusFilter}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Visualization</h4>
          <ChartTabSwitcher activeTab={activeChartTab} onTabChange={setActiveChartTab} />
        </div>
        {renderChartContent()}
      </div>
    </div>
  );
}

export const SimplePriceComparisonTab = memo(SimplePriceComparisonTabComponent);
SimplePriceComparisonTab.displayName = 'SimplePriceComparisonTab';
