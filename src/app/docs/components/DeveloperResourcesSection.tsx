'use client';

import Link from 'next/link';

import { Wrench, Code2, FileCode, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';

export default function DeveloperResourcesSection() {
  const resources = [
    {
      icon: <Code2 className="w-6 h-6" />,
      title: 'Integration Guide',
      description: 'Learn how to integrate Insight into your application',
      href: '#developer',
      external: false,
    },
    {
      icon: <FileCode className="w-6 h-6" />,
      title: 'Code Examples',
      description: 'View data fetching and analysis examples in JavaScript and TypeScript',
      href: '#developer',
      external: false,
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: 'FAQ',
      description: 'View common developer questions and solutions',
      href: '#faq',
      external: false,
    },
  ];

  const faqs = [
    {
      question: 'What oracle providers are supported?',
      answer:
        'We support 10 oracle providers: chainlink, pyth, api3, redstone, dia, winklink, supra, twap, reflector, and flare. Each provider may support different blockchains and trading pairs.',
    },
    {
      question: 'What consensus algorithms are available?',
      answer:
        'We support 4 consensus methods: median, trimmed_mean, weighted_median, and iqr_filtered. The best method is auto-selected based on data characteristics.',
    },
    {
      question: 'How should I format the symbol in queries?',
      answer:
        'Symbols containing "/" must be URL-encoded. For example, BTC/USD should be sent as BTC%2FUSD in the URL path.',
    },
    {
      question: 'Why does historical data require a provider?',
      answer:
        'Historical data is provider-specific and cannot be aggregated across oracles. You must specify which oracle provider to query, e.g., ?provider=chainlink.',
    },
  ];

  return (
    <section id="developer" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Developer Resources</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Integration guides and technical support for developers.
        </p>
      </div>

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
              Learn More
              {resource.external ? (
                <ExternalLink className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Link>
          </div>
        ))}
      </div>

      <div id="faq" className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">FAQ</h3>
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
