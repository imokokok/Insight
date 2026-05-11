import Link from 'next/link';

import { Code, BookOpen, Server, Database, ArrowRight, Layers, Zap, Key } from 'lucide-react';

export default function TechnicalDocsSection() {
  const docs = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Methodology',
      description:
        'Learn about our data collection, validation methodology, and consensus algorithms',
      href: '#technical',
      tags: ['Data Quality', 'Validation', 'Consensus'],
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: 'API Documentation',
      description:
        'Integrate with our V1 REST API for real-time and historical price data with API Key authentication',
      href: '#technical',
      tags: ['REST API', 'API Key', 'OpenAPI 3.1'],
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: 'Architecture',
      description:
        'Next.js App Router with Supabase, React Query, Zustand, and 10 oracle client implementations',
      href: '#technical',
      tags: ['Next.js', 'Supabase', 'TypeScript'],
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Data Sources',
      description:
        '10 oracle providers including Chainlink, Pyth, API3, RedStone, DIA, WINkLink, Supra, TWAP, Reflector, and Flare',
      href: '#technical',
      tags: ['10 Oracles', '54+ Chains', 'On-chain Data'],
    },
  ];

  return (
    <section id="technical" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Code className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Technical Documentation</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Deep dive into our technical implementation and architecture
        </p>
      </div>

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
                  Read More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-900 rounded-xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold">API Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <Key className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">Requires API Key</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">GET</span>
            <span className="text-blue-400">/api/v1/price/BTC%2FUSD</span>
          </div>
          <div className="text-gray-400 mb-2">Get aggregated price across all oracles</div>
          <div className="text-gray-500 mb-2">
            {'# Symbol with "/" must be URL-encoded: BTC/USD → BTC%2FUSD'}
          </div>
          <pre className="text-gray-300">
            {`{
  "success": true,
  "data": {
    "symbol": "BTC/USD",
    "aggregatedPrice": 81345.37,
    "priceRange": {
      "min": 80749.27, "max": 81424.37,
      "spread": 675.10, "spreadPercent": 0.83
    },
    "providerCount": 10,
    "providers": [...]
  }
}`}
          </pre>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">GET</span>
            <span className="text-blue-400">/api/v1/consensus/BTC%2FUSD?method=median</span>
          </div>
          <div className="text-gray-400 mb-2">
            Get consensus price with configurable aggregation method
          </div>
          <pre className="text-gray-300">
            {`{
  "success": true,
  "data": {
    "symbol": "BTC/USD",
    "consensus": {
      "price": 81340.50,
      "method": "median",
      "confidence": 0.95,
      "agreement": 0.97,
      "participantCount": 10
    }
  }
}`}
          </pre>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">GET</span>
            <span className="text-blue-400">/api/v1/oracles/chainlink?symbol=BTC</span>
          </div>
          <div className="text-gray-400 mb-2">
            Query price from a specific oracle (symbol is required)
          </div>
          <pre className="text-gray-300">
            {`{
  "success": true,
  "data": {
    "provider": "chainlink",
    "price": 81345.37,
    "confidence": 0.97,
    "source": "BTC / USD"
  }
}`}
          </pre>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">GET</span>
            <span className="text-blue-400">
              /api/v1/price/BTC%2FUSD/history?provider=chainlink
            </span>
          </div>
          <div className="text-gray-400 mb-2">Historical data requires the provider parameter</div>
          <pre className="text-gray-300">
            {`{
  "success": true,
  "data": [...],
  "meta": { "provider": "chainlink", "symbol": "BTC/USD" }
}`}
          </pre>
        </div>
      </div>
    </section>
  );
}
