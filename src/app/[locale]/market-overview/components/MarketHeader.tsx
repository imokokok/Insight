'use client';

import { useTranslations, useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { BarChart3 } from 'lucide-react';
import { LiveStatusBar } from '@/components/ui';
import UnifiedExportSection from './UnifiedExportSection';
import RefreshControl from './RefreshControl';
import RealtimeIndicator from './RealtimeIndicator';
import { RefreshInterval } from '../constants';
import { OracleMarketData, AssetData } from '../types';

interface MarketHeaderProps {
  loading: boolean;
  oracleData: OracleMarketData[];
  assets: AssetData[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  activeChart: string;
  getChartTitle: () => string;
  lastUpdated: Date | null;
  refreshStatus: string;
  fetchData: () => Promise<void>;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
  wsStatus: string;
  wsReconnect: () => void;
}

export default function MarketHeader({
  loading,
  oracleData,
  assets,
  chartContainerRef,
  activeChart,
  getChartTitle,
  lastUpdated,
  refreshStatus,
  fetchData,
  refreshInterval,
  setRefreshInterval,
  wsStatus,
  wsReconnect,
}: MarketHeaderProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Main Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title Section */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 border border-primary-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isChineseLocale(locale) ? '市场概览' : 'Market Overview'}
            </h1>
            <p className="text-sm text-gray-500">
              {isChineseLocale(locale)
                ? '全面分析预言机市场份额、TVS趋势和链支持情况'
                : 'Comprehensive analysis of oracle market share, TVS trends and chain support'}
            </p>
          </div>
        </div>

        {/* Operation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <UnifiedExportSection
            loading={loading}
            oracleData={oracleData}
            assets={assets}
            chartContainerRef={chartContainerRef}
            activeChart={activeChart}
            getChartTitle={getChartTitle}
          />

          <RefreshControl
            lastUpdated={lastUpdated ?? undefined}
            isRefreshing={refreshStatus === 'refreshing'}
            onRefresh={fetchData}
            autoRefreshInterval={refreshInterval}
            onAutoRefreshChange={(interval) => setRefreshInterval(interval as RefreshInterval)}
          />

          <RealtimeIndicator isConnected={wsStatus === 'connected'} onReconnect={wsReconnect} />
        </div>
      </div>

      {/* Live Status Bar */}
      <LiveStatusBar
        isConnected={wsStatus === 'connected'}
        lastUpdate={lastUpdated ?? undefined}
      />
    </div>
  );
}
