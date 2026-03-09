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

// 侧边栏菜单项类型
type MenuItem = {
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

// 顶部导航栏组件
function DashboardHeader({
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onExport,
  isRefreshing,
  onMenuToggle,
}: {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
  onMenuToggle: () => void;
}) {
  const { t } = useI18n();
  const timeRanges: TimeRange[] = useMemo(() => ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'], []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* 左侧：菜单按钮 + Logo + 标题 */}
        <div className="flex items-center gap-3">
          {/* 移动端菜单按钮 */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <ChainlinkIcon className="w-7 h-7" />
          <div>
            <h1 className="text-lg font-semibold text-white">{t('chainlink.analytics')}</h1>
            <p className="text-xs text-slate-400 hidden sm:block">{t('chainlink.platform')}</p>
          </div>
        </div>

        {/* 中间：时间范围选择器 */}
        <div className="hidden md:flex items-center bg-slate-800 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                timeRange === range
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t(`chainlink.timeRange.${range}`)}
            </button>
          ))}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all duration-200 disabled:opacity-50"
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
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/25"
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

      {/* 移动端时间选择器 */}
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center bg-slate-800 rounded-lg p-1 overflow-x-auto scrollbar-hide">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t(`chainlink.timeRange.${range}`)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

// 左侧边栏导航组件
function Sidebar({
  activeMenu,
  onMenuChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: {
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { t } = useI18n();

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: 'market',
        label: t('chainlink.menu.marketData'),
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
        id: 'network',
        label: t('chainlink.menu.networkHealth'),
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        id: 'nodes',
        label: t('chainlink.menu.nodeAnalytics'),
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
        id: 'ecosystem',
        label: t('chainlink.menu.ecosystem'),
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
        id: 'risk',
        label: t('chainlink.menu.riskAssessment'),
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      },
    ],
    [t]
  );

  const handleMenuClick = useCallback(
    (menuId: string) => {
      onMenuChange(menuId);
      onCloseMobile();
    },
    [onMenuChange, onCloseMobile]
  );

  return (
    <>
      {/* 移动端遮罩层 */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 fixed lg:static inset-y-0 left-0 z-50 lg:z-auto ${
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        } ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* 移动端关闭按钮 */}
        <div className="flex justify-between items-center p-2 lg:hidden">
          <span className="text-white font-semibold px-2">{t('chainlink.menu.title')}</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 桌面端折叠按钮 */}
        <div className="hidden lg:flex justify-end p-2">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 17l-5-5m0 0l5-5m-5 5h12"
              />
            </svg>
          </button>
        </div>

        {/* 菜单项 */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                activeMenu === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span
                className={`flex-shrink-0 ${activeMenu === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
              >
                {item.icon}
              </span>
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* 底部信息 */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">{t('chainlink.dataSource')}</p>
              <p className="text-sm font-medium text-white">{t('chainlink.chainlinkNetwork')}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t('chainlink.lastUpdated')}: {t('chainlink.justNow')}
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
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
      className={`bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
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
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p
            className={`text-xs mt-2 font-medium ${
              changeType === 'positive'
                ? 'text-emerald-400'
                : changeType === 'negative'
                  ? 'text-red-400'
                  : 'text-slate-400'
            }`}
          >
            {changeType === 'positive' && '↑ '}
            {changeType === 'negative' && '↓ '}
            {changeType === 'neutral' && '→ '}
            {change}
          </p>
        </div>
        <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300">{icon}</div>
      </div>
    </DashboardCard>
  );
}

// 主内容区域组件
function DashboardContent({ activeMenu, timeRange }: { activeMenu: string; timeRange: TimeRange }) {
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
    switch (activeMenu) {
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
  }, [activeMenu, t]);

  return (
    <main className="flex-1 overflow-auto bg-slate-950 min-w-0">
      <div className="p-3 sm:p-4 lg:p-6">
        {/* 页面标题 */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white">{getPageTitle()}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t('chainlink.lastUpdated')}: {t('chainlink.justNow')} • {t('chainlink.period')}:{' '}
            {timeRange}
          </p>
        </div>

        {/* 市场数据面板 */}
        {activeMenu === 'market' && (
          <div className="mb-4 sm:mb-6">
            <MarketDataPanel />
          </div>
        )}

        {/* 网络健康度面板 */}
        {activeMenu === 'network' && (
          <div className="mb-4 sm:mb-6">
            <NetworkHealthPanel />
          </div>
        )}

        {/* 风险评估面板 */}
        {activeMenu === 'risk' && (
          <div className="mb-4 sm:mb-6">
            <RiskAssessmentPanel />
          </div>
        )}

        {/* 节点分析面板 */}
        {activeMenu === 'nodes' && (
          <div className="mb-4 sm:mb-6">
            <NodeAnalyticsPanel />
          </div>
        )}

        {/* 生态系统面板 */}
        {activeMenu === 'ecosystem' && (
          <div className="mb-4 sm:mb-6">
            <EcosystemPanel />
          </div>
        )}

        {/* 以下只在 market/network 页面显示 */}
        {(activeMenu === 'market' || activeMenu === 'network') && (
          <>
            {/* 统计卡片网格 - 响应式：1列 -> 2列 -> 4列 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>

            {/* 主图表区域 - 响应式堆叠 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* 价格图表 - 移动端优化高度 */}
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
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-xs sm:text-sm text-slate-400">
                      {t('chainlink.24hVolume')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white">$245.2M</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-xs sm:text-sm text-slate-400">
                      {t('chainlink.marketData.marketCap')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white">$8.4B</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-xs sm:text-sm text-slate-400">
                      {t('chainlink.marketData.circulatingSupply')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white">608.1M LINK</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-xs sm:text-sm text-slate-400">
                      {t('chainlink.stakingApr')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-emerald-400">4.32%</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3">
                    <span className="text-xs sm:text-sm text-slate-400">
                      {t('chainlink.networkUptime')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-emerald-400">
                      99.99%
                    </span>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* 底部信息卡片 - 响应式 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <DashboardCard title={t('chainlink.networkStatus')} className="lg:col-span-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {networkStatusData.map((item, index) => (
                    <div key={index} className="text-center p-2 sm:p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1 truncate">{item.label}</p>
                      <p className="text-base sm:text-lg font-semibold text-white">{item.value}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        <span className="text-xs text-slate-500">
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
                <div className="space-y-2 sm:space-y-3">
                  {dataSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between py-1.5 sm:py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            source.status === 'active'
                              ? 'bg-emerald-400'
                              : 'bg-amber-400 animate-pulse'
                          }`}
                        />
                        <span className="text-xs sm:text-sm text-slate-300 truncate">
                          {source.name}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono flex-shrink-0">
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
  const [activeMenu, setActiveMenu] = useState('market');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [price, history] = await Promise.all([
        chainlinkClient.getPrice('LINK', Blockchain.ETHEREUM),
        chainlinkClient.getHistoricalPrices('LINK', Blockchain.ETHEREUM, 7),
      ]);
      setPriceData(price);
      setHistoricalData(history);
    } catch (error) {
      console.error('Error fetching Chainlink data:', error);
    } finally {
      setLoading(false);
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

  // 切换移动端菜单
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // 关闭移动端菜单
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, timeRange]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* 顶部导航栏 */}
      <DashboardHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isRefreshing={isRefreshing}
        onMenuToggle={toggleMobileMenu}
      />

      {/* 主体内容区域 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧边栏 */}
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={closeMobileMenu}
        />

        {/* 主内容区域 */}
        <DashboardContent activeMenu={activeMenu} timeRange={timeRange} />
      </div>
    </div>
  );
}
