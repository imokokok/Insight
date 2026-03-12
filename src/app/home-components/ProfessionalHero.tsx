'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { ArrowRight, Search, TrendingUp, Shield, Zap } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// 生成模拟趋势数据
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

// 三个指标数据，包含迷你图表数据
const metrics = [
  {
    label: 'tvs',
    value: '$42.1B',
    subLabel: '总保障价值',
    icon: Shield,
    trend: generateTrendData(40),
    color: '#3b82f6',
  },
  {
    label: 'oracles',
    value: '5',
    subLabel: '活跃预言机',
    icon: Zap,
    trend: generateTrendData(5, 15),
    color: '#10b981',
  },
  {
    label: 'pairs',
    value: '1200+',
    subLabel: '支持交易对',
    icon: TrendingUp,
    trend: generateTrendData(1100, 25),
    color: '#8b5cf6',
  },
];

export default function ProfessionalHero() {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [searchQuery, setSearchQuery] = useState('');

  const title = isZh ? '洞察预言机数据' : 'Insight Oracle Data';
  const titleHighlight = isZh ? '驱动智能决策' : 'Power Smart Decisions';

  return (
    <section className="relative min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-100/30 to-transparent rounded-full" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#1e40af 1px, transparent 1px), linear-gradient(90deg, #1e40af 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center px-6 lg:px-12 xl:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge - Live Indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-sm font-medium text-blue-600">
                {t('home.hero.badge') || '专业预言机数据平台'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
              {title}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
                {titleHighlight}
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              {t('home.hero.description') ||
                '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能，助力 Web3 开发者和分析师做出明智决策。'}
            </p>

            {/* Search Box */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200/50 overflow-hidden">
                  <div className="pl-5">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isZh ? '搜索交易对、预言机或区块链...' : 'Search trading pairs, oracles, or blockchains...'}
                    className="flex-1 px-4 py-4 text-base text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                  />
                  <button className="mr-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all">
                    {isZh ? '搜索' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mb-10">
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                {t('home.hero.ctaPrimary') || '开始探索'}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Metrics Grid - 3 columns with mini charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                const isPositive = metric.trend[metric.trend.length - 1].value >= metric.trend[0].value;
                return (
                  <div
                    key={metric.label}
                    className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-4 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs text-gray-500">{metric.subLabel}</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                        <span>{isPositive ? '+' : ''}{((metric.trend[metric.trend.length - 1].value / metric.trend[0].value - 1) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">{metric.value}</div>
                    {/* Mini Trend Chart */}
                    <div className="h-10 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metric.trend}>
                          <defs>
                            <linearGradient id={`gradient-${metric.label}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={metric.color}
                            strokeWidth={2}
                            fill={`url(#gradient-${metric.label})`}
                            dot={false}
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
