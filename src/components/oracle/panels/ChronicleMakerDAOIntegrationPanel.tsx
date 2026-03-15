'use client';

import { useI18n } from '@/lib/i18n/provider';
import { MakerDAOIntegration, MakerDAOAsset } from '@/lib/oracles/chronicle';
import { Landmark, DollarSign, TrendingUp, Shield, Database } from 'lucide-react';

interface ChronicleMakerDAOIntegrationPanelProps {
  data: MakerDAOIntegration;
}

export function ChronicleMakerDAOIntegrationPanel({ data }: ChronicleMakerDAOIntegrationPanelProps) {
  const { t } = useI18n();

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'stablecoin':
        return 'bg-blue-100 text-blue-700';
      case 'crypto':
        return 'bg-purple-100 text-purple-700';
      case 'rwa':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('chronicle.makerdao.title')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.tvl')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(data.totalValueLocked)}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.daiSupply')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(data.daiSupply)}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.systemSurplus')}</p>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(data.systemSurplus)}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.debtCeiling')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(data.globalDebtCeiling)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {t('chronicle.makerdao.integrationVersion')}: <span className="font-medium text-gray-900">{data.integrationVersion}</span>
          </p>
        </div>
      </div>

      {/* Supported Assets */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('chronicle.makerdao.supportedAssets')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('chronicle.makerdao.asset')}</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('chronicle.makerdao.type')}</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('chronicle.makerdao.price')}</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('chronicle.makerdao.collateralRatio')}</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('chronicle.makerdao.stabilityFee')}</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">{t('chronicle.makerdao.debtCeiling')}</th>
              </tr>
            </thead>
            <tbody>
              {data.supportedAssets.map((asset, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div>
                      <span className="font-semibold text-gray-900">{asset.symbol}</span>
                      <span className="text-sm text-gray-500 ml-2">{asset.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getAssetTypeColor(asset.type)}`}>
                      {asset.type}
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
