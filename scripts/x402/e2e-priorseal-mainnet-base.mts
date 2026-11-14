/**
 * PriorSeal x402 paid-tier e2e rehearsal against the integration-readiness
 * endpoint (Base MAINNET, eip155:8453).
 *
 * Mirrors insight/scripts/x402/e2e-mainnet-base.mts but targets priorseal.xyz.
 * The settle goes through the CDP facilitator (PRIORSEAL_X402_FACILITATOR_URL
 * + PRIORSEAL_X402_FACILITATOR_AUTH_MODE=cdp), which is what registers the
 * resource in the Coinbase CDP x402 Bazaar on first real settlement.
 *
 * Supports X402_E2E_PROXY (e.g. http://127.0.0.1:7890) when the local network
 * blocks Cloudflare-hosted origins (SNI interference) — all fetches are routed
 * through the proxy via undici ProxyAgent.
 *
 * Usage:
 *   X402_E2E_PRIVATE_KEY=0x... [X402_E2E_PROXY=http://127.0.0.1:7890] \
 *     npx tsx scripts/x402/e2e-priorseal-mainnet-base.mts
 *
 * Safety: the payer key must be a dedicated, balance-limited mainnet key
 * (~/.workbuddy/secrets/x402-pay.key). EIP-3009 exact scheme settles server-side,
 * so the payer needs USDC balance but zero gas.
 */

import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { privateKeyToAccount } from 'viem/accounts';

const BASE_URL = (process.env.X402_E2E_BASE_URL ?? 'https://priorseal.xyz').replace(/\/+$/, '');
const PATH = '/v1/integration-readiness';
const NETWORK = 'eip155:8453' as const;
// The endpoint requires chainId + subjectAddress; without a rehearsal key
// fall back to the zero address for quote-only runs.
const QUOTE_QUERY = '?chainId=8453&subjectAddress=0x0000000000000000000000000000000000000000';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeBase64Json(value: string): Record<string, unknown> {
  const json = Buffer.from(value, 'base64').toString('utf8');
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) {
    throw new Error('payment header did not contain a JSON object');
  }
  return parsed;
}

// The endpoint rejects the zero address (400 INVALID_REQUEST): quote stage must
// present a real payer address when a rehearsal key is available.
function payerAddressForQuote(): string | null {
  const rawKey = process.env.X402_E2E_PRIVATE_KEY?.trim();
  if (rawKey && /^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
    return privateKeyToAccount(rawKey as `0x${string}`).address;
  }
  return null;
}

async function stage1Quote(): Promise<void> {
  const payer = payerAddressForQuote();
  const query = payer ? `?chainId=8453&subjectAddress=${payer}` : QUOTE_QUERY;
  const res = await fetch(`${BASE_URL}${PATH}${query}`, {
    headers: { accept: 'application/json' },
  });

  const required = res.headers.get('payment-required');
  if (res.status !== 402 || !required) {
    console.error(`[stage1] FAIL: expected 402 + PAYMENT-REQUIRED, got ${res.status}.`);
    console.error((await res.text()).slice(0, 400));
    process.exit(1);
  }

  const quote = decodeBase64Json(required);
  console.log('[stage1] OK: 402 quote received');
  const accepts = (quote as { accepts?: unknown }).accepts;
  if (Array.isArray(accepts)) {
    for (const a of accepts) {
      if (isRecord(a) && typeof a.network === 'string' && a.network === NETWORK) {
        console.log('[stage1] Base mainnet terms:', JSON.stringify(a));
      }
    }
  }
}

async function stage2PaidCall(): Promise<void> {
  const rawKey = process.env.X402_E2E_PRIVATE_KEY?.trim();
  if (!rawKey) {
    console.log('[stage2] SKIP: X402_E2E_PRIVATE_KEY not set (quote-only run)');
    return;
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
    console.error('[stage2] FAIL: X402_E2E_PRIVATE_KEY must be 32-byte 0x hex');
    process.exit(1);
  }

  const signer = privateKeyToAccount(rawKey as `0x${string}`);
  const paidQuery = `?chainId=8453&subjectAddress=${signer.address}`;
  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: new ExactEvmScheme(signer), x402Version: 2 }],
  });
  const paidFetch = wrapFetchWithPayment(globalThis.fetch, client);

  const res = await paidFetch(`${BASE_URL}${PATH}${paidQuery}`, {
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    console.error(`[stage2] FAIL: paid call returned ${res.status}`);
    console.error((await res.text()).slice(0, 600));
    process.exit(1);
  }

  const receiptHeader = res.headers.get('payment-response');
  if (!receiptHeader) {
    console.error('[stage2] FAIL: no PAYMENT-RESPONSE settlement receipt on 200 response');
    console.error((await res.text()).slice(0, 600));
    process.exit(1);
  }

  const receipt = decodeBase64Json(receiptHeader);
  const transaction = receipt.transaction;
  const payer = receipt.payer;
  const validTransaction =
    typeof transaction === 'string' && /^0x[0-9a-fA-F]{64}$/.test(transaction);
  const validPayer =
    typeof payer === 'string' && payer.toLowerCase() === signer.address.toLowerCase();
  if (receipt.success !== true || receipt.network !== NETWORK || !validPayer || !validTransaction) {
    const reason =
      typeof receipt.errorReason === 'string' ? receipt.errorReason : 'settlement_receipt_invalid';
    console.error(`[stage2] FAIL: payment was not confirmed (${reason})`);
    console.error('[stage2] raw receipt:', JSON.stringify(receipt, null, 2));
    process.exit(1);
  }

  console.log('[stage2] OK: settlement confirmed via facilitator');
  console.log('[stage2] transaction =', transaction, 'payer =', payer, 'network =', NETWORK);
}

if (process.env.X402_E2E_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.X402_E2E_PROXY));
  console.log('[proxy] routing all fetches through', process.env.X402_E2E_PROXY);
}

try {
  await stage1Quote();
  await stage2PaidCall();
  console.log('e2e done');
} catch (error) {
  console.error('e2e error:', error);
  process.exit(1);
}
