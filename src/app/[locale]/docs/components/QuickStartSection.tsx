'use client';

import Link from 'next/link';

import { Rocket, UserPlus, Search, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function QuickStartSection() {
  const t = useTranslations();

  const steps = [
    {
      icon: <UserPlus className="w-6 h-6" />,
      title: t('docs.quickstart.steps.register.title'),
      description: t('docs.quickstart.steps.register.description'),
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: t('docs.quickstart.steps.search.title'),
      description: t('docs.quickstart.steps.search.description'),
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: t('docs.quickstart.steps.analyze.title'),
      description: t('docs.quickstart.steps.analyze.description'),
    },
  ];

  return (
    <section id="quickstart" className="py-16 scroll-mt-20">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Rocket className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('docs.quickstart.title')}</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">{t('docs.quickstart.description')}</p>
      </div>

      {/* Platform Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('docs.quickstart.overview.title')}
        </h3>
        <p className="text-gray-600 mb-4">{t('docs.quickstart.overview.description')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{t('docs.quickstart.overview.point1')}</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{t('docs.quickstart.overview.point2')}</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{t('docs.quickstart.overview.point3')}</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('docs.quickstart.steps.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                {step.icon}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <h4 className="font-semibold text-gray-900">{step.title}</h4>
              </div>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/price-query"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('docs.quickstart.cta.primary')}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/market-overview"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t('docs.quickstart.cta.secondary')}
        </Link>
      </div>
    </section>
  );
}
