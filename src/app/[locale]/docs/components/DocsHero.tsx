'use client';

import Link from 'next/link';

import { BookOpen, Search, ArrowRight } from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function DocsHero() {
  const t = useTranslations();

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6 backdrop-blur-sm">
            <BookOpen className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {t('docs.hero.title') || '文档中心'}
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed">
            {t('docs.hero.subtitle') ||
              '了解如何使用 Insight 预言机数据平台进行实时价格监控、跨预言机对比和深度数据分析。'}
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                placeholder={t('docs.hero.searchPlaceholder') || '搜索文档...'}
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="text-blue-200">{t('docs.hero.quickLinks') || '快速链接'}:</span>
            <Link
              href="#quickstart"
              className="inline-flex items-center gap-1 text-white hover:text-blue-200 transition-colors"
            >
              {t('docs.nav.quickstart') || '快速入门'}
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-1 text-white hover:text-blue-200 transition-colors"
            >
              {t('docs.nav.features') || '功能指南'}
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="#api"
              className="inline-flex items-center gap-1 text-white hover:text-blue-200 transition-colors"
            >
              {t('docs.nav.api') || 'API 参考'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
