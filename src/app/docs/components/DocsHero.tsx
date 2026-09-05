'use client';

import Link from 'next/link';

import {
  ArrowRight,
  Bot,
  Database,
  FileCode,
  Layers,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';

import { EditorialWorkspaceHeader } from '@/components/editorial';

interface QuickLink {
  href: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
}

const quickLinks: QuickLink[] = [
  { href: '#quickstart', label: 'Quick Start', icon: Rocket },
  { href: '#features', label: 'Features', icon: Sparkles },
  { href: '#technical', label: 'Technical Docs', icon: FileCode },
  { href: '#methodology', label: 'Methodology', icon: Scale },
  { href: '#architecture', label: 'Architecture', icon: Layers },
  { href: '#data-sources', label: 'Data Sources', icon: Database },
  { href: '/docs/api', label: 'API Reference', icon: Terminal, external: true },
  { href: '/docs/sdk', label: 'Guard SDK', icon: ShieldCheck, external: true },
  { href: '/ai', label: 'AI / MCP Server', icon: Bot, external: true },
];

function QuickLinkButton({ link, index }: { link: QuickLink; index: number }) {
  const Icon = link.icon;
  const className =
    'group grid min-h-28 grid-cols-[auto_1fr_auto] items-start gap-3 border-b border-r border-slate-900/10 bg-white/35 p-5 transition-colors hover:bg-blue-50/45 focus-visible:z-10';
  const content = (
    <>
      <span className="font-mono text-[10px] text-blue-700">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span>
        <Icon className="mb-5 h-4 w-4 text-slate-500 transition-colors group-hover:text-blue-700" />
        <span className="block text-sm font-semibold text-slate-800">{link.label}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700" />
    </>
  );

  if (link.external) {
    return (
      <Link href={link.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href={link.href} className={className}>
      {content}
    </a>
  );
}

export default function DocsHero() {
  return (
    <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
      <EditorialWorkspaceHeader
        index="11"
        stage="Learn"
        eyebrow="Insight documentation · Product logic, risk methodology, architecture, data sources, and integration references"
        title="Understand the evidence before you depend on it."
        description="Follow an oracle price from collection through consensus, health analysis, risk interpretation, and signed verification. Then connect the same evidence to your application or agent."
        evidence={['Product workflow', 'Risk methodology', 'Developer reference']}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
            >
              Start with the workflow
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/docs/sdk"
              className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              Guard SDK
            </Link>
          </div>
        }
      />

      <div className="py-10 sm:py-12">
        <div className="mb-5 grid gap-3 border-b border-slate-900/15 pb-4 sm:grid-cols-[0.68fr_1.32fr]">
          <p className="editorial-index">Index — Documentation map</p>
          <p className="max-w-xl text-sm leading-relaxed text-slate-600">
            Start with a task, inspect the method behind it, then move into the implementation
            reference when you are ready to integrate.
          </p>
        </div>
        <nav
          aria-label="Documentation sections"
          className="grid grid-cols-1 border-y border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4"
        >
          {quickLinks.map((link, index) => (
            <QuickLinkButton key={link.href} link={link} index={index} />
          ))}
        </nav>
      </div>
    </section>
  );
}
