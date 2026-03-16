'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

export default function ProfessionalCTA() {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';

  return (
    <section className="py-16 sm:py-20 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="relative overflow-hidden bg-gray-900 p-8 sm:p-12 lg:p-16">
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                {isZh ? '专业预言机数据分析' : 'Professional Oracle Analytics'}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-2xl mx-auto leading-tight">
              {isZh ? '开始探索预言机数据' : 'Start Exploring Oracle Data'}
            </h2>

            <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
              {isZh
                ? '获取全面、准确、实时的预言机数据分析'
                : 'Get comprehensive, accurate, and real-time oracle data analysis'}
            </p>

            <Link
              href="/price-query"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors duration-200 group"
            >
              <Zap className="w-5 h-5" />
              {isZh ? '立即开始探索' : 'Start Exploring Now'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
