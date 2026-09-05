import Link from 'next/link';

import { ArrowRight, BookOpen, CircleAlert, ShieldCheck } from 'lucide-react';

import { EditorialWorkspaceHeader } from '@/components/editorial';
import { CodeBlock } from '@/components/shared/CodeBlock';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guard SDK Documentation — Insight',
  description:
    'Integrate Insight Guard: two-sided pre-trade gates, Oracle Watch halt handling, and verified execution receipts for DeFi agents.',
};

const installCode = `npm install oracle-insight-guard`;

const gateCode = `const guard = new InsightGuard({
  apiKey: process.env.INSIGHT_API_KEY!,
});

const decision = await guard.check({
  asset: 'ETH',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 100_000,
  destinationAsset: 'USDC',
});

if (!decision.allowed) {
  // Do not create or submit a transaction.
  return decision.result;
}`;

const receiptCode = `const result = await guard.executeSwap({
  source: { asset: 'ETH', destinationAsset: 'USDC', chainId: 1, action: 'swap', tradeAmountUsd: 100_000 },
  destination: { asset: 'USDC', destinationAsset: 'ETH', chainId: 1, action: 'swap', tradeAmountUsd: 100_000 },
  receipt: { settlementChainId: 1, maxSlippageBps: 50 },
  submitTransaction: async () => ({ txHash: await submitSwap() }),
});

if (result.status === 'executed') {
  // bindingMode is VERIFIED because both signed pre-trade proofs were supplied.
  console.log(result.receipt.attestation.uid);
}`;

export default function SdkDocsPage() {
  return (
    <div className="editorial-workspace min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="12"
          stage="Integrate"
          eyebrow="Guard SDK reference · Server-side workflow orchestration"
          title="Build the safe execution path into your agent."
          description="Guard is a TypeScript client over Insight’s existing API. It does not carry local risk rules or signing keys: API-side verdicts, attestations, audit records, and credits remain authoritative."
          evidence={['Typed workflow', 'Server-side key use', 'Verifiable receipts']}
          action={
            <Link
              href="/sdk"
              className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
            >
              <BookOpen className="h-4 w-4" />
              View SDK overview
            </Link>
          }
        />
      </section>

      <main className="editorial-frame mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-20">
        <section className="border-y border-slate-900/15 bg-white/45 p-6 sm:p-8">
          <p className="editorial-index mb-4">01 — Install</p>
          <h2 className="text-2xl font-bold text-slate-900">
            Use a trusted server or agent runtime.
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            The API key unlocks paid endpoints, so keep it in a server environment variable. Do not
            ship it to a browser or client wallet application.
          </p>
          <div className="mt-6 max-w-xl">
            <CodeBlock code={installCode} label="Install" />
          </div>
        </section>

        <section className="py-14">
          <p className="editorial-index mb-4">02 — Pre-trade gate</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Check before creating a transaction.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            <code>check()</code> returns an explicit decision. <code>assertSafe()</code> is
            available for executors that prefer an exception on <code>DANGER</code> or{' '}
            <code>BLOCK</code>. Guard defaults new checks to signed schema v3.
          </p>
          <div className="mt-7">
            <CodeBlock code={gateCode} label="Pre-trade gate" />
          </div>
        </section>

        <section className="border-y border-slate-900/15 bg-white/45 py-14">
          <div className="px-6 sm:px-8">
            <p className="editorial-index mb-4">03 — Verified receipt workflow</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Supply both sides of a swap before submitting it.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
              A destination-per-source fill price needs two independent pre-trade proofs. Guard
              validates that the pair is reciprocal before calling your transaction submitter, then
              sends both originals with the settled transaction hash to the receipt issuer.
            </p>
            <div className="mt-7">
              <CodeBlock code={receiptCode} label="executeSwap" />
            </div>
          </div>
        </section>

        <section className="py-14">
          <p className="editorial-index mb-4">04 — Oracle Watch</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Wire halt to a real pause action.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="border-b border-slate-900/10 bg-white/55 p-6">
              <ShieldCheck className="mb-4 h-6 w-6 text-emerald-600" />
              <h3 className="font-bold text-slate-900">Normal cadence</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                <code>watch()</code> defaults to 15 minutes. Faster polling needs an explicit opt-in
                because it consumes more C3 calls and usually yields no fresher data.
              </p>
            </div>
            <div className="border-b border-slate-900/10 bg-white/55 p-6">
              <CircleAlert className="mb-4 h-6 w-6 text-amber-600" />
              <h3 className="font-bold text-slate-900">Halt semantics</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Bind <code>onHalt</code> to pause your executor. Pass the same{' '}
                <code>watchTarget</code>
                to <code>executeSwap</code> to prevent a new submission while that halt is active.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-900/15 pt-10">
          <h2 className="text-2xl font-bold text-slate-900">Billing and verification boundary</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
            Guard uses the same API key and credit wallet as direct API calls. Pre-Trade and Oracle
            Watch are C3 calls; execution receipt issuance is C4. A successful two-sided
            <code>executeSwap()</code> uses two C3 calls and one C4 call (20 credits at current
            prices), before optional Watch polling. REST API, AI/MCP, and Guard are distinct
            integration surfaces that draw from the same wallet. A valid signed receipt proves the
            issuer and integrity of its bytes; it is not a guarantee that the market price or trade
            was correct.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/api"
              className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700"
            >
              API access and keys
            </Link>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-950"
            >
              API reference <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
