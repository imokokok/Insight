'use client';

import Link from 'next/link';

import { ArrowRight, Sparkles, Zap } from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function ProfessionalCTA() {
  const t = useTranslations('home.cta');

  return (
    <section className="py-20 sm:py-24 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-8 sm:p-12 lg:p-16">
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 mb-6">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">{t('badge')}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 max-w-2xl mx-auto leading-tight">
              {t('title')}
            </h2>

            <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto">{t('description')}</p>

            <Link
              href="/market-overview"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-all duration-200 group"
            >
              <Zap className="w-5 h-5" />
              {t('button')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
