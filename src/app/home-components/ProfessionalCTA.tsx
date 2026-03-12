'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

export default function ProfessionalCTA() {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 sm:p-12 lg:p-16">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-72 h-72 sm:w-96 sm:h-96 bg-blue-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>

          <div className="relative z-10 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                {isZh ? '专业预言机数据分析' : 'Professional Oracle Analytics'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-2xl mx-auto leading-tight">
              {isZh ? '开始探索预言机数据' : 'Start Exploring Oracle Data'}
            </h2>

            {/* Description */}
            <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              {isZh
                ? '获取全面、准确、实时的预言机数据分析'
                : 'Get comprehensive, accurate, and real-time oracle data analysis'}
            </p>

            {/* Single Primary CTA */}
            <Link
              href="/price-query"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 hover:shadow-xl hover:shadow-white/10 transition-all duration-300 group shadow-lg"
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
