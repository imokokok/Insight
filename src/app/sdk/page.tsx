import Link from 'next/link';

import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  CirclePause,
  Code2,
  FileSignature,
  ShieldCheck,
} from 'lucide-react';

import { EditorialWorkspaceHeader } from '@/components/editorial';
import { CodeBlock } from '@/components/shared/CodeBlock';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight Guard SDK — Safe DeFi Agent Execution',
  description:
    'Run two-sided pre-trade gates, pause on Oracle Watch halts, and issue verified execution receipts through one TypeScript SDK for DeFi agents.',
  keywords: [
    'DeFi agent SDK',
    'pre-trade risk SDK',
    'oracle watch',
    'execution receipt',
    'AI agent safety',
  ],
  openGraph: {
    title: 'Insight Guard SDK — Safe DeFi Agent Execution',
    description:
      'Pre-trade gates, Oracle Watch halts, and verified execution receipts for DeFi agents.',
    type: 'website',
  },
};

const workflow = [
  {
    index: '01',
    title: 'Gate before submitting',
    body: 'Run source and destination Pre-Trade checks. DANGER and BLOCK stop the workflow before your transaction function is called.',
    icon: ShieldCheck,
  },
  {
    index: '02',
    title: 'Watch while running',
    body: 'Poll Oracle Watch at a bounded cadence and bind its halt signal to the strategy pause operation.',
    icon: CirclePause,
  },
  {
    index: '03',
    title: 'Prove what settled',
    body: 'Pair the two signed pre-trade proofs with the transaction hash to issue a VERIFIED execution receipt.',
    icon: FileSignature,
  },
];

const installCode = `npm install oracle-insight-guard`;

const workflowCode = `import { InsightGuard } from 'oracle-insight-guard';

const guard = new InsightGuard({ apiKey: process.env.INSIGHT_API_KEY! });

const result = await guard.executeSwap({
  source: {
    asset: 'ETH', destinationAsset: 'USDC', chainId: 1,
    action: 'swap', tradeAmountUsd: 100_000,
  },
  destination: {
    asset: 'USDC', destinationAsset: 'ETH', chainId: 1,
    action: 'swap', tradeAmountUsd: 100_000,
  },
  watchTarget: { symbol: 'ETH', chain: 'ethereum' },
  receipt: { settlementChainId: 1, maxSlippageBps: 50 },
  submitTransaction: async () => ({ txHash: await submitSwap() }),
});

if (result.status === 'blocked') return; // no transaction was submitted
console.log(result.receipt.executionStatus);`;

const watchCode = `const watch = guard.watch(
  { symbol: 'ETH', chain: 'ethereum' },
  {
    onHalt: async (signal) => strategy.pause(signal.reason),
    onError: (error) => logger.error(error),
  }
);`;

export default function SdkPage() {
  return (
    <div className="editorial-workspace min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="10"
          stage="Guard"
          eyebrow="Insight Guard SDK · The execution workflow for DeFi agents"
          title="Make risk signals change the transaction."
          description="One server-side TypeScript workflow for two-sided pre-trade gates, Oracle Watch halts, and signed execution receipts. It orchestrates Insight’s API; the risk engine, attestation keys, and credit meter remain on Insight."
          evidence={['Gate before submit', 'Halt between trades', 'Verified execution proof']}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="#quickstart"
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                View quickstart
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/docs/sdk"
                className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700"
              >
                <BookOpen className="h-4 w-4" />
                SDK documentation
              </Link>
            </div>
          }
        />
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — One guarded workflow</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                The API remains composable. The SDK makes the safe path default.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Use individual REST or MCP calls when you need them. Use Guard when an agent should
                check, decide, execute, and retain proof as one explicit workflow.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 border-y border-slate-900/15 md:grid-cols-3">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.index}
                  className="border-b border-r border-slate-900/10 bg-white/35 p-6 last:border-b-0 md:last:border-b-0"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <span className="font-mono text-xs text-blue-700">{item.index}</span>
                    <div className="flex h-10 w-10 items-center justify-center border border-blue-200 bg-blue-50">
                      <Icon className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="quickstart" className="border-y border-slate-900/10 bg-white/45 py-14 sm:py-20">
        <div className="editorial-frame mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
          <div>
            <p className="editorial-index mb-5">02 — Quickstart</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Integrate the workflow, not three disconnected calls.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Install the package in a trusted agent runtime. Never expose an Insight API key in a
              browser bundle.
            </p>
            <div className="mt-7 space-y-4">
              {[
                'Use v3 pre-trade attestations by default.',
                'Pass both sides of a swap to receive a VERIFIED receipt.',
                'Bind Oracle Watch onHalt to your strategy pause operation.',
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <CodeBlock code={installCode} label="Install" />
            <CodeBlock code={workflowCode} label="Guarded swap" />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
          <div>
            <p className="editorial-index mb-5">03 — Between trades</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Treat a halt signal as an operational event.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Guard defaults to a 15-minute Watch cadence. A halt is remembered for that target;
              pass the same target to <code>executeSwap</code> to prevent a new submission while the
              halt is active.
            </p>
          </div>
          <CodeBlock code={watchCode} label="Oracle Watch" />
        </div>
      </section>

      <section className="border-y border-slate-900/15 bg-blue-50/55 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <BadgeCheck className="mx-auto mb-5 h-8 w-8 text-blue-700" />
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Keep your existing API access. Add the guarded path on top.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Guard uses the same API key and the existing C3/C4 credit meter: pre-trade and Watch
            calls are C3; execution receipt issuance is C4. A successful two-sided guarded swap uses
            20 credits at current prices (two C3 gates plus one C4 receipt), excluding Watch
            polling. There is no second billing model.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/api#keys"
              className="inline-flex items-center gap-2 border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-950"
            >
              <Code2 className="h-4 w-4" />
              Create an API key
            </Link>
            <Link
              href="/docs/sdk"
              className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
            >
              Read integration docs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
