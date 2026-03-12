'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { ArrowRight, BookOpen, Shield, Globe, TrendingUp, Zap, Search } from 'lucide-react';

const metrics = [
  { label: 'oracles', value: '5+', icon: Shield },
  { label: 'chains', value: '15+', icon: Globe },
  { label: 'feeds', value: '1200+', icon: TrendingUp },
  { label: 'tvs', value: '$45B+', icon: Zap },
];

export default function ProfessionalHero() {
  const { t, language } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');

  const title = language === 'zh' ? '洞察预言机数据' : 'Insight Oracle Data';
  const titleHighlight = language === 'zh' ? '驱动智能决策' : 'Power Smart Decisions';

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
          backgroundSize: '60px 60px'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center px-6 lg:px-12 xl:px-20 py-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-sm font-medium text-blue-600">
                {t('home.hero.badge') || '专业预言机数据平台'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
              {title}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
                {titleHighlight}
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              {t('home.hero.description') ||
                '全面分析和比较 Chainlink、Band Protocol、UMA、Pyth Network、API3 等主流预言机协议。实时监控价格数据，评估协议性能，助力 Web3 开发者和分析师做出明智决策。'}
            </p>

            {/* Search Box - Dune Analytics style */}
            <div className="max-w-2xl mx-auto mb-10">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200/50 overflow-hidden">
                  <div className="pl-6">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'zh' ? '搜索交易对、预言机或区块链...' : 'Search trading pairs, oracles, or blockchains...'}
                    className="flex-1 px-4 py-5 text-lg text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                  />
                  <button className="mr-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all">
                    {language === 'zh' ? '搜索' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                {t('home.hero.ctaPrimary') || '开始探索'}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#docs"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-300"
              >
                <BookOpen className="w-5 h-5" />
                {t('home.hero.ctaSecondary') || '查看文档'}
              </Link>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-5 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      {t(`home.hero.stats.${metric.label}`) || metric.label}
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
