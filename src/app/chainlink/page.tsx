'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';

import { ChainlinkClient } from '@/lib/oracles/chainlink';
import { PriceData, Blockchain } from '@/lib/types/oracle';
import { MarketDataPanel } from './components/MarketDataPanel';
import { PriceChart } from './components/PriceChart';
import { NetworkHealthPanel } from './components/NetworkHealthPanel';
import { DataQualityPanel } from './components/DataQualityPanel';
import { NodeAnalyticsPanel } from './components/NodeAnalyticsPanel';
import { EcosystemPanel } from './components/EcosystemPanel';
import { RiskAssessmentPanel } from './components/RiskAssessmentPanel';

const chainlinkClient = new ChainlinkClient();

// 时间范围类型
type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

// 标签页类型
type TabItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

// Chainlink Logo 组件
const ChainlinkIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 256 256" className={className} fill="none">
    <path d="M128 0L16 64v128l112 64 112-64V64L128 0z" fill="#375BD2" />
    <path d="M208 64l-80 46-80-46 80-46 80 46z" fill="#6582F0" />
    <path d="M48 64v128l80 46V110l-80-46z" fill="#2A4CAD" />
    <path d="M208 64v128l-80 46V110l80-46z" fill="#375BD2" />
    <path d="M72 142l56 32v80l-56-32v-80z" fill="#2A4CAD" />
    <path d="M184 142l-56 32v80l56-32v-80z" fill="#375BD2" />
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
  const { t } = useI18n();

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: 'market',
        label: t('chainlink.menu.marketData'),
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
        id: 'network',
        label: t('chainlink.menu.networkHealth'),
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        id: 'nodes',
        label: t('chainlink.menu.nodeAnalytics'),
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
        id: 'ecosystem',
        label: t('chainlink.menu.ecosystem'),
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
        id: 'risk',
        label: t('chainlink.menu.riskAssessment'),
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
    [t]
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
                    ? 'border-blue-600 text-blue-600'
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
  const { t } = useI18n();
  const timeRanges: TimeRange[] = useMemo(() => ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'], []);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 左侧：标题 */}
          <div className="flex items-center gap-3">
            <ChainlinkIcon className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('chainlink.analytics')}</h1>
              <p className="text-sm text-gray-500">{t('chainlink.platform')}</p>
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
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t(`chainlink.timeRange.${range}`)}
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
              <span className="hidden sm:inline">{t('chainlink.refresh')}</span>
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="hidden sm:inline">{t('chainlink.export')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 卡片组件
function DashboardCard({
  title,
  children,
  className = '',
  headerAction,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
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
    <DashboardCard className="h-full">
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
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      </div>
    </DashboardCard>
  );
}

// 主内容区域组件
function PageContent({ activeTab, timeRange }: { activeTab: string; timeRange: TimeRange }) {
  const { t } = useI18n();

  // 统计数据 - 使用 useMemo 优化
  const stats = useMemo(
    () => [
      {
        title: t('chainlink.stats.decentralizedNodes'),
        value: '1,800+',
        change: '+5%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        ),
      },
      {
        title: t('chainlink.stats.supportedChains'),
        value: '20+',
        change: '0%',
        changeType: 'neutral' as const,
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
        title: t('chainlink.stats.dataFeeds'),
        value: '1,200+',
        change: '+12%',
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
        title: t('chainlink.stats.totalValueSecured'),
        value: '$10T+',
        change: '+8%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      },
    ],
    [t]
  );

  // 网络状态数据 - 使用 useMemo 优化
  const networkStatusData = useMemo(
    () => [
      {
        label: t('chainlink.networkHealth.activeNodes'),
        value: '1,847',
        status: 'healthy' as const,
      },
      { label: t('chainlink.stats.dataFeeds'), value: '1,243', status: 'healthy' as const },
      {
        label: t('chainlink.networkHealth.responseTime'),
        value: '245ms',
        status: 'warning' as const,
      },
      { label: t('chainlink.successRate'), value: '99.97%', status: 'healthy' as const },
    ],
    [t]
  );

  // 数据源数据 - 使用 useMemo 优化
  const dataSources = useMemo(
    () => [
      { name: 'Chainlink Market', status: 'active' as const, latency: '120ms' },
      { name: 'Ethereum Mainnet', status: 'active' as const, latency: '245ms' },
      { name: 'Polygon Network', status: 'active' as const, latency: '89ms' },
      { name: 'Arbitrum One', status: 'syncing' as const, latency: '156ms' },
    ],
    []
  );

  const getPageTitle = useCallback(() => {
    switch (activeTab) {
      case 'market':
        return t('chainlink.pageTitles.market');
      case 'network':
        return t('chainlink.pageTitles.network');
      case 'nodes':
        return t('chainlink.pageTitles.nodes');
      case 'ecosystem':
        return t('chainlink.pageTitles.ecosystem');
      case 'risk':
        return t('chainlink.pageTitles.risk');
      default:
        return '';
    }
  }, [activeTab, t]);

  return (
    <main className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('chainlink.lastUpdated')}: {t('chainlink.justNow')} • {t('chainlink.period')}:{' '}
            {timeRange}
          </p>
        </div>

        {/* 市场数据面板 */}
        {activeTab === 'market' && (
          <div className="mb-6">
            <MarketDataPanel />
          </div>
        )}

        {/* 网络健康度面板 */}
        {activeTab === 'network' && (
          <div className="mb-6">
            <NetworkHealthPanel />
          </div>
        )}

        {/* 风险评估面板 */}
        {activeTab === 'risk' && (
          <div className="mb-6">
            <RiskAssessmentPanel />
          </div>
        )}

        {/* 节点分析面板 */}
        {activeTab === 'nodes' && (
          <div className="mb-6">
            <NodeAnalyticsPanel />
          </div>
        )}

        {/* 生态系统面板 */}
        {activeTab === 'ecosystem' && (
          <div className="mb-6">
            <EcosystemPanel />
          </div>
        )}

        {/* 以下只在 market/network 页面显示 */}
        {(activeTab === 'market' || activeTab === 'network') && (
          <>
            {/* 统计卡片网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>

            {/* 主图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* 价格图表 */}
              <DashboardCard title={t('chainlink.priceChart.title')} className="lg:col-span-2">
                <PriceChart
                  symbol="LINK"
                  chain={Blockchain.ETHEREUM}
                  initialTimeRange={timeRange}
                  height={320}
                  showToolbar={true}
                />
              </DashboardCard>

              {/* 快速统计 */}
              <DashboardCard title={t('chainlink.quickStats')}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{t('chainlink.24hVolume')}</span>
                    <span className="text-sm font-semibold text-gray-900">$245.2M</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t('chainlink.marketData.marketCap')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">$8.4B</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t('chainlink.marketData.circulatingSupply')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">608.1M LINK</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{t('chainlink.stakingApr')}</span>
                    <span className="text-sm font-semibold text-green-600">4.32%</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">{t('chainlink.networkUptime')}</span>
                    <span className="text-sm font-semibold text-green-600">99.99%</span>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* 底部信息卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardCard title={t('chainlink.networkStatus')} className="lg:col-span-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {networkStatusData.map((item, index) => (
                    <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 truncate">{item.label}</p>
                      <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        />
                        <span className="text-xs text-gray-500">
                          {item.status === 'healthy'
                            ? t('chainlink.normal')
                            : t('chainlink.networkHealth.warning')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard title={t('chainlink.dataSource')}>
                <div className="space-y-3">
                  {dataSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            source.status === 'active'
                              ? 'bg-green-500'
                              : 'bg-yellow-500 animate-pulse'
                          }`}
                        />
                        <span className="text-sm text-gray-700 truncate">{source.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                        {source.latency}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// 主页面组件
export default function ChainlinkPage() {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState('market');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      const [price, history] = await Promise.all([
        chainlinkClient.getPrice('LINK', Blockchain.ETHEREUM),
        chainlinkClient.getHistoricalPrices('LINK', Blockchain.ETHEREUM, 7),
      ]);
      setPriceData(price);
      setHistoricalData(history);
    } catch (error) {
      console.error('Error fetching Chainlink data:', error);
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
    a.download = `chainlink-data-${timeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [priceData, historicalData, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, timeRange]);

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
