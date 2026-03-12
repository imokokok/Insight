'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { 
  ArrowRight, 
  BookOpen, 
  MessageCircle, 
  Sparkles
} from 'lucide-react';

export default function ProfessionalCTA() {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';

  return (
    <section className="py-20 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        {/* Main CTA Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 md:p-16">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                {isZh ? '开始您的数据之旅' : 'Start Your Data Journey'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 max-w-3xl">
              {isZh
                ? '准备好探索预言机数据了吗？'
                : 'Ready to Explore Oracle Data?'}
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl">
              {isZh
                ? '立即开始使用 Insight 平台，获取全面、准确、实时的预言机数据分析'
                : 'Start using the Insight platform today for comprehensive, accurate, and real-time oracle data analysis'}
            </p>

            {/* CTA Button */}
            <div className="flex flex-wrap gap-4 mb-12">
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 hover:shadow-xl transition-all duration-300 group"
              >
                {isZh ? '免费开始使用' : 'Get Started Free'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Secondary Links */}
            <div className="flex flex-wrap items-center gap-6 text-blue-200">
              <Link href="#docs" className="flex items-center gap-2 hover:text-white transition-colors">
                <BookOpen className="w-4 h-4" />
                <span>{isZh ? '文档中心' : 'Documentation'}</span>
              </Link>
              <Link href="#community" className="flex items-center gap-2 hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>{isZh ? '社区讨论' : 'Community'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
