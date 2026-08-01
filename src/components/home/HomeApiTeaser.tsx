'use client';

import { useState } from 'react';

import Link from 'next/link';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  CreditCard,
  Key,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { getAppUrl } from '@/lib/utils/appUrl';

type Language = 'curl' | 'python' | 'javascript';

const SELLING_POINTS = [
  {
    icon: Layers,
    label: '10+ Providers',
    description: 'Chainlink, Pyth, RedStone, API3, DIA, Supra and more',
  },
  {
    icon: ShieldCheck,
    label: 'Verified Data',
    description: 'Every response includes on-chain or API verification metadata',
  },
  {
    icon: Zap,
    label: 'Free Tier',
    description: 'Start integrating with a free API key and generous quota',
  },
];

const EXAMPLES: Record<Language, string> = {
  curl: `curl -H "X-API-Key: ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  "${getAppUrl()}/api/v1/prices?provider=chainlink&symbol=BTC%2FUSD&chain=ethereum"`,
  python: `import requests

url = "${getAppUrl()}/api/v1/prices"
headers = {"X-API-Key": "ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
params = {"provider": "chainlink", "symbol": "BTC/USD", "chain": "ethereum"}

response = requests.get(url, headers=headers, params=params)
data = response.json()
print(data["price"])`,
  javascript: `const url = new URL("${getAppUrl()}/api/v1/prices");
url.searchParams.set("provider", "chainlink");
url.searchParams.set("symbol", "BTC/USD");
url.searchParams.set("chain", "ethereum");

const res = await fetch(url, {
  headers: { "X-API-Key": "ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
});
const data = await res.json();
console.log(data.price);`,
};

const LANGUAGE_LABELS: Record<Language, string> = {
  curl: 'cURL',
  python: 'Python',
  javascript: 'JavaScript',
};

export function HomeApiTeaser() {
  const [language, setLanguage] = useState<Language>('curl');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLES[language]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold mb-4">
              <Key className="w-3.5 h-3.5" />
              <span>REST API v1</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Build on transparent oracle infrastructure
            </h2>

            <p className="text-base text-slate-600 leading-relaxed mb-8">
              One API for verified prices, hourly reliability snapshots, depeg alerts and
              liquidation risk signals. Designed for DeFi protocols, indexers, and trading bots.
            </p>

            <div className="space-y-5 mb-8">
              {SELLING_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.label} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{point.label}</div>
                      <div className="text-sm text-slate-500 mt-0.5">{point.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/api"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <Key className="w-4 h-4" />
                Get API Key
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 hover:text-violet-700 hover:border-violet-200 hover:bg-violet-50/50 rounded-xl font-semibold transition-all duration-200"
              >
                <CreditCard className="w-4 h-4" />
                See pricing
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 hover:text-violet-700 hover:border-violet-200 hover:bg-violet-50/50 rounded-xl font-semibold transition-all duration-200"
              >
                <BookOpen className="w-4 h-4" />
                Read Docs
              </Link>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center gap-1">
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      language === lang
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-x-auto">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={language}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-slate-200 font-mono leading-relaxed whitespace-pre"
                >
                  <code>{EXAMPLES[language]}</code>
                </motion.pre>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
