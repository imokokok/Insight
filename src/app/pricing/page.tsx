import Link from 'next/link';

import { ArrowRight, BookOpen, ShieldCheck, Terminal } from 'lucide-react';

import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';
import { DataAccessTierMatrix, PricingSection } from '@/components/pricing';
import { METERING_CLASS_ORDER, creditCostRange } from '@/lib/billing/metering';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Insight Oracle Evidence Infrastructure',
  description:
    'Choose capacity for Insight REST API, AI/MCP, and Guard SDK usage. Every paying user gets every endpoint, with transparent per-call credit metering and prepaid top-ups.',
};

// Derived from metering.ts so re-pricing a class updates this ledger too.
const CREDIT_COST_RANGE = creditCostRange();
const METERING_LADDER_LABEL = `${METERING_CLASS_ORDER[0]}–${
  METERING_CLASS_ORDER[METERING_CLASS_ORDER.length - 1]
}`;

const BILLING_FACTS = [
  {
    value: '400',
    label: 'Trial credits',
    detail: 'One-time grant after email verification, never resets',
  },
  {
    value: METERING_LADDER_LABEL,
    label: 'Metering classes',
    detail: `${CREDIT_COST_RANGE.min} to ${CREDIT_COST_RANGE.max} credits per call`,
  },
  {
    value: '100%',
    label: 'Capability access',
    detail: 'Every endpoint on every paid path',
  },
  {
    value: 'USDC',
    label: 'Plan currency',
    detail: 'Crypto checkout without auto-renewal',
  },
];

const X402_PAY_PER_CALL_FACTS = [
  {
    value: '$0.002–$0.040',
    label: 'Per MCP call',
    detail: 'Op-priced Trade Guard plus product prices; settled in USDC on Base',
  },
  {
    value: '0',
    label: 'Credentials',
    detail: 'No account, no API key: the 402 quote is the contract',
  },
  {
    value: 'HTTP 402',
    label: 'Machine-native',
    detail: 'Agents discover the price in HTTP 402 and retry with x402 or MPP',
  },
  {
    value: 'BLOCK',
    label: 'Still charged',
    detail: 'A BLOCK verdict is a complete check; the answer, not the outcome, is the product',
  },
];

const PRODUCT_PRICES = [
  {
    name: 'Trade Guard',
    price: '$0.002–$0.040',
    unit: 'per call, op-priced',
    detail:
      'Read-only ops cost 2–4 credits ($0.002–$0.004). The trade-safety ops (check_safety, prepare_swap, prepare_perp_order) cost 40 credits ($0.040), which is both the per-call price and the product ceiling; the 16 deprecated alias spellings are callable at the same price until 2027-01-06. price_analytics batch mode is billed per asset at 2 credits each: 10 assets cost 20 credits, the 20-asset cap costs 40.',
    credits: '2–40 credits (40 = per trade-safety op, also the ceiling)',
  },
  {
    name: 'Trade Proof',
    price: '$0.040',
    unit: 'per call',
    detail:
      'Signed evidence: begin the trade record, issue the execution receipt, or verify evidence offline. verify_evidence is free for the three offline kinds (execution_pair, base_agent_swap, solana_swap); live reads are 40 credits / $0.040.',
    credits: '40 credits',
  },
  {
    name: 'Oracle Watch',
    price: '$0.500',
    unit: 'per 24h window',
    detail:
      'Up to 48 signal polls per window, one full reassessment every 30 minutes, escalating to a full scan when the signal jumps. Polls inside a paid window are free.',
    credits: '500 credits',
  },
  {
    name: 'Position Lifecycle',
    price: '$0.550',
    unit: 'per position',
    detail:
      'One window plus four guard checks and one execution receipt for a single position; in-bundle guards and receipts are not charged again.',
    credits: '550 credits',
  },
];

export default function PricingPage() {
  return (
    <div className="editorial-workspace evidence-workbench commercial-workbench pricing-workbench min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="13"
          stage="Choose"
          eyebrow="Capacity, not feature gates · Website access stays public; REST API, AI/MCP, and Guard SDK calls draw from one credit wallet"
          title="Pay for the evidence your system actually uses."
          description="Choose a monthly capacity allowance or add prepaid credits when you need them. REST API, AI/MCP, and Guard SDK are distinct integration paths over the same endpoints, tools, risk analysis, verification features, and credit wallet."
          evidence={['One credit wallet', 'All endpoints', 'Transparent metering']}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/register?redirect=/pricing"
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                Start with 400 credits
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
              >
                <BookOpen className="h-4 w-4" />
                Read metering docs
              </Link>
            </div>
          }
        />

        <EvidenceProcessRail
          label="Capacity decision"
          items={[
            { label: 'Estimate demand', detail: 'Calls · class · cadence' },
            { label: 'Choose capacity', detail: 'Monthly · annual · prepaid' },
            { label: 'Expand safely', detail: 'One wallet · no feature gates' },
          ]}
        />

        <div className="pricing-fact-ledger grid border-b border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
          {BILLING_FACTS.map((fact, index) => (
            <div
              key={fact.label}
              className="pricing-fact-record border-b border-r border-slate-900/10 bg-white/30 px-0 py-6 sm:px-5 first:sm:pl-0"
            >
              <span className="font-mono text-[10px] text-blue-700">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                {fact.value}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                {fact.label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{fact.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-plan-section py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — Select capacity</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                One evidence layer. Four operating scales.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Starter and the Usage Pack tiers are usage allowances: monthly credits and a fixed
                request rate. Enterprise removes the monthly cap under a separate agreement.
              </p>
            </div>
          </div>
          <PricingSection />
        </div>
      </section>

      <section className="pricing-plan-section py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">02 — Product prices</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Four product tools, metered by the work they do.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Trade Guard dispatches across metering classes, so it is priced by operation rather
                than a single flat rate. The other three products carry one product price. Every
                price below is also available through the credit wallet and x402. The catalog
                exposes 4 products + 16 deprecated aliases = 20 discoverable names; aliases are
                callable at their product price until 2027-01-06.
              </p>
            </div>
          </div>
          <div className="pricing-fact-ledger grid border-b border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCT_PRICES.map((product, index) => (
              <div
                key={product.name}
                className="pricing-fact-record border-b border-r border-slate-900/10 bg-white/30 px-0 py-6 sm:px-5 first:sm:pl-0"
              >
                <span className="font-mono text-[10px] text-blue-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                  {product.name}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {product.price}
                </p>
                <p className="mt-1 text-xs text-slate-600">{product.unit}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{product.detail}</p>
                <p className="mt-2 font-mono text-[11px] text-blue-700">{product.credits}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-500">
            REST resources are priced per call alongside the four products. The signed oracle
            configuration snapshot —{' '}
            <code className="font-mono text-xs text-slate-700">
              POST /api/v1/oracle-config/snapshot
            </code>{' '}
            — costs <span className="font-semibold text-slate-700">$0.50 per call</span>, or an
            equivalent <span className="font-semibold text-slate-700">500 credits</span> with an API
            key.
          </p>
        </div>
      </section>

      <section className="pricing-plan-section py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">03 — Pay per call, no account</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                One endpoint for autonomous agents: hit it, pay, get the verdict.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                <code className="font-mono text-base">GET /api/v1/safety/pre-trade</code> speaks the
                x402 and optional MPP protocols. A request without credentials receives an HTTP 402
                quote; the agent pays the quoted USDC price on Base — $0.02 for the REST pre-trade
                safety check (C3) — and retries with a signed payment to receive the full result. On
                the MCP surface, the <code className="font-mono text-base">trade_guard</code>{' '}
                trade-safety ops (<code className="font-mono text-base">check_safety</code>,{' '}
                <code className="font-mono text-base">prepare_swap</code>,{' '}
                <code className="font-mono text-base">prepare_perp_order</code>) are $0.040 each;
                read-only Trade Guard ops start at $0.002, and the 16 deprecated alias spellings are
                charged the same as their canonical op. Humans and teams with ongoing volume should
                use the credit plans above instead.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/docs/x402"
                  className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
                >
                  <Terminal className="h-4 w-4" />
                  Copy-paste quickstart
                </Link>
                <Link
                  href="/docs/x402#verify"
                  className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verify a receipt
                </Link>
              </div>
            </div>
          </div>
          <div className="pricing-fact-ledger grid border-b border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
            {X402_PAY_PER_CALL_FACTS.map((fact, index) => (
              <div
                key={fact.label}
                className="pricing-fact-record border-b border-r border-slate-900/10 bg-white/30 px-0 py-6 sm:px-5 first:sm:pl-0"
              >
                <span className="font-mono text-[10px] text-blue-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                  {fact.value}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                  {fact.label}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{fact.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-slate-900/10">
        <DataAccessTierMatrix />
      </div>
    </div>
  );
}
