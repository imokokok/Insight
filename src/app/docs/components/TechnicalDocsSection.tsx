import Link from 'next/link';

import {
  ArrowRight,
  BookOpen,
  Bot,
  Code,
  Database,
  ExternalLink,
  Layers,
  Server,
} from 'lucide-react';

interface DocCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  tags: string[];
  accent: 'emerald' | 'blue' | 'violet' | 'amber';
  external?: boolean;
  anchor?: boolean;
}

const docs: DocCard[] = [
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Methodology',
    description:
      'Data collection, validation rules, and consensus algorithms that power Insight price intelligence.',
    href: '#methodology',
    tags: ['Data Quality', 'Validation', 'Consensus'],
    accent: 'emerald',
    anchor: true,
  },
  {
    icon: <Server className="w-6 h-6" />,
    title: 'API Reference',
    description:
      'Interactive API explorer with OpenAPI 3.1. Try endpoints live, generate code snippets, and import into Postman.',
    href: '/docs/api',
    tags: ['REST API', 'OpenAPI', 'Try It Out'],
    accent: 'blue',
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Architecture',
    description:
      'Next.js App Router with Supabase, React Query, Zustand, and 11 oracle client implementations.',
    href: '#architecture',
    tags: ['Next.js', 'Supabase', 'TypeScript'],
    accent: 'violet',
    anchor: true,
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: 'Data Sources',
    description:
      '11 oracle providers including Chainlink, Pyth, API3, RedStone, DIA, WINkLink, Supra, TWAP, Reflector, Flare, and Switchboard.',
    href: '#data-sources',
    tags: ['11 Oracles', '40+ Chains', 'On-chain Data'],
    accent: 'amber',
    anchor: true,
  },
  {
    icon: <Bot className="w-6 h-6" />,
    title: 'AI / MCP Server',
    description:
      'Connect Claude, Cursor, and other MCP clients to oracle prices, risk summaries, pre-trade safety checks, liquidation stress tests, and more.',
    href: '/ai',
    tags: ['AI Agents', '32 Tools', 'MCP', 'Pre-Trade Safety'],
    accent: 'violet',
  },
];

const accentStyles = {
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'group-hover:border-emerald-200',
    tag: 'bg-emerald-50 text-emerald-700',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'group-hover:border-blue-200',
    tag: 'bg-blue-50 text-blue-700',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'group-hover:border-violet-200',
    tag: 'bg-violet-50 text-violet-700',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'group-hover:border-amber-200',
    tag: 'bg-amber-50 text-amber-700',
  },
};

export default function TechnicalDocsSection() {
  return (
    <section id="technical" className="py-16 scroll-mt-20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Code className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Technical Documentation
            </h2>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Deep dive into implementation details, data sources, and architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {docs.map((doc, index) => {
            const accent = accentStyles[doc.accent];
            const isAnchor = doc.anchor === true;
            const isExternal = doc.external === true;

            const cardContent = (
              <>
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 ${accent.bg} rounded-xl flex items-center justify-center ${accent.text} flex-shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    {doc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {doc.title}
                      </h3>
                      {isExternal && (
                        <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{doc.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {doc.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md ${accent.tag}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                      {isAnchor ? 'Jump to section' : 'Read More'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </>
            );

            const className = `group block bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-all ${accent.border}`;

            if (isAnchor) {
              return (
                <a key={index} href={doc.href} className={className}>
                  {cardContent}
                </a>
              );
            }

            if (isExternal) {
              return (
                <a
                  key={index}
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <Link key={index} href={doc.href} className={className}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
