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
  color: string;
  statsValue: string;
  statsKey: string;
  chartType: 'area' | 'bar' | 'line';
  chartData: { value: number; label: string }[];
}

// Generate sample chart data for each feature
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
    color: 'blue',
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
    color: 'indigo',
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
    color: 'violet',
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
    color: 'emerald',
    statsValue: '30D',
    statsKey: 'home.features.history.stats',
    chartType: 'area',
    chartData: generateChartData(65, 25),
  },
];

const COLOR_THEMES: Record<
  string,
  {
    bg: string;
    bgHover: string;
    border: string;
    borderHover: string;
    text: string;
    gradient: string;
    chartColor: string;
    chartGradient: string;
    iconBg: string;
    iconRing: string;
  }
> = {
  blue: {
    bg: 'bg-blue-50/50',
    bgHover: 'bg-blue-50',
    border: 'border-blue-100',
    borderHover: 'border-blue-300',
    text: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    chartColor: chartColors.chart.blueLight,
    chartGradient: 'url(#blueGradient)',
    iconBg: 'bg-blue-100',
    iconRing: 'ring-blue-200',
  },
  indigo: {
    bg: 'bg-indigo-50/50',
    bgHover: 'bg-indigo-50',
    border: 'border-indigo-100',
    borderHover: 'border-indigo-300',
    text: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
    chartColor: chartColors.chart.indigoLight,
    chartGradient: 'url(#indigoGradient)',
    iconBg: 'bg-indigo-100',
    iconRing: 'ring-indigo-200',
  },
  violet: {
    bg: 'bg-violet-50/50',
    bgHover: 'bg-violet-50',
    border: 'border-violet-100',
    borderHover: 'border-violet-300',
    text: 'text-violet-600',
    gradient: 'from-violet-500 to-violet-600',
    chartColor: chartColors.chart.violetLight,
    chartGradient: 'url(#violetGradient)',
    iconBg: 'bg-violet-100',
    iconRing: 'ring-violet-200',
  },
  emerald: {
    bg: 'bg-emerald-50/50',
    bgHover: 'bg-emerald-50',
    border: 'border-emerald-100',
    borderHover: 'border-emerald-300',
    text: 'text-emerald-600',
    gradient: 'from-emerald-500 to-emerald-600',
    chartColor: chartColors.chart.emeraldLight,
    chartGradient: 'url(#emeraldGradient)',
    iconBg: 'bg-emerald-100',
    iconRing: 'ring-emerald-200',
  },
};

// Mini Chart Component
function MiniChart({
  type,
  data,
  color,
  isHovered,
}: {
  type: 'area' | 'bar' | 'line';
  data: { value: number; label: string }[];
  color: string;
  isHovered: boolean;
}) {
  const chartColor = color;
  const gradientId = `${color.replace('#', '')}Gradient`;

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={isHovered ? 2.5 : 2}
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
              radius={[2, 2, 0, 0]}
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
              strokeWidth={isHovered ? 2.5 : 2}
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
    <div className="h-16 w-full">
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
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-4">
            <Activity className="w-4 h-4 text-blue-500" />
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

        {/* 2x2 Grid - Single column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const colors = COLOR_THEMES[feature.color];
            const isHovered = hoveredCard === feature.id;

            return (
              <Link
                key={feature.id}
                href={feature.href}
                className={`
                  relative group rounded-2xl border-2 bg-white p-5 sm:p-6
                  transition-all duration-500 ease-out overflow-hidden
                  ${colors.border}
                  ${isHovered ? `${colors.borderHover} shadow-2xl scale-[1.02]` : 'shadow-sm hover:shadow-lg'}
                `}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Background gradient on hover */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-br ${colors.gradient} 
                    ${isHovered ? 'opacity-[0.03]' : 'opacity-0'}
                    transition-opacity duration-500
                  `}
                />

                {/* Animated border glow */}
                <div
                  className={`
                    absolute inset-0 rounded-2xl transition-opacity duration-500
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                  `}
                  style={{
                    background: `linear-gradient(135deg, ${colors.chartColor}20, transparent 50%)`,
                  }}
                />

                <div className="relative">
                  {/* Header: Icon + Title + Arrow */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Enhanced Icon Container */}
                    <div
                      className={`
                        flex-shrink-0 p-3 rounded-xl ${colors.iconBg}
                        ring-2 ${colors.iconRing} ring-offset-2
                        transition-all duration-500 ease-out
                        ${isHovered ? 'scale-110 shadow-lg ring-offset-4' : ''}
                      `}
                    >
                      <Icon
                        className={`
                          w-6 h-6 ${colors.text}
                          transition-transform duration-500
                          ${isHovered ? 'scale-110' : ''}
                        `}
                      />
                    </div>

                    {/* Title and Description */}
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {t(feature.descriptionKey)}
                      </p>
                    </div>

                    {/* Arrow Indicator with enhanced animation */}
                    <div
                      className={`
                        flex-shrink-0 p-2 rounded-full ${colors.bg}
                        transition-all duration-500 ease-out
                        ${isHovered ? 'opacity-100 translate-x-0 bg-opacity-100' : 'opacity-0 translate-x-4'}
                      `}
                    >
                      <ArrowRight
                        className={`
                          w-5 h-5 ${colors.text}
                          transition-transform duration-500
                          ${isHovered ? 'translate-x-0.5' : ''}
                        `}
                      />
                    </div>
                  </div>

                  {/* Mini Chart Section */}
                  <div
                    className={`
                      mb-4 p-3 rounded-xl ${colors.bg} border ${colors.border}
                      transition-all duration-500
                      ${isHovered ? 'bg-opacity-100' : 'bg-opacity-50'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {feature.chartType === 'area' && (
                          <TrendingUp className={`w-3.5 h-3.5 ${colors.text}`} />
                        )}
                        {feature.chartType === 'bar' && (
                          <BarChart3 className={`w-3.5 h-3.5 ${colors.text}`} />
                        )}
                        {feature.chartType === 'line' && (
                          <LineChart className={`w-3.5 h-3.5 ${colors.text}`} />
                        )}
                        <span className={`text-xs font-medium ${colors.text}`}>
                          {t('home.features.liveData')}
                        </span>
                      </div>
                    </div>
                    <MiniChart
                      type={feature.chartType}
                      data={feature.chartData}
                      color={colors.chartColor}
                      isHovered={isHovered}
                    />
                  </div>

                  {/* Stats Section */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div
                        className={`
                          px-2.5 py-1 rounded-lg ${colors.bg} 
                          transition-all duration-500
                          ${isHovered ? `${colors.bgHover} scale-105` : ''}
                        `}
                      >
                        <span className={`text-sm font-bold ${colors.text}`}>
                          {feature.statsValue}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{t(feature.statsKey)}</span>
                    </div>

                    <span
                      className={`
                        text-xs font-medium ${colors.text}
                        transition-all duration-500
                        ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
                      `}
                    >
                      {t('home.features.learnMore')}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* SVG Gradients for charts */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.chart.blueLight} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.chart.blueLight} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.chart.indigoLight} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.chart.indigoLight} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.chart.violetLight} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.chart.violetLight} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.chart.emeraldLight} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.chart.emeraldLight} stopOpacity={0.05} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}
