'use client';

import { DropdownSelect } from '@/components/ui';

import { type ThresholdType, type ThresholdConfig } from '../utils';

export interface AnomalyConfigProps {
  thresholdConfig: ThresholdConfig;
  onThresholdConfigChange: (config: ThresholdConfig) => void;
}

const thresholdTypeOptions = [
  { value: 'fixed' as ThresholdType, label: 'Fixed Threshold' },
  { value: 'dynamic' as ThresholdType, label: 'Dynamic Volatility' },
  { value: 'atr' as ThresholdType, label: 'ATR Indicator' },
];

const calculationPeriodOptions = [
  { value: 7, label: '7' },
  { value: 14, label: '14' },
  { value: 20, label: '20' },
  { value: 30, label: '30' },
];

export function AnomalyConfig({ thresholdConfig, onThresholdConfigChange }: AnomalyConfigProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
        Anomaly Detection Configuration
      </h3>
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Threshold Type</label>
          <DropdownSelect
            options={thresholdTypeOptions}
            value={thresholdConfig.type}
            onChange={(value) =>
              onThresholdConfigChange({
                ...thresholdConfig,
                type: value as ThresholdType,
              })
            }
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Fixed Threshold %
            </label>
            <input
              type="number"
              value={thresholdConfig.fixedThreshold}
              onChange={(e) =>
                onThresholdConfigChange({
                  ...thresholdConfig,
                  fixedThreshold: Number(e.target.value),
                })
              }
              step={0.1}
              min={0.1}
              max={10}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Volatility Multiplier
            </label>
            <input
              type="number"
              value={thresholdConfig.atrMultiplier}
              onChange={(e) =>
                onThresholdConfigChange({
                  ...thresholdConfig,
                  atrMultiplier: Number(e.target.value),
                })
              }
              step={0.5}
              min={0.5}
              max={5}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-500 uppercase tracking-wide">
            Calculation Period
          </label>
          <DropdownSelect
            options={calculationPeriodOptions}
            value={thresholdConfig.volatilityWindow}
            onChange={(value) =>
              onThresholdConfigChange({
                ...thresholdConfig,
                volatilityWindow: value as number,
              })
            }
            className="w-full"
          />
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          {thresholdConfig.type === 'fixed' && 'Fixed threshold for detecting price anomalies'}
          {thresholdConfig.type === 'dynamic' && 'Dynamic threshold based on price volatility'}
          {thresholdConfig.type === 'atr' && 'ATR-based threshold for adaptive detection'}
        </div>
      </div>
    </div>
  );
}
