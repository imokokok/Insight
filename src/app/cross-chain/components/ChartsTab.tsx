'use client';

import { useMemo } from 'react';

import { baseColors, semanticColors, chartColors } from '@/lib/config/colors';
import { formatPrice } from '@/lib/utils/format';
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { useCrossChainSelectorStore } from '@/stores/crossChainSelectorStore';

import { useStatistics } from '../hooks/useStatistics';
import { useCurrentClient, useFilteredChains } from '../useCrossChainData';
import { chainNames } from '../utils';

export function ChartsTab() {
  const filteredChains = useFilteredChains();
  const currentPrices = useCrossChainDataStore((s) => s.currentPrices);
  const selectedBaseChain = useCrossChainSelectorStore((s) => s.selectedBaseChain);
  const currentClient = useCurrentClient();

  const statistics = useStatistics({
    currentPrices,
    filteredChains,
    currentClient,
  });

  const {
    avgPrice,
    medianPrice,
    standardDeviation,
    coefficientOfVariation,
    skewness,
    kurtosis,
    confidenceInterval95,
    iqrValue,
    validPrices,
  } = statistics;

  const priceDistribution = useMemo(() => {
    if (validPrices.length === 0) return [];
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const range = max - min;
    const bins = 5;
    const binSize = range / bins || 1;

    const distribution = Array.from({ length: bins }, (_, i) => ({
      range: `${formatPrice(min + i * binSize)} - ${formatPrice(min + (i + 1) * binSize)}`,
      count: 0,
      percentage: 0,
    }));

    validPrices.forEach((price) => {
      const binIndex = Math.min(Math.floor((price - min) / binSize), bins - 1);
      distribution[binIndex].count++;
    });

    distribution.forEach((bin) => {
      bin.percentage = validPrices.length > 0 ? (bin.count / validPrices.length) * 100 : 0;
    });

    return distribution;
  }, [validPrices]);

  const chainPriceBars = useMemo(() => {
    if (currentPrices.length === 0 || !selectedBaseChain) return [];
    const basePrice = currentPrices.find((p) => p.chain === selectedBaseChain)?.price ?? 0;
    if (basePrice <= 0) return [];

    return currentPrices
      .filter((p) => p.chain && filteredChains.includes(p.chain) && p.price > 0)
      .map((p) => ({
        chain: chainNames[p.chain!] || p.chain,
        price: p.price,
        diffPercent: ((p.price - basePrice) / basePrice) * 100,
      }))
      .sort((a, b) => b.price - a.price);
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const statsCards = [
    {
      label: 'Average Price',
      value: avgPrice > 0 ? formatPrice(avgPrice) : '-',
      color: baseColors.primary[500],
    },
    {
      label: 'Median Price',
      value: medianPrice > 0 ? formatPrice(medianPrice) : '-',
      color: semanticColors.success.main,
    },
    {
      label: 'Standard Deviation',
      value: standardDeviation > 0 ? formatPrice(standardDeviation) : '-',
      color: chartColors.recharts.purple,
    },
    {
      label: 'Coefficient of Variation',
      value: coefficientOfVariation > 0 ? `${(coefficientOfVariation * 100).toFixed(2)}%` : '-',
      color: baseColors.gray[700],
    },
    {
      label: 'Skewness',
      value: skewness !== 0 ? skewness.toFixed(4) : '-',
      color: baseColors.gray[700],
    },
    {
      label: 'Kurtosis',
      value: kurtosis !== 0 ? kurtosis.toFixed(4) : '-',
      color: baseColors.gray[700],
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: baseColors.gray[900] }}>
          Price Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statsCards.map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-lg"
              style={{ backgroundColor: baseColors.gray[50] }}
            >
              <div className="text-xs" style={{ color: baseColors.gray[500] }}>
                {card.label}
              </div>
              <div className="text-lg font-semibold" style={{ color: card.color }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {confidenceInterval95.lower > 0 && (
        <div className="p-4 rounded-lg border" style={{ borderColor: baseColors.gray[200] }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: baseColors.gray[900] }}>
            95% Confidence Interval ({confidenceInterval95.distributionType.toUpperCase()}
            -distribution)
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 rounded-full bg-gray-200 relative">
              <div
                className="absolute h-full rounded-full"
                style={{
                  left: '20%',
                  right: '20%',
                  backgroundColor: baseColors.primary[400],
                }}
              />
            </div>
          </div>
          <div
            className="flex justify-between mt-2 text-xs"
            style={{ color: baseColors.gray[600] }}
          >
            <span>Lower: {formatPrice(confidenceInterval95.lower)}</span>
            <span>Critical Value: {confidenceInterval95.criticalValue.toFixed(3)}</span>
            <span>Upper: {formatPrice(confidenceInterval95.upper)}</span>
          </div>
        </div>
      )}

      {chainPriceBars.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
            Price Comparison vs {chainNames[selectedBaseChain!] || selectedBaseChain}
          </h4>
          <div className="space-y-2">
            {chainPriceBars.map((item) => (
              <div key={item.chain} className="flex items-center gap-3">
                <span className="text-xs w-24 truncate" style={{ color: baseColors.gray[600] }}>
                  {item.chain}
                </span>
                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.abs(item.diffPercent) * 10, 100)}%`,
                      backgroundColor:
                        item.diffPercent > 0
                          ? semanticColors.danger.main
                          : item.diffPercent < 0
                            ? semanticColors.success.main
                            : baseColors.gray[400],
                      marginLeft: item.diffPercent < 0 ? 'auto' : '0',
                      marginRight: item.diffPercent > 0 ? 'auto' : '0',
                    }}
                  />
                </div>
                <span
                  className="text-xs font-mono w-16 text-right"
                  style={{
                    color:
                      item.diffPercent > 0
                        ? semanticColors.danger.main
                        : item.diffPercent < 0
                          ? semanticColors.success.main
                          : baseColors.gray[600],
                  }}
                >
                  {item.diffPercent >= 0 ? '+' : ''}
                  {item.diffPercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {priceDistribution.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: baseColors.gray[900] }}>
            Price Distribution
          </h4>
          <div className="space-y-2">
            {priceDistribution.map((bin, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs w-32 truncate" style={{ color: baseColors.gray[600] }}>
                  {bin.range}
                </span>
                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${bin.percentage}%`,
                      backgroundColor: baseColors.primary[400],
                    }}
                  />
                </div>
                <span className="text-xs w-12 text-right" style={{ color: baseColors.gray[600] }}>
                  {bin.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
