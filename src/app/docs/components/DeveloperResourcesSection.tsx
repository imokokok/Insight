'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  ArrowRight,
  Bot,
  ChevronDown,
  Code2,
  ExternalLink,
  FileCode,
  HelpCircle,
  Terminal,
  Wrench,
} from 'lucide-react';

interface Resource {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  accent: 'amber' | 'blue' | 'emerald';
}

const resources: Resource[] = [
  {
    icon: <Terminal className="w-6 h-6" />,
    title: 'API Reference',
    description: 'Programmatic access to oracle prices, history, and batch queries with API keys.',
    href: '/docs/api',
    accent: 'blue',
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: 'Guard SDK',
    description:
      'Add two-sided pre-trade gates, Oracle Watch halt handling, and verified execution receipts to a DeFi agent.',
    href: '/docs/sdk',
    accent: 'blue',
  },
  {
    icon: <FileCode className="w-6 h-6" />,
    title: 'Receipt Verifier',
    description:
      'Verify pre-trade and execution receipts locally — published on npm as verify-insight-receipt (v0.2.0). No API key, database access, or dependency on Insight being online.',
    href: '#verifiable-receipts',
    accent: 'emerald',
  },
  {
    icon: <Bot className="w-6 h-6" />,
    title: 'AI / MCP Server',
    description:
      'Connect AI agents like Claude and Cursor via the Model Context Protocol — with pre-trade oracle safety checks and the always-on Oracle Watch signal.',
    href: '/ai',
    accent: 'blue',
  },
  {
    icon: <FileCode className="w-6 h-6" />,
    title: 'Code Examples',
    description: 'View data fetching and analysis examples in JavaScript and TypeScript.',
    href: '/docs/api#examples',
    accent: 'emerald',
  },
  {
    icon: <HelpCircle className="w-6 h-6" />,
    title: 'FAQ',
    description: 'Common developer questions about symbols, providers, and historical data.',
    href: '#faq',
    accent: 'amber',
  },
];

const faqs = [
  {
    question: 'What oracle providers are supported?',
    answer:
      'We support 10 oracle providers: chainlink, api3, redstone, dia, winklink, supra, twap, reflector, flare, and switchboard. Each provider supports different blockchains and trading pairs.',
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
  {
    question: 'How can I verify an Insight receipt without calling the API?',
    answer:
      'The verifier is published on npm as verify-insight-receipt (v0.2.0): run npm install verify-insight-receipt, then call verifyReceipt(), verifyExecutionReceipt(), or verifyExecutionPair(). It recomputes the EIP-712 hashes and recovers signers locally without an API key, database access, or network request. Pass the published oracle-keys.json document separately when you also want key-window status. You can also install directly from the repository verifier/ directory.',
  },
];

const accentStyles = {
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'group-hover:border-amber-200',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'group-hover:border-blue-200',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'group-hover:border-emerald-200',
  },
};

function FaqItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-4' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-slate-600 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function DeveloperResourcesSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="developer" className="py-16 scroll-mt-20 border-t border-slate-100">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="border border-amber-200 bg-amber-100 p-2">
            <Wrench className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Developer Resources</h2>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Integration guides, code examples, and answers to common questions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {resources.map((resource, index) => {
          const accent = accentStyles[resource.accent];
          const LinkWrapper = resource.external ? 'a' : Link;
          const wrapperProps = resource.external
            ? { href: resource.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: resource.href };

          return (
            <LinkWrapper
              key={index}
              {...wrapperProps}
              className={`group block border-b border-slate-900/10 bg-white/55 p-6 transition-colors last:border-b-0 hover:bg-blue-50/30 ${accent.border}`}
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center border border-current/15 ${accent.bg} ${accent.text} transition-colors`}
              >
                {resource.icon}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {resource.title}
                </h3>
                {resource.external && (
                  <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">{resource.description}</p>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                Learn More
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </LinkWrapper>
          );
        })}
      </div>

      <div id="faq" className="border-y border-slate-900/15 bg-white/55 p-6">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Frequently Asked Questions</h3>
        </div>
        <div>
          {faqs.map((faq, index) => (
            <FaqItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openFaq === index}
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
