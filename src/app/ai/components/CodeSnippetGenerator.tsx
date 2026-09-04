'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { Check, Copy } from 'lucide-react';

import { useAppUrl } from '@/hooks/useAppUrl';

interface CodeSnippetGeneratorProps {
  /** Default API key to embed in the generated snippet. */
  defaultApiKey?: string;
}

type Language = 'curl' | 'javascript' | 'python' | 'go';

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
];

const CHAINS: { id: number; label: string }[] = [
  { id: 1, label: 'Ethereum' },
  { id: 42161, label: 'Arbitrum' },
  { id: 10, label: 'Optimism' },
  { id: 137, label: 'Polygon' },
  { id: 8453, label: 'Base' },
  { id: 56, label: 'BNB Chain' },
  { id: 43114, label: 'Avalanche' },
];

const ACTIONS = ['swap', 'borrow', 'lend', 'liquidate', 'repay'] as const;

const INPUT_CLASS =
  'w-full border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600';

/**
 * REST code snippet generator for the pre-trade safety check.
 *
 * The "lightweight SDK" — instead of publishing an npm package, lets bot/script
 * developers pick a language, fill in their trade intent, and copy a runnable
 * snippet that already embeds the immune-system gate (abort on DANGER/BLOCK).
 * Serves the same "reduce integration friction" goal as an SDK at ~1/10th the
 * maintenance cost for a solo developer.
 */
export function CodeSnippetGenerator({ defaultApiKey }: CodeSnippetGeneratorProps) {
  const [asset, setAsset] = useState('ETH');
  const [chainId, setChainId] = useState(1);
  const [action, setAction] = useState<(typeof ACTIONS)[number]>('swap');
  const [tradeAmountUsd, setTradeAmountUsd] = useState(100000);
  const [apiKey, setApiKey] = useState(defaultApiKey ?? '');
  const [language, setLanguage] = useState<Language>('curl');
  const [copied, setCopied] = useState(false);

  const baseUrl = useAppUrl();
  const keyPlaceholder = 'ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const keyValue = apiKey.trim() || keyPlaceholder;

  const endpoint = `${baseUrl}/api/v1/safety/pre-trade?asset=${encodeURIComponent(asset)}&chainId=${chainId}&action=${action}&tradeAmountUsd=${tradeAmountUsd}`;

  const code = useMemo(() => {
    switch (language) {
      case 'curl':
        return [
          `curl -X GET "${endpoint}" \\`,
          `  -H "X-API-Key: ${keyValue}" \\`,
          `  -H "Accept: application/json"`,
          ``,
          `# Response: { "data": { "verdict": "PASS|CAUTION|DANGER|BLOCK", ... } }`,
          `# Immune-system gate — abort the trade on DANGER or BLOCK.`,
        ].join('\n');

      case 'javascript':
        return [
          `const url = new URL("${baseUrl}/api/v1/safety/pre-trade");`,
          `url.searchParams.set("asset", "${asset}");`,
          `url.searchParams.set("chainId", "${chainId}");`,
          `url.searchParams.set("action", "${action}");`,
          `url.searchParams.set("tradeAmountUsd", "${tradeAmountUsd}");`,
          ``,
          `const res = await fetch(url, {`,
          `  headers: { "X-API-Key": "${keyValue}" },`,
          `});`,
          `const { data } = await res.json();`,
          ``,
          `// Immune-system gate: abort on DANGER or BLOCK.`,
          `if (data.verdict === "DANGER" || data.verdict === "BLOCK") {`,
          `  throw new Error("Aborting trade: oracle verdict " + data.verdict);`,
          `}`,
        ].join('\n');

      case 'python':
        return [
          `import requests`,
          ``,
          `resp = requests.get(`,
          `    "${baseUrl}/api/v1/safety/pre-trade",`,
          `    params={`,
          `        "asset": "${asset}",`,
          `        "chainId": ${chainId},`,
          `        "action": "${action}",`,
          `        "tradeAmountUsd": ${tradeAmountUsd},`,
          `    },`,
          `    headers={"X-API-Key": "${keyValue}"},`,
          `)`,
          `data = resp.json()["data"]`,
          ``,
          `# Immune-system gate: abort on DANGER or BLOCK.`,
          `if data["verdict"] in ("DANGER", "BLOCK"):`,
          `    raise RuntimeError("Aborting trade: oracle verdict " + data["verdict"])`,
        ].join('\n');

      case 'go':
        return [
          `package main`,
          ``,
          `import (`,
          `	"encoding/json"`,
          `	"fmt"`,
          `	"io"`,
          `	"net/http"`,
          `)`,
          ``,
          `func main() {`,
          `	req, _ := http.NewRequest("GET", "${endpoint}", nil)`,
          `	req.Header.Set("X-API-Key", "${keyValue}")`,
          ``,
          `	resp, err := http.DefaultClient.Do(req)`,
          `	if err != nil {`,
          `		panic(err)`,
          `	}`,
          `	defer resp.Body.Close()`,
          ``,
          `	body, _ := io.ReadAll(resp.Body)`,
          `	var out map[string]any`,
          `	json.Unmarshal(body, &out)`,
          `	data := out["data"].(map[string]any)`,
          `	verdict := data["verdict"].(string)`,
          ``,
          `	// Immune-system gate: abort on DANGER or BLOCK.`,
          `	if verdict == "DANGER" || verdict == "BLOCK" {`,
          `		panic(fmt.Sprintf("Aborting trade: oracle verdict %s", verdict))`,
          `	}`,
          `}`,
        ].join('\n');
    }
  }, [language, endpoint, keyValue, baseUrl, asset, chainId, action, tradeAmountUsd]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Asset">
          <input
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value.toUpperCase())}
            placeholder="ETH"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Chain">
          <select
            value={chainId}
            onChange={(e) => setChainId(Number(e.target.value))}
            className={INPUT_CLASS}
          >
            {CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.id})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Action">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as (typeof ACTIONS)[number])}
            className={INPUT_CLASS}
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trade size (USD)">
          <input
            type="number"
            min={1}
            value={tradeAmountUsd}
            onChange={(e) => setTradeAmountUsd(Number(e.target.value))}
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      <Field label="API Key (optional — leave empty to use a placeholder)">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={keyPlaceholder}
          className={`${INPUT_CLASS} font-mono`}
        />
      </Field>

      <div className="overflow-hidden border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  language === lang.id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 text-xs text-slate-200 overflow-x-auto font-mono leading-relaxed max-h-[440px]">
          <code>{code}</code>
        </pre>
      </div>

      <p className="text-xs text-slate-500">
        Every snippet embeds the immune-system gate: the trade is aborted when the verdict is DANGER
        or BLOCK. Same logic as the{' '}
        <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-700">
          pre_trade_safety_check
        </code>{' '}
        MCP tool.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
