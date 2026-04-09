'use client';

import { BarChart3 } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type RefreshInterval } from '@/lib/constants';
import { type OracleMarketData, type AssetData } from '../types';

import RealtimeIndicator from './RealtimeIndicator';
import RefreshControl from './RefreshControl';
import UnifiedExportSection from './UnifiedExportSection';

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
  const t = useTranslations('marketOverview');

  return (
    <div className="flex flex-col gap-3 mb-6 border-b border-gray-100 pb-4">
      {/* Main Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title Section */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 border border-primary-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('pageTitle')}</h1>
            <p className="text-sm text-gray-500">{t('pageDescription')}</p>
          </div>
        </div>

        {/* Operation Buttons - Text-only Style */}
        <div className="flex items-center gap-4">
          {/* Data Operations Group: Export, Refresh */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* View Control Group: Realtime Status */}
          <div className="flex items-center">
            <RealtimeIndicator isConnected={wsStatus === 'connected'} onReconnect={wsReconnect} />
          </div>
        </div>
      </div>
    </div>
  );
}
