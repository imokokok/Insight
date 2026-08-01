'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { Check, Copy } from 'lucide-react';

import { getAppUrl } from '@/lib/utils/appUrl';

interface McpConfigGeneratorProps {
  /** Default API key to embed in the generated config. */
  defaultApiKey?: string;
}

export function McpConfigGenerator({ defaultApiKey }: McpConfigGeneratorProps) {
  const [apiKey, setApiKey] = useState(defaultApiKey ?? '');
  const [copied, setCopied] = useState(false);

  const baseUrl = getAppUrl();

  const cursorConfig = useMemo(() => {
    const server: Record<string, unknown> = {
      url: `${baseUrl}/api/mcp`,
    };
    if (apiKey.trim()) {
      server.headers = { 'X-API-Key': apiKey.trim() };
    }
    return {
      mcpServers: {
        'insight-oracle': server,
      },
    };
  }, [baseUrl, apiKey]);

  const claudeDesktopConfig = useMemo(() => {
    if (apiKey.trim()) {
      return {
        mcpServers: {
          'insight-oracle': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-fetch'],
            env: {
              API_URL: `${baseUrl}/api/mcp`,
              API_KEY: apiKey.trim(),
            },
          },
        },
      };
    }
    return {
      mcpServers: {
        'insight-oracle': {
          command: 'npx',
          args: ['tsx', 'src/mcp/index.ts'],
          env: { NODE_ENV: 'production' },
        },
      },
    };
  }, [baseUrl, apiKey]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="mcp-api-key" className="block text-sm font-medium text-slate-700 mb-1.5">
          API Key (optional)
        </label>
        <input
          id="mcp-api-key"
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="ins_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Leave empty to generate a local stdio config; paste a key to generate a remote HTTP
          config.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          The Free plan includes 1,000 calls/mo; some advanced tools (e.g. check_position_safety)
          require Pro or higher.{' '}
          <Link href="/api#pricing" className="text-blue-600 hover:underline">
            See pricing →
          </Link>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ConfigCard
          title="Cursor / Windsurf / Claude Desktop (HTTP)"
          config={cursorConfig}
          copied={copied}
          onCopy={() => handleCopy(JSON.stringify(cursorConfig, null, 2))}
        />
        <ConfigCard
          title="Claude Desktop (local stdio)"
          config={claudeDesktopConfig}
          copied={copied}
          onCopy={() => handleCopy(JSON.stringify(claudeDesktopConfig, null, 2))}
        />
      </div>
    </div>
  );
}

interface ConfigCardProps {
  title: string;
  config: Record<string, unknown>;
  copied: boolean;
  onCopy: () => void;
}

function ConfigCard({ title, config, copied, onCopy }: ConfigCardProps) {
  return (
    <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs text-slate-200 overflow-x-auto font-mono leading-relaxed">
        <code>{JSON.stringify(config, null, 2)}</code>
      </pre>
    </div>
  );
}
