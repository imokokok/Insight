'use client';

import Link from 'next/link';

import {
  Layers,
  Search,
  GitCompare,
  Link2,
  Bell,
  ArrowRight,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function FeaturesGuideSection() {
  const t = useTranslations();

  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: t('docs.features.priceQuery.title'),
      description: t('docs.features.priceQuery.description'),
      href: '/price-query',
      highlights: [
        t('docs.features.priceQuery.highlight1'),
        t('docs.features.priceQuery.highlight2'),
        t('docs.features.priceQuery.highlight3'),
      ],
    },
    {
      icon: <GitCompare className="w-6 h-6" />,
      title: t('docs.features.crossOracle.title'),
      description: t('docs.features.crossOracle.description'),
      href: '/cross-oracle',
      highlights: [
        t('docs.features.crossOracle.highlight1'),
        t('docs.features.crossOracle.highlight2'),
        t('docs.features.crossOracle.highlight3'),
      ],
    },
    {
      icon: <Link2 className="w-6 h-6" />,
      title: t('docs.features.crossChain.title'),
      description: t('docs.features.crossChain.description'),
      href: '/cross-chain',
      highlights: [
        t('docs.features.crossChain.highlight1'),
        t('docs.features.crossChain.highlight2'),
        t('docs.features.crossChain.highlight3'),
      ],
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: t('docs.features.alerts.title'),
      description: t('docs.features.alerts.description'),
      href: '/alerts',
      highlights: [
        t('docs.features.alerts.highlight1'),
        t('docs.features.alerts.highlight2'),
        t('docs.features.alerts.highlight3'),
      ],
    },
  ];

  return (
    <section id="features" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('docs.features.title')}
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          {t('docs.features.description')}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-2 mb-4">
              {feature.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <BarChart3 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            <Link
              href={feature.href}
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              {t('docs.features.learnMore')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('docs.features.info.realtime.title')}
            </p>
            <p className="text-xs text-gray-600">
              {t('docs.features.info.realtime.description')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('docs.features.info.accurate.title')}
            </p>
            <p className="text-xs text-gray-600">
              {t('docs.features.info.accurate.description')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('docs.features.info.comprehensive.title')}
            </p>
            <p className="text-xs text-gray-600">
              {t('docs.features.info.comprehensive.description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
