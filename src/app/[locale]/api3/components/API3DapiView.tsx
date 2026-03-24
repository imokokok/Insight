'use client';

import { useTranslations } from 'next-intl';
import { DapiCoveragePanel } from '@/components/oracle/panels/DapiCoveragePanel';
import { DataSourceTraceabilityPanel } from '@/components/oracle/panels/DataSourceTraceabilityPanel';
import { DapiPriceDeviationMonitor } from '@/components/oracle/common/DapiPriceDeviationMonitor';
import { API3DapiViewProps } from '../types';

export function API3DapiView({
  dapiCoverage,
  deviations,
  sourceTrace,
  isLoading,
}: API3DapiViewProps) {
  const t = useTranslations();

  const coverageData = dapiCoverage || {
    totalDapis: 150,
    byAssetType: {
      crypto: 80,
      forex: 40,
      commodities: 20,
      stocks: 10,
    },
    byChain: {
      ethereum: 85,
      arbitrum: 45,
      polygon: 20,
    },
    updateFrequency: {
      high: 100,
      medium: 35,
      low: 15,
    },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.totalDapis')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{coverageData.totalDapis}+</p>
          <p className="text-xs text-emerald-600 mt-1">+8%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.chainsSupported')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{Object.keys(coverageData.byChain).length}+</p>
          <p className="text-xs text-gray-500 mt-1">Multi-chain</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.cryptoAssets')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{coverageData.byAssetType.crypto}</p>
          <p className="text-xs text-emerald-600 mt-1">Most Popular</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.dapi.updateFrequency')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">10s</p>
          <p className="text-xs text-gray-500 mt-1">Real-time</p>
        </div>
      </div>

      <DapiCoveragePanel data={coverageData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {deviations && deviations.length > 0 && (
          <DapiPriceDeviationMonitor data={deviations} />
        )}
        {sourceTrace && sourceTrace.length > 0 && (
          <DataSourceTraceabilityPanel data={sourceTrace} />
        )}
      </div>
    </div>
  );
}
