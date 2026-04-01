'use client';

import { useState, useMemo, useCallback } from 'react';

import { FileText, GitCompare, TrendingUp, AlertTriangle } from 'lucide-react';

import {
  CustomReportGenerator,
  DataComparisonTool,
  TrendPrediction,
  AnomalyDetection,
} from '@/components/oracle/analytics';
import { useAPI3Historical } from '@/hooks/oracles/api3';
import {
  type MetricDefinition,
  type DataSource,
  type DataPoint,
  type ReportConfig,
} from '@/hooks/useAPI3Analytics';
import { useTranslations } from '@/i18n';
import { Blockchain } from '@/types/oracle';

type AnalyticsTab = 'report' | 'comparison' | 'prediction' | 'anomaly';

const getTabs = () => [
  { id: 'report' as const, labelKey: 'api3.analytics.tabs.report', icon: FileText },
  { id: 'comparison' as const, labelKey: 'api3.analytics.tabs.comparison', icon: GitCompare },
  { id: 'prediction' as const, labelKey: 'api3.analytics.tabs.prediction', icon: TrendingUp },
  { id: 'anomaly' as const, labelKey: 'api3.analytics.tabs.anomaly', icon: AlertTriangle },
];

const getAvailableMetrics = (t: (key: string) => string): MetricDefinition[] => [
  {
    id: 'price',
    name: t('api3.analytics.metrics.price.name'),
    category: t('api3.analytics.categories.market'),
    unit: 'USD',
    description: t('api3.analytics.metrics.price.description'),
  },
  {
    id: 'volume',
    name: t('api3.analytics.metrics.volume.name'),
    category: t('api3.analytics.categories.market'),
    unit: 'USD',
    description: t('api3.analytics.metrics.volume.description'),
  },
  {
    id: 'marketCap',
    name: t('api3.analytics.metrics.marketCap.name'),
    category: t('api3.analytics.categories.market'),
    unit: 'USD',
    description: t('api3.analytics.metrics.marketCap.description'),
  },
  {
    id: 'responseTime',
    name: t('api3.analytics.metrics.responseTime.name'),
    category: t('api3.analytics.categories.performance'),
    unit: 'ms',
    description: t('api3.analytics.metrics.responseTime.description'),
  },
  {
    id: 'successRate',
    name: t('api3.analytics.metrics.successRate.name'),
    category: t('api3.analytics.categories.performance'),
    unit: '%',
    description: t('api3.analytics.metrics.successRate.description'),
  },
  {
    id: 'activeAirnodes',
    name: t('api3.analytics.metrics.activeAirnodes.name'),
    category: t('api3.analytics.categories.network'),
    description: t('api3.analytics.metrics.activeAirnodes.description'),
  },
  {
    id: 'activeDapis',
    name: t('api3.analytics.metrics.activeDapis.name'),
    category: t('api3.analytics.categories.network'),
    description: t('api3.analytics.metrics.activeDapis.description'),
  },
  {
    id: 'stakingApr',
    name: t('api3.analytics.metrics.stakingApr.name'),
    category: t('api3.analytics.categories.staking'),
    unit: '%',
    description: t('api3.analytics.metrics.stakingApr.description'),
  },
  {
    id: 'totalStaked',
    name: t('api3.analytics.metrics.totalStaked.name'),
    category: t('api3.analytics.categories.staking'),
    unit: 'API3',
    description: t('api3.analytics.metrics.totalStaked.description'),
  },
  {
    id: 'coverageRatio',
    name: t('api3.analytics.metrics.coverageRatio.name'),
    category: t('api3.analytics.categories.risk'),
    unit: '%',
    description: t('api3.analytics.metrics.coverageRatio.description'),
  },
];

export function API3AnalyticsView() {
  const t = useTranslations();
  const tabs = getTabs();
  const availableMetrics = getAvailableMetrics(t);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('report');

  const { historicalData: apiHistoricalData } = useAPI3Historical({
    symbol: 'API3',
    chain: Blockchain.ETHEREUM,
    enabled: true,
  });

  const historicalDataPoints: DataPoint[] = useMemo(() => {
    if (!apiHistoricalData || apiHistoricalData.length === 0) {
      return generateMockData();
    }
    return apiHistoricalData.map((d) => ({
      timestamp: d.timestamp,
      value: d.price,
    }));
  }, [apiHistoricalData]);

  const dataSources: DataSource[] = useMemo(() => {
    return [
      {
        id: 'eth-usd',
        name: 'ETH/USD',
        type: 'dapi',
        data: historicalDataPoints,
      },
      {
        id: 'btc-usd',
        name: 'BTC/USD',
        type: 'dapi',
        data: generateMockData(0.8),
      },
      {
        id: 'api3-usd',
        name: 'API3/USD',
        type: 'dapi',
        data: historicalDataPoints,
      },
      {
        id: 'ethereum',
        name: 'Ethereum',
        type: 'chain',
        data: historicalDataPoints,
      },
      {
        id: 'polygon',
        name: 'Polygon',
        type: 'chain',
        data: generateMockData(0.95),
      },
    ];
  }, [historicalDataPoints]);

  const timeRange = useMemo(
    () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(Date.now()),
    }),
    []
  );

  const handleGenerateReport = useCallback((_config: ReportConfig) => {}, []);

  const handleAnomalyDetected = useCallback((_anomalies: unknown[]) => {}, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'report':
        return (
          <CustomReportGenerator
            availableMetrics={availableMetrics}
            onGenerate={handleGenerateReport}
            data={historicalDataPoints}
          />
        );
      case 'comparison':
        return (
          <DataComparisonTool
            dataSources={dataSources}
            metrics={['price', 'volume', 'responseTime']}
            timeRange={timeRange}
          />
        );
      case 'prediction':
        return (
          <TrendPrediction
            historicalData={historicalDataPoints}
            predictionDays={30}
            confidenceLevel={0.95}
          />
        );
      case 'anomaly':
        return (
          <AnomalyDetection
            data={historicalDataPoints}
            sensitivity="medium"
            onAnomalyDetected={handleAnomalyDetected}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-[500px]">{renderContent()}</div>
    </div>
  );
}

function generateMockData(correlation: number = 1): DataPoint[] {
  const data: DataPoint[] = [];
  const now = Date.now();
  let basePrice = 2.5;

  for (let i = 90; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const change = (Math.random() - 0.5) * 0.1 * correlation;
    basePrice = basePrice * (1 + change);

    const anomaly = Math.random() < 0.02;
    const value = anomaly ? basePrice * (1 + (Math.random() - 0.5) * 0.3) : basePrice;

    data.push({
      timestamp,
      value,
    });
  }

  return data;
}

export default API3AnalyticsView;
