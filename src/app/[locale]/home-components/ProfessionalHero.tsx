'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Search, TrendingUp, Shield, Zap, BookOpen, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { chartColors } from '@/lib/config/colors';
import HeroBackground from './HeroBackground';

interface TrendData {
  value: number;
}

interface Metric {
  label: string;
  value: string;
  subLabel: string;
  icon: typeof Shield;
  trend: TrendData[];
  color: string;
}

const generateTrendData = (baseValue: number, points: number = 20): TrendData[] => {
  const data: TrendData[] = [];
  let currentValue = baseValue;
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * 0.05;
    currentValue = currentValue * (1 + change);
    data.push({ value: currentValue });
  }
  return data;
};

const getStaticMetrics = (t: (key: string) => string): Omit<Metric, 'trend'>[] => [
  {
    label: 'tvs',
    value: '$42.1B',
    subLabel: t('home.hero.metrics.totalValueSecured'),
    icon: Shield,
    color: chartColors.chart.blue,
  },
  {
    label: 'oracles',
    value: '5',
    subLabel: t('home.hero.metrics.activeOracles'),
    icon: Zap,
    color: chartColors.chart.emerald,
  },
  {
    label: 'pairs',
    value: '1200+',
    subLabel: t('home.hero.metrics.supportedPairs'),
    icon: TrendingUp,
    color: chartColors.chart.violet,
  },
];

export default function ProfessionalHero() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mounted, setMounted] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const symbol = searchQuery.trim().toUpperCase();
      router.push(`/${locale}/price-query?symbol=${symbol}`);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const metrics = useMemo(() => {
    const staticMetrics = getStaticMetrics(t);
    if (!mounted) {
      return staticMetrics.map((m) => ({
        ...m,
        trend: [{ value: 0 }],
      }));
    }
    return staticMetrics.map((m) => ({
      ...m,
      trend:
        m.label === 'tvs'
          ? generateTrendData(40)
          : m.label === 'oracles'
            ? generateTrendData(5, 15)
            : generateTrendData(1100, 25),
    }));
  }, [t, mounted]);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      <HeroBackground />
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
              <form
                onSubmit={handleSearch}
                className={`relative flex items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border transition-all duration-300 ease-out overflow-hidden ${
                  isSearchFocused
                    ? 'shadow-xl shadow-emerald-500/10 border-emerald-300/50 scale-[1.02]'
                    : 'border-gray-200/80 hover:border-gray-300 hover:shadow-xl'
                }`}
              >
                <div className="pl-5">
                  <Search
                    className={`w-5 h-5 transition-all duration-300 ${
                      isSearchFocused
                        ? 'text-emerald-600 scale-110'
                        : 'text-gray-400'
                    }`}
                  />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={t('home.hero.searchPlaceholder')}
                  className="flex-1 px-4 sm:px-5 py-4 sm:py-5 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 min-w-0 !outline-none"
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
                <button
                  type="submit"
                  className="mr-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold rounded-xl hover:from-gray-800 hover:to-gray-700 hover:shadow-lg hover:shadow-gray-900/25 active:scale-95 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
                >
                  {t('common.search')}
                </button>
              </form>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
              <Link
                href="/market-overview"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors duration-200 group w-full sm:w-auto justify-center"
              >
                {t('home.hero.ctaPrimary') || '查看市场概览'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 font-semibold border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 group w-full sm:w-auto justify-center"
              >
                <Search className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors duration-200" />
                {t('home.hero.ctaSecondary') || '查询价格'}
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
