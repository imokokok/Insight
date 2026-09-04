'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Activity,
  AlertTriangle,
  Anchor,
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  Globe,
  Key,
  Layers,
  Lock,
  Play,
  Shield,
} from 'lucide-react';

import { ApiKeyManager } from '@/components/api-keys';
import { EditorialWorkspaceHeader } from '@/components/editorial';
import { DataAccessTierMatrix, PricingSection } from '@/components/pricing';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { Button } from '@/components/ui/Button';
import { useAppUrl } from '@/hooks/useAppUrl';
import { useSession, useUser } from '@/stores/authStore';

const FEATURES = [
  {
    icon: Globe,
    title: 'Current Prices',
    description:
      'On-demand prices from Chainlink, API3, RedStone, DIA, Supra and more across 40+ chains.',
  },
  {
    icon: Database,
    title: '15-Minute Snapshots',
    description:
      'Reliability snapshots polled every 15 minutes — consensus price, per-provider deviation and latency, up to one year back.',
  },
  {
    icon: Layers,
    title: 'Batch Queries',
    description:
      'Fetch multiple assets in a single request. Perfect for dashboards, indexers and bots.',
  },
  {
    icon: AlertTriangle,
    title: 'Stablecoin Depeg Risk',
    description:
      'Detect oracle-market divergence for USDC, USDT, DAI and other stablecoins with protocol impact.',
  },
  {
    icon: Anchor,
    title: 'Wrapped Asset Peg',
    description:
      'Track WBTC, cbBTC, tBTC, wstETH and other wrapped assets against underlying collateral.',
  },
  {
    icon: Shield,
    title: 'Liquidation Stress Test',
    description: 'Run 1%, 3%, 5% adverse deviation scenarios on Aave, Compound, Morpho and more.',
  },
  {
    icon: Activity,
    title: 'Oracle Reliability',
    description:
      'Hourly reputation scores, 15-minute feed health, deviation events and shared-source dependency analysis.',
  },
  {
    icon: BarChart3,
    title: 'Anomaly Detection',
    description:
      'Aggregate anomaly summaries over the last 30 days with severity and provider breakdowns.',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Get an API Key',
    description: 'Create an API key below. It is shown only once, so store it securely.',
  },
  {
    step: '2',
    title: 'Build the Query',
    description: 'Choose a provider, symbol and chain. URL-encode symbols like BTC%2FUSD.',
  },
  {
    step: '3',
    title: 'Handle the Response',
    description: 'Check the success flag and read price plus verification metadata.',
  },
];

function getCodeExamples(baseUrl: string): Record<string, string> {
  return {
    curl: `curl -H "X-API-Key: ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  "${baseUrl}/api/v1/prices?provider=chainlink&symbol=BTC%2FUSD&chain=ethereum"`,
    js: `const API_KEY = 'ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const symbol = encodeURIComponent('BTC/USD');

const response = await fetch(
  \`${baseUrl}/api/v1/prices?provider=chainlink&symbol=\${symbol}&chain=ethereum\`,
  { headers: { 'X-API-Key': API_KEY } }
);

const result = await response.json();
console.log(result.data.price);`,
    ts: `interface PriceResponse {
  success: boolean;
  data: {
    symbol: string;
    price: number;
    timestamp: number;
    source: string;
    chain: string;
    verification: {
      type: 'on-chain' | 'api';
      source: string;
      explorerUrl: string;
    };
  };
  meta: { timestamp: number };
}

const response = await fetch(
  '${baseUrl}/api/v1/prices?provider=chainlink&symbol=BTC%2FUSD&chain=ethereum',
  { headers: { 'X-API-Key': 'ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' } }
);
const result: PriceResponse = await response.json();
console.log(result.data.price);`,
    python: `import requests

headers = {'X-API-Key': 'ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
params = {
    'provider': 'chainlink',
    'symbol': 'BTC/USD',
    'chain': 'ethereum'
}

response = requests.get(
    '${baseUrl}/api/v1/prices',
    headers=headers,
    params=params
)
result = response.json()
print(result['data']['price'])`,
  };
}

const FAQ_ITEMS = [
  {
    q: 'How do I authenticate requests?',
    a: 'Include your API key in the X-API-Key header. The /api/v1/health endpoint is public and does not require authentication.',
  },
  {
    q: 'How often is the data updated?',
    a: 'Insight collects price snapshots every 15 minutes and recalculates reputation scores hourly. Prices are also fetched on demand (5-minute cache). Daily reports aggregate the day\u2019s deviation events and liquidation stress tests. Polling faster than 15 minutes yields no fresher snapshot data, so clients should cache accordingly.',
  },
  {
    q: 'What happens if I run out of quota / credits?',
    a: 'Every API key is credit-metered: each call costs credits by metering class (C1–C4). Credits come from your wallet — a monthly allowance with a Developer/Team subscription, or prepaid top-up packs from Settings → Billing. When the wallet balance (or a key’s monthly credit budget) can’t cover the next call, requests return HTTP 402 with CREDIT_EXHAUSTED and the response includes your balance and a top-up link.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Payments are made in crypto via NOWPayments and are irreversible on-chain. If you experience a significant service issue within the first 14 days, contact us with your invoice ID for a case-by-case review — approved refunds are issued manually from our merchant balance. See our Refund Policy for full details.',
  },
  {
    q: 'Is commercial use allowed?',
    a: 'Yes. Every paid plan (Developer, Team, Enterprise) includes commercial use rights. You can use the API in production applications, SaaS products, and internal tools. Attribution is appreciated but not required.',
  },
  {
    q: 'What are the rate limits?',
    a: 'Developer: 30 req/min, Team: 60 req/min, Enterprise: custom. These are sized to the 15-minute data cadence — polling faster than 15 minutes yields no fresher snapshot data. Rate limit headers (X-RateLimit-*) are included in every response so you can implement client-side backoff.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'New users get 30 free trial credits after email verification — enough to sample the endpoints before paying. There is no recurring free tier; once the trial is used, you can start with a $39 prepaid Starter Pack (pay-as-you-go) or a Developer subscription from $49/mo, which includes 10,000 credits. The website itself stays free to browse.',
  },
  {
    q: 'Is the data verified on-chain?',
    a: 'Every response includes a verification object that tells you whether the data came from an on-chain feed or an API source, with an explorer link when applicable.',
  },
];

function HeroSection() {
  const user = useUser();
  const router = useRouter();

  return (
    <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
      <EditorialWorkspaceHeader
        index="09"
        stage="Integrate"
        eyebrow="REST API v1 · Oracle evidence and risk infrastructure for production systems"
        title="Move verified market evidence into your system."
        description="Query prices, consensus, reputation, depeg risk, protocol exposure, and execution safety through one typed interface with explicit freshness and verification metadata."
        evidence={['Authenticated access', 'Typed evidence', 'Metered usage']}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <Link
                href="#keys"
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                <Key className="w-4 h-4" />
                Create API Key
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/register?redirect=/api')}
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                <Play className="w-4 h-4" />
                Get Started Free
              </button>
            )}
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
            >
              <BookOpen className="w-4 h-4" />
              Read Docs
            </Link>
          </div>
        }
      />
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-14 sm:py-20">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="mb-10 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
          <p className="editorial-index">01 — Capability surface</p>
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              One interface. The evidence remains visible.
            </h2>
            <p className="max-w-2xl text-lg text-slate-600">
              A single API for oracle prices, risk tracking and protocol analytics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 border-y border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="border-b border-r border-slate-900/10 bg-white/35 p-6 transition-colors hover:bg-blue-50/35"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStartSection() {
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'ts' | 'python'>('curl');
  const codeExamples = getCodeExamples(useAppUrl());

  return (
    <section className="border-y border-slate-900/10 bg-white/45 py-14 sm:py-20">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="editorial-index mb-5">02 — First request</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Start building in minutes
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Copy a snippet, plug in your API key, and start pulling verified oracle data.
            </p>

            <div className="space-y-6">
              {STEPS.map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-blue-200 bg-blue-50 font-mono text-sm font-bold text-blue-700">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {(['curl', 'js', 'ts', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    activeLang === lang
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang}
                </button>
              ))}
            </div>
            <CodeBlock code={codeExamples[activeLang]} label="Example request" />
          </div>
        </div>
      </div>
    </section>
  );
}

function KeyManagerSection() {
  const user = useUser();
  const session = useSession();
  const router = useRouter();

  return (
    <section id="keys" className="py-14 sm:py-20">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="mb-10 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
          <p className="editorial-index">04 — Access control</p>
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Your API Keys
            </h2>
            <p className="max-w-2xl text-lg text-slate-600">
              Create and manage keys, view usage, and revoke access when needed.
            </p>
          </div>
        </div>

        {user && session?.access_token ? (
          <div className="mx-auto max-w-4xl border-y border-slate-900/15 bg-white/45 p-6 md:p-8">
            <ApiKeyManager accessToken={session.access_token} />
          </div>
        ) : (
          <div className="mx-auto max-w-xl border-y border-slate-900/15 bg-white/45 p-8 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Sign in to manage keys</h3>
            <p className="text-sm text-slate-600 mb-6">
              Create an account to generate your API key and start building.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push('/register?redirect=/api')}>Create account</Button>
              <Button variant="secondary" onClick={() => router.push('/login?redirect=/api')}>
                Sign in
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="border-y border-slate-900/10 bg-white/45 py-14 sm:py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <p className="editorial-index mb-5">05 — Operational questions</p>
        <h2 className="mb-10 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="border-b border-slate-900/10 bg-transparent p-6 transition-colors hover:bg-slate-50"
            >
              <h3 className="font-bold text-slate-900 mb-2">{item.q}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DocsCtaSection() {
  return (
    <section className="border-t border-slate-900/15 bg-blue-50/55 py-14 sm:py-20">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Ready to integrate?</h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600">
          Explore the full API reference for endpoint details, authentication, rate limits, error
          codes and code examples.
        </p>
        <Link
          href="/docs/api"
          className="inline-flex items-center gap-2 border border-blue-700 bg-blue-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-950"
        >
          <BookOpen className="w-5 h-5" />
          View API Reference
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

function PricingSectionBlock() {
  return (
    <>
      <section id="pricing" className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-8 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">03 — Select capacity</p>
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                Pay for what your agents use
              </h2>
              <p className="max-w-2xl text-lg text-slate-600">
                New users get 30 free trial credits after email verification, and every paying user
                gets all endpoints. Developer/Team subscriptions include a monthly credit allowance
                spent per call (C1–C4); top up prepaid credit packs for high-frequency and bursty
                agent workloads. Crypto payments via NOWPayments.
              </p>
            </div>
          </div>
          <PricingSection />
        </div>
      </section>
      <DataAccessTierMatrix />
    </>
  );
}

export function ApiPageContent() {
  return (
    <div className="editorial-workspace min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <QuickStartSection />
      <PricingSectionBlock />
      <KeyManagerSection />
      <FaqSection />
      <DocsCtaSection />
    </div>
  );
}
