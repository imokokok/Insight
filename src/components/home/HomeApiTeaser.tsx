'use client';

import { useState } from 'react';

import Link from 'next/link';

import { ArrowUpRight, Check, Copy } from 'lucide-react';

import { useAppUrl } from '@/hooks/useAppUrl';

type Language = 'curl' | 'python' | 'javascript';

const INTERFACE_LAYERS = [
  ['01', 'Request', 'Ask for a price, risk signal, or reliability record.'],
  ['02', 'Resolve', 'Compare providers and retain source-level verification metadata.'],
  ['03', 'Return', 'Deliver a response your protocol or agent can inspect and preserve.'],
] as const;

const getExamples = (baseUrl: string): Record<Language, string> => ({
  curl: `curl -H "X-API-Key: ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  "${baseUrl}/api/v1/prices?provider=chainlink&symbol=BTC%2FUSD&chain=ethereum"`,
  python: `import requests

url = "${baseUrl}/api/v1/prices"
headers = {"X-API-Key": "ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
params = {"provider": "chainlink", "symbol": "BTC/USD", "chain": "ethereum"}

response = requests.get(url, headers=headers, params=params)
data = response.json()
print(data["price"])`,
  javascript: `const url = new URL("${baseUrl}/api/v1/prices");
url.searchParams.set("provider", "chainlink");
url.searchParams.set("symbol", "BTC/USD");
url.searchParams.set("chain", "ethereum");

const res = await fetch(url, {
  headers: { "X-API-Key": "ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
});
const data = await res.json();
console.log(data.price);`,
});

const LANGUAGE_LABELS: Record<Language, string> = {
  curl: 'cURL',
  python: 'Python',
  javascript: 'JavaScript',
};

export function HomeApiTeaser() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [copied, setCopied] = useState(false);
  const examples = getExamples(useAppUrl());

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(examples[language]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be unavailable in embedded previews.
    }
  };

  return (
    <section className="execution-interface home-view-reveal" aria-labelledby="execution-title">
      <div className="execution-interface-intro">
        <p className="instrument-label">Evidence instrument 06 / execution interface</p>
        <h3 id="execution-title">Transparent data, shaped for execution.</h3>
        <p>
          Query verified prices, reliability snapshots, depeg alerts, and liquidation risk signals
          through one interface.
        </p>

        <ol className="execution-layers">
          {INTERFACE_LAYERS.map(([index, title, description]) => (
            <li key={index}>
              <span>{index}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="execution-actions">
          <Link href="/api" className="is-primary">
            Get API Key <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/docs/api">Read API reference</Link>
          <Link href="/pricing">View pricing</Link>
        </div>
      </div>

      <div className="request-specimen">
        <div className="request-specimen-meta">
          <span>Request specimen</span>
          <span>REST / v1</span>
          <span>Auth required</span>
        </div>

        <div className="request-specimen-tabs" aria-label="Code language">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={language === lang}
              onClick={() => setLanguage(lang)}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
          <button type="button" className="request-copy" onClick={handleCopy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="request-specimen-code">
          <div className="request-line-ruler" aria-hidden="true">
            {Array.from({ length: Math.max(examples[language].split('\n').length, 4) }).map(
              (_, index) => (
                <span key={index}>{String(index + 1).padStart(2, '0')}</span>
              )
            )}
          </div>
          <pre key={language} className="home-code-swap">
            <code>{examples[language]}</code>
          </pre>
        </div>

        <div className="request-specimen-foot">
          <span>Source verification included</span>
          <span>Credit class C1–C4</span>
          <span>Machine-readable response</span>
        </div>
      </div>
    </section>
  );
}
