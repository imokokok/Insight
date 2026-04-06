'use client';

import { useState, useCallback, useMemo } from 'react';

import { DropdownSelect, SegmentedControl, type SelectorOption } from '@/components/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useCreateAlert, type CreateAlertInput } from '@/hooks';
import { useTranslations } from '@/i18n';
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
  const t = useTranslations();
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

  const { createAlert, isCreating } = useCreateAlert();

  const symbolOptions: SelectorOption<string>[] = useMemo(
    () => symbols.map((s) => ({ value: s, label: s })),
    []
  );

  const providerOptions: SelectorOption<OracleProvider | ''>[] = useMemo(
    () => [
      { value: '', label: t('alerts.create.allProviders') },
      ...Object.entries(providerNames).map(([key, name]) => ({
        value: key as OracleProvider,
        label: name,
        icon: <span className="w-1.5 h-1.5 rounded-full" />,
        color: oracleColors[key as OracleProvider],
      })),
    ],
    [t]
  );

  const chainOptions: SelectorOption<Blockchain | ''>[] = useMemo(
    () => [
      {
        value: '',
        label: provider ? t('alerts.create.allChains') : t('alerts.create.selectProviderFirst'),
      },
      ...Object.entries(chainNames).map(([key, name]) => ({
        value: key as Blockchain,
        label: name,
      })),
    ],
    [provider, t]
  );

  const CONDITION_OPTIONS: { value: AlertConditionType; label: string; description: string }[] =
    useMemo(
      () => [
        {
          value: 'above',
          label: t('alerts.condition.above'),
          description: t('alerts.condition.aboveDesc'),
        },
        {
          value: 'below',
          label: t('alerts.condition.below'),
          description: t('alerts.condition.belowDesc'),
        },
        {
          value: 'change_percent',
          label: t('alerts.condition.changePercent'),
          description: t('alerts.condition.changePercentDesc'),
        },
      ],
      [t]
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
        setError(t('alerts.error.invalidTargetValue'));
        return;
      }

      const conditionLabel =
        conditionType === 'above'
          ? t('alerts.condition.above')
          : conditionType === 'below'
            ? t('alerts.condition.below')
            : t('alerts.condition.changePercent');

      const input: CreateAlertInput = {
        name: alertName || `${symbol} ${conditionLabel} ${numericTarget}`,
        symbol,
        provider: provider || null,
        chain: chain || null,
        condition_type: conditionType,
        target_value: numericTarget,
        is_active: isActive,
      };

      const { alert, error: createError } = await createAlert(input);

      if (createError) {
        setError(createError.message);
        return;
      }

      if (alert) {
        setTargetValue('');
        setAlertName('');
        setError(null);
        onAlertCreated?.();
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
      t,
    ]
  );

  const getTargetPlaceholder = useCallback(() => {
    switch (conditionType) {
      case 'above':
      case 'below':
        return t('alerts.placeholder.targetPrice');
      case 'change_percent':
        return t('alerts.placeholder.percentage');
      default:
        return t('alerts.placeholder.targetValue');
    }
  }, [conditionType, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('alerts.create.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AlertTemplates onSelectTemplate={handleApplyTemplate} selectedSymbol={symbol} />

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('alerts.create.customConfig')}
            </h4>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('alerts.create.nameLabel')}{' '}
              <span className="text-gray-400">{t('alerts.create.nameOptional')}</span>
            </label>
            <input
              type="text"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder={t('alerts.create.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('alerts.create.symbolLabel')}
            </label>
            <SegmentedControl
              options={symbolOptions}
              value={symbol}
              onChange={(value) => setSymbol(value as string)}
              size="sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('alerts.create.providerLabel')}{' '}
              <span className="text-gray-400">{t('alerts.create.providerOptional')}</span>
            </label>
            <DropdownSelect
              options={providerOptions}
              value={provider}
              onChange={handleProviderChange}
              placeholder={t('alerts.create.allProviders')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('alerts.create.chainLabel')}{' '}
              <span className="text-gray-400">{t('alerts.create.chainOptional')}</span>
            </label>
            <DropdownSelect
              options={chainOptions}
              value={chain}
              onChange={(value) => setChain(value as Blockchain | '')}
              disabled={!provider}
              placeholder={
                provider ? t('alerts.create.allChains') : t('alerts.create.selectProviderFirst')
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('alerts.create.conditionLabel')}
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('alerts.create.targetValueLabel')}
            </label>
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
            <label className="text-sm font-medium text-gray-700">
              {t('alerts.create.enableAlert')}
            </label>
            <button
              type="button"
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
                <h4 className="text-sm font-medium text-gray-700">{t('alerts.mute.settings')}</h4>
                <p className="text-xs text-gray-500">
                  {muteConfig.enabled
                    ? t('alerts.mute.enabledHint')
                    : t('alerts.mute.disabledHint')}
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
            {isCreating ? t('alerts.create.submitting') : t('alerts.create.submit')}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
