'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  Search,
  GitCompare,
  Globe,
  History,
  ArrowRight,
  TrendingUp,
  Activity,
  BarChart3,
  LineChart,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
} from 'recharts';
import { chartColors } from '@/lib/config/colors';

interface FeatureCard {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  href: string;
  statsValue: string;
  statsKey: string;
  chartType: 'area' | 'bar' | 'line';
  chartData: { value: number; label: string }[];
}

const generateChartData = (baseValue: number, variance: number, count: number = 7) => {
  return Array.from({ length: count }, (_, i) => ({
    value: baseValue + Math.random() * variance - variance / 2,
    label: `${i + 1}`,
  }));
};

const features: FeatureCard[] = [
  {
    id: 'price-query',
    titleKey: 'home.features.priceQuery.title',
    descriptionKey: 'home.features.priceQuery.description',
    icon: Search,
    href: '/price-query',
    statsValue: '1,000+',
    statsKey: 'home.features.priceQuery.stats',
    chartType: 'area',
    chartData: generateChartData(85, 15),
  },
  {
    id: 'cross-oracle',
    titleKey: 'home.features.crossOracle.title',
    descriptionKey: 'home.features.crossOracle.description',
    icon: GitCompare,
    href: '/cross-oracle',
    statsValue: '5+',
    statsKey: 'home.features.crossOracle.stats',
    chartType: 'bar',
    chartData: [
      { value: 92, label: 'CL' },
      { value: 88, label: 'PY' },
      { value: 85, label: 'API' },
      { value: 90, label: 'BD' },
      { value: 87, label: 'UM' },
    ],
  },
  {
    id: 'cross-chain',
    titleKey: 'home.features.crossChain.title',
    descriptionKey: 'home.features.crossChain.description',
    icon: Globe,
    href: '/cross-chain',
    statsValue: '10+',
    statsKey: 'home.features.crossChain.stats',
    chartType: 'line',
    chartData: generateChartData(75, 20),
  },
  {
    id: 'history',
    titleKey: 'home.features.history.title',
    descriptionKey: 'home.features.history.description',
    icon: History,
    href: '/history',
    statsValue: '30D',
    statsKey: 'home.features.history.stats',
    chartType: 'area',
    chartData: generateChartData(65, 25),
  },
];

function MiniChart({
  type,
  data,
  isHovered,
}: {
  type: 'area' | 'bar' | 'line';
  data: { value: number; label: string }[];
  isHovered: boolean;
}) {
  const chartColor = chartColors.chart.blue;
  const gradientId = 'featureChartGradient';

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={isHovered ? 2 : 1.5}
              fill={`url(#${gradientId})`}
              animationDuration={1000}
            />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <Bar
              dataKey="value"
              fill={chartColor}
              animationDuration={1000}
              opacity={isHovered ? 1 : 0.8}
            />
          </BarChart>
        );
      case 'line':
        return (
          <ReLineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={isHovered ? 2 : 1.5}
              dot={false}
              animationDuration={1000}
            />
          </ReLineChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

export default function FeatureCards() {
  const { t } = useI18n();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="py-12 sm:py-16 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 mb-4">
            <Activity className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">
              {t('home.features.sectionBadge')}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            {t('home.features.sectionTitle')}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            {t('home.features.sectionDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isHovered = hoveredCard === feature.id;

            return (
              <Link
                key={feature.id}
                href={feature.href}
                className={`
                  relative group bg-white border border-gray-200 p-5 sm:p-6
                  transition-colors duration-200
                  ${isHovered ? 'border-gray-400' : ''}
                `}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`
                      flex-shrink-0 p-3 bg-gray-100
                      transition-colors duration-200
                      ${isHovered ? 'bg-gray-200' : ''}
                    `}
                  >
                    <Icon
                      className={`
                        w-6 h-6 text-gray-600
                        transition-colors duration-200
                      `}
                    />
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {t(feature.descriptionKey)}
                    </p>
                  </div>

                  <div
                    className={`
                      flex-shrink-0 p-2 bg-gray-100 border border-gray-200
                      transition-opacity duration-200
                      ${isHovered ? 'opacity-100' : 'opacity-0'}
                    `}
                  >
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                  </div>
                </div>

                <div
                  className={`
                    mb-4 p-3 bg-gray-50 border border-gray-200
                    transition-colors duration-200
                    ${isHovered ? 'bg-gray-100' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {feature.chartType === 'area' && (
                        <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      {feature.chartType === 'bar' && (
                        <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      {feature.chartType === 'line' && (
                        <LineChart className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <span className="text-xs font-medium text-gray-500">
                        {t('home.features.liveData')}
                      </span>
                    </div>
                  </div>
                  <MiniChart
                    type={feature.chartType}
                    data={feature.chartData}
                    isHovered={isHovered}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        px-2.5 py-1 bg-gray-100
                        transition-colors duration-200
                        ${isHovered ? 'bg-gray-200' : ''}
                      `}
                    >
                      <span className="text-sm font-bold text-gray-700">{feature.statsValue}</span>
                    </div>
                    <span className="text-xs text-gray-500">{t(feature.statsKey)}</span>
                  </div>

                  <span
                    className={`
                      text-xs font-medium text-gray-600
                      transition-opacity duration-200
                      ${isHovered ? 'opacity-100' : 'opacity-0'}
                    `}
                  >
                    {t('home.features.learnMore')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="featureChartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.chart.blue} stopOpacity={0.2} />
              <stop offset="95%" stopColor={chartColors.chart.blue} stopOpacity={0.02} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}
