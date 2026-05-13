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

  const codeExample = `// Query BTC aggregated price (API Key required)
const response = await fetch(
  '/api/v1/price/BTC%2FUSD',
  {
    headers: {
      'x-api-key': 'ik_your_api_key'
    }
  }
);
const data = await response.json();

console.log(data.data.aggregatedPrice); // 81345.37
console.log(data.data.providerCount);   // 10`;

  const batchCodeExample = `// Query price from a specific oracle
const response = await fetch(
  '/api/v1/oracles/chainlink?symbol=BTC',
  {
    headers: {
      'x-api-key': 'ik_your_api_key'
    }
  }
);
const data = await response.json();

// Consensus price with specific method
const consensus = await fetch(
  '/api/v1/consensus/BTC%2FUSD?method=median',
  {
    headers: {
      'x-api-key': 'ik_your_api_key'
    }
  }
);

// Historical data requires provider parameter
const history = await fetch(
  '/api/v1/price/BTC%2FUSD/history?provider=chainlink&period=24',
  {
    headers: {
      'x-api-key': 'ik_your_api_key'
    }
  }
);`;

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
      question: 'How do I authenticate API requests?',
      answer:
        'All data endpoints require an API key. Pass it via the x-api-key header (x-api-key: ik_xxx) or the Authorization header (Authorization: Bearer ik_xxx). Create API keys at /api/v1/api-keys after signing in.',
    },
    {
      question: 'What are the API rate limits?',
      answer:
        'Free plan: 60 requests/minute. Pro plan: 600 requests/minute. Enterprise plan: 6,000 requests/minute. Rate limits are per API key.',
    },
    {
      question: 'How should I format the symbol in the URL?',
      answer:
        'Symbols containing "/" must be URL-encoded. For example, BTC/USD should be sent as BTC%2FUSD in the URL path. Example: /api/v1/price/BTC%2FUSD.',
    },
    {
      question: 'What consensus algorithms are available?',
      answer:
        'The /api/v1/consensus endpoint supports 4 methods: median, trimmed_mean, weighted_median, and iqr_filtered. If not specified, the best method is auto-selected based on data characteristics.',
    },
    {
      question: 'Why does the history endpoint require a provider?',
      answer:
        'Historical data is provider-specific and cannot be aggregated across oracles. You must specify which oracle provider to query, e.g., ?provider=chainlink.',
    },
    {
      question: 'How do I get an API key?',
      answer:
        'After registering and signing in, you can generate API keys via the /api/v1/api-keys endpoint. Each user can have up to 5 active keys. The full key is only shown once at creation.',
    },
    {
      question: 'What oracle providers are supported?',
      answer:
        'We support 10 oracle providers: chainlink, pyth, api3, redstone, dia, winklink, supra, twap, reflector, and flare. Each provider may support different blockchains and trading pairs.',
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
          <div className="text-gray-500 mb-2">{'// Aggregated price query'}</div>
          <pre className="text-gray-300">
            <code>{codeExample}</code>
          </pre>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="text-gray-500 mb-2">
            {'// Single oracle, consensus & historical query'}
          </div>
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
