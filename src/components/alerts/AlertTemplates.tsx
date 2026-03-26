'use client';

import React, { useState, useCallback, useMemo } from 'react';

import { DropdownSelect } from '@/components/ui';
import { useTranslations } from '@/i18n';
import type { AlertConditionType } from '@/lib/supabase/database.types';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'price' | 'volatility' | 'data' | 'custom';
  config: {
    symbol: string;
    provider: OracleProvider | '';
    chain: Blockchain | '';
    condition_type: AlertConditionType;
    target_value: number;
    is_active: boolean;
  };
}

interface AlertTemplatesProps {
  onSelectTemplate: (template: AlertTemplate) => void;
  selectedSymbol?: string;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  price_breakout: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
  price_drop: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
      />
    </svg>
  ),
  volatility_spike: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  data_delay: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  deviation_alert: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  custom: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
      />
    </svg>
  ),
};

export function getPresetTemplates(t: (key: string) => string): AlertTemplate[] {
  return [
    {
      id: 'price_breakout',
      name: t('alerts.templates.priceBreakout.name'),
      description: t('alerts.templates.priceBreakout.description'),
      icon: 'price_breakout',
      category: 'price',
      config: {
        symbol: 'BTC',
        provider: '',
        chain: '',
        condition_type: 'above',
        target_value: 70000,
        is_active: true,
      },
    },
    {
      id: 'price_drop',
      name: t('alerts.templates.priceDrop.name'),
      description: t('alerts.templates.priceDrop.description'),
      icon: 'price_drop',
      category: 'price',
      config: {
        symbol: 'BTC',
        provider: '',
        chain: '',
        condition_type: 'below',
        target_value: 60000,
        is_active: true,
      },
    },
    {
      id: 'volatility_spike',
      name: t('alerts.templates.volatilitySpike.name'),
      description: t('alerts.templates.volatilitySpike.description'),
      icon: 'volatility_spike',
      category: 'volatility',
      config: {
        symbol: 'ETH',
        provider: '',
        chain: '',
        condition_type: 'change_percent',
        target_value: 5,
        is_active: true,
      },
    },
    {
      id: 'deviation_alert',
      name: t('alerts.templates.deviationAlert.name'),
      description: t('alerts.templates.deviationAlert.description'),
      icon: 'deviation_alert',
      category: 'volatility',
      config: {
        symbol: 'BTC',
        provider: '',
        chain: '',
        condition_type: 'change_percent',
        target_value: 2,
        is_active: true,
      },
    },
    {
      id: 'data_delay',
      name: t('alerts.templates.dataDelay.name'),
      description: t('alerts.templates.dataDelay.description'),
      icon: 'data_delay',
      category: 'data',
      config: {
        symbol: 'ETH',
        provider: '',
        chain: '',
        condition_type: 'above',
        target_value: 0,
        is_active: true,
      },
    },
  ];
}

export function AlertTemplates({ onSelectTemplate, selectedSymbol = 'BTC' }: AlertTemplatesProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const templates = useMemo(() => getPresetTemplates(t), [t]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return templates;
    return templates.filter((t) => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  const handleSelectTemplate = useCallback(
    (template: AlertTemplate) => {
      const adjustedTemplate = {
        ...template,
        config: {
          ...template.config,
          symbol: selectedSymbol,
        },
      };
      onSelectTemplate(adjustedTemplate);
    },
    [onSelectTemplate, selectedSymbol]
  );

  const categoryOptions = [
    { value: 'all', label: t('alerts.templates.categories.all') },
    { value: 'price', label: t('alerts.templates.categories.price') },
    { value: 'volatility', label: t('alerts.templates.categories.volatility') },
    { value: 'data', label: t('alerts.templates.categories.data') },
  ];

  const displayedTemplates = isExpanded ? filteredTemplates : filteredTemplates.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{t('alerts.templates.title')}</h4>
        <DropdownSelect
          options={categoryOptions}
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value as string)}
        />
      </div>

      <div className="grid grid-cols-1 gap-2">
        {displayedTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            className="flex items-start gap-3 p-3 text-left border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <div className="flex-shrink-0 text-gray-500">{TEMPLATE_ICONS[template.icon]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{template.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {template.config.symbol}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {template.config.condition_type === 'above'
                    ? `≥ ${template.config.target_value}`
                    : template.config.condition_type === 'below'
                      ? `≤ ${template.config.target_value}`
                      : `±${template.config.target_value}%`}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredTemplates.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
        >
          {isExpanded ? t('alerts.templates.showLess') : t('alerts.templates.showMore')}
        </button>
      )}
    </div>
  );
}

export default AlertTemplates;
