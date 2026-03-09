'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { MarketDataPanel } from './components/MarketDataPanel';
import { PriceChart } from './components/PriceChart';
import { NetworkHealthPanel } from './components/NetworkHealthPanel';
import { DataQualityPanel } from './components/DataQualityPanel';
import { ValidatorAnalyticsPanel } from './components/ValidatorAnalyticsPanel';
import { EcosystemPanel } from './components/EcosystemPanel';
import { RiskAssessmentPanel } from './components/RiskAssessmentPanel';

const bandClient = new BandProtocolClient();

// 时间范围类型
type TimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y';

// 标签页类型
type TabItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

// Band Protocol Logo 组件
const BandProtocolIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 256 256" className={className} fill="none">
    <circle cx="128" cy="128" r="120" fill="#4520E6" />
    <path
      d="M128 48L176 80V144L128 176L80 144V80L128 48Z"
      fill="white"
      fillOpacity="0.9"
    />
    <circle cx="128" cy="128" r="24" fill="#4520E6" />
    <path
      d="M128 192L80 160V176L128 208L176 176V160L128 192Z"
      fill="white"
      fillOpacity="0.6"
    />
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
        label: t('bandProtocol.menu.marketData'),
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
        label: t('bandProtocol.menu.networkHealth'),
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
        id: 'validators',
        label: t('bandProtocol.menu.validatorAnalytics'),
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
        label: t('bandProtocol.menu.ecosystem'),
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
        label: t('bandProtocol.menu.riskAssessment'),
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
  const { t } = useI18n();
  const timeRanges: TimeRange[] = useMemo(() => ['1H', '24H', '7D', '30D', '90D', '1Y'], []);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 左侧：标题 */}
          <div className="flex items-center gap-3">
            <BandProtocolIcon className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('bandProtocol.analytics')}</h1>
              <p className="text-sm text-gray-500">{t('bandProtocol.platform')}</p>
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
                  {t(`bandProtocol.timeRange.${range}`)}
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
              <span className="hidden sm:inline">{t('bandProtocol.refresh')}</span>
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
              <span className="hidden sm:inline">{t('bandProtocol.export')}</span>
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
        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">{icon}</div>
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
        title: t('bandProtocol.stats.activeValidators'),
        value: '72+',
        change: '+3%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        ),
      },
      {
        title: t('bandProtocol.stats.supportedBlockchains'),
        value: '30+',
        change: '+5%',
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
        title: t('bandProtocol.stats.dataSources'),
        value: '200+',
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
        title: t('bandProtocol.stats.crossChainRequests'),
        value: '12K+',
        change: '+18%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        ),
      },
    ],
    [t]
  );

  const getPageTitle = useCallback(() => {
    switch (activeTab) {
      case 'market':
        return t('bandProtocol.pageTitles.market');
      case 'network':
        return t('bandProtocol.pageTitles.network');
      case 'validators':
        return t('bandProtocol.pageTitles.validators');
      case 'ecosystem':
        return t('bandProtocol.pageTitles.ecosystem');
      case 'risk':
        return t('bandProtocol.pageTitles.risk');
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
            {t('bandProtocol.lastUpdated')}: {t('bandProtocol.justNow')} • {t('bandProtocol.period')}:{' '}
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

        {/* 验证者分析面板 */}
        {activeTab === 'validators' && (
          <div className="mb-6">
            <ValidatorAnalyticsPanel />
          </div>
        )}

        {/* 风险评估面板 */}
        {activeTab === 'risk' && (
          <div className="mb-6">
            <RiskAssessmentPanel />
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
              <DashboardCard title={t('bandProtocol.priceChart.title')} className="lg:col-span-2">
                <PriceChart timeRange={timeRange} height={320} />
              </DashboardCard>

              {/* 快速统计 */}
              <DashboardCard title={t('bandProtocol.quickStats')}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{t('bandProtocol.24hVolume')}</span>
                    <span className="text-sm font-semibold text-gray-900">$2.4M</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t('bandProtocol.marketData.marketCap')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">$362M</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      {t('bandProtocol.marketData.circulatingSupply')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">145M BAND</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{t('bandProtocol.stakingApr')}</span>
                    <span className="text-sm font-semibold text-green-600">9.85%</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">{t('bandProtocol.networkUptime')}</span>
                    <span className="text-sm font-semibold text-green-600">99.97%</span>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* 数据质量面板 */}
            <div className="mb-6">
              <DataQualityPanel />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// 主页面组件
export default function BandProtocolPage() {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [activeTab, setActiveTab] = useState('market');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // 模拟刷新延迟
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // 导出数据
  const handleExport = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      timeRange,
      activeTab,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `band-protocol-data-${timeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [timeRange, activeTab]);

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
