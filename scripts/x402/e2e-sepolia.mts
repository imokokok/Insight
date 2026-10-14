/**
 * x402 paid-tier e2e check against the pre-trade endpoint (Base Sepolia).
 *
 * Stage 1 (always runs): anonymous request — asserts the endpoint answers 402
 *   with a machine-readable PAYMENT-REQUIRED quote, and prints the decoded
 *   payment terms (network, asset, amount, payTo).
 * Stage 2 (only when X402_E2E_PRIVATE_KEY is set): pays with a stock x402 v2
 *   fetch client, asserts 200 + verdict, and prints the decoded
 *   PAYMENT-RESPONSE settlement receipt (tx hash, payer, amount).
 *
 * Usage:
 *   BASE_URL=https://oracleinsight.xyz npx tsx scripts/x402/e2e-sepolia.mts
 *   X402_E2E_PRIVATE_KEY=0x... BASE_URL=http://localhost:3000 npx tsx scripts/x402/e2e-sepolia.mts
 *
 * Safety: the payer key must be a dedicated, balance-limited testnet key.
 * Never point this script at a funded mainnet wallet.
 */

import { ExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { privateKeyToAccount } from 'viem/accounts';

const BASE_URL = (process.env.BASE_URL ?? 'https://oracleinsight.xyz').replace(/\/+$/, '');
const PATH = '/api/v1/safety/pre-trade';
const QUERY = '?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000';
const NETWORK = 'eip155:84532' as const;

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

async function stage1Quote(): Promise<void> {
  const res = await fetch(`${BASE_URL}${PATH}${QUERY}`, {
    headers: { accept: 'application/json' },
  });

  const required = res.headers.get('payment-required');
  if (res.status !== 402 || !required) {
    console.error(
      `[stage1] FAIL: expected 402 + PAYMENT-REQUIRED, got ${res.status}. ` +
        'Is X402_ENABLED=true with a valid X402_PAY_TO on the target deployment?'
    );
    process.exit(1);
  }

  const quote = decodeBase64Json(required);
  console.log('[stage1] OK: 402 quote received');
  console.log(JSON.stringify(quote, null, 2));
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
  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: new ExactEvmScheme(signer), x402Version: 2 }],
  });
  const paidFetch = wrapFetchWithPayment(globalThis.fetch, client);

  const res = await paidFetch(`${BASE_URL}${PATH}${QUERY}`, {
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    console.error(`[stage2] FAIL: paid call returned ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }

  const receiptHeader = res.headers.get('payment-response');
  const body: unknown = await res.json();
  if (!isRecord(body) || !isRecord(body.data) || typeof body.data.verdict !== 'string') {
    console.error('[stage2] FAIL: paid response did not contain a verdict');
    process.exit(1);
  }

  if (!receiptHeader) {
    console.error('[stage2] FAIL: no PAYMENT-RESPONSE settlement receipt on 200 response');
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
    process.exit(1);
  }

  console.log('[stage2] OK: settlement confirmed, verdict =', body.data.verdict);
  console.log('[stage2] transaction =', transaction, 'payer =', payer, 'network =', NETWORK);
}

try {
  await stage1Quote();
  await stage2PaidCall();
  console.log('e2e done');
} catch (error) {
  console.error('e2e error:', error);
  process.exit(1);
}
