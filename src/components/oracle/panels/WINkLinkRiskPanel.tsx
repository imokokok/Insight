'use client';

import { useI18n } from '@/lib/i18n/provider';
import { WINkLinkRiskMetrics } from '@/lib/oracles/winklink';
import { Shield, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface WINkLinkRiskPanelProps {
  data: WINkLinkRiskMetrics;
}

export function WINkLinkRiskPanel({ data }: WINkLinkRiskPanelProps) {
  const { t } = useI18n();

  const getRiskLevel = (score: number) => {
    if (score >= 90) return { level: 'low', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 70) return { level: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'high', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const getDeviationRisk = (deviation: number) => {
    if (deviation <= 0.2) return { level: 'low', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (deviation <= 0.5) return { level: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'high', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const dataQualityRisk = getRiskLevel(data.dataQualityScore);
  const deviationRisk = getDeviationRisk(data.priceDeviation);
  const nodeRisk = getRiskLevel(100 - data.nodeConcentrationRisk);
  const uptimeRisk = getRiskLevel(100 - data.uptimeRisk * 100);

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('winklink.risk.title')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.dataQuality')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.dataQualityScore}%</p>
            <span className={`text-xs px-2 py-1 rounded ${dataQualityRisk.bgColor} ${dataQualityRisk.color}`}>
              {dataQualityRisk.level} risk
            </span>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.priceDeviation')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.priceDeviation}%</p>
            <span className={`text-xs px-2 py-1 rounded ${deviationRisk.bgColor} ${deviationRisk.color}`}>
              {deviationRisk.level} risk
            </span>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.nodeConcentration')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.nodeConcentrationRisk}%</p>
            <span className={`text-xs px-2 py-1 rounded ${nodeRisk.bgColor} ${nodeRisk.color}`}>
              {nodeRisk.level} risk
            </span>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-500">{t('winklink.risk.uptime')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{(100 - data.uptimeRisk * 100).toFixed(2)}%</p>
            <span className={`text-xs px-2 py-1 rounded ${uptimeRisk.bgColor} ${uptimeRisk.color}`}>
              {uptimeRisk.level} risk
            </span>
          </div>
        </div>
      </div>

      {/* Risk Details */}
      <div className="py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold mb-3">{t('winklink.risk.details')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">{t('winklink.risk.dataQualityDescription')}</span>
            <span className="text-sm font-medium text-green-600">{t('winklink.risk.excellent')}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">{t('winklink.risk.priceStability')}</span>
            <span className="text-sm font-medium text-green-600">{t('winklink.risk.stable')}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">{t('winklink.risk.nodeDistribution')}</span>
            <span className="text-sm font-medium text-yellow-600">{t('winklink.risk.moderate')}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">{t('winklink.risk.serviceReliability')}</span>
            <span className="text-sm font-medium text-green-600">{t('winklink.risk.high')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
