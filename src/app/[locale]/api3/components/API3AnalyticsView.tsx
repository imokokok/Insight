'use client';

import { useState, useMemo, useCallback } from 'react';

import { FileText, GitCompare, TrendingUp, AlertTriangle } from 'lucide-react';

import {
  CustomReportGenerator,
  DataComparisonTool,
  TrendPrediction,
  AnomalyDetection,
} from '@/components/oracle/analytics';
import { useTranslations } from '@/i18n';
import { useAPI3Historical } from '@/hooks/oracles/api3';
import useAPI3Analytics, {
  type MetricDefinition,
  type DataSource,
  type DataPoint,
  type ReportConfig,
} from '@/hooks/useAPI3Analytics';

type AnalyticsTab = 'report' | 'comparison' | 'prediction' | 'anomaly';

const tabs = [
  { id: 'report' as const, label: 'Custom Report', icon: FileText },
  { id: 'comparison' as const, label: 'Data Comparison', icon: GitCompare },
  { id: 'prediction' as const, label: 'Trend Prediction', icon: TrendingUp },
  { id: 'anomaly' as const, label: 'Anomaly Detection', icon: AlertTriangle },
];

const availableMetrics: MetricDefinition[] = [
  { id: 'price', name: 'Price', category: 'Market Data', unit: 'USD', description: 'Current price of API3 token' },
  { id: 'volume', name: 'Volume', category: 'Market Data', unit: 'USD', description: '24h trading volume' },
  { id: 'marketCap', name: 'Market Cap', category: 'Market Data', unit: 'USD', description: 'Total market capitalization' },
  { id: 'responseTime', name: 'Response Time', category: 'Performance', unit: 'ms', description: 'Average API response time' },
  { id: 'successRate', name: 'Success Rate', category: 'Performance', unit: '%', description: 'API request success rate' },
  { id: 'activeAirnodes', name: 'Active Airnodes', category: 'Network', description: 'Number of active Airnode operators' },
  { id: 'activeDapis', name: 'Active dAPIs', category: 'Network', description: 'Number of active data feeds' },
  { id: 'stakingApr', name: 'Staking APR', category: 'Staking', unit: '%', description: 'Annual percentage return for staking' },
  { id: 'totalStaked', name: 'Total Staked', category: 'Staking', unit: 'API3', description: 'Total tokens staked' },
  { id: 'coverageRatio', name: 'Coverage Ratio', category: 'Risk', unit: '%', description: 'Coverage pool collateralization ratio' },
];

export function API3AnalyticsView() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('report');

  const { historicalData: apiHistoricalData, isLoading } = useAPI3Historical('API3', 'ethereum', true);

  const analytics = useAPI3Analytics();

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

  const timeRange = useMemo(() => ({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }), []);

  const handleGenerateReport = useCallback((config: ReportConfig) => {
    console.log('Generating report with config:', config);
  }, []);

  const handleAnomalyDetected = useCallback((anomalies: unknown[]) => {
    console.log('Anomalies detected:', anomalies);
  }, []);

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
                {t(`api3.analytics.tabs.${tab.id}`) || tab.label}
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
