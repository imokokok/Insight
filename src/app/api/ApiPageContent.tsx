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
  Sparkles,
} from 'lucide-react';

import { ApiKeyManager } from '@/components/api-keys';
import { DataAccessTierMatrix, PricingSection } from '@/components/pricing';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { Button } from '@/components/ui/Button';
import { getAppUrl } from '@/lib/utils/appUrl';
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
    description: 'Create a free key below. It is shown only once, so store it securely.',
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

function getCodeExamples(): Record<string, string> {
  const baseUrl = getAppUrl();
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
    q: 'What happens if I exceed my quota?',
    a: 'API calls return HTTP 402 with a QUOTA_EXCEEDED error code. You can upgrade your plan at any time from Settings → Billing. The quota resets on the 1st of each month.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Payments are made in crypto via NOWPayments and are irreversible on-chain. If you experience a significant service issue within the first 14 days, contact us with your invoice ID for a case-by-case review — approved refunds are issued manually from our merchant balance. See our Refund Policy for full details.',
  },
  {
    q: 'Is commercial use allowed?',
    a: 'Yes. All paid plans (Pro, Protocol, Enterprise) include commercial use rights. You can use the API in production applications, SaaS products, and internal tools. Attribution is appreciated but not required.',
  },
  {
    q: 'What are the rate limits?',
    a: 'Free: 5 req/min, Pro: 30 req/min, Protocol: 60 req/min, Enterprise: custom. These are sized to the 15-minute data cadence — polling faster than 15 minutes yields no fresher snapshot data. Rate limit headers (X-RateLimit-*) are included in every response so you can implement client-side backoff.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes — every new account gets a 7-day Pro Trial (10,000 calls, 30 req/min, deep-analysis endpoints unlocked). Claim it from Settings → Billing after registration. No payment required.',
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
    <section className="relative overflow-hidden bg-slate-950 border-b border-slate-800">
      <div
        className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.05) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.14) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>REST API v1</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
            Insight Oracle API
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
            15-minute oracle reliability assessment — reputation, deviation, depeg risk, liquidation
            stress tests and anomaly detection across 10+ oracle providers and 40+ blockchain
            networks.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link
                href="#keys"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm shadow-blue-900/10"
              >
                <Key className="w-4 h-4" />
                Create API Key
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/register?redirect=/api')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm shadow-blue-900/10"
              >
                <Play className="w-4 h-4" />
                Get Started Free
              </button>
            )}
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:bg-white/10 rounded-xl font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Read Docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Built for DeFi data pipelines
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A single API for oracle prices, risk tracking and protocol analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
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
  const codeExamples = getCodeExamples();

  return (
    <section className="py-16 sm:py-20 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Start building in minutes
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Copy a snippet, plug in your API key, and start pulling verified oracle data.
            </p>

            <div className="space-y-6">
              {STEPS.map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
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
    <section id="keys" className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Your API Keys
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Create and manage keys, view usage, and revoke access when needed.
          </p>
        </div>

        {user && session?.access_token ? (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
            <ApiKeyManager accessToken={session.access_token} />
          </div>
        ) : (
          <div className="max-w-xl mx-auto text-center bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Sign in to manage keys</h3>
            <p className="text-sm text-slate-600 mb-6">
              Create a free account to get your API key and start building.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push('/register?redirect=/api')}>
                Create free account
              </Button>
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
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-center mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50 rounded-2xl border border-slate-100 p-6 hover:border-slate-200 transition-colors"
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
    <section className="py-16 sm:py-20 bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Ready to integrate?</h2>
        <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
          Explore the full API reference for endpoint details, authentication, rate limits, error
          codes and code examples.
        </p>
        <Link
          href="/docs/api"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm shadow-blue-900/10"
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
      <section id="pricing" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Simple, quota-based pricing
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Free 1,000 calls/mo. Pro 49 USDC/mo. Protocol 499 USDC/mo. Annual plans include 2
              months free. Crypto payments via NOWPayments.
            </p>
          </div>
          <PricingSection showTrialBanner={false} />
        </div>
      </section>
      <DataAccessTierMatrix />
    </>
  );
}

export function ApiPageContent() {
  return (
    <div className="min-h-screen bg-slate-50">
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
