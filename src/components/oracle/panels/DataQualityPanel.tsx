'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { baseColors } from '@/lib/config/colors';
import { QualityScoreCard } from './QualityScoreCard';
import { PriceDeviationChart } from './PriceDeviationChart';
import { LatencyDistributionChart } from './LatencyDistributionChart';
import { DataSourceList } from './DataSourceList';
import {
  DataQualityConfig,
  generatePriceDeviationData,
  generateLatencyDistribution,
  calculateLatencyMetrics,
  generateDataSources,
  calculateQualityScore,
} from './qualityUtils';

interface DataQualityPanelProps {
  symbol?: string;
  basePrice?: number;
  autoUpdate?: boolean;
  updateInterval?: number;
}

export function DataQualityPanel({
  symbol = 'ETH',
  basePrice = 2500,
  autoUpdate = true,
  updateInterval = 30000,
}: DataQualityPanelProps) {
  const t = useTranslations();
  const [config, setConfig] = useState<DataQualityConfig>({
    symbol,
    basePrice,
    priceDeviations: [],
    latencyDistribution: [],
    latencyMetrics: { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, stdDev: 0 },
    dataSources: [],
    qualityScore: { overall: 0, priceAccuracy: 0, latency: 0, reliability: 0 },
    lastUpdated: new Date(),
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateData = useCallback(() => {
    const priceDeviations = generatePriceDeviationData(basePrice);
    const latencyDistribution = generateLatencyDistribution();
    const latencyMetrics = calculateLatencyMetrics(latencyDistribution);
    const dataSources = generateDataSources();
    const qualityScore = calculateQualityScore(priceDeviations, latencyMetrics, dataSources);

    setConfig({
      symbol,
      basePrice,
      priceDeviations,
      latencyDistribution,
      latencyMetrics,
      dataSources,
      qualityScore,
      lastUpdated: new Date(),
    });
    setLastUpdated(new Date());
  }, [symbol, basePrice]);

  useEffect(() => {
    updateData();

    if (autoUpdate) {
      intervalRef.current = setInterval(updateData, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateData, autoUpdate, updateInterval]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('dataQuality.dataQualityAnalysis')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('dataQuality.oracleDataQualityMetrics')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {t('dataQuality.lastUpdated')}: {lastUpdated.toLocaleTimeString('zh-CN')}
          </span>
          <button
            onClick={updateData}
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: baseColors.primary[50], color: baseColors.primary[600] }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = baseColors.primary[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = baseColors.primary[50];
            }}
          >
            {t('dataQuality.refreshData')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceDeviationChart data={config.priceDeviations} />
        </div>
        <QualityScoreCard score={config.qualityScore} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyDistributionChart
          data={config.latencyDistribution}
          metrics={config.latencyMetrics}
        />
        <DataSourceList sources={config.dataSources} />
      </div>
    </div>
  );
}

export type { DataQualityPanelProps };
export type {
  DataQualityConfig,
  PriceDeviationData,
  LatencyDistributionData,
  LatencyMetrics,
  DataSourceReliability,
  QualityScore,
  QualityStatus,
} from './qualityUtils';
