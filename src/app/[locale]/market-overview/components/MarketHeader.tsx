'use client';

import { useTranslations, useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { BarChart3 } from 'lucide-react';
import UnifiedExportSection from './UnifiedExportSection';
import RefreshControl from './RefreshControl';
import RealtimeIndicator from './RealtimeIndicator';
import { RefreshInterval } from '../constants';
import { OracleMarketData, AssetData } from '../types';

import { chartColors, getChartColor } from '@/lib/chartColors';

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
  const _t = useTranslations();
  const locale = useLocale();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary-100 border border-primary-200">
            <BarChart3 className="w-6 h-6 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isChineseLocale(locale) ? '市场概览' : 'Market Overview'}
          </h1>
        </div>
        <p className="text-gray-600 ml-14">
          {isChineseLocale(locale)
            ? '全面分析预言机市场份额、TVS趋势和链支持情况'
            : 'Comprehensive analysis of oracle market share, TVS trends and chain support'}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
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
  );
}
