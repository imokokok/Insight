'use client';

import { useState } from 'react';

import { SectionErrorBoundary } from '@/components/error-boundary';
import { SegmentedControl } from '@/components/ui';
import { useTranslations } from '@/i18n';

import { ChartsTab } from './components/ChartsTab';
import { CrossChainFilters } from './components/CrossChainFilters';
import { OverviewTab } from './components/OverviewTab';
import { PageHeader } from './components/PageHeader';
import { PriceSpreadHeatmap } from './components/PriceSpreadHeatmap';
import { TabNavigation, type TabId } from './components/TabNavigation';
import { type RefreshInterval } from './constants';
import { useCrossChainData } from './useCrossChainData';

export default function CrossChainContent() {
  const t = useTranslations();
  const data = useCrossChainData();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { loading, lastUpdated, refreshInterval, setRefreshInterval } = data;

  const refreshOptions = [
    { value: 0, label: t('crossChain.autoRefreshOff') },
    { value: 30000, label: t('crossChain.autoRefresh30s') },
    { value: 60000, label: t('crossChain.autoRefresh1m') },
    { value: 300000, label: t('crossChain.autoRefresh5m') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader data={data} />

        <div className="flex flex-col xl:flex-row gap-4">
          <div className="xl:w-[360px] flex-shrink-0">
            <div className="xl:sticky xl:top-6 space-y-4">
              <CrossChainFilters data={data} />

              <SectionErrorBoundary componentName="Price Spread Heatmap">
                <PriceSpreadHeatmap data={data} />
              </SectionErrorBoundary>

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('crossChain.autoRefresh')}</span>
                  <SegmentedControl
                    options={refreshOptions.map((opt) => ({
                      value: opt.value.toString(),
                      label: opt.label,
                    }))}
                    value={refreshInterval.toString()}
                    onChange={(value) => setRefreshInterval(Number(value) as RefreshInterval)}
                    size="sm"
                  />
                </div>
              </div>

              {lastUpdated && (
                <div className="text-xs text-gray-400 text-center">
                  {t('time.lastUpdated')} {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {loading ? (
              <div className="py-16 flex flex-col justify-center items-center gap-3 bg-white rounded-lg border border-gray-200 mt-4">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
                <div className="text-sm text-gray-500">{t('crossChain.loadingData')}</div>
              </div>
            ) : (
              <div className="mt-4">
                {activeTab === 'overview' && <OverviewTab data={data} />}
                {activeTab === 'charts' && <ChartsTab data={data} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
