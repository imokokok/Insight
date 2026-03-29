'use client';

import { useState, useCallback, useEffect } from 'react';

import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  Network,
  Building2,
  PieChart as PieChartIcon2,
  GitCompare,
  Target,
  ActivitySquare,
  ChevronDown,
} from 'lucide-react';

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
  {
    key: 'chain',
    icon: Network,
    translationKey: 'chainBreakdown',
  },
];

const secondaryChartTypes: ChartTypeConfig[] = [
  {
    key: 'protocol',
    icon: Building2,
    translationKey: 'protocols',
  },
  {
    key: 'asset',
    icon: PieChartIcon2,
    translationKey: 'assetCategories',
  },
  {
    key: 'comparison',
    icon: GitCompare,
    translationKey: 'oracleComparison',
  },
  {
    key: 'benchmark',
    icon: Target,
    translationKey: 'benchmark',
  },
  {
    key: 'correlation',
    icon: ActivitySquare,
    translationKey: 'correlation',
  },
];

const allChartTypes = [...mainChartTypes, ...secondaryChartTypes];

const CHART_TYPE_STORAGE_KEY = 'market-overview-chart-type';

interface ChartTypeSelectorProps {
  activeChart: ChartType;
  onChartChange: (chart: ChartType) => void;
}

export default function ChartTypeSelector({ activeChart, onChartChange }: ChartTypeSelectorProps) {
  const t = useTranslations('marketOverview');
  const isMobile = useIsMobile();

  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);

  useEffect(() => {
    const savedChartType = localStorage.getItem(CHART_TYPE_STORAGE_KEY) as ChartType | null;
    if (savedChartType) {
      const isValidType = allChartTypes.some((type) => type.key === savedChartType);
      if (isValidType && savedChartType !== activeChart) {
        onChartChange(savedChartType);
      }
    }
  }, []);

  const handleChartTypeSwitch = useCallback(
    (type: ChartType) => {
      onChartChange(type);
      localStorage.setItem(CHART_TYPE_STORAGE_KEY, type);
      setIsSecondaryMenuOpen(false);
    },
    [onChartChange]
  );

  const getCurrentSecondaryChart = () => {
    return secondaryChartTypes.find((type) => type.key === activeChart);
  };

  const isSecondaryChartActive = secondaryChartTypes.some((type) => type.key === activeChart);

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

      <div className="relative">
        <button
          onClick={() => setIsSecondaryMenuOpen(!isSecondaryMenuOpen)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap border-b-2',
            isSecondaryChartActive
              ? 'text-primary-600 border-primary-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {(() => {
            const currentSecondary = getCurrentSecondaryChart();
            if (currentSecondary) {
              const Icon = currentSecondary.icon;
              return (
                <>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className={isMobile ? 'hidden' : ''}>
                    {t(`ui.chart.${currentSecondary.translationKey}`)}
                  </span>
                </>
              );
            }
            return (
              <>
                <ActivitySquare className="w-4 h-4 flex-shrink-0" />
                <span>{t('ui.filter.more')}</span>
              </>
            );
          })()}
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200',
              isSecondaryMenuOpen && 'rotate-180'
            )}
          />
        </button>

        {isSecondaryMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsSecondaryMenuOpen(false)} />
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
              {secondaryChartTypes.map((type) => {
                const Icon = type.icon;
                const isActive = activeChart === type.key;
                return (
                  <button
                    key={type.key}
                    onClick={() => handleChartTypeSwitch(type.key)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{t(`ui.chart.${type.translationKey}`)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { mainChartTypes, secondaryChartTypes, allChartTypes };
