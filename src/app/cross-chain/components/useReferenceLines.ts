'use client';

import { useState, useCallback } from 'react';

import { chartColors, semanticColors } from '@/lib/config/colors';
import { type Blockchain } from '@/types/oracle';

import { type ChartDataPoint } from '../constants';

import { type ReferenceLineConfig } from './ReferenceLineManager';

export function useReferenceLines(
  visibleData: ChartDataPoint[],
  filteredChains: Blockchain[],
  avgPrice: number,
  medianPrice: number,
  priceDomain: [number | string, number | string]
) {
  const [referenceLines, setReferenceLines] = useState<ReferenceLineConfig[]>([]);

  const addReferenceLine = useCallback(
    (type: 'current' | 'avg' | 'median' | 'custom') => {
      const id = `ref-${Date.now()}`;
      let y = 0;
      let label = '';
      let color = '';

      switch (type) {
        case 'current':
          if (visibleData.length > 0) {
            const lastPoint = visibleData[visibleData.length - 1];
            const prices = filteredChains
              .map((chain) => lastPoint[chain] as number | undefined)
              .filter((p): p is number => p !== undefined && !isNaN(p));
            y = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
          }
          label = 'Current Price';
          color = chartColors.recharts.primary;
          break;
        case 'avg':
          y = avgPrice;
          label = 'Average Price';
          color = semanticColors.success.main;
          break;
        case 'median':
          y = medianPrice;
          label = 'Median Price';
          color = semanticColors.warning.main;
          break;
        case 'custom':
          y =
            priceDomain[0] === 'auto'
              ? 0
              : (priceDomain[0] as number) +
                ((priceDomain[1] as number) - (priceDomain[0] as number)) / 2;
          label = 'Custom Line';
          color = semanticColors.info.main;
          break;
      }

      if (y > 0) {
        setReferenceLines((prev) => [...prev, { id, y, label, color, strokeDasharray: '5 5' }]);
      }
    },
    [visibleData, filteredChains, avgPrice, medianPrice, priceDomain]
  );

  const removeReferenceLine = useCallback((id: string) => {
    setReferenceLines((prev) => prev.filter((line) => line.id !== id));
  }, []);

  const clearAllReferenceLines = useCallback(() => {
    setReferenceLines([]);
  }, []);

  return { referenceLines, addReferenceLine, removeReferenceLine, clearAllReferenceLines };
}
