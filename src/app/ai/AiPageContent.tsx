'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import Link from 'next/link';

import {
  Bot,
  Brain,
  Code2,
  ExternalLink,
  Eye,
  Key,
  Radar,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { ApiKeyManager } from '@/components/api-keys';
import { PricingCtaSection } from '@/components/pricing';
import { Button } from '@/components/ui/Button';
import { createLogger } from '@/lib/utils/logger';
import { useSession, useUser } from '@/stores/authStore';

import { McpConfigGenerator } from '../mcp/components/McpConfigGenerator';
import { McpPlayground } from '../mcp/components/McpPlayground';

import { CodeSnippetGenerator } from './components/CodeSnippetGenerator';
import { OracleWatchDemo } from './components/OracleWatchDemo';
import { PreTradeSafetyDemo } from './components/PreTradeSafetyDemo';

const logger = createLogger('ai-page');

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  plainKey?: string;
}

const CAPABILITIES = [
  {
    icon: ShieldCheck,
    title: 'Pre-Trade Safety Check',
    description:
      'Before any swap/borrow/lend, agents call one tool to verify cross-oracle consensus, deviation, freshness and depeg — getting a PASS / CAUTION / DANGER / BLOCK verdict.',
    accent: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: Brain,
    title: 'Manipulation Risk Score',
    description:
      'A 0–1 score blending per-provider deviation, cross-provider agreement, staleness and reputation — the single number an agent needs to decide if a price is trustworthy.',
    accent: 'text-violet-600 bg-violet-50',
  },
  {
    icon: Terminal,
    title: '34 MCP Tools',
    description:
      'Prices, consensus, risk summaries, position stress tests, stablecoin depeg, reputation rankings, feed health — all callable by any MCP-compatible client.',
    accent: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Zap,
    title: 'Agent-Native Verdicts',
    description:
      'Every verdict ships with machine-readable factors AND a plain-English guidance line, so agents can both gate execution and explain decisions to humans.',
    accent: 'text-amber-600 bg-amber-50',
  },
];

const AGENT_USE_CASES = [
  {
    icon: ShieldCheck,
    title: 'Pre-trade gating',
    prompt:
      '"I want to borrow 500k USDC against ETH on Aave — check the oracle is safe first, and abort if the verdict is DANGER or BLOCK."',
  },
  {
    icon: TrendingUp,
    title: 'Consensus & deviation',
    prompt:
      '"What\'s the latest Chainlink price for BTC, and how far is it from the cross-oracle consensus?"',
  },
  {
    icon: Bot,
    title: 'Automated risk briefing',
    prompt:
      '"Generate an oracle health report for the last 24 hours, focusing on depeg events and feed latency."',
  },
  {
    icon: Radar,
    title: 'Always-on monitoring',
    prompt:
      '"I run a yield strategy on ETH. Poll oracle_watch every 5 minutes and pause withdrawals if the verdict ever turns DANGER."',
  },
];

const INTEGRATION_STEPS = [
  {
    step: '1',
    title: 'Create an API Key',
    body: 'Sign in, generate an API key. API access is credit-metered — subscriptions from 49 USDC/mo or prepaid top-up packs.',
  },
  {
    step: '2',
    title: 'Add the MCP server to your client',
    body: 'Copy the config for Claude Desktop, Cursor, or Windsurf and paste your key. One-click setup.',
  },
  {
    step: '3',
    title: 'Gate every action and every running strategy',
    body: 'Agents auto-discover the pre_trade_safety_check tool for one-off trades and the oracle_watch tool to keep running strategies safe between actions.',
  },
];

export function AiPageContent() {
  const user = useUser();
  const session = useSession();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;

    let cancelled = false;

    fetch('/api/user/api-keys', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setKeys(result.data.keys as ApiKeyItem[]);
        }
      })
      .catch((err) => {
        logger.error(
          'Failed to load API keys',
          err instanceof Error ? err : new Error(String(err))
        );
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const defaultApiKey = useMemo(() => {
    const keyWithPlain = keys.find((k) => k.plainKey);
    return keyWithPlain?.plainKey;
  }, [keys]);

  return (
    <div className="min-h-screen bg-white">
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-white border-b border-slate-100">
        <div
          className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 text-xs font-medium mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI × Crypto · Oracle Safety Layer</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              The Oracle Immune System for AI Agents
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-4 max-w-2xl mx-auto">
              AI agents are the new DeFi users — but they can&apos;t tell when a price is being
              manipulated. Insight gives every agent a pre-trade safety checkpoint: cross-oracle
              consensus, manipulation risk scoring, and 34 MCP tools it can call directly.
            </p>

            <p className="text-sm text-slate-500 mb-6">
              MCP calls share your API credit meter · subscriptions from 49 USDC/mo ·{' '}
              <Link href="/api#pricing" className="text-blue-600 hover:underline">
                See pricing
              </Link>
            </p>

            <p className="text-sm text-slate-500 mb-6">
              Every check is signed, and every receipt can be verified by anyone.{' '}
              <Link href="/verify" className="text-blue-600 hover:underline">
                Verify a receipt
              </Link>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#safety-check"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                Try the Safety Check
              </a>
              <a
                href="#config"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Bot className="w-4 h-4" />
                Connect an Agent
              </a>
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50/50 rounded-lg font-medium transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Learn about MCP
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= CAPABILITIES ======================= */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Built for the AI agent era</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              One platform that turns cross-oracle data into verifiable, agent-callable safety
              signals — the missing layer between AI agents and on-chain execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${cap.accent}`}
                >
                  <cap.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{cap.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{cap.description}</p>
              </div>
            ))}

            <a
              href="#oracle-watch"
              className="sm:col-span-2 lg:col-span-4 p-6 bg-gradient-to-r from-violet-50 via-white to-emerald-50 border border-violet-100 rounded-2xl hover:border-violet-200 transition-colors flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-600 text-white flex-shrink-0">
                <Radar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  Oracle Watch — the always-on companion
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Pre-trade checks a single moment; Oracle Watch keeps watching. A live cross-oracle
                  trust signal (NORMAL / CAUTION / DANGER) that agents can poll to keep running
                  strategies — yield, keepers, portfolios — safe between trades.
                </p>
              </div>
              <span className="text-sm font-medium text-violet-700 whitespace-nowrap">
                Try it live →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ===================== SAFETY CHECK DEMO ===================== */}
      <section id="safety-check" className="py-16 sm:py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              Flagship · Direction 1
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Pre-Trade Oracle Safety Check
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Try it live. Tell Insight what you&apos;re about to trade, and it aggregates
              cross-oracle consensus, deviation, freshness and depeg signals into one verdict an
              agent can act on.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
            <PreTradeSafetyDemo apiKey={defaultApiKey} />
          </div>

          <p className="text-center text-xs text-slate-500 mt-4">
            Same logic powers the{' '}
            <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-700">
              pre_trade_safety_check
            </code>{' '}
            MCP tool and the{' '}
            <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-700">
              GET /api/v1/safety/pre-trade
            </code>{' '}
            REST endpoint.
          </p>
        </div>
      </section>

      {/* ===================== ORACLE WATCH DEMO ===================== */}
      <section id="oracle-watch" className="py-16 sm:py-20 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium mb-4">
              <Radar className="w-3.5 h-3.5" />
              Always-on · Direction 2
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Oracle Watch</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Pre-trade checks the moment before an action. Oracle Watch keeps watching between
              actions — a live cross-oracle trust signal that running strategies can poll and gate
              on, instead of trusting a price silently.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
            <OracleWatchDemo apiKey={defaultApiKey} />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoTile
              icon={<Eye className="w-4 h-4" />}
              title="For running strategies"
              body="Yield bots, keepers and portfolio managers poll the signal periodically and pause when it turns DANGER."
            />
            <InfoTile
              icon={<Zap className="w-4 h-4" />}
              title="One verdict, same language"
              body="NORMAL / CAUTION / DANGER reuses the pre-trade severity thresholds (deviation 1%/3%, agreement 0.95/0.85), so agents speak one consistent risk language."
            />
            <InfoTile
              icon={<Terminal className="w-4 h-4" />}
              title="MCP + REST"
              body="Call it from any MCP client as oracle_watch, or hit GET /api/v1/oracle-watch directly. No cross-oracle coverage degrades to DANGER, not an error."
            />
          </div>
        </div>
      </section>

      {/* ======================= USE CASES ======================= */}
      <UseCasesSection />

      {/* ===================== INTEGRATION GUIDE ===================== */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Connect an AI agent in 3 steps
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Any MCP-compatible client works. The agent auto-discovers Insight&apos;s tools —
              including the pre-trade safety check — and can start gating trades immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {INTEGRATION_STEPS.map((s) => (
              <div key={s.step} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm mb-4">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ConfigSnippetCard
              title="Claude Desktop"
              filename="claude_desktop_config.json"
              snippet={`{
  "mcpServers": {
    "insight-oracle": {
      "url": "https://www.oracleinsight.xyz/api/mcp"
    }
  }
}`}
            />
            <ConfigSnippetCard
              title="Cursor"
              filename="~/.cursor/mcp.json"
              snippet={`{
  "mcpServers": {
    "insight-oracle": {
      "url": "https://www.oracleinsight.xyz/api/mcp"
    }
  }
}`}
            />
            <ConfigSnippetCard
              title="Agent prompt"
              filename="system prompt"
              snippet={`Before executing any on-chain trade,
call pre_trade_safety_check with the
asset, chainId, action and amount.
If the verdict is DANGER or BLOCK,
do NOT execute — report the risk
factors to the user instead.
For long-running strategies, poll
oracle_watch periodically and pause
when the verdict turns DANGER.`}
            />
          </div>
        </div>
      </section>

      {/* ===================== MCP CONFIG GENERATOR ===================== */}
      <section id="config" className="py-16 sm:py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Generate your MCP config</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Pick your client, paste your API Key, and copy. Every request goes through the same
              authentication, rate limiting, and quota enforcement as the REST API.
            </p>
          </div>

          <McpConfigGenerator defaultApiKey={defaultApiKey} />
        </div>
      </section>

      {/* ===================== REST CODE SNIPPET GENERATOR ===================== */}
      <section id="code" className="py-16 sm:py-20 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-4">
              <Code2 className="w-3.5 h-3.5" />
              No MCP? Call the REST API
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Generate integration code</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Building a bot or script without MCP? Pick your language, fill in the trade intent,
              and copy a runnable snippet. Each one already embeds the immune-system gate — the
              trade aborts when the verdict is DANGER or BLOCK.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
            <CodeSnippetGenerator defaultApiKey={defaultApiKey} />
          </div>
        </div>
      </section>

      {/* ===================== API KEY MANAGEMENT ===================== */}
      {user && session?.access_token ? (
        <section id="keys" className="py-16 sm:py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Manage API Keys</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Create a new key for your agent, or review quotas and usage for existing keys.
              </p>
            </div>
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
              <ApiKeyManager accessToken={session.access_token} />
            </div>
          </div>
        </section>
      ) : (
        <section id="keys" className="py-16 sm:py-20 bg-white">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Sign in to manage API Keys
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Sign in to create an API Key and have it auto-filled in the config generator and
                safety check demo.
              </p>
              <Button onClick={() => (window.location.href = '/login?redirect=/ai')}>
                Sign in / Sign up
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ===================== MCP PLAYGROUND ===================== */}
      <section id="playground" className="py-16 sm:py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">MCP Tool Playground</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Test any of the 34 tools — including{' '}
              <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-sm text-slate-700">
                pre_trade_safety_check
              </code>{' '}
              and{' '}
              <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-sm text-slate-700">
                oracle_watch
              </code>{' '}
              — without leaving the browser.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
            <McpPlayground apiKey={defaultApiKey} />
          </div>
        </div>
      </section>

      <PricingCtaSection
        title="AI Agent Pricing"
        subtitle="MCP and safety-check calls share the same credit meter and billing as the REST API. New users get 30 free trial credits after email verification — Developer from 49 USDC/mo (10,000 credits) or pay-as-you-go top-up packs."
        buttonText="View Pricing"
      />
    </div>
  );
}

function UseCasesSection() {
  return (
    <section className="py-16 sm:py-20 bg-slate-50/40 border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">What can your agent ask?</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Once connected, ask in plain language — the agent picks the right MCP tool and returns
            the analysis, gating execution when risk is high.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {AGENT_USE_CASES.map((useCase) => (
            <div
              key={useCase.title}
              className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                <useCase.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-3">{useCase.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-mono bg-slate-50 p-3 rounded-lg">
                {useCase.prompt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConfigSnippetCard({
  title,
  filename,
  snippet,
}: {
  title: string;
  filename: string;
  snippet: string;
}) {
  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
      <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
        <Code2 className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <span className="ml-auto text-xs font-mono text-slate-500">{filename}</span>
      </div>
      <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
        {snippet}
      </pre>
    </div>
  );
}

function InfoTile({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-slate-900 mb-1.5">{title}</h4>
      <p className="text-xs text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
