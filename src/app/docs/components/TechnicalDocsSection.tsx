'use client';

import Link from 'next/link';

import { Code, BookOpen, Server, Database, ArrowRight, Layers, Zap } from 'lucide-react';

export default function TechnicalDocsSection() {
  const docs = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Methodology',
      description: 'Learn about our data collection and validation methodology',
      href: '#methodology',
      tags: ['Data Quality', 'Validation'],
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: 'API Documentation',
      description: 'Integrate with our API for real-time price data',
      href: '#api',
      tags: ['REST API', 'WebSocket'],
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: 'Architecture',
      description: 'Understand our system architecture and design',
      href: '#architecture',
      tags: ['Microservices', 'Scalability'],
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Data Sources',
      description: 'Explore our oracle data sources and integrations',
      href: '#datasources',
      tags: ['Oracles', 'Chainlink'],
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
                  Read More
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
            <h3 className="text-white font-semibold">API Preview</h3>
          </div>
          <Link href="#api" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View All Endpoints
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">GET</span>
            <span className="text-blue-400">/api/v1/prices/:symbol</span>
          </div>
          <div className="text-gray-400 mb-2">Get current price for a symbol</div>
          <pre className="text-gray-300">
            {`{
  "symbol": "ETH/USD",
  "price": 3456.78,
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "chainlink",
  "confidence": 0.98,
  "change24h": 2.45
}`}
          </pre>
        </div>
      </div>
    </section>
  );
}
