'use client';

import { useTranslations } from '@/i18n';
import { DashboardCard } from '../DashboardCard';
import { AnomalyDetectionConfig } from './types';

interface AlertConfigProps {
  config: AnomalyDetectionConfig;
  onConfigChange: (config: AnomalyDetectionConfig) => void;
}

export function AlertConfig({ config, onConfigChange }: AlertConfigProps) {
  const t = useTranslations();

  return (
    <DashboardCard title={t('anomalyAlert.configTitle')}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('anomalyAlert.priceSpikeThreshold')} (%)
          </label>
          <input
            type="number"
            value={config.priceSpikeThreshold}
            onChange={(e) =>
              onConfigChange({ ...config, priceSpikeThreshold: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            min="0"
            step="0.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('anomalyAlert.priceDropThreshold')} (%)
          </label>
          <input
            type="number"
            value={config.priceDropThreshold}
            onChange={(e) =>
              onConfigChange({ ...config, priceDropThreshold: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            min="0"
            step="0.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('anomalyAlert.priceDeviationThreshold')} (%)
          </label>
          <input
            type="number"
            value={config.priceDeviationThreshold}
            onChange={(e) =>
              onConfigChange({ ...config, priceDeviationThreshold: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            min="0"
            step="0.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('anomalyAlert.dataDelayThreshold')} (秒)
          </label>
          <input
            type="number"
            value={config.dataDelayThreshold / 1000}
            onChange={(e) =>
              onConfigChange({ ...config, dataDelayThreshold: Number(e.target.value) * 1000 })
            }
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('anomalyAlert.checkInterval')} (秒)
          </label>
          <input
            type="number"
            value={config.checkInterval / 1000}
            onChange={(e) =>
              onConfigChange({ ...config, checkInterval: Number(e.target.value) * 1000 })
            }
            className="w-full px-3 py-2 border border-gray-300  focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            min="5"
          />
        </div>
      </div>
    </DashboardCard>
  );
}
