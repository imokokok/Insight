import Link from 'next/link';

import { ArrowRight, BookOpen, KeyRound, Radio, ShieldCheck, Coins } from 'lucide-react';

import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';
import { CodeBlock } from '@/components/shared/CodeBlock';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pay-per-Call Quickstart: x402 and MPP — Insight',
  description:
    'Call the Insight pre-trade safety check with no account or API key: pay $0.02 in USDC on Base via x402 or optional MPP. Copy-paste quickstarts for curl, TypeScript, Python, and MCP tools/call.',
  keywords: [
    'x402 quickstart',
    'MPP quickstart',
    'pay per call API',
    'USDC Base micropayments',
    'AI agent payments',
    'pre-trade safety check',
  ],
};

const ENDPOINT =
  'https://www.oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000';

const MCP_ENDPOINT = 'https://www.oracleinsight.xyz/api/mcp';

const PAY_FACTS = [
  {
    value: '$0.02',
    label: 'Per check (C3)',
    detail: 'USDC on Base via the configured facilitator for x402 or MPP',
  },
  {
    value: '0',
    label: 'Credentials',
    detail: 'No account, no API key: the 402 quote is the contract',
  },
  {
    value: 'HTTP 402',
    label: 'Machine-native',
    detail: 'Read the protocol challenge, sign EIP-3009, retry paid',
  },
  {
    value: 'EIP-712',
    label: 'Verifiable verdict',
    detail: 'Attestation receipts verify offline via verify-insight-receipt',
  },
];

const QUERY_PARAMS = [
  { name: 'asset', required: true, detail: 'Asset symbol, e.g. ETH, BTC, USDC' },
  {
    name: 'chainId',
    required: true,
    detail: 'Chain ID, e.g. 1=Ethereum, 8453=Base, 0=chain-agnostic',
  },
  { name: 'action', required: true, detail: 'swap | borrow | lend | liquidate | repay' },
  { name: 'tradeAmountUsd', required: true, detail: 'Trade size in USD, e.g. 1000' },
  {
    name: 'targetProviders',
    required: false,
    detail: 'Comma-separated oracle providers to restrict the check to',
  },
  {
    name: 'protocolId',
    required: false,
    detail: 'Lending protocol to evaluate against, e.g. aave-v3-ethereum',
  },
  {
    name: 'schemaVersion',
    required: false,
    detail: 'Attestation schema: 1 (default), 2 (quorum gate), 3 (adds independence gate)',
  },
];

const METERING_CLASSES = [
  { cls: 'C1', atomic: '2000', usd: '$0.002', detail: 'Lightweight reads (most catalog tools)' },
  { cls: 'C2', atomic: '8000', usd: '$0.008', detail: 'Standard analysis tools' },
  { cls: 'C3', atomic: '20000', usd: '$0.02', detail: 'Pre-trade safety check' },
  { cls: 'C4', atomic: '40000', usd: '$0.04', detail: 'Heaviest composite tools' },
];

const curlCode = `# Call without credentials: HTTP 402 with a PAYMENT-REQUIRED quote header
curl -sD - -o /dev/null "${ENDPOINT}" \\
  | grep -i '^payment-required' | cut -d' ' -f2- | base64 --decode | jq

# The decoded quote names everything an x402 client needs:
#   scheme "exact", network "eip155:8453" (Base),
#   USDC 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, 20000 atomic units ($0.02),
#   payTo 0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231.
# Sign EIP-3009 transferWithAuthorization, retry with PAYMENT-SIGNATURE, get the verdict.`;

const tsCode = `// npm i @x402/fetch @x402/evm viem
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY!);
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});
const client = new x402Client().register(
  'eip155:8453',
  new ExactEvmScheme(toClientEvmSigner(account, publicClient)),
);
const fetchWithPay = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPay('${ENDPOINT}');
const check = await res.json();
console.log(check.verdict, check.recommendedMaxPositionUsd);
// The 402 -> sign -> retry -> settle round trip is automatic.`;

const mppCode = `// npm i mppx viem
import { Mppx, evm } from 'mppx/client';
import { privateKeyToAccount } from 'viem/accounts';

const mppx = Mppx.create({
  methods: [
    evm.charge({
      account: privateKeyToAccount(process.env.EVM_PRIVATE_KEY!),
      networks: [8453],
      currencies: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
      maxAmount: '0.02',
    }),
  ],
});

// mppx reads the MPP challenge, signs the EIP-3009 authorization,
// retries with Authorization: Payment, and returns the safety-check JSON.
const res = await mppx.fetch('${ENDPOINT}');
const check = await res.json();
console.log(check.verdict, check.recommendedMaxPositionUsd);`;

const pyCode = `# pip install "x402[httpx,evm]"
import asyncio, os

from eth_account import Account
from x402 import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

URL = "${ENDPOINT}"


async def main():
    account = Account.from_key(os.environ["EVM_PRIVATE_KEY"])
    client = x402Client()
    register_exact_evm_client(client, EthAccountSigner(account))
    async with x402HttpxClient(client) as http:
        response = await http.get(URL)
        await response.aread()
        print(response.text)  # verdict JSON, payment settled automatically


asyncio.run(main())`;

const mcpCode = `// Any x402 v2 client works; the only difference from the REST example
// is the JSON-RPC POST body. tools/list and initialize stay free.
const rpcBody = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'pre_trade_safety_check',
    arguments: { asset: 'ETH', chainId: 1, action: 'swap', tradeAmountUsd: 1000 },
  },
};

const res = await fetchWithPay('${MCP_ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  },
  body: JSON.stringify(rpcBody),
});
// The settle receipt arrives in the payment-response header:
// decode it and read .transaction for the BaseScan link.`;

const verifyCode = `# 1. Verify a returned attestation receipt online (keyless, free):
curl -X POST https://www.oracleinsight.xyz/api/v1/safety/attestation/verify \\
  -H "Content-Type: application/json" --data @receipt.json

# 2. Or verify fully offline - recomputes the EIP-712 hash locally,
#    no API key, no database, no dependency on Insight being online:
npm install verify-insight-receipt`;

export default function X402QuickstartPage() {
  return (
    <div className="editorial-workspace evidence-workbench commercial-workbench min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="14"
          stage="Integrate"
          eyebrow="Pay per call, no account · x402 or MPP · USDC on Base"
          title="One wallet. One HTTP call. One verifiable verdict."
          description="The REST pre-trade safety check accepts x402 and optional MPP at the same price. An unauthenticated request receives an HTTP 402 challenge; your agent signs an EIP-3009 USDC authorization, retries, and receives the full check. Business errors are not settled. Every settled call is auditable on-chain; verdicts carry verifiable EIP-712 attestations. MCP calls continue to use x402."
          evidence={['No signup', 'Settle only on success', 'Offline-verifiable receipts']}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/safety-check"
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Try the check in your browser
              </Link>
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700"
              >
                <BookOpen className="h-4 w-4" />
                Credit plans &amp; API reference
              </Link>
            </div>
          }
        />

        <EvidenceProcessRail
          label="Paid call lifecycle"
          items={[
            { label: 'Request', detail: '402 advertises x402 and optional MPP terms' },
            { label: 'Sign & retry', detail: 'EIP-3009 USDC auth · payment protocol header' },
            { label: 'Verdict', detail: 'Facilitator settles on-chain · receipt is verifiable' },
          ]}
        />

        <div className="pricing-fact-ledger grid border-b border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
          {PAY_FACTS.map((fact, index) => (
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

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — See the quote</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                The HTTP 402 response is the price tag.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Before writing any code, inspect what an agent sees. Protocol-specific response
                headers carry the quote: x402 clients read{' '}
                <code className="font-mono">PAYMENT-REQUIRED</code>, while MPP clients read{' '}
                <code className="font-mono">WWW-Authenticate</code>.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={curlCode} label="terminal" />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">02 — TypeScript</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Five lines of setup, then just fetch.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Wrap <code className="font-mono text-base">fetch</code> with an x402 client and the
                402 round trip disappears: the wrapper signs, retries, and hands your code the
                verdict JSON. Fund the wallet with a few dollars of USDC on Base and point
                <code className="font-mono text-base">EVM_PRIVATE_KEY</code> at it.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={tsCode} label="pre-trade.mts" />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">03 — MPP</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Use the standard Payment authorization scheme.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                When MPP is enabled on the deployment, the same REST endpoint advertises an MPP
                <code className="font-mono text-base"> evm/charge</code> challenge alongside its
                x402 quote. The mppx client handles the challenge and sends its credential in{' '}
                <code className="font-mono text-base">Authorization: Payment</code>. Both rails use
                the configured price and USDC recipient.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={mppCode} label="pre-trade.mts · MPP" />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
            MPP is deployment-opt-in. The REST endpoint settles only after a successful check;
            <code className="font-mono"> /api/mcp</code> currently uses x402.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">04 — Python</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                httpx with a paying transport.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                The official Python SDK intercepts the 402 inside an httpx async transport, so your
                LangChain or custom agent loop stays untouched.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={pyCode} label="pre-trade.py" />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">05 — MCP tools/call</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                40 tools over MCP, paid per call.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                The Model Context Protocol endpoint at{' '}
                <code className="font-mono text-base">{MCP_ENDPOINT}</code> lets any agent browse
                the 40-tool catalog for free (initialize, tools/list, ping). Unauthenticated{' '}
                <code className="font-mono text-base">tools/call</code> is priced by the tool&apos;s
                metering class and settles through the same x402 rail. With an{' '}
                <code className="font-mono text-base">X-API-Key</code>, calls draw from the credit
                wallet instead.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={mcpCode} label="mcp-tools-call.mts" />
          </div>
          <div className="mt-6 overflow-x-auto border-b border-slate-900/15">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-900/15 text-xs uppercase tracking-[0.1em] text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Class</th>
                  <th className="py-3 pr-4 font-semibold">Atomic units</th>
                  <th className="py-3 pr-4 font-semibold">USDC</th>
                  <th className="py-3 font-semibold">Typical tools</th>
                </tr>
              </thead>
              <tbody>
                {METERING_CLASSES.map((row) => (
                  <tr key={row.cls} className="border-b border-slate-900/10 last:border-b-0">
                    <td className="py-3 pr-4 font-mono font-semibold text-slate-900">{row.cls}</td>
                    <td className="py-3 pr-4 font-mono text-slate-600">{row.atomic}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{row.usd}</td>
                    <td className="py-3 text-slate-600">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="verify" className="scroll-mt-20 py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">06 — Verify what you paid for</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                A BLOCK verdict is still a complete check.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                The product is the answer, not the outcome: a BLOCK is a fully computed check and is
                charged like any other verdict. What you get back carries a verifiable EIP-712
                attestation, so the receipt itself proves which oracle keys, quorum, and
                independence gates produced it. Key response fields:{' '}
                <code className="font-mono text-sm">verdict</code>,{' '}
                <code className="font-mono text-sm">staleDataRisk</code>,{' '}
                <code className="font-mono text-sm">consensusPrice</code>,{' '}
                <code className="font-mono text-sm">maxDeviationPct</code>,{' '}
                <code className="font-mono text-sm">participantCount</code>,{' '}
                <code className="font-mono text-sm">manipulationRiskScore</code>,{' '}
                <code className="font-mono text-sm">crossProviderAgreement</code>,{' '}
                <code className="font-mono text-sm">recommendedMaxPositionUsd</code>.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={verifyCode} label="verify.sh" />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">07 — Reference</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Query parameters and discovery.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Four parameters are required; the rest tune the check. Machine-readable discovery
                lives at the site root for agents that prefer manifests over HTML.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto border-b border-slate-900/15">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-900/15 text-xs uppercase tracking-[0.1em] text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Parameter</th>
                  <th className="py-3 pr-4 font-semibold">Required</th>
                  <th className="py-3 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {QUERY_PARAMS.map((row) => (
                  <tr key={row.name} className="border-b border-slate-900/10 last:border-b-0">
                    <td className="py-3 pr-4 font-mono font-semibold text-slate-900">{row.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.required ? 'Yes' : 'No'}</td>
                    <td className="py-3 text-slate-600">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Radio,
                label: 'Discovery manifest',
                href: 'https://www.oracleinsight.xyz/.well-known/x402.json',
                detail: '.well-known/x402.json',
              },
              {
                icon: BookOpen,
                label: 'OpenAPI discovery doc',
                href: 'https://www.oracleinsight.xyz/openapi.json',
                detail: 'openapi.json with pricing block',
              },
              {
                icon: KeyRound,
                label: 'MCP server card',
                href: 'https://www.oracleinsight.xyz/.well-known/mcp/server-card.json',
                detail: '40-tool catalog, no handshake needed',
              },
              {
                icon: Coins,
                label: 'Credit plans',
                href: '/pricing',
                detail: 'For teams with ongoing volume',
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group border-b border-slate-900/10 bg-white/55 p-5 transition-colors hover:bg-blue-50/30"
              >
                <item.icon className="h-5 w-5 text-blue-600" />
                <p className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/safety-check"
              className="inline-flex items-center gap-2 border border-blue-600 bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Run a free check in the browser
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/ai"
              className="inline-flex items-center gap-2 border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-700"
            >
              Connect Claude or Cursor via MCP
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
