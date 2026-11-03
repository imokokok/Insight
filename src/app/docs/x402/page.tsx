import Link from 'next/link';

import { ArrowRight, BookOpen, KeyRound, Radio, ShieldCheck, Coins } from 'lucide-react';

import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';
import { CodeBlock } from '@/components/shared/CodeBlock';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pay-per-Call Quickstart: x402 and MPP — Insight',
  description:
    'Call the Insight pre-trade safety check with no account or API key: pay in USDC on configured EVM or Solana networks via x402, or the configured EVM network via optional MPP.',
  keywords: [
    'x402 quickstart',
    'MPP quickstart',
    'pay per call API',
    'USDC EVM micropayments',
    'AI agent payments',
    'pre-trade safety check',
  ],
};

const ENDPOINT =
  'https://www.oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000';

const MCP_ENDPOINT = 'https://www.oracleinsight.xyz/api/mcp';
const MCP_MPP_ENDPOINT = 'https://www.oracleinsight.xyz/api/mcp/mpp';

const PAY_FACTS = [
  {
    value: '$0.02',
    label: 'Per check (C3)',
    detail: 'USDC on configured EVM or Solana x402 networks; MPP remains EVM-only',
  },
  {
    value: '0',
    label: 'Credentials',
    detail: 'No account, no API key: the 402 quote is the contract',
  },
  {
    value: 'HTTP 402',
    label: 'Machine-native',
    detail: 'Read the payment challenge, sign with the selected network scheme, retry',
  },
  {
    value: 'Signed',
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
# The fixed entry label is optional aggregate attribution, never an identity.
curl -sD - -o /dev/null -H 'X-Insight-Entry-Source: docs' "${ENDPOINT}" \\
  | grep -i '^payment-required' | cut -d' ' -f2- | base64 --decode | jq

# Example Base option from the decoded quote:
#   scheme "exact", network "eip155:8453" (Base),
#   USDC 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, 20000 atomic units ($0.02),
#   payTo 0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231.
# The quote lists each configured EVM network; an enabled Solana option is listed too.
# The registered x402 scheme signs the selected option, retries, and returns the verdict.`;

const tsCode = `// npm i @x402/fetch @x402/evm viem
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY!);
const client = new x402Client().register(
  'eip155:*',
  new ExactEvmScheme(toClientEvmSigner(account)),
);
const fetchWithPay = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPay('${ENDPOINT}', {
  headers: { 'X-Insight-Entry-Source': 'docs' },
});
const check = await res.json();
console.log(check.verdict, check.recommendedMaxPositionUsd);
// This covers standard EIP-3009 EVM options. BNB Chain uses the AEON mandate
// scheme documented below; do not register the stock scheme for eip155:56.`;

const solanaTsCode = `// npm i @x402/fetch @x402/svm @solana/kit @scure/base
import { base58 } from '@scure/base';
import { createKeyPairSignerFromBytes } from '@solana/kit';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactSvmScheme } from '@x402/svm/exact/client';

const secret = process.env.SOLANA_PRIVATE_KEY;
if (!secret) throw new Error('Set SOLANA_PRIVATE_KEY in the server environment');

const signer = await createKeyPairSignerFromBytes(base58.decode(secret));
const client = new x402Client().register(
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  new ExactSvmScheme(signer),
);
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// The API may advertise configured EVM and Solana options. This client selects Solana.
const res = await fetchWithPay('${ENDPOINT}', {
  headers: { 'X-Insight-Entry-Source': 'docs' },
});
const check = await res.json();
console.log(check.verdict, check.recommendedMaxPositionUsd);
// Keep the signing key in a server-side or constrained signing service.`;

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
        response = await http.get(URL, headers={"X-Insight-Entry-Source": "docs"})
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
    'X-Insight-Entry-Source': 'docs',
  },
  body: JSON.stringify(rpcBody),
});
// The settle receipt arrives in the payment-response header:
// decode it and read .transaction for the matching chain explorer link.`;

const mcpMppCode = `// npm i @modelcontextprotocol/sdk mppx viem
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { evm } from 'mppx/client';
import { McpClient } from 'mppx/mcp/client';
import { privateKeyToAccount } from 'viem/accounts';

const client = new Client({ name: 'insight-agent', version: '1.0.0' });
await client.connect(
  new StreamableHTTPClientTransport(new URL('${MCP_MPP_ENDPOINT}')),
);

const paidClient = McpClient.wrap(client, {
  methods: [
    evm.charge({
      account: privateKeyToAccount(process.env.EVM_PRIVATE_KEY!),
      networks: [8453],
      currencies: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
      maxAmount: '0.02',
    }),
  ],
});

const result = await paidClient.callTool({
  name: 'pre_trade_safety_check',
  arguments: { asset: 'ETH', chainId: 1, action: 'swap', tradeAmountUsd: 1000 },
});
console.log(result.content, result.receipt);`;

const verifyCode = `# 1. Verify a returned attestation receipt online (keyless, free):
curl -X POST https://www.oracleinsight.xyz/api/v1/safety/attestation/verify \\
  -H "Content-Type: application/json" --data @receipt.json

# 2. Or verify fully offline - recomputes the EIP-712 hash locally,
#    no API key, no database, no dependency on Insight being online:
npm install verify-insight-receipt`;

/**
 * One "first paid call in ~10 minutes" row per guard family. The REST call is
 * the same 402-then-pay round trip as the pre-trade example above; only the
 * path and query differ. Prices follow the metering classes: every guard
 * decision is C3 ($0.02); the two 24h products are plan-priced.
 */
const GUARD_QUICKSTARTS = [
  {
    family: 'Execution preflight',
    path: '/api/v1/safety/preflight',
    method: 'GET',
    query: 'asset=MON&chainId=143&action=swap&tradeAmountUsd=1000&destinationAsset=USDC',
    mcp: 'execution_preflight',
    decides: 'ALLOW / CAUTION / BLOCK data-sufficiency for one declared action',
    price: '$0.02 (C3)',
  },
  {
    family: 'Base Lending Guard',
    path: '/api/v1/safety/base-lending-guard',
    method: 'GET',
    query:
      'protocolId=aave-v3-base&action=borrow&collateralSymbol=WETH&loanSymbol=USDC&collateralValueUsd=10000&debtValueUsd=4000',
    mcp: 'base_lending_guard · base_lending_guard_exact_call',
    decides: 'Aave V3, Morpho Blue, Compound V3, Moonwell on Base',
    price: '$0.02 (C3)',
  },
  {
    family: 'Base Perp Guard',
    path: '/api/v1/safety/base-perp-guard',
    method: 'GET',
    query:
      'protocolId=synthetix-perps-v3-base&action=open_long&assetSymbol=ETH&marginAssetSymbol=USDC&sizeUsd=25000&marginValueUsd=5000',
    mcp: 'base_perp_guard · base_perp_guard_exact_call',
    decides: 'Synthetix Perps V3 open: oracle integrity + leverage caps',
    price: '$0.02 (C3)',
  },
  {
    family: 'Hyperliquid Perp Guard',
    path: '/api/v1/safety/hyperliquid-perp-guard',
    method: 'GET',
    query:
      'protocolId=hyperliquid-perps-mainnet&action=open_long&assetSymbol=BTC&marginAssetSymbol=USDC&sizeUsd=25000&marginValueUsd=5000',
    mcp: 'hyperliquid_perp_guard · hyperliquid_perp_guard_exact_call',
    decides: 'HyperCore order intent: oracle integrity + leverage vs margin',
    price: '$0.02 (C3)',
  },
  {
    family: 'Monad Lending Guard',
    path: '/api/v1/safety/monad-lending-guard',
    method: 'GET',
    query:
      'protocolId=aave-v3-monad&action=borrow&collateralSymbol=WETH&loanSymbol=USDC&collateralValueUsd=10000&debtValueUsd=4000',
    mcp: 'monad_lending_guard · monad_lending_guard_exact_call',
    decides: 'Aave V3 Monad, exact Morpho Blue Monad markets',
    price: '$0.02 (C3)',
  },
  {
    family: 'Multichain EVM Lending Guard',
    path: '/api/v1/safety/multichain-evm-lending-guard',
    method: 'GET',
    query:
      'chainId=42161&protocolId=aave-v3-arbitrum&action=borrow&collateralSymbol=WETH&loanSymbol=USDC&collateralValueUsd=10000&debtValueUsd=4000',
    mcp: 'multichain_evm_lending_guard · _exact_call',
    decides: 'Aave, Venus, Lista, Compound, Dolomite, Euler v2, Fluid T1',
    price: '$0.02 (C3)',
  },
  {
    family: 'Solana Lending Guard',
    path: '/api/v1/safety/solana-lending-guard',
    method: 'POST',
    query: '(POST body: exact unsigned Kamino / Marginfi / Jupiter Earn / Save instruction)',
    mcp: 'solana_lending_guard · loopscale_vault_deposit',
    decides: 'One direct Solana deposit instruction, simulated before attestation',
    price: '$0.02 (C3)',
  },
  {
    family: 'Verified Swap Intent',
    path: '/api/v1/safety/swap-intent',
    method: 'GET',
    query:
      'sourceAsset=ETH&destinationAsset=USDC&subjectChainId=1&settlementChainId=1&declaredNotionalUsd=1000',
    mcp: 'agent_begin_trade · verify_execution_pair',
    decides: 'Two schema-v3 gates + one execution-receipt credit per swap',
    price: '$0.02 (C3)',
  },
  {
    family: 'Oracle Watch Window (24h)',
    path: '/api/v1/safety/oracle-watch-window',
    method: 'POST',
    query: '(POST body: {"symbol":"BTC","chain":"hyperevm"}; returns a one-time window token)',
    mcp: 'REST-first (token-authed in-window polls)',
    decides: '24h of continuous halt/proceed signals for one position',
    price: '$0.50 per window',
  },
  {
    family: 'Position Lifecycle Bundle (24h)',
    path: '/api/v1/safety/position-lifecycle',
    method: 'POST',
    query: '(POST body: {"symbol":"BTC","chain":"hyperevm"}; returns a one-time lifecycle token)',
    mcp: 'REST-first (bundled calls are token-authed)',
    decides: 'Embedded window + 4 guard assessments + 1 attested receipt',
    price: '$0.55 per lifecycle',
  },
];

const guardQuickstartCode = `# Every guard follows the same three steps as pre-trade:
# 1) call without credentials -> HTTP 402 quote
# 2) sign the quoted option with your x402 client
# 3) retry -> verdict JSON + PAYMENT-RESPONSE settlement header

# Example: Hyperliquid Perp Guard preview (GET, $0.02 / C3)
curl -sD - -o /dev/null -H 'X-Insight-Entry-Source: docs' \\
  "https://www.oracleinsight.xyz/api/v1/safety/hyperliquid-perp-guard?protocolId=hyperliquid-perps-mainnet&action=open_long&assetSymbol=BTC&marginAssetSymbol=USDC&sizeUsd=25000&marginValueUsd=5000" \\
  | grep -i '^payment-required' | cut -d' ' -f2- | base64 --decode | jq

# Example: buy a 24h Position Lifecycle Bundle (POST, $0.55 flat)
curl -sD - -o /dev/null -X POST \\
  "https://www.oracleinsight.xyz/api/v1/safety/position-lifecycle" \\
  -H 'Content-Type: application/json' \\
  --data '{"symbol":"BTC","chain":"hyperevm"}' \\
  | grep -i '^payment-required' | cut -d' ' -f2- | base64 --decode | jq
# The purchase returns a one-time lifecycle token; the bundled window polls,
# guard assessments, and receipt are then token-authenticated, never re-charged.`;

export default function X402QuickstartPage() {
  return (
    <div className="editorial-workspace evidence-workbench commercial-workbench min-h-screen">
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="14"
          stage="Integrate"
          eyebrow="Pay per call, no account · x402 across EVM and Solana · optional MPP"
          title="One wallet. One HTTP call. One verifiable verdict."
          description="The REST pre-trade safety check can advertise x402 payment options on configured EVM and Solana networks; optional MPP remains on the configured EVM network. The full MCP catalog supports x402 and API keys. Payment is verified first and settled only after a successful check. Settlements are auditable on-chain, and verdicts carry verifiable attestations."
          evidence={['No signup', 'Settle only on success', 'Offline-verifiable receipts']}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/decision-integrity#pre-trade"
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-blue-700 hover:bg-blue-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Try a pre-trade assessment in your browser
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
            { label: 'Sign & retry', detail: 'EVM or Solana USDC · x402 payment header' },
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
                402 round trip disappears: the wrapper signs on the advertised standard EVM network,
                retries, and hands your code the verdict JSON. BNB Chain uses a separate AEON
                mandate scheme; the next sections cover that exception and Solana.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={tsCode} label="pre-trade.mts" />
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">
            Configure comma-separated CAIP-2 ids in{' '}
            <code className="font-mono">X402_EVM_NETWORKS</code> to advertise multiple EVM chains.
            The registry includes Ethereum, OP Mainnet, Arbitrum, Polygon, Avalanche, Sei, X Layer,
            Monad, HyperEVM, BNB Chain, Base, and Base Sepolia. If the variable is unset, x402 uses
            only <code className="font-mono">X402_NETWORK</code>; that setting remains MPP&apos;s
            single EVM network. Use <code className="font-mono">X402_PAY_TO</code> for a shared
            recipient or <code className="font-mono">X402_EVM_PAY_TOS</code> for explicit{' '}
            <code className="font-mono">network=recipient</code> treasury isolation. Use{' '}
            <code className="font-mono">X402_FACILITATOR_URLS</code> for per-network{' '}
            <code className="font-mono">network=https://facilitator</code> routing. Only list
            networks advertised by that facilitator&apos;s{' '}
            <code className="font-mono">/supported</code> endpoint. HyperEVM uses{' '}
            <code className="font-mono">eip155:999</code> with UVD&apos;s
            <code className="font-mono">https://facilitator.ultravioletadao.xyz</code> override.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">03 — BNB Chain</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                BNB uses a mandate, not stock EIP-3009.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Binance-Peg USDC has no EIP-3009 authorization entrypoint. A BNB payer must register
                Insight&apos;s AEON mandate scheme for{' '}
                <code className="font-mono text-base">eip155:56</code>, which makes a one-time
                ERC-20 allowance transaction before signing the exact payment. The standard wildcard
                EVM example above must not be used for BNB.
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-slate-500">
            The maintained adapter is exported by the{' '}
            <Link
              href="https://github.com/imokokok/Insight/tree/main/integrations/elizaos-plugin-insight"
              className="text-primary-700 hover:underline"
            >
              Insight ElizaOS integration
            </Link>{' '}
            as <code className="font-mono">ExactEvmMandateScheme</code> and{' '}
            <code className="font-mono">createMandateSignerFromKey</code>. Use a dedicated,
            balance-capped agent key; the facilitator can pull the allowance granted by that key.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">04 — Solana x402</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Pay with Solana USDC.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                When Solana is enabled on the deployment, the endpoint advertises a Solana x402 V2{' '}
                <code className="font-mono text-base">exact</code> option alongside the enabled EVM
                options. Register the Solana scheme in your client and keep its signer on the server
                or behind a spending-limited signing interface. The selected facilitator must
                advertise support for this exact network and scheme.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={solanaTsCode} label="pre-trade-solana.mts" />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
            Server setup uses <code className="font-mono">X402_SOLANA_ENABLED</code>,{' '}
            <code className="font-mono">X402_SOLANA_NETWORK</code>, and{' '}
            <code className="font-mono">X402_SOLANA_PAY_TO</code>. To route Solana through a
            different facilitator than EVM, add its CAIP-2 id to{' '}
            <code className="font-mono">X402_FACILITATOR_URLS</code>. Devnet uses{' '}
            <code className="font-mono">solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1</code>; mainnet uses{' '}
            <code className="font-mono">solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp</code> and is
            opt-in. Create the recipient USDC associated token account and confirm facilitator
            support before enabling it. Set{' '}
            <code className="font-mono">X402_EVM_ENABLED=false</code> when enabling Solana without
            activating an EVM recipient.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">05 — MPP</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Use the standard Payment authorization scheme.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                When MPP is enabled on the deployment, the REST endpoint advertises an MPP
                <code className="font-mono text-base"> evm</code> charge offer alongside its x402
                quote. The dedicated MCP pilot uses standard MPP challenge, credential, and receipt
                metadata. The mppx client handles challenges and sends its credential in{' '}
                <code className="font-mono text-base">Authorization: Payment</code>. Both rails use
                the configured EVM price and USDC recipient. MPP does not use the Solana x402
                option.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={mppCode} label="pre-trade.mts · MPP" />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
            MPP is deployment-opt-in. The REST endpoint settles only after a successful check. The
            MPP MCP pilot is at <code className="font-mono">/api/mcp/mpp</code> and supports only{' '}
            <code className="font-mono">pre_trade_safety_check</code>; the full catalog at{' '}
            <code className="font-mono">/api/mcp</code> keeps its x402 and API-key payment paths.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">05 — Python</p>
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
            <p className="editorial-index">06 — MCP tools/call</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                40+ tools over MCP, paid per call.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                The Model Context Protocol endpoint at{' '}
                <code className="font-mono text-base">{MCP_ENDPOINT}</code> lets any agent browse
                the 40+-tool catalog for free (initialize, tools/list, ping). Unauthenticated{' '}
                <code className="font-mono text-base">tools/call</code> is priced by the tool&apos;s
                metering class and settles through the same x402 rail. With an{' '}
                <code className="font-mono text-base">X-API-Key</code>, calls draw from the credit
                wallet instead. The MPP pilot at{' '}
                <code className="font-mono text-base">{MCP_MPP_ENDPOINT}</code>
                accepts only <code className="font-mono text-base">pre_trade_safety_check</code>;
                its challenge is bound to the tool arguments and settles only after success.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CodeBlock code={mcpCode} label="mcp-tools-call.mts" />
          </div>
          <div className="mt-6">
            <CodeBlock code={mcpMppCode} label="mcp-tools-call.mts · MPP" />
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
            <p className="editorial-index">07 — Verify what you paid for</p>
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

      <section id="guard-families" className="scroll-mt-20 py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">08 — Guard family quickstarts</p>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                First paid call in ~10 minutes, for every guard.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Every guard family below is a x402 v2 resource: call it without credentials, receive
                the HTTP 402 quote, pay, and retry — the same three steps as the pre-trade example
                in section 02, only the path and parameters differ. Each row also names the MCP tool
                equivalent, so an agent can pick either surface. All guard decisions are C3 ($0.02
                per complete decision); the two 24h products are flat-priced.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto border-b border-slate-900/15">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-900/15 text-xs uppercase tracking-[0.1em] text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Family</th>
                  <th className="py-3 pr-4 font-semibold">Endpoint / MCP tool</th>
                  <th className="py-3 pr-4 font-semibold">What it decides</th>
                  <th className="py-3 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {GUARD_QUICKSTARTS.map((g) => (
                  <tr key={g.path} className="border-b border-slate-900/10 last:border-b-0">
                    <td className="py-3 pr-4 align-top">
                      <span className="font-semibold text-slate-900">{g.family}</span>
                      <br />
                      <code className="font-mono text-xs text-slate-600">
                        {g.method} {g.path}
                      </code>
                      <br />
                      <span className="text-xs text-slate-500">{g.query}</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">{g.mcp}</td>
                    <td className="py-3 pr-4 text-slate-600">{g.decides}</td>
                    <td className="py-3 font-semibold text-slate-900">{g.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
            POST exact-call guards and the two 24h products take a JSON body instead of query
            params; the Solana guards simulate the exact unsigned message before returning a
            decision. Every guard is read-only: it never signs, broadcasts, or authorizes a
            transaction.
          </p>
          <div className="mt-6">
            <CodeBlock code={guardQuickstartCode} label="guard-quickstart.sh" />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">09 — Reference</p>
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
                href: 'https://www.oracleinsight.xyz/.well-known/x402',
                detail: '.well-known/x402',
              },
              {
                icon: BookOpen,
                label: 'OpenAPI discovery doc',
                href: 'https://www.oracleinsight.xyz/openapi.json',
                detail: 'Live OpenAPI with standard MPP offers',
              },
              {
                icon: KeyRound,
                label: 'MCP server card',
                href: 'https://www.oracleinsight.xyz/.well-known/mcp/server-card.json',
                detail: '40+ tool catalog, no handshake needed',
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
              href="/decision-integrity#pre-trade"
              className="inline-flex items-center gap-2 border border-blue-600 bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Run a free pre-trade assessment in the browser
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
