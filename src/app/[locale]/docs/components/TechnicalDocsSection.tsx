'use client';

import Link from 'next/link';

import { Code, BookOpen, Server, Database, ArrowRight, FileText, Layers, Zap } from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function TechnicalDocsSection() {
  const t = useTranslations();

  const docs = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: t('docs.technical.methodology.title'),
      description: t('docs.technical.methodology.description'),
      href: '/methodology',
      tags: [t('docs.technical.methodology.tag1'), t('docs.technical.methodology.tag2')],
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: t('docs.technical.api.title'),
      description: t('docs.technical.api.description'),
      href: '/api',
      tags: [t('docs.technical.api.tag1'), t('docs.technical.api.tag2')],
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: t('docs.technical.architecture.title'),
      description: t('docs.technical.architecture.description'),
      href: '#',
      tags: [t('docs.technical.architecture.tag1'), t('docs.technical.architecture.tag2')],
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: t('docs.technical.dataSources.title'),
      description: t('docs.technical.dataSources.description'),
      href: '#',
      tags: [t('docs.technical.dataSources.tag1'), t('docs.technical.dataSources.tag2')],
    },
  ];

  return (
    <section id="technical" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Code className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('docs.technical.title')}</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">{t('docs.technical.description')}</p>
      </div>

      {/* Technical Docs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {docs.map((doc, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0">
                {doc.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{doc.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{doc.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {doc.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={doc.href}
                  className="inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                >
                  {t('docs.technical.readMore')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API Preview */}
      <div className="mt-8 bg-gray-900 rounded-xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold">{t('docs.technical.apiPreview.title')}</h3>
          </div>
          <Link href="/api" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            {t('docs.technical.apiPreview.viewAll')}
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">{t('docs.technical.apiPreview.method')}</span>
            <span className="text-blue-400">{t('docs.technical.apiPreview.endpoint')}</span>
          </div>
          <div className="text-gray-400 mb-2">{t('docs.technical.apiPreview.description')}</div>
          <pre className="text-gray-300">
            {`{
  "symbol": "ETH/USD",
  "price": 3456.78,
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "chainlink",
  "confidence": 0.98
}`}
          </pre>
        </div>
      </div>
    </section>
  );
}
