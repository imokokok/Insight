'use client';

import { memo, useState } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
} from 'lucide-react';

import { PriceFlash } from '@/components/ui/PriceFlash';
import {
  type ConsensusResult,
  type ConsensusMethod,
  getConsensusMethodLabel,
  getConsensusMethodDescription,
} from '@/lib/analytics/consensusPrice';
import { formatPrice } from '@/lib/utils/format';

import { PriceRangeBar } from './PriceRangeBar';

const ALL_METHODS: ConsensusMethod[] = [
  'median',
  'trimmed_mean',
  'weighted_median',
  'iqr_filtered',
];

interface MarketConsensusCardProps {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  previousMedian?: number;
  symbol: string;
  consensusResult?: ConsensusResult | null;
  currentMethod?: ConsensusMethod;
  onMethodChange?: (method: ConsensusMethod) => void;
}

function getConfidenceColor(level: string): string {
  switch (level) {
    case 'high':
      return 'text-emerald-600 bg-emerald-50';
    case 'medium':
      return 'text-blue-600 bg-blue-50';
    case 'low':
      return 'text-amber-600 bg-amber-50';
    case 'very_low':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

function getAgreementColor(agreement: number): string {
  if (agreement >= 0.8) return 'text-emerald-600';
  if (agreement >= 0.6) return 'text-blue-600';
  if (agreement >= 0.4) return 'text-amber-600';
  return 'text-red-600';
}

function MarketConsensusCardComponent({
  medianPrice,
  minPrice,
  maxPrice,
  previousMedian,
  symbol,
  consensusResult,
  currentMethod,
  onMethodChange,
}: MarketConsensusCardProps) {
  const [showMethodDetails, setShowMethodDetails] = useState(false);

  const displayPrice = consensusResult?.price ?? medianPrice;
  const changePercent =
    previousMedian && previousMedian > 0
      ? ((displayPrice - previousMedian) / previousMedian) * 100
      : null;

  const [baseAsset, quoteAsset] = symbol.split('/');
  const activeMethod = currentMethod ?? consensusResult?.method ?? 'median';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="group relative flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-500">Market Consensus</span>
            {consensusResult && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getConfidenceColor(consensusResult.confidenceLevel)}`}
              >
                <Shield className="w-3 h-3" />
                {consensusResult.confidenceLevel.replace('_', ' ')}
              </span>
            )}
            <div
              className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              role="tooltip"
            >
              Aggregated consensus price from all oracle quotes using{' '}
              {getConsensusMethodLabel(activeMethod)} method
              <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <PriceFlash value={displayPrice} previousValue={previousMedian}>
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatPrice(displayPrice)}
              </span>
            </PriceFlash>
            <span className="text-sm text-gray-400">
              {baseAsset}/{quoteAsset}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {changePercent !== null && (
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                changePercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {changePercent >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-semibold">{Math.abs(changePercent).toFixed(2)}%</span>
            </div>
          )}

          {onMethodChange && (
            <select
              value={activeMethod}
              onChange={(e) => onMethodChange(e.target.value as ConsensusMethod)}
              className="text-[10px] border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-600"
            >
              {ALL_METHODS.map((method) => (
                <option key={method} value={method}>
                  {getConsensusMethodLabel(method)}
                  {consensusResult?.recommendedMethod === method ? ' (Default)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {consensusResult && (
        <div className="flex items-center gap-3 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Confidence:</span>
            <span className={`font-medium ${getConfidenceColor(consensusResult.confidenceLevel)}`}>
              {(consensusResult.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Agreement:</span>
            <span className={`font-medium ${getAgreementColor(consensusResult.agreement)}`}>
              {(consensusResult.agreement * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Oracles:</span>
            <span className="font-medium text-gray-700">{consensusResult.participantCount}</span>
          </div>
          {consensusResult.excludedCount > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-medium">{consensusResult.excludedCount} excluded</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <PriceRangeBar
          minPrice={consensusResult?.priceRange.min ?? minPrice}
          maxPrice={consensusResult?.priceRange.max ?? maxPrice}
          medianPrice={displayPrice}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          Price Range: {formatPrice(consensusResult?.priceRange.min ?? minPrice)} -{' '}
          {formatPrice(consensusResult?.priceRange.max ?? maxPrice)}
        </span>
        <span className="group relative">
          Spread:{' '}
          {displayPrice !== 0
            ? (
                ((consensusResult?.priceRange.max ?? maxPrice) -
                  (consensusResult?.priceRange.min ?? minPrice)) /
                displayPrice
              ).toFixed(2) + '%'
            : 'N/A'}
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            role="tooltip"
          >
            Price spread between oracle quotes, lower means higher consistency
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </span>
      </div>

      {consensusResult && consensusResult.excludedProviders.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Excluded: {consensusResult.excludedProviders.join(', ')}</span>
          </div>
        </div>
      )}

      {consensusResult && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowMethodDetails(!showMethodDetails)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showMethodDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Method comparison
          </button>

          {showMethodDetails && (
            <div className="mt-2 space-y-1.5">
              {ALL_METHODS.map((method) => {
                const price = consensusResult.methodResults[method];
                const isActive = method === activeMethod;
                const isRecommended = method === consensusResult.recommendedMethod;
                return (
                  <div
                    key={method}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                      isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}
                      >
                        {getConsensusMethodLabel(method)}
                      </span>
                      {isRecommended && (
                        <span className="px-1 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                        {formatPrice(price)}
                      </span>
                      {displayPrice > 0 && (
                        <span className="text-gray-400 w-14 text-right">
                          {((Math.abs(price - displayPrice) / displayPrice) * 100).toFixed(3)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="pt-1.5 text-[10px] text-gray-400">
                {getConsensusMethodDescription(activeMethod)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const MarketConsensusCard = memo(MarketConsensusCardComponent);
MarketConsensusCard.displayName = 'MarketConsensusCard';
