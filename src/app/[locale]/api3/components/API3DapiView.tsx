'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

import { Activity, CheckCircle2, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

import { DapiDataFlowVisualization, type DataSourceInfo } from '@/components/oracle/charts/DapiDataFlowVisualization';
import { RealtimePriceAnimation } from '@/components/oracle/charts/RealtimePriceAnimation';
import { HistoricalDataComparison, type DataSeries, type TimeRange } from '@/components/oracle/charts/HistoricalDataComparison';
import { useTranslations } from '@/i18n';

import { ChainlinkDataTable } from '../../chainlink/components/ChainlinkDataTable';
import { type DapiFeed, type API3DapiViewProps } from '../types';
import { useAPI3Price, useAPI3Historical, useAPI3SourceTrace } from '@/hooks/oracles/api3';
import { isMockData, getMockDataAnnotation } from '@/lib/oracles/api3MockDataAnnotations';

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
  { id: 'src-1', name: 'Binance', type: 'exchange', reliability: 99.9, latency: 15, status: 'active', lastUpdate: new Date() },
  { id: 'src-2', name: 'Coinbase Pro', type: 'exchange', reliability: 99.8, latency: 18, status: 'active', lastUpdate: new Date() },
  { id: 'src-3', name: 'Kraken', type: 'exchange', reliability: 99.85, latency: 20, status: 'active', lastUpdate: new Date() },
];

function generateHistoricalData(basePrice: number, points: number): { timestamp: number; value: number }[] {
  const data = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = points; i >= 0; i--) {
    const change = (Math.random() - 0.5) * basePrice * 0.02;
    price = Math.max(price + change, basePrice * 0.8);
    price = Math.min(price, basePrice * 1.2);
    data.push({
      timestamp: now - i * 3600,
      value: price,
    });
  }
  
  return data;
}

export function API3DapiView(props: API3DapiViewProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPrice, setCurrentPrice] = useState(2456.78);
  const [previousPrice, setPreviousPrice] = useState(2450.12);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: '7d',
  });

  const symbol = props.symbol || 'ETH/USD';
  const chain = props.chain;

  const priceQuery = useAPI3Price({ symbol, chain, enabled: !!props.useRealData });
  const historicalQuery = useAPI3Historical({ symbol, chain, period: 7, enabled: !!props.useRealData });
  const sourceTraceQuery = useAPI3SourceTrace(!!props.useRealData);

  const dapiFeeds = useMemo(() => {
    return props.dapiFeeds || DEFAULT_DAPI_FEEDS;
  }, [props.dapiFeeds]);

  const dataSources = useMemo(() => {
    if (props.dataSources) {
      return props.dataSources;
    }
    if (props.useRealData && sourceTraceQuery.sourceTrace) {
      return sourceTraceQuery.sourceTrace.map((src: DataSourceInfo) => ({
        id: src.id,
        name: src.name,
        type: src.type as 'exchange' | 'aggregator' | 'traditional_finance',
        reliability: src.accuracy,
        latency: src.responseSpeed,
        status: 'active' as const,
        lastUpdate: new Date(),
      }));
    }
    return DEFAULT_DATA_SOURCES;
  }, [props.dataSources, props.useRealData, sourceTraceQuery.sourceTrace]);

  const categories = useMemo(() => [
    { id: 'all', label: 'All', count: dapiFeeds.length },
    { id: 'crypto', label: 'Crypto', count: dapiFeeds.filter((f: DapiFeed) => f.category === 'crypto').length },
    { id: 'forex', label: 'Forex', count: dapiFeeds.filter((f: DapiFeed) => f.category === 'forex').length },
    { id: 'commodities', label: 'Commodities', count: dapiFeeds.filter((f: DapiFeed) => f.category === 'commodities').length },
    { id: 'stocks', label: 'Stocks', count: dapiFeeds.filter((f: DapiFeed) => f.category === 'stocks').length },
  ], [dapiFeeds]);

  const historicalSeries = useMemo((): DataSeries[] => {
    if (props.useRealData && historicalQuery.historicalData) {
      return [
        {
          id: 'api3',
          name: symbol,
          color: '#10b981',
          data: historicalQuery.historicalData.map(d => ({
            timestamp: Math.floor(d.timestamp / 1000),
            value: d.price,
          })),
          type: 'price',
        },
      ];
    }
    return [
      {
        id: 'api3',
        name: 'API3',
        color: '#10b981',
        data: generateHistoricalData(1.5, 168),
        type: 'price',
      },
      {
        id: 'chainlink',
        name: 'Chainlink',
        color: '#3b82f6',
        data: generateHistoricalData(14.5, 168),
        type: 'price',
      },
    ];
  }, [props.useRealData, historicalQuery.historicalData, symbol]);

  // 使用 ref 来存储当前价格，避免依赖循环
  const currentPriceRef = useRef(currentPrice);
  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  useEffect(() => {
    if (props.useRealData && priceQuery.price) {
      setPreviousPrice(currentPriceRef.current);
      setCurrentPrice(priceQuery.price.price);
    }
  }, [props.useRealData, priceQuery.price]);

  useEffect(() => {
    if (!props.useRealData) {
      const interval = setInterval(() => {
        setPreviousPrice((prev) => currentPriceRef.current);
        const change = (Math.random() - 0.5) * 20;
        setCurrentPrice((prev) => Math.max(prev + change, 2000));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [props.useRealData]);

  useEffect(() => {
    if (!props.useRealData) {
      const data = Array.from({ length: 20 }, () => 2400 + Math.random() * 100);
      setSparklineData(data);
    } else if (historicalQuery.historicalData) {
      const data = historicalQuery.historicalData.slice(-20).map(d => d.price);
      setSparklineData(data);
    }
  }, [props.useRealData, historicalQuery.historicalData]);

  const filteredFeeds = useMemo(() =>
    selectedCategory === 'all'
      ? dapiFeeds
      : dapiFeeds.filter((feed: DapiFeed) => feed.category === selectedCategory),
    [selectedCategory, dapiFeeds]);

  const columns = [
    { key: 'name', header: t('api3.dapi.name') || 'Name', sortable: true },
    {
      key: 'category',
      header: t('api3.dapi.category') || 'Category',
      sortable: true,
      render: (item: DapiFeed) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
          {item.category}
        </span>
      ),
    },
    {
      key: 'updateFrequency',
      header: t('api3.dapi.frequency') || 'Update Frequency',
      sortable: true,
    },
    {
      key: 'deviationThreshold',
      header: t('api3.dapi.threshold') || 'Deviation Threshold',
      sortable: true,
    },
    {
      key: 'status',
      header: t('api3.dapi.status') || 'Status',
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
      header: t('api3.dapi.requests') || 'Requests',
      sortable: true,
      render: (item: DapiFeed) => `${(item.totalRequests / 1e6).toFixed(1)}M`,
    },
    {
      key: 'reliability',
      header: t('api3.dapi.reliability') || 'Reliability',
      sortable: true,
      render: (item: DapiFeed) => `${item.reliability}%`,
    },
  ];

  const trend = currentPrice > previousPrice ? 'up' : currentPrice < previousPrice ? 'down' : 'stable';
  const isLoading = props.useRealData && (priceQuery.isLoading || historicalQuery.isLoading);
  const hasError = props.useRealData && (priceQuery.error || historicalQuery.error);
  const showMockWarning = !props.useRealData || isMockData('dataSources');

  return (
    <div className="space-y-8">
      {showMockWarning && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4" />
          <span>
            {t('api3.dapi.mockDataWarning') || '部分数据为模拟数据，仅供参考'}
          </span>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4" />
          <span>
            {t('api3.dapi.dataError') || '数据加载失败，显示备用数据'}
          </span>
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
                {t('api3.dapi.total') || 'Total dAPIs'}
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{dapiFeeds.length}</p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('api3.dapi.active') || 'Active'}
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
                {t('api3.dapi.totalRequests') || 'Total Requests'}
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {(dapiFeeds.reduce((acc: number, f: DapiFeed) => acc + f.totalRequests, 0) / 1e6).toFixed(1)}M
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('api3.dapi.avgReliability') || 'Avg Reliability'}
              </p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {(
                  dapiFeeds.reduce((acc: number, f: DapiFeed) => acc + f.reliability, 0) / dapiFeeds.length
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
                selectedCategory === category.id ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {category.count}
            </span>
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          {t('api3.dapi.dataFeeds') || 'Data Feeds'}
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
          {t('api3.dapi.about') || 'About Data Feeds'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.updateFrequency') || 'Update Frequency'}:
              </span>{' '}
              {t('api3.dapi.frequencyDesc') ||
                'dAPIs are updated based on deviation thresholds and heartbeat intervals to ensure price accuracy.'}
            </p>
            <p>
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.deviationThreshold') || 'Deviation Threshold'}:
              </span>{' '}
              {t('api3.dapi.thresholdDesc') ||
                'Minimum price change required to trigger a new on-chain update.'}
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.reliability') || 'Reliability'}:
              </span>{' '}
              {t('api3.dapi.reliabilityDesc') ||
                'Percentage of successful updates over the last 30 days, excluding planned maintenance.'}
            </p>
            <p>
              <span className="font-medium text-gray-900 dark:text-white">
                {t('api3.dapi.decentralization') || 'Decentralization'}:
              </span>{' '}
              {t('api3.dapi.decentralizationDesc') ||
                'Each dAPI is secured by multiple independent first-party oracles.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
