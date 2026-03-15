'use client';

import { CrossChainCoverage, CrossChainAsset } from '@/lib/oracles/dia';
import { useI18n } from '@/lib/i18n/provider';
import { Blockchain } from '@/types/oracle';

interface DIACrossChainCoveragePanelProps {
  data: CrossChainCoverage;
}

export function DIACrossChainCoveragePanel({ data }: DIACrossChainCoveragePanelProps) {
  const { t } = useI18n();

  const getCoverageStatusColor = (status: string) => {
    switch (status) {
      case 'full':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'limited':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getChainLabel = (chain: Blockchain) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  return (
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold mb-3">{t('dia.crossChainCoverage.title')}</h3>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('dia.crossChainCoverage.totalAssets')}</p>
            <p className="text-xl font-bold text-indigo-600">{data.totalAssets}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('dia.crossChainCoverage.crypto')}</p>
            <p className="text-xl font-bold text-green-600">{data.byAssetType.crypto}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('dia.crossChainCoverage.stablecoins')}</p>
            <p className="text-xl font-bold text-blue-600">{data.byAssetType.stablecoin}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('dia.crossChainCoverage.defi')}</p>
            <p className="text-xl font-bold text-purple-600">{data.byAssetType.defi}</p>
          </div>
        </div>

        {/* Chain Distribution */}
        <div className="py-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-700 mb-3">
            {t('dia.crossChainCoverage.byChain')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(data.byChain).map(([chain, count]) => (
              <div key={chain} className="py-2 text-center">
                <p className="text-xs text-gray-500 mb-1">{getChainLabel(chain as Blockchain)}</p>
                <p className="text-lg font-semibold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Assets List */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-3">
            {t('dia.crossChainCoverage.assets')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.assets.map((asset: CrossChainAsset) => (
              <div key={asset.symbol} className="py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-semibold text-gray-900">{asset.name}</h5>
                    <span className="text-sm text-gray-500">{asset.symbol}</span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-md ${getCoverageStatusColor(
                      asset.coverageStatus
                    )}`}
                  >
                    {asset.coverageStatus}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('dia.crossChainCoverage.confidence')}</span>
                    <span className="font-medium text-gray-900">
                      {(asset.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('dia.crossChainCoverage.updateFreq')}</span>
                    <span className="font-medium text-gray-900">{asset.updateFrequency}s</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-xs text-gray-500">
                      {t('dia.crossChainCoverage.supportedChains')}:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {asset.chains.map((chain) => (
                        <span
                          key={chain}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-md"
                        >
                          {getChainLabel(chain)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
