import Link from 'next/link';

import { ArrowRight, Bot, BookOpen, Braces, Code2, ShieldCheck } from 'lucide-react';

import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Build with Insight — REST API, AI / MCP & Guard SDK',
  description:
    'Choose an Insight integration path: REST API for your stack, AI / MCP for agent tools, or Guard SDK for evidence-aware workflows.',
  keywords: ['Insight API', 'MCP oracle tools', 'DeFi agent SDK', 'oracle risk integration'],
  openGraph: {
    title: 'Build with Insight — REST API, AI / MCP & Guard SDK',
    description: 'Bring inspectable oracle evidence into the workflow you control.',
    type: 'website',
  },
};

const paths = [
  {
    href: '/api',
    icon: Braces,
    title: 'REST API',
    body: 'Query prices, evidence, and risk assessments from the service or application you already operate.',
    detail: 'For backend services and custom interfaces',
  },
  {
    href: '/ai',
    icon: Bot,
    title: 'AI / MCP',
    body: 'Expose structured oracle tools to compatible agent clients while preserving your own policy and execution controls.',
    detail: 'For agent runtimes and MCP clients',
  },
  {
    href: '/sdk',
    icon: ShieldCheck,
    title: 'Guard SDK',
    body: 'Compose pre-trade assessments, Oracle Watch, and optional evidence retention into a TypeScript workflow.',
    detail: 'For evidence-aware application workflows',
  },
] as const;

export default function BuildPage() {
  return (
    <div className="editorial-workspace evidence-workbench developer-workbench min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="03"
          stage="Build"
          eyebrow="Integration paths · Evidence layer for systems you control"
          title="Bring inspectable evidence into your own workflow."
          description="Insight can be used through REST, AI / MCP, or Guard SDK. Each route provides evidence and assessments; your system retains ownership of policy, authorization, signing, and transaction submission."
          evidence={['REST API', 'AI / MCP', 'Guard SDK']}
          action={
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
            >
              <BookOpen className="h-4 w-4" />
              Read developer docs
            </Link>
          }
        />
        <EvidenceProcessRail
          label="Integration boundary"
          items={[
            { label: 'Call Insight', detail: 'Evidence · assessment · monitoring' },
            { label: 'Apply policy', detail: 'Your rules · your approvals' },
            { label: 'Execute', detail: 'Your signer · your transaction' },
            { label: 'Verify', detail: 'Inspect returned evidence' },
          ]}
          activeIndex={1}
        />
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — Integration paths</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Start at the boundary your system already has.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
                The same evidence model is available in three forms. Pick the surface that suits
                your runtime rather than changing your architecture to fit a tool.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 border-y border-slate-900/15 md:grid-cols-3">
            {paths.map((path, index) => {
              const Icon = path.icon;
              return (
                <Link
                  key={path.href}
                  href={path.href}
                  className="group flex min-h-80 flex-col border-b border-r border-slate-900/10 bg-white/35 p-6 transition-colors hover:bg-blue-50/55 last:border-b-0 md:last:border-b-0"
                >
                  <div className="mb-10 flex items-start justify-between">
                    <span className="font-mono text-xs text-blue-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50 text-blue-700 transition-colors group-hover:bg-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">{path.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{path.body}</p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    {path.detail}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-semibold text-blue-700">
                    View path <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/15 bg-blue-50/55 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <Code2 className="mx-auto mb-5 h-8 w-8 text-blue-700" />
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Build on evidence; keep control of the decision.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Insight provides the observation and assessment layer. When a workflow also needs
            authorization and execution accountability, PriorSeal can be paired as a separate,
            complementary product.
          </p>
          <Link
            href="/decision-integrity"
            className="mt-8 inline-flex items-center gap-2 border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-950"
          >
            See the decision integrity workflow
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
