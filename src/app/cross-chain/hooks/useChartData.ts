/**
 * @fileoverview 图表数据 Hook
 * 提供图表数据计算功能
 */

import { useMemo } from 'react';

import { safeMax, safeMin } from '@/lib/utils/statistics';
import { type Blockchain, type PriceData } from '@/types/oracle';

import {
  type HeatmapData,
  type BoxPlotData,
  type ChartDataPoint,
  type IqrOutliers,
} from '../constants';
import {
  chainNames,
  chainColors,
  calculatePercentile,
  calculateSMA,
  detectPriceJumps,
  defaultThresholdConfig,
  detectOutliersIQR,
  detectOutliersZScore,
  calculatePearsonCorrelationWithSignificanceByTimestamp,
  type CorrelationResult,
  type TimestampedPrice,
  type ThresholdConfig,
} from '../utils';

export interface UseChartDataParams {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  filteredChains: Blockchain[];
  selectedBaseChain: Blockchain | null;
  selectedTimeRange: number;
  showMA: boolean;
  maPeriod: number;
  validPrices: number[];
  avgPrice: number;
  standardDeviation: number;
  medianPrice: number;
  thresholdConfig?: ThresholdConfig;
}

export interface UseChartDataReturn {
  chartData: ChartDataPoint[];
  chartDataWithMA: ChartDataPoint[];
  priceDifferences: {
    chain: Blockchain;
    price: number;
    diff: number;
    diffPercent: number;
  }[];
  heatmapData: HeatmapData[];
  maxHeatmapValue: number;
  priceDistributionData: {
    range: string;
    count: number;
    midPrice: number;
    minPrice: number;
    maxPrice: number;
  }[];
  boxPlotData: BoxPlotData[];
  totalDataPoints: number;
  iqrOutliers: IqrOutliers;
  stdDevHistoricalOutliers: {
    timestamp: number;
    chain: Blockchain;
    price: number;
    deviation: number;
  }[];
  scatterData: Array<
    Partial<ChartDataPoint> & {
      outlierChain: Blockchain;
      outlierPrice: number;
      deviation: number;
      timestamp: number;
    }
  >;
  correlationMatrix: Partial<Record<Blockchain, Partial<Record<Blockchain, number>>>>;
  correlationMatrixWithSignificance: Partial<
    Record<Blockchain, Partial<Record<Blockchain, CorrelationResult>>>
  >;
  priceJumpFrequency: Partial<Record<Blockchain, number>>;
  priceChangePercent: Partial<Record<Blockchain, number>>;
  meanBinIndex: number;
  medianBinIndex: number;
  stdDevBinRange: { lower: number; upper: number } | null;
}

// eslint-disable-next-line max-lines-per-function
export function useChartData(params: UseChartDataParams): UseChartDataReturn {
  const {
    currentPrices,
    historicalPrices,
    filteredChains,
    selectedBaseChain,
    selectedTimeRange,
    showMA,
    maPeriod,
    validPrices,
    avgPrice,
    standardDeviation,
    medianPrice,
    thresholdConfig: thresholdConfigParam,
  } = params;

  const thresholdConfig = thresholdConfigParam ?? defaultThresholdConfig;

  const chartData = useMemo(() => {
    if (Object.keys(historicalPrices).length === 0) return [];
    const timestamps = new Set<number>();
    filteredChains.forEach((chain) => {
      historicalPrices[chain]?.forEach((price) => timestamps.add(price.timestamp));
    });
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    const getTimeFormat = (): Intl.DateTimeFormatOptions => {
      if (selectedTimeRange <= 6) {
        return { hour: '2-digit', minute: '2-digit' };
      } else if (selectedTimeRange <= 24) {
        return { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      } else {
        return { month: 'short', day: 'numeric' };
      }
    };

    const calculateMA = (
      prices: (number | undefined)[],
      period: number,
      index: number
    ): number | null => {
      if (index < period - 1) return null;
      const slice = prices.slice(index - period + 1, index + 1);
      const validPrices = slice.filter((p): p is number => p !== undefined);
      if (validPrices.length < period) return null;
      return validPrices.reduce((a, b) => a + b, 0) / period;
    };

    const chainPriceMaps: Partial<Record<Blockchain, Map<number, PriceData>>> = {};
    filteredChains.forEach((chain) => {
      chainPriceMaps[chain] = new Map(historicalPrices[chain]?.map((p) => [p.timestamp, p]) || []);
    });

    const chainPriceArrays: Partial<Record<Blockchain, (number | undefined)[]>> = {};
    filteredChains.forEach((chain) => {
      chainPriceArrays[chain] = sortedTimestamps.map((timestamp) => {
        return chainPriceMaps[chain]?.get(timestamp)?.price;
      });
    });

    return sortedTimestamps.map((timestamp, index) => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: new Date(timestamp).toLocaleString([], getTimeFormat()),
      };
      filteredChains.forEach((chain) => {
        const priceData = chainPriceMaps[chain]?.get(timestamp);
        if (priceData) {
          dataPoint[chain] = priceData.price;
          const prices = chainPriceArrays[chain] || [];
          const ma7 = calculateMA(prices, 7, index);
          const ma20 = calculateMA(prices, 20, index);
          dataPoint[`${chain}_MA7`] = ma7;
          dataPoint[`${chain}_MA20`] = ma20;
        }
      });
      return dataPoint;
    });
  }, [historicalPrices, filteredChains, selectedTimeRange]);

  const chartDataWithMA = useMemo(() => {
    if (!showMA || chartData.length === 0) return chartData;
    const avgPrices = chartData.map((point) => {
      const prices = filteredChains
        .map((chain) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined && !isNaN(p));
      return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    });
    const maValues = calculateSMA(avgPrices, maPeriod);
    return chartData.map((point, index) => ({
      ...point,
      ma: maValues[index],
    }));
  }, [chartData, showMA, maPeriod, filteredChains]);

  const priceDifferences = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2 || !selectedBaseChain) return [];
    const basePriceData = filteredPrices.find((p) => p.chain === selectedBaseChain);
    if (!basePriceData) return [];
    const basePrice = basePriceData.price;
    return filteredPrices.map((priceData) => {
      const diff = priceData.price - basePrice;
      const diffPercent = basePrice > 0 && priceData.price > 0 ? (diff / basePrice) * 100 : 0;
      return {
        chain: priceData.chain!,
        price: priceData.price,
        diff,
        diffPercent,
      };
    });
  }, [currentPrices, selectedBaseChain, filteredChains]);

  const heatmapData = useMemo(() => {
    const filteredPrices = currentPrices.filter((p) => p.chain && filteredChains.includes(p.chain));
    if (filteredPrices.length < 2) return [];
    const data: HeatmapData[] = [];

    filteredChains.forEach((xChain) => {
      filteredChains.forEach((yChain) => {
        const xPrice = filteredPrices.find((p) => p.chain === xChain)?.price || 0;
        const yPrice = filteredPrices.find((p) => p.chain === yChain)?.price || 0;
        const diff = Math.abs(xPrice - yPrice);
        const percent = xPrice > 0 && yPrice > 0 ? (diff / xPrice) * 100 : 0;

        data.push({
          x: chainNames[xChain],
          y: chainNames[yChain],
          value: diff,
          percent,
          xChain,
          yChain,
        });
      });
    });

    return data;
  }, [currentPrices, filteredChains]);

  const maxHeatmapValue = useMemo(() => {
    if (heatmapData.length === 0) return 1;
    return safeMax(heatmapData.map((d) => d.percent));
  }, [heatmapData]);

  const priceDistributionData = useMemo(() => {
    if (validPrices.length === 0) return [];

    const numBins = Math.min(10, Math.max(5, validPrices.length));
    const min = safeMin(validPrices);
    const max = safeMax(validPrices);
    const range = max - min;
    const binWidth = range > 0 ? range / numBins : 1;

    const bins: {
      range: string;
      count: number;
      minPrice: number;
      maxPrice: number;
      midPrice: number;
    }[] = [];

    for (let i = 0; i < numBins; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;

      const formatBinPrice = (p: number): string => {
        const absP = Math.abs(p);
        if (absP >= 1000) return (p / 1000).toFixed(1) + 'K';
        if (absP >= 1) return p.toFixed(4);
        return p.toFixed(6);
      };
      const rangeLabel = `$${formatBinPrice(binMin)}-$${formatBinPrice(binMax)}`;

      bins.push({
        range: rangeLabel,
        count: 0,
        minPrice: binMin,
        maxPrice: binMax,
        midPrice: (binMin + binMax) / 2,
      });
    }

    if (binWidth === 0) {
      bins[0].count = validPrices.length;
    } else {
      validPrices.forEach((price) => {
        const binIndex = Math.min(Math.floor((price - min) / binWidth), numBins - 1);
        bins[binIndex].count++;
      });
    }

    return bins.map((bin) => ({
      range: bin.range,
      count: bin.count,
      midPrice: bin.midPrice,
      minPrice: bin.minPrice,
      maxPrice: bin.maxPrice,
    }));
  }, [validPrices]);

  const meanBinIndex = useMemo(() => {
    if (priceDistributionData.length === 0 || avgPrice === 0) return -1;
    for (let i = 0; i < priceDistributionData.length; i++) {
      const binMin = priceDistributionData[i].minPrice;
      const binMax = priceDistributionData[i].maxPrice;
      if (avgPrice >= binMin && (avgPrice <= binMax || i === priceDistributionData.length - 1)) {
        return i;
      }
    }
    return -1;
  }, [priceDistributionData, avgPrice]);

  const medianBinIndex = useMemo(() => {
    if (priceDistributionData.length === 0 || medianPrice === 0) return -1;
    for (let i = 0; i < priceDistributionData.length; i++) {
      const binMin = priceDistributionData[i].minPrice;
      const binMax = priceDistributionData[i].maxPrice;
      if (
        medianPrice >= binMin &&
        (medianPrice <= binMax || i === priceDistributionData.length - 1)
      ) {
        return i;
      }
    }
    return -1;
  }, [priceDistributionData, medianPrice]);

  const stdDevBinRange = useMemo(() => {
    if (priceDistributionData.length === 0 || standardDeviation === 0) return null;
    const lower = avgPrice - standardDeviation;
    const upper = avgPrice + standardDeviation;
    return { lower, upper };
  }, [priceDistributionData, avgPrice, standardDeviation]);

  const boxPlotData = useMemo(() => {
    const result: BoxPlotData[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain]?.map((p) => p.price) || [];
      if (prices.length < 4) return;

      const sorted = [...prices].sort((a, b) => a - b);
      const n = sorted.length;

      const q1 = calculatePercentile(sorted, 25);
      const q3 = calculatePercentile(sorted, 75);
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const nonOutliers = sorted.filter((p) => p >= lowerBound && p <= upperBound);
      const outliers = sorted.filter((p) => p < lowerBound || p > upperBound);

      result.push({
        chain,
        chainName: chainNames[chain],
        color: chainColors[chain],
        min: nonOutliers.length > 0 ? safeMin(nonOutliers) : lowerBound,
        q1,
        median: sorted[Math.floor(n / 2)],
        q3,
        max: nonOutliers.length > 0 ? safeMax(nonOutliers) : upperBound,
        outliers,
        iqr,
        lowerWhisker: lowerBound,
        upperWhisker: upperBound,
      });
    });

    return result;
  }, [historicalPrices, filteredChains]);

  const totalDataPoints = useMemo(() => {
    let count = 0;
    filteredChains.forEach((chain) => {
      count += historicalPrices[chain]?.length || 0;
    });
    return count;
  }, [historicalPrices, filteredChains]);

  const iqrOutliers = useMemo((): IqrOutliers => {
    if (validPrices.length < 4) {
      return { outliers: [], q1: 0, q3: 0, iqr: 0, lowerBound: 0, upperBound: 0 };
    }

    const multiplier =
      thresholdConfig.outlierDetectionMethod === 'iqr' ? thresholdConfig.outlierThreshold : 1.5;

    const sorted = [...validPrices].sort((a, b) => a - b);
    const q1 = calculatePercentile(sorted, 25);
    const q3 = calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const outliers: {
      chain: Blockchain;
      price: number;
      deviationPercent: number;
      boundType: 'lower' | 'upper';
      expectedRange: string;
    }[] = [];

    currentPrices.forEach((priceData) => {
      if (!priceData.chain || !filteredChains.includes(priceData.chain)) return;
      if (priceData.price < lowerBound || priceData.price > upperBound) {
        const boundType = priceData.price < lowerBound ? 'lower' : 'upper';
        const boundValue = boundType === 'lower' ? lowerBound : upperBound;
        const deviationPercent = Math.abs((priceData.price - boundValue) / boundValue) * 100;

        outliers.push({
          chain: priceData.chain,
          price: priceData.price,
          deviationPercent,
          boundType,
          expectedRange: `$${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}`,
        });
      }
    });

    return { outliers, q1, q3, iqr, lowerBound, upperBound };
  }, [validPrices, currentPrices, filteredChains, thresholdConfig]);

  const stdDevHistoricalOutliers = useMemo(() => {
    const result: { timestamp: number; chain: Blockchain; price: number; deviation: number }[] = [];

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) return;

      const priceValues = prices.map((p) => p.price);

      if (thresholdConfig.outlierDetectionMethod === 'iqr') {
        const iqrResult = detectOutliersIQR(priceValues, thresholdConfig.outlierThreshold);

        prices.forEach((priceData) => {
          if (priceData.price < iqrResult.lowerBound || priceData.price > iqrResult.upperBound) {
            const boundValue =
              priceData.price < iqrResult.lowerBound ? iqrResult.lowerBound : iqrResult.upperBound;
            const deviation = Math.abs(priceData.price - boundValue) / iqrResult.iqr;
            result.push({
              timestamp: priceData.timestamp,
              chain,
              price: priceData.price,
              deviation,
            });
          }
        });
      } else {
        const zscoreResult = detectOutliersZScore(priceValues, thresholdConfig.outlierThreshold);

        prices.forEach((priceData) => {
          const zScore = (priceData.price - zscoreResult.mean) / zscoreResult.stdDev;
          if (Math.abs(zScore) > thresholdConfig.outlierThreshold) {
            result.push({
              timestamp: priceData.timestamp,
              chain,
              price: priceData.price,
              deviation: Math.abs(zScore),
            });
          }
        });
      }
    });

    return result;
  }, [
    historicalPrices,
    filteredChains,
    thresholdConfig.outlierDetectionMethod,
    thresholdConfig.outlierThreshold,
  ]);

  const scatterData = useMemo(() => {
    if (stdDevHistoricalOutliers.length === 0 || chartData.length === 0) return [];
    const chartDataMap = new Map(chartData.map((d) => [d.timestamp, d]));
    return stdDevHistoricalOutliers
      .map((outlier) => {
        const dataPoint = chartDataMap.get(outlier.timestamp);
        return {
          ...dataPoint,
          outlierChain: outlier.chain,
          outlierPrice: outlier.price,
          deviation: outlier.deviation,
          timestamp: outlier.timestamp,
        };
      })
      .filter((d) => d.timestamp !== undefined);
  }, [stdDevHistoricalOutliers, chartData]);

  const { correlationMatrix, correlationMatrixWithSignificance } = useMemo(() => {
    const matrix: Partial<Record<Blockchain, Partial<Record<Blockchain, number>>>> = {};
    const matrixWithSig: Partial<
      Record<Blockchain, Partial<Record<Blockchain, CorrelationResult>>>
    > = {};

    filteredChains.forEach((chainX) => {
      matrix[chainX] = {};
      matrixWithSig[chainX] = {};
      const dataX: TimestampedPrice[] =
        historicalPrices[chainX]?.map((p) => ({ timestamp: p.timestamp, price: p.price })) || [];

      filteredChains.forEach((chainY) => {
        const dataY: TimestampedPrice[] =
          historicalPrices[chainY]?.map((p) => ({ timestamp: p.timestamp, price: p.price })) || [];

        if (chainX === chainY) {
          if (matrix[chainX]) {
            matrix[chainX][chainY] = 1;
          }
          if (matrixWithSig[chainX]) {
            matrixWithSig[chainX][chainY] = {
              correlation: 1,
              pValue: 0,
              sampleSize: dataX.length,
              isSignificant: true,
              significanceLevel: '***',
            };
          }
        } else {
          const result = calculatePearsonCorrelationWithSignificanceByTimestamp(dataX, dataY);
          if (matrix[chainX]) {
            matrix[chainX][chainY] = isNaN(result.correlation) ? 0 : result.correlation;
          }
          if (matrixWithSig[chainX]) {
            matrixWithSig[chainX][chainY] = result;
          }
        }
      });
    });

    return { correlationMatrix: matrix, correlationMatrixWithSignificance: matrixWithSig };
  }, [historicalPrices, filteredChains]);
  const priceJumpFrequency = useMemo(() => {
    const frequency: Partial<Record<Blockchain, number>> = {};

    filteredChains.forEach((chain) => {
      const prices = historicalPrices[chain] || [];
      if (prices.length < 2) {
        frequency[chain] = 0;
        return;
      }

      const changes: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const prevPrice = prices[i - 1].price;
        const currPrice = prices[i].price;
        if (prevPrice > 0) {
          const changePercent = Math.abs((currPrice - prevPrice) / prevPrice) * 100;
          changes.push(changePercent);
        }
      }

      if (changes.length === 0) {
        frequency[chain] = 0;
        return;
      }

      const jumpCount = detectPriceJumps(
        changes,
        defaultThresholdConfig.priceJumpMethod,
        defaultThresholdConfig.priceJumpThreshold
      );
      frequency[chain] = jumpCount;
    });

    return frequency;
  }, [historicalPrices, filteredChains]);
  const priceChangePercent = useMemo(() => {
    const result: Partial<Record<Blockchain, number>> = {};
    filteredChains.forEach((chain) => {
      const prices = chartData
        .map((point) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined);
      if (prices.length >= 2) {
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        if (firstPrice > 0) {
          result[chain] = ((lastPrice - firstPrice) / firstPrice) * 100;
        }
      }
    });
    return result;
  }, [chartData, filteredChains]);

  return {
    chartData,
    chartDataWithMA,
    priceDifferences,
    heatmapData,
    maxHeatmapValue,
    priceDistributionData,
    boxPlotData,
    totalDataPoints,
    iqrOutliers,
    stdDevHistoricalOutliers,
    scatterData,
    correlationMatrix,
    correlationMatrixWithSignificance,
    priceJumpFrequency,
    priceChangePercent,
    meanBinIndex,
    medianBinIndex,
    stdDevBinRange,
  };
}
