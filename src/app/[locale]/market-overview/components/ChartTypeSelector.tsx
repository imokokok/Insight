'use client';

import { useCallback, useEffect } from 'react';

import { PieChart as PieChartIcon, TrendingUp, BarChart3 } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/stores/uiStore';

import { type ChartType } from '../types';

import type { LucideIcon } from 'lucide-react';

interface ChartTypeConfig {
  key: ChartType;
  icon: LucideIcon;
  translationKey: string;
}

const mainChartTypes: ChartTypeConfig[] = [
  {
    key: 'pie',
    icon: PieChartIcon,
    translationKey: 'marketShare',
  },
  {
    key: 'trend',
    icon: TrendingUp,
    translationKey: 'tvsTrend',
  },
  {
    key: 'bar',
    icon: BarChart3,
    translationKey: 'chainSupport',
  },
];

const CHART_TYPE_STORAGE_KEY = 'market-overview-chart-type';

interface ChartTypeSelectorProps {
  activeChart: ChartType;
  onChartChange: (chart: ChartType) => void;
}

export default function ChartTypeSelector({ activeChart, onChartChange }: ChartTypeSelectorProps) {
  const t = useTranslations('marketOverview');
  const isMobile = useIsMobile();

  useEffect(() => {
    const savedChartType = localStorage.getItem(CHART_TYPE_STORAGE_KEY) as ChartType | null;
    if (savedChartType) {
      const isValidType = mainChartTypes.some((type) => type.key === savedChartType);
      if (isValidType && savedChartType !== activeChart) {
        onChartChange(savedChartType);
      }
    }
  }, []);

  const handleChartTypeSwitch = useCallback(
    (type: ChartType) => {
      onChartChange(type);
      localStorage.setItem(CHART_TYPE_STORAGE_KEY, type);
    },
    [onChartChange]
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center overflow-x-auto">
        {mainChartTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeChart === type.key;
          return (
            <button
              key={type.key}
              onClick={() => handleChartTypeSwitch(type.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap border-b-2',
                isActive
                  ? 'text-primary-600 border-primary-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              )}
              title={t(`ui.chart.${type.translationKey}`)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className={isMobile ? 'hidden' : ''}>
                {t(`ui.chart.${type.translationKey}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { mainChartTypes };
