'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { ChronicleClient } from '@/lib/oracles/chronicle';
import {
  PageHeader,
  MarketDataPanel,
  NetworkHealthPanel,
} from '@/components/oracle';
import { ChronicleScuttlebuttPanel } from '@/components/oracle/panels/ChronicleScuttlebuttPanel';
import { ChronicleMakerDAOIntegrationPanel } from '@/components/oracle/panels/ChronicleMakerDAOIntegrationPanel';
import { ChronicleValidatorPanel } from '@/components/oracle/panels/ChronicleValidatorPanel';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useChronicleAllData } from '@/hooks/useChronicleData';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ChroniclePageContent');

type ChronicleTab = 'market' | 'network' | 'scuttlebutt' | 'makerdao' | 'validators';

const TABS: { id: ChronicleTab; labelKey: string }[] = [
  { id: 'market', labelKey: 'chronicle.tabs.market' },
  { id: 'network', labelKey: 'chronicle.tabs.network' },
  { id: 'scuttlebutt', labelKey: 'chronicle.tabs.scuttlebutt' },
  { id: 'makerdao', labelKey: 'chronicle.tabs.makerdao' },
  { id: 'validators', labelKey: 'chronicle.tabs.validators' },
];

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{t('chronicle.error.loadingFailed')}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{error.message || t('chronicle.error.loadingFailed')}</p>
        <button
          onClick={onRetry}
          className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-gray-500">{t('chronicle.loading')}</p>
      </div>
    </div>
  );
}

export function ChroniclePageContent() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ChronicleTab>('market');

  const config = getOracleConfig(OracleProvider.CHRONICLE);
  const client = useMemo(() => new ChronicleClient(), []);

  const {
    price,
    historicalData,
    scuttlebuttData,
    makerDAOData,
    validatorData,
    networkStats,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useChronicleAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      scuttlebutt: scuttlebuttData,
      makerdao: makerDAOData,
      validators: validatorData,
    },
    filename: `chronicle-data-${new Date().toISOString().split('T')[0]}`,
  });

  const { isRefreshing, refresh: handleRefresh } = useRefresh({
    onRefresh: refetchAll,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorFallback error={errors[0] || new Error('Unknown error')} onRetry={refetchAll} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={config.name}
        subtitle={t('chronicle.subtitle')}
        icon={config.icon}
        onRefresh={handleRefresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-2 p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'market' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MarketDataPanel client={client} config={config.marketData} iconBgColor={config.iconBgColor} />
              </div>
              <div>
                <NetworkHealthPanel config={config.networkData} />
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <NetworkHealthPanel config={config.networkData} />
          )}

          {activeTab === 'scuttlebutt' && scuttlebuttData && (
            <ChronicleScuttlebuttPanel data={scuttlebuttData} />
          )}

          {activeTab === 'makerdao' && makerDAOData && (
            <ChronicleMakerDAOIntegrationPanel data={makerDAOData} />
          )}

          {activeTab === 'validators' && validatorData && (
            <ChronicleValidatorPanel data={validatorData} />
          )}
        </div>
      </div>
    </div>
  );
}
