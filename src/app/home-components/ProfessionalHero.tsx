'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { ArrowRight, Search, TrendingUp, Shield, Zap, BookOpen, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { chartColors } from '@/lib/config/colors';

const generateTrendData = (baseValue: number, points: number = 20) => {
  const data = [];
  let currentValue = baseValue;
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * 0.05;
    currentValue = currentValue * (1 + change);
    data.push({ value: currentValue });
  }
  return data;
};

const getMetrics = (t: (key: string) => string) => [
  {
    label: 'tvs',
    value: '$42.1B',
    subLabel: t('home.hero.metrics.totalValueSecured'),
    icon: Shield,
    trend: generateTrendData(40),
    color: chartColors.chart.blue,
  },
  {
    label: 'oracles',
    value: '5',
    subLabel: t('home.hero.metrics.activeOracles'),
    icon: Zap,
    trend: generateTrendData(5, 15),
    color: chartColors.chart.emerald,
  },
  {
    label: 'pairs',
    value: '1200+',
    subLabel: t('home.hero.metrics.supportedPairs'),
    icon: TrendingUp,
    trend: generateTrendData(1100, 25),
    color: chartColors.chart.violet,
  },
];

export default function ProfessionalHero() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const metrics = getMetrics(t);

  return (
    <section className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      <div className="relative z-10 flex-1 flex items-center px-6 lg:px-12 xl:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                {t('home.hero.liveData')}
              </span>
              <span className="w-1 h-1 bg-emerald-400"></span>
              <span className="text-xs text-emerald-600">
                {t('home.hero.badge') || '专业预言机数据平台'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              {t('home.hero.title.part1')}
              <br />
              <span className="text-gray-700">{t('home.hero.title.part2')}</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              {t('home.hero.description') ||
                '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能，助力 Web3 开发者和分析师做出明智决策。'}
            </p>

            <div className="max-w-2xl mx-auto mb-10">
              <div
                className={`relative flex items-center bg-white border overflow-hidden transition-colors duration-200 ${
                  isSearchFocused ? 'border-gray-900' : 'border-gray-300'
                }`}
              >
                <div className="pl-4">
                  <Search
                    className={`w-5 h-5 transition-colors duration-200 ${isSearchFocused ? 'text-gray-900' : 'text-gray-400'}`}
                  />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={t('home.hero.searchPlaceholder')}
                  className="flex-1 px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent outline-none min-w-0"
                />
                <button className="mr-1 px-4 sm:px-6 py-2 sm:py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors duration-200 text-sm sm:text-base whitespace-nowrap">
                  {t('common.search')}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors duration-200 group w-full sm:w-auto justify-center"
              >
                {t('home.hero.ctaPrimary') || '开始探索'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 font-semibold border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 group w-full sm:w-auto justify-center"
              >
                <BookOpen className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors duration-200" />
                {t('home.hero.viewDocumentation')}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                const isPositive =
                  metric.trend[metric.trend.length - 1].value >= metric.trend[0].value;
                const percentChange =
                  (metric.trend[metric.trend.length - 1].value / metric.trend[0].value - 1) * 100;

                return (
                  <div
                    key={metric.label}
                    className="group bg-white border border-gray-200 p-5 hover:border-gray-400 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gray-100">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">{metric.subLabel}</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 border ${
                          isPositive
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                            : 'text-red-600 bg-red-50 border-red-200'
                        }`}
                      >
                        <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                        <span>
                          {isPositive ? '+' : ''}
                          {percentChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-3">{metric.value}</div>
                    <div className="h-12 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metric.trend}>
                          <defs>
                            <linearGradient
                              id={`gradient-${metric.label}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor={metric.color} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={metric.color}
                            strokeWidth={2}
                            fill={`url(#gradient-${metric.label})`}
                            dot={false}
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
