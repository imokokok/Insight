'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  Wrench,
  Code2,
  FileCode,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export default function DeveloperResourcesSection() {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const codeExample = `// ${t('docs.developer.codeExample.comment')}
const response = await fetch(
  '${t('docs.technical.apiPreview.endpoint')}?symbol=ETH/USD'
);
const data = await response.json();

${t('docs.developer.codeExample.consoleLog')} // 3456.78`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resources = [
    {
      icon: <Code2 className="w-6 h-6" />,
      title: t('docs.developer.integration.title'),
      description: t('docs.developer.integration.description'),
      href: '#',
      external: false,
    },
    {
      icon: <FileCode className="w-6 h-6" />,
      title: t('docs.developer.examples.title'),
      description: t('docs.developer.examples.description'),
      href: '#',
      external: false,
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: t('docs.developer.faq.title'),
      description: t('docs.developer.faq.description'),
      href: '#',
      external: false,
    },
  ];

  const faqs = [
    {
      question: t('docs.developer.faq.q1.question'),
      answer: t('docs.developer.faq.q1.answer'),
    },
    {
      question: t('docs.developer.faq.q2.question'),
      answer: t('docs.developer.faq.q2.answer'),
    },
    {
      question: t('docs.developer.faq.q3.question'),
      answer: t('docs.developer.faq.q3.answer'),
    },
  ];

  return (
    <section id="developer" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('docs.developer.title')}</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">{t('docs.developer.description')}</p>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
              {resource.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
            <Link
              href={resource.href}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              {t('docs.developer.learnMore')}
              {resource.external ? (
                <ExternalLink className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Link>
          </div>
        ))}
      </div>

      {/* Code Example */}
      <div className="bg-gray-900 rounded-xl p-6 mb-10 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">{t('docs.developer.codeExample.title')}</h3>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">{t('docs.developer.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{t('docs.developer.copy')}</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-gray-300">
            <code>{codeExample}</code>
          </pre>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t('docs.developer.faq.title')}
        </h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
              <p className="text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
