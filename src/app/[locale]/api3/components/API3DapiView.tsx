'use client';

import { useState, useMemo } from 'react';

import { Activity, CheckCircle2, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

import {
  DapiDataFlowVisualization,
  type DataSourceInfo,
} from '@/components/oracle/charts/DapiDataFlowVisualization';
import {
  HistoricalDataComparison,
  type DataSeries,
  type TimeRange,
} from '@/components/oracle/charts/HistoricalDataComparison';
import { RealtimePriceAnimation } from '@/components/oracle/charts/RealtimePriceAnimation';
import { useAPI3Price, useAPI3Historical, useAPI3SourceTrace } from '@/hooks/oracles/api3';
import { useTranslations } from '@/i18n';

import { ChainlinkDataTable } from '../../chainlink/components/ChainlinkDataTable';
import { type DapiFeed, type API3DapiViewProps } from '../types';

const DEFAULT_DAPI_FEEDS: DapiFeed[] = [
  {
    id: '1',
    name: 'ETH/USD',
    category: 'crypto',
    updateFrequency: '10s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 8500000,
    reliability: 99.98,
  },
  {
    id: '2',
    name: 'BTC/USD',
    category: 'crypto',
    updateFrequency: '10s',
    deviationThreshold: '0.5%',
    status: 'active',
    totalRequests: 9200000,
    reliability: 99.97,
  },
  {
    id: '3',
    name: 'API3/USD',
    category: 'crypto',
    updateFrequency: '30s',
    deviationThreshold: '1%',
    status: 'active',
    totalRequests: 4500000,
    reliability: 99.95,
  },
  {
    id: '4',
    name: 'EUR/USD',
    category: 'forex',
    updateFrequency: '60s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 3200000,
    reliability: 99.96,
  },
  {
    id: '5',
    name: 'GBP/USD',
    category: 'forex',
    updateFrequency: '60s',
    deviationThreshold: '0.1%',
    status: 'active',
    totalRequests: 2100000,
    reliability: 99.94,
  },
];

const DEFAULT_DATA_SOURCES: DataSourceInfo[] = [
  {
    id: 'src-1',
    name: 'Binance',
    type: 'exchange',
    reliability: 99.9,
    latency: 15,
    status: 'active',
    lastUpdate: new Date(),
  },
  {
    id: 'src-2',
    name: 'Coinbase Pro',
    type: 'exchange',
    reliability: 99.8,
    latency: 18,
    status: 'active',
    lastUpdate: new Date(),
  },
  {
    id: 'src-3',
    name: 'Kraken',
    type: 'exchange',
    reliability: 99.85,
    latency: 20,
    status: 'active',
    lastUpdate: new Date(),
  },
];

export function API3DapiView(props: API3DapiViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>(() => ({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(Date.now()),
    label: '7d',
  }));

  const symbol = props.symbol || 'ETH/USD';
  const chain = props.chain;

  const priceQuery = useAPI3Price({ symbol, chain, enabled: !!props.useRealData });
  const historicalQuery = useAPI3Historical({
    symbol,
    chain,
    period: 7,
    enabled: !!props.useRealData,
  });
  const sourceTraceQuery = useAPI3SourceTrace(!!props.useRealData);

  const currentPrice = priceQuery.price?.price || 0;
  const previousPrice = 0;
  const sparklineData = historicalQuery.historicalData?.slice(-20).map((d) => d.price) || [];

  const dapiFeeds = useMemo(() => {
    if (!props.useRealData) {
      throw new Error('Real data is required. Please enable useRealData prop.');
    }
    return props.dapiFeeds || [];
  }, [props.useRealData, props.dapiFeeds]);

  const dataSources = useMemo((): DataSourceInfo[] => {
    if (props.dataSources) {
      return props.dataSources;
    }
    if (props.useRealData && sourceTraceQuery.sourceTrace) {
      return sourceTraceQuery.sourceTrace.map((src) => ({
        id: src.id,
        name: src.name,
        type: (src.type === 'exchange'
          ? 'exchange'
          : src.type === 'traditional_finance'
            ? 'api'
            : 'aggregator') as DataSourceInfo['type'],
        reliability: (src as unknown as { accuracy?: number }).accuracy ?? 0,
        latency: (src as unknown as { responseSpeed?: number }).responseSpeed ?? 0,
        status: 'active' as const,
        lastUpdate: new Date(),
      }));
    }
    throw new Error('Real data sources are required. Please enable useRealData prop.');
  }, [props.dataSources, props.useRealData, sourceTraceQuery.sourceTrace]);

  const categories = useMemo(
    () => [
      { id: 'all', label: t('api3.dapi.categoryLabels.all'), count: dapiFeeds.length },
      {
        id: 'crypto',
        label: t('api3.dapi.categoryLabels.crypto'),
        count: dapiFeeds.filter((f: DapiFeed) => f.category === 'crypto').length,
      },
      {
        id: 'forex',
        label: t('api3.dapi.categoryLabels.forex'),
        count: dapiFeeds.filter((f: DapiFeed) => f.category === 'forex').length,
      },
      {
        id: 'commodities',
        label: t('api3.dapi.categoryLabels.commodities'),
        count: dapiFeeds.filter((f: DapiFeed) => f.category === 'commodities').length,
      },
      {
        id: 'stocks',
        label: t('api3.dapi.categoryLabels.stocks'),
        count: dapiFeeds.filter((f: DapiFeed) => f.category === 'stocks').length,
      },
    ],
    [dapiFeeds, t]
  );

  const historicalSeries = useMemo((): DataSeries[] => {
    if (props.useRealData && historicalQuery.historicalData) {
      return [
        {
          id: 'api3',
          name: symbol,
          color: '#10b981',
          data: historicalQuery.historicalData.map((d) => ({
            timestamp: Math.floor(d.timestamp / 1000),
            value: d.price,
          })),
          type: 'price',
        },
      ];
    }
    throw new Error('Historical data requires real data. Please enable useRealData prop.');
  }, [props.useRealData, historicalQuery.historicalData, symbol]);

  const filteredFeeds = useMemo(
    () =>
      selectedCategory === 'all'
        ? dapiFeeds
        : dapiFeeds.filter((feed: DapiFeed) => feed.category === selectedCategory),
    [selectedCategory, dapiFeeds]
  );

  const columns = [
    { key: 'name', header: t('api3.dapi.name'), sortable: true },
    {
      key: 'category',
      header: t('api3.dapi.category'),
      sortable: true,
      render: (item: DapiFeed) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
          {item.category}
        </span>
      ),
    },
    {
      key: 'updateFrequency',
      header: t('api3.dapi.frequency'),
      sortable: true,
    },
    {
      key: 'deviationThreshold',
      header: t('api3.dapi.threshold'),
      sortable: true,
    },
    {
      key: 'status',
      header: t('api3.dapi.status'),
      sortable: true,
      render: (item: DapiFeed) => (
        <span
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
            item.status === 'active'
              ? 'text-emerald-600 dark:text-emerald-400'
              : item.status === 'paused'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.status === 'active'
                ? 'bg-emerald-500'
                : item.status === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
          />
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'totalRequests',
      header: t('api3.dapi.requests'),
      sortable: true,
      render: (item: DapiFeed) => `${(item.totalRequests / 1e6).toFixed(1)}M`,
    },
    {
      key: 'reliability',
      header: t('api3.dapi.reliability'),
      sortable: true,
      render: (item: DapiFeed) => `${item.reliability}%`,
    },
  ];

  const trend =
    currentPrice > previousPrice ? 'up' : currentPrice < previousPrice ? 'down' : 'stable';
  const hasError = props.useRealData && (priceQuery.error || historicalQuery.error);
  const showMockWarning = !props.useRealData;

  return (
    <div className="space-y-8">
      {showMockWarning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('api3.dapi.mockDataWarning')}</span>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('api3.dapi.dataError')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealtimePriceAnimation
          symbol={symbol}
          currentPrice={currentPrice}
          previousPrice={previousPrice}
          trend={trend}
          decimals={2}
          showSparkline={true}
          sparklineData={sparklineData}
        />

        <div className="flex flex-wrap items-center gap-6 md:gap-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('api3.dapi.total')}
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {dapiFeeds.length}
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('api3.dapi.active')}
              </p>
              <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {dapiFeeds.filter((f: DapiFeed) => f.status === 'active').length}
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('api3.dapi.totalRequests')}
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {(
                  dapiFeeds.reduce((acc: number, f: DapiFeed) => acc + f.totalRequests, 0) / 1e6
                ).toFixed(1)}
                M
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('api3.dapi.avgReliability')}
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {(
                  dapiFeeds.reduce((acc: number, f: DapiFeed) => acc + f.reliability, 0) /
                  dapiFeeds.length
                ).toFixed(2)}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      <DapiDataFlowVisualization
        dapiName={symbol}
        sources={dataSources}
        targetChain={chain || 'Ethereum'}
      />

      <HistoricalDataComparison
        dataSeries={historicalSeries}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedCategory === category.id
                ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {category.label}
            <span
              className={`text-xs ${
                selectedCategory === category.id
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {category.count}
            </span>
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          {t('api3.dapi.dataFeeds')}
        </h3>
        <ChainlinkDataTable
          data={filteredFeeds as unknown as Record<string, unknown>[]}
          columns={
            columns as unknown as Array<{
              key: string;
              header: string;
              width?: string;
              sortable?: boolean;
              render?: (item: Record<string, unknown>) => React.ReactNode;
            }>
          }
        />
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          {t('api3.dapi.about')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.updateFrequency')}:
              </span>{' '}
              {t('api3.dapi.frequencyDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.deviationThreshold')}:
              </span>{' '}
              {t('api3.dapi.thresholdDesc')}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.reliability')}:
              </span>{' '}
              {t('api3.dapi.reliabilityDesc')}
            </p>
            <p>
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.decentralization')}:
              </span>{' '}
              {t('api3.dapi.decentralizationDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
