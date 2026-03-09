'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PythNetworkClient } from '@/lib/oracles/pythNetwork';
import { PriceData, Blockchain } from '@/lib/types/oracle';
import { MarketDataPanel } from './components/MarketDataPanel';
import { PriceChart } from './components/PriceChart';
import { CoreFeaturesPanel } from './components/CoreFeaturesPanel';
import { PublisherAnalyticsPanel } from './components/PublisherAnalyticsPanel';
import { PriceFeedsPanel } from './components/PriceFeedsPanel';
import { EcosystemPanel } from './components/EcosystemPanel';
import { CompetitorComparisonPanel } from './components/CompetitorComparisonPanel';
import { RiskAssessmentPanel } from './components/RiskAssessmentPanel';
import { NetworkHealthPanel } from './components/NetworkHealthPanel';

const pythClient = new PythNetworkClient();

// 时间范围类型
type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

// 标签页类型
type TabItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

// Pyth Logo 组件
const PythIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 256 256" className={className} fill="none">
    <defs>
      <linearGradient id="pythGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <circle cx="128" cy="128" r="120" fill="url(#pythGradient)" />
    <path d="M128 48L168 88L128 128L88 88L128 48Z" fill="white" fillOpacity="0.9" />
    <path d="M128 128L168 168L128 208L88 168L128 128Z" fill="white" fillOpacity="0.6" />
    <circle cx="128" cy="128" r="20" fill="white" />
  </svg>
);

// 标签页导航组件
function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) {
  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: 'market',
        label: 'Market Data',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        id: 'features',
        label: 'Core Features',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
      },
      {
        id: 'publishers',
        label: 'Publishers',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        ),
      },
      {
        id: 'feeds',
        label: 'Price Feeds',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
        ),
      },
      {
        id: 'ecosystem',
        label: 'Ecosystem',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        ),
      },
      {
        id: 'comparison',
        label: 'Comparison',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        id: 'risk',
        label: 'Risk Assessment',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      },
    ],
    []
  );

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-hide" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-200
                ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// 顶部操作栏组件
function PageHeader({
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onExport,
  isRefreshing,
}: {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
}) {
  const timeRanges: TimeRange[] = useMemo(() => ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'], []);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 左侧：标题 */}
          <div className="flex items-center gap-3">
            <PythIcon className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pyth Network</h1>
              <p className="text-sm text-gray-500">First-Party Financial Data Oracle</p>
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 时间范围选择器 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => onTimeRangeChange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    timeRange === range
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p
              className={`text-xs mt-2 font-medium ${
                changeType === 'positive'
                  ? 'text-green-600'
                  : changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-gray-500'
              }`}
            >
              {changeType === 'positive' && '↑ '}
              {changeType === 'negative' && '↓ '}
              {changeType === 'neutral' && '→ '}
              {change}
            </p>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg text-purple-600">{icon}</div>
        </div>
      </div>
    </div>
  );
}

// 主内容区域组件
function PageContent({ activeTab, timeRange }: { activeTab: string; timeRange: TimeRange }) {
  // 统计数据
  const stats = useMemo(
    () => [
      {
        title: 'Active Publishers',
        value: '95+',
        change: '+12%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
      {
        title: 'Supported Chains',
        value: '50+',
        change: '+5',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        ),
      },
      {
        title: 'Price Feeds',
        value: '500+',
        change: '+23',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        title: 'Avg Latency',
        value: '350ms',
        change: '-50ms',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
      },
    ],
    []
  );

  const getPageTitle = useCallback(() => {
    switch (activeTab) {
      case 'market':
        return 'Market Data Overview';
      case 'features':
        return 'Core Features';
      case 'publishers':
        return 'Publisher Analytics';
      case 'feeds':
        return 'Price Feeds';
      case 'ecosystem':
        return 'Ecosystem Integrations';
      case 'comparison':
        return 'Competitor Comparison';
      case 'risk':
        return 'Risk Assessment';
      default:
        return '';
    }
  }, [activeTab]);

  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time data • Period: {timeRange}</p>
        </div>

        {/* 市场数据面板 */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            <MarketDataPanel />

            {/* 统计卡片网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>

            {/* 价格图表 */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">PYTH Price Chart</h3>
              </div>
              <div className="p-5">
                <PriceChart
                  symbol="PYTH"
                  chain={Blockchain.SOLANA}
                  initialTimeRange={timeRange}
                  height={400}
                  showToolbar={true}
                />
              </div>
            </div>

            {/* 网络健康度 */}
            <NetworkHealthPanel />
          </div>
        )}

        {/* 核心特性 */}
        {activeTab === 'features' && <CoreFeaturesPanel />}

        {/* 发布者分析 */}
        {activeTab === 'publishers' && <PublisherAnalyticsPanel />}

        {/* 价格馈送 */}
        {activeTab === 'feeds' && <PriceFeedsPanel />}

        {/* 生态集成 */}
        {activeTab === 'ecosystem' && <EcosystemPanel />}

        {/* 竞品对比 */}
        {activeTab === 'comparison' && <CompetitorComparisonPanel />}

        {/* 风险评估 */}
        {activeTab === 'risk' && <RiskAssessmentPanel />}
      </div>
    </main>
  );
}

// 主页面组件
export default function PythNetworkPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState('market');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      const [price, history] = await Promise.all([
        pythClient.getPrice('PYTH', Blockchain.SOLANA),
        pythClient.getHistoricalPrices('PYTH', Blockchain.SOLANA, 7),
      ]);
      setPriceData(price);
      setHistoricalData(history);
    } catch (error) {
      console.error('Error fetching Pyth data:', error);
    }
  }, []);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [fetchData]);

  // 导出数据
  const handleExport = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      price: priceData,
      historical: historicalData,
      timeRange,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyth-data-${timeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [priceData, historicalData, timeRange]);

  useEffect(() => {
    const fetchAndSetData = async () => {
      try {
        const [price, history] = await Promise.all([
          pythClient.getPrice('PYTH', Blockchain.SOLANA),
          pythClient.getHistoricalPrices('PYTH', Blockchain.SOLANA, 7),
        ]);
        setPriceData(price);
        setHistoricalData(history);
      } catch (error) {
        console.error('Error fetching Pyth data:', error);
      }
    };
    fetchAndSetData();
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <PageHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isRefreshing={isRefreshing}
      />

      {/* 标签页导航 */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 主内容区域 */}
      <PageContent activeTab={activeTab} timeRange={timeRange} />
    </div>
  );
}
