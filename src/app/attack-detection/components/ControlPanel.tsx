'use client';

import { useState } from 'react';

import { Filter, ChevronDown, ChevronUp, Shield, Clock, Gauge } from 'lucide-react';

import { DropdownSelect, SegmentedControl } from '@/components/ui';
import type { RefreshInterval } from '@/types/common';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { type AttackDetectionConfig, DEFAULT_DEVIATION_THRESHOLDS } from '../types/index';

// ── Asset options ──
const ASSET_OPTIONS = [
  { value: 'BTC', label: 'BTC' },
  { value: 'ETH', label: 'ETH' },
  { value: 'SOL', label: 'SOL' },
  { value: 'BNB', label: 'BNB' },
  { value: 'USDC', label: 'USDC' },
  { value: 'USDT', label: 'USDT' },
  { value: 'ARB', label: 'ARB' },
  { value: 'OP', label: 'OP' },
  { value: 'MATIC', label: 'MATIC' },
  { value: 'AVAX', label: 'AVAX' },
  { value: 'DOGE', label: 'DOGE' },
  { value: 'LINK', label: 'LINK' },
];

// ── Chain options (TWAP-supported) ──
const CHAIN_OPTIONS = [
  { value: Blockchain.ETHEREUM, label: 'Ethereum' },
  { value: Blockchain.ARBITRUM, label: 'Arbitrum' },
  { value: Blockchain.OPTIMISM, label: 'Optimism' },
  { value: Blockchain.POLYGON, label: 'Polygon' },
  { value: Blockchain.BASE, label: 'Base' },
  { value: Blockchain.BNB_CHAIN, label: 'BNB Chain' },
];

// ── Oracle options ──
const ORACLE_OPTIONS: {
  value: OracleProvider;
  label: string;
  color: string;
  disabled?: boolean;
}[] = [
  { value: OracleProvider.CHAINLINK, label: 'Chainlink', color: '#375BD2' },
  { value: OracleProvider.PYTH, label: 'Pyth', color: '#F9AF2D' },
  { value: OracleProvider.TWAP, label: 'TWAP', color: '#10B981', disabled: true },
  { value: OracleProvider.REDSTONE, label: 'RedStone', color: '#EC1F24' },
  { value: OracleProvider.API3, label: 'API3', color: '#7B61FF' },
  { value: OracleProvider.DIA, label: 'DIA', color: '#1E2B3D' },
  { value: OracleProvider.WINKLINK, label: 'WINkLink', color: '#FF4D4D' },
  { value: OracleProvider.SUPRA, label: 'Supra', color: '#14B8A6' },
  { value: OracleProvider.REFLECTOR, label: 'Reflector', color: '#F59E0B' },
  { value: OracleProvider.FLARE, label: 'Flare', color: '#8B0FE5' },
];

// ── TWAP window options ──
const TWAP_WINDOW_OPTIONS = [
  { value: 10, label: '10min' },
  { value: 30, label: '30min' },
  { value: 60, label: '60min' },
];

// ── Refresh interval options ──
const REFRESH_INTERVAL_OPTIONS = [
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '60s' },
  { value: 300000, label: '5m' },
];

interface ControlPanelProps {
  config: AttackDetectionConfig;
  onConfigChange: (config: Partial<AttackDetectionConfig>) => void;
  isLoading: boolean;
}

export function ControlPanel({ config, onConfigChange, isLoading: _isLoading }: ControlPanelProps) {
  const [isThresholdExpanded, setIsThresholdExpanded] = useState(false);

  const handleOracleToggle = (value: OracleProvider | OracleProvider[]) => {
    const newOracles = Array.isArray(value) ? value : [value];
    // Always ensure TWAP is included
    if (!newOracles.includes(OracleProvider.TWAP)) {
      newOracles.push(OracleProvider.TWAP);
    }
    onConfigChange({ selectedOracles: newOracles });
  };

  const selectedOracleValues = config.selectedOracles.filter((o) =>
    ORACLE_OPTIONS.some((opt) => opt.value === o)
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-4">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">Detection Config</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Asset selector */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Asset</label>
          <DropdownSelect
            options={ASSET_OPTIONS}
            value={config.symbol}
            onChange={(value) => onConfigChange({ symbol: value as string })}
            placeholder="Select asset..."
            searchable
            searchPlaceholder="Search asset..."
            className="w-full"
          />
        </section>

        {/* Chain selector */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Chain</label>
          <DropdownSelect
            options={CHAIN_OPTIONS}
            value={config.chain}
            onChange={(value) => onConfigChange({ chain: value as Blockchain })}
            placeholder="Select chain..."
            className="w-full"
          />
        </section>

        {/* Oracle checkboxes */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Oracles</label>
          <SegmentedControl
            options={ORACLE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              color: o.color,
              disabled: o.disabled,
            }))}
            value={selectedOracleValues}
            onChange={handleOracleToggle}
            multiple
            size="sm"
            showSelectAll
          />
        </section>

        {/* TWAP Window */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Clock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            TWAP Window
          </label>
          <SegmentedControl
            options={TWAP_WINDOW_OPTIONS}
            value={config.twapWindowMinutes}
            onChange={(value) => onConfigChange({ twapWindowMinutes: value as number })}
            size="sm"
          />
        </section>

        {/* Refresh interval */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Gauge className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            Refresh Interval
          </label>
          <SegmentedControl
            options={REFRESH_INTERVAL_OPTIONS}
            value={config.refreshIntervalMs}
            onChange={(value) => onConfigChange({ refreshIntervalMs: value as RefreshInterval })}
            size="sm"
          />
        </section>

        {/* Threshold config (collapsible) */}
        <section className="border border-gray-100 rounded-lg">
          <button
            onClick={() => setIsThresholdExpanded(!isThresholdExpanded)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-500" />
              Deviation Thresholds
            </span>
            {isThresholdExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {isThresholdExpanded && (
            <div className="px-3 pb-3 space-y-3">
              {(
                [
                  {
                    key: 'stablecoin',
                    label: 'Stablecoin',
                    default: DEFAULT_DEVIATION_THRESHOLDS.stablecoin,
                  },
                  { key: 'major', label: 'Major', default: DEFAULT_DEVIATION_THRESHOLDS.major },
                  { key: 'alt', label: 'Alt', default: DEFAULT_DEVIATION_THRESHOLDS.alt },
                  { key: 'micro', label: 'Micro', default: DEFAULT_DEVIATION_THRESHOLDS.micro },
                ] as const
              ).map(({ key, label, default: def }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={config.customThresholds[key]}
                      onChange={(e) =>
                        onConfigChange({
                          customThresholds: {
                            ...config.customThresholds,
                            [key]: parseFloat(e.target.value) || def,
                          },
                        })
                      }
                      className="w-20 px-2 py-1 text-xs text-right border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
