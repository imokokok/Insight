'use client';

import { useState, useCallback, useMemo } from 'react';

import { DropdownSelect, SegmentedControl, type SelectorOption } from '@/components/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useCreateAlert, type CreateAlertInput } from '@/hooks';
import { providerNames, chainNames, symbols, oracleColors } from '@/lib/constants';
import type { AlertConditionType } from '@/lib/supabase/database.types';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

import { AlertMutePeriod, type MutePeriodConfig } from './AlertMutePeriod';
import { AlertTemplates, type AlertTemplate } from './AlertTemplates';

interface AlertConfigProps {
  onAlertCreated?: () => void;
}

const DEFAULT_MUTE_CONFIG: MutePeriodConfig = {
  enabled: false,
  duration: 60,
  recurring: false,
};

export function AlertConfig({ onAlertCreated }: AlertConfigProps) {
  const [alertName, setAlertName] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('BTC');
  const [provider, setProvider] = useState<OracleProvider | ''>('');
  const [chain, setChain] = useState<Blockchain | ''>('');
  const [conditionType, setConditionType] = useState<AlertConditionType>('above');
  const [targetValue, setTargetValue] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [muteConfig, setMuteConfig] = useState<MutePeriodConfig>(DEFAULT_MUTE_CONFIG);
  const [showMuteSettings, setShowMuteSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createAlert, isPending: isCreating } = useCreateAlert();

  const symbolOptions: SelectorOption<string>[] = useMemo(
    () => symbols.map((s) => ({ value: s, label: s })),
    []
  );

  const providerOptions: SelectorOption<OracleProvider | ''>[] = useMemo(
    () => [
      { value: '', label: 'All Providers' },
      ...Object.entries(providerNames).map(([key, name]) => ({
        value: key as OracleProvider,
        label: name,
        icon: <span className="w-1.5 h-1.5 rounded-full" />,
        color: oracleColors[key as OracleProvider],
      })),
    ],
    []
  );

  const chainOptions: SelectorOption<Blockchain | ''>[] = useMemo(
    () => [
      {
        value: '',
        label: provider ? 'All Chains' : 'Select Provider First',
      },
      ...Object.entries(chainNames).map(([key, name]) => ({
        value: key as Blockchain,
        label: name,
      })),
    ],
    [provider]
  );

  const CONDITION_OPTIONS: { value: AlertConditionType; label: string; description: string }[] =
    useMemo(
      () => [
        {
          value: 'above',
          label: 'Price Above',
          description: 'Alert when price goes above target value',
        },
        {
          value: 'below',
          label: 'Price Below',
          description: 'Alert when price goes below target value',
        },
        {
          value: 'change_percent',
          label: 'Price Change %',
          description: 'Alert when price change percentage exceeds threshold',
        },
      ],
      []
    );

  const handleProviderChange = useCallback((value: OracleProvider | '') => {
    setProvider(value);
    if (value) {
      setChain('');
    }
  }, []);

  const handleApplyTemplate = useCallback((template: AlertTemplate) => {
    setSymbol(template.config.symbol);
    setProvider(template.config.provider as OracleProvider | '');
    setChain(template.config.chain as Blockchain | '');
    setConditionType(template.config.condition_type);
    setTargetValue(template.config.target_value.toString());
    setIsActive(template.config.is_active);
    setAlertName(template.name);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const numericTarget = parseFloat(targetValue);
      if (isNaN(numericTarget) || numericTarget <= 0) {
        setError('Please enter a valid target value');
        return;
      }

      const conditionLabel =
        conditionType === 'above' ? 'above' : conditionType === 'below' ? 'below' : 'change %';

      const input: CreateAlertInput = {
        name: alertName || `${symbol} ${conditionLabel} ${numericTarget}`,
        symbol,
        provider: provider || null,
        chain: chain || null,
        condition_type: conditionType,
        target_value: numericTarget,
        is_active: isActive,
      };

      try {
        const alert = await createAlert(input);
        if (alert) {
          setTargetValue('');
          setAlertName('');
          setError(null);
          onAlertCreated?.();
        }
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [
      alertName,
      symbol,
      provider,
      chain,
      conditionType,
      targetValue,
      isActive,
      createAlert,
      onAlertCreated,
    ]
  );

  const getTargetPlaceholder = useCallback(() => {
    switch (conditionType) {
      case 'above':
      case 'below':
        return 'Enter target price';
      case 'change_percent':
        return 'Enter percentage';
      default:
        return 'Enter target value';
    }
  }, [conditionType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AlertTemplates onSelectTemplate={handleApplyTemplate} selectedSymbol={symbol} />

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Configuration</h4>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Enter a name for this alert"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <SegmentedControl
              options={symbolOptions}
              value={symbol}
              onChange={(value) => setSymbol(value as string)}
              size="sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Oracle Provider <span className="text-gray-400">(optional)</span>
            </label>
            <DropdownSelect
              options={providerOptions}
              value={provider}
              onChange={handleProviderChange}
              placeholder="All Providers"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blockchain <span className="text-gray-400">(optional)</span>
            </label>
            <DropdownSelect
              options={chainOptions}
              value={chain}
              onChange={(value) => setChain(value as Blockchain | '')}
              disabled={!provider}
              placeholder={provider ? 'All Chains' : 'Select Provider First'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <div className="space-y-2">
              {CONDITION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    conditionType === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="conditionType"
                    value={option.value}
                    checked={conditionType === option.value}
                    onChange={(e) => setConditionType(e.target.value as AlertConditionType)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
            <input
              type="number"
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={getTargetPlaceholder()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Enable Alert</label>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowMuteSettings(!showMuteSettings)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <h4 className="text-sm font-medium text-gray-700">Mute Settings</h4>
                <p className="text-xs text-gray-500">
                  {muteConfig.enabled ? 'Mute period is enabled' : 'Mute period is disabled'}
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  showMuteSettings ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showMuteSettings && (
              <div className="mt-3">
                <AlertMutePeriod config={muteConfig} onChange={setMuteConfig} />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className={`w-full py-2 px-4 font-medium text-white transition-colors ${
              isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isCreating ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
