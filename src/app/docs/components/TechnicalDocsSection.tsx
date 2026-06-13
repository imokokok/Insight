import Link from 'next/link';

import { Code, BookOpen, Server, Database, ArrowRight, Layers } from 'lucide-react';

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
        'Learn about our internal API architecture and data flow between oracle providers',
      href: '#technical',
      tags: ['REST API', 'Architecture', 'Data Flow'],
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
    </section>
  );
}
