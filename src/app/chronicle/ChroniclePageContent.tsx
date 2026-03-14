'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { ChronicleClient } from '@/lib/oracles/chronicle';
import {
  PageHeader,
  MarketDataPanel,
  NetworkHealthPanel,
} from '@/components/oracle';
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

  const { isRefreshing, handleRefresh, lastUpdateTime } = useRefresh({
    onRefresh: refetchAll,
    interval: 60000,
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
        lastUpdateTime={lastUpdateTime}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('chronicle.scuttlebutt.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.securityLevel')}</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{scuttlebuttData.securityLevel}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.auditScore')}</p>
                  <p className="text-2xl font-bold text-gray-900">{scuttlebuttData.auditScore}/100</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.scuttlebutt.features')}</p>
                  <p className="text-2xl font-bold text-gray-900">{scuttlebuttData.securityFeatures.length}</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">{t('chronicle.scuttlebutt.securityFeatures')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {scuttlebuttData.securityFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'makerdao' && makerDAOData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('chronicle.makerdao.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.makerdao.tvl')}</p>
                  <p className="text-2xl font-bold text-gray-900">${(makerDAOData.totalValueLocked / 1e9).toFixed(2)}B</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.makerdao.daiSupply')}</p>
                  <p className="text-2xl font-bold text-gray-900">${(makerDAOData.daiSupply / 1e9).toFixed(2)}B</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.makerdao.systemSurplus')}</p>
                  <p className="text-2xl font-bold text-green-600">${(makerDAOData.systemSurplus / 1e6).toFixed(2)}M</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.makerdao.debtCeiling')}</p>
                  <p className="text-2xl font-bold text-gray-900">${(makerDAOData.globalDebtCeiling / 1e9).toFixed(2)}B</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.makerdao.asset')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.makerdao.type')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.makerdao.price')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.makerdao.collateralRatio')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.makerdao.stabilityFee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {makerDAOData.supportedAssets.map((asset, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">{asset.symbol}</span>
                          <span className="text-sm text-gray-500 ml-2">{asset.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 capitalize">{asset.type}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-900">${asset.price.toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-900">{asset.collateralRatio}%</td>
                        <td className="py-3 px-4 text-gray-900">{asset.stabilityFee}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'validators' && validatorData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('chronicle.validators.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.validators.total')}</p>
                  <p className="text-2xl font-bold text-gray-900">{validatorData.totalValidators}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.validators.active')}</p>
                  <p className="text-2xl font-bold text-green-600">{validatorData.activeValidators}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.validators.avgReputation')}</p>
                  <p className="text-2xl font-bold text-gray-900">{validatorData.averageReputation}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('chronicle.validators.totalStaked')}</p>
                  <p className="text-2xl font-bold text-gray-900">{(validatorData.totalStaked / 1e6).toFixed(2)}M</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.validators.name')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.validators.reputation')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.validators.uptime')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.validators.responseTime')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.validators.staked')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('chronicle.validators.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatorData.validators.map((validator, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900">{validator.name}</p>
                          <p className="text-xs text-gray-500">{validator.address}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${validator.reputationScore}%` }} />
                            </div>
                            <span className="text-sm text-gray-700">{validator.reputationScore}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{validator.uptime}%</td>
                        <td className="py-3 px-4 text-gray-900">{validator.responseTime}ms</td>
                        <td className="py-3 px-4 text-gray-900">{(validator.stakedAmount / 1e6).toFixed(2)}M</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            validator.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {validator.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
