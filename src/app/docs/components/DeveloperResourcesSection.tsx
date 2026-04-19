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

export default function DeveloperResourcesSection() {
  const [copied, setCopied] = useState(false);

  const codeExample = `// Query ETH price from Chainlink
const response = await fetch(
  '/api/oracles?symbol=ETH&provider=chainlink'
);
const data = await response.json();

console.log(data.price); // 3456.78
console.log(data.provider); // "chainlink"
console.log(data.timestamp); // 1705315800000`;

  const batchCodeExample = `// Batch query multiple prices
const response = await fetch('/api/oracles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requests: [
      { symbol: 'BTC', provider: 'chainlink' },
      { symbol: 'ETH', provider: 'pyth' }
    ]
  })
});
const data = await response.json();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resources = [
    {
      icon: <Code2 className="w-6 h-6" />,
      title: 'Integration Guide',
      description: 'Learn how to integrate Insight API into your application',
      href: '#developer',
      external: false,
    },
    {
      icon: <FileCode className="w-6 h-6" />,
      title: 'Code Examples',
      description: 'View API call examples in JavaScript and TypeScript',
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
      question: 'What are the API rate limits?',
      answer:
        'Free users can make up to 100 requests per minute; professional users can make 1,000 requests per minute. Contact us for higher quotas.',
    },
    {
      question: 'What data formats are supported?',
      answer:
        'The API returns JSON-formatted data by default. Some endpoints support CSV format via Accept header.',
    },
    {
      question: 'How do I get an API key?',
      answer:
        'After registering an account, you can generate and manage your API keys on the settings page.',
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

      <div className="bg-gray-900 rounded-xl p-6 mb-10 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">Code Examples</h3>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
          <div className="text-gray-500 mb-2">{'// Single price query'}</div>
          <pre className="text-gray-300">
            <code>{codeExample}</code>
          </pre>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="text-gray-500 mb-2">{'// Batch query'}</div>
          <pre className="text-gray-300">
            <code>{batchCodeExample}</code>
          </pre>
        </div>
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
