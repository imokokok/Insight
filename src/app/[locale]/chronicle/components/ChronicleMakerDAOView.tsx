'use client';

import { useTranslations } from 'next-intl';
import { ChronicleMakerDAOViewProps } from '../types';

export function ChronicleMakerDAOView({
  makerDAO,
  isLoading,
}: ChronicleMakerDAOViewProps) {
  const t = useTranslations();

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'stablecoin':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'crypto':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'rwa':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  const supportedAssets = makerDAO?.supportedAssets || [];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.tvl')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(makerDAO?.totalValueLocked || 4500000000)}
            </p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.daiSupply')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(makerDAO?.daiSupply || 3200000000)}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.systemSurplus')}</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(makerDAO?.systemSurplus || 85000000)}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.debtCeiling')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(makerDAO?.globalDebtCeiling || 5000000000)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {t('chronicle.makerdao.integrationVersion')}:{' '}
            <span className="font-medium text-gray-900">{makerDAO?.integrationVersion || '2.5.1'}</span>
          </p>
        </div>
      </div>

      {/* Supported Assets */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.makerdao.supportedAssets')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.makerdao.asset')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.makerdao.type')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.makerdao.price')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.makerdao.collateralRatio')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.makerdao.stabilityFee')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.makerdao.debtCeiling')}
                </th>
              </tr>
            </thead>
            <tbody>
              {supportedAssets.map((asset, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div>
                      <span className="font-semibold text-gray-900">{asset.symbol}</span>
                      <span className="text-sm text-gray-500 ml-2">{asset.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium capitalize border rounded ${getAssetTypeColor(asset.type)}`}
                    >
                      {t(`chronicle.assetType.${asset.type}`)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-900">${asset.price.toLocaleString()}</td>
                  <td className="py-2 px-3 text-gray-900">
                    {asset.collateralRatio > 0 ? `${asset.collateralRatio}%` : '-'}
                  </td>
                  <td className="py-2 px-3 text-gray-900">
                    {asset.stabilityFee > 0 ? `${asset.stabilityFee}%` : '-'}
                  </td>
                  <td className="py-2 px-3 text-gray-900">
                    {asset.debtCeiling > 0 ? formatCurrency(asset.debtCeiling) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
