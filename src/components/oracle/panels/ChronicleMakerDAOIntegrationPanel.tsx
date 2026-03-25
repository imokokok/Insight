'use client';

import { useTranslations } from '@/i18n';
import { MakerDAOIntegration, MakerDAOAsset } from '@/lib/oracles/chronicle';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Landmark, DollarSign, TrendingUp, Shield, Database } from 'lucide-react';

interface ChronicleMakerDAOIntegrationPanelProps {
  data: MakerDAOIntegration;
}

export function ChronicleMakerDAOIntegrationPanel({
  data,
}: ChronicleMakerDAOIntegrationPanelProps) {
  const t = useTranslations();

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'stablecoin':
        return 'bg-primary-50 text-primary-700 border-primary-200';
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <DashboardCard title={t('chronicle.makerdao.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.tvl')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(data.totalValueLocked)}
            </p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.daiSupply')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(data.daiSupply)}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.systemSurplus')}</p>
            </div>
            <p className="text-xl font-bold text-success-600">{formatCurrency(data.systemSurplus)}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500">{t('chronicle.makerdao.debtCeiling')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(data.globalDebtCeiling)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {t('chronicle.makerdao.integrationVersion')}:{' '}
            <span className="font-medium text-gray-900">{data.integrationVersion}</span>
          </p>
        </div>
      </DashboardCard>

      {/* Supported Assets */}
      <DashboardCard title={t('chronicle.makerdao.supportedAssets')}>
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
              {data.supportedAssets.map((asset, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div>
                      <span className="font-semibold text-gray-900">{asset.symbol}</span>
                      <span className="text-sm text-gray-500 ml-2">{asset.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium capitalize border ${getAssetTypeColor(asset.type)}`}
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
      </DashboardCard>
    </div>
  );
}
