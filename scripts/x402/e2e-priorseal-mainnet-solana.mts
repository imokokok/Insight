/**
 * PriorSeal x402 paid-tier e2e rehearsal on Solana MAINNET
 * (solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp), settling through the PayAI SVM
 * facilitator against the integration-readiness smoke endpoint.
 *
 * Pays the production smoke endpoint with a stock x402 v2 SVM client, asserts
 * 200 + a well-formed settlement receipt (Solana signature, payer), prints the
 * decoded PAYMENT-RESPONSE header. The smoke endpoint verifies payment and
 * signed delivery only; use e2e-priorseal-mainnet-base/bsc for EVM product
 * flows.
 *
 * FEE_PAYER_OVERRIDE: PayAI's public /supported lane and its settlement lane
 * can advertise different fee payers (docs.payai.network: "A public
 * unauthenticated /supported response may use a different lane"). When the
 * quote-hint fee payer is rejected with "feePayer not managed", override it
 * with the wallet observed actively settling on mainnet.
 *
 * Usage:
 *   SATI_PAYER_KEYPAIR_PATH=~/.workbuddy/secrets/x402-solana-payer.json \
 *   SATI_RPC_URL="https://mainnet.helius-rpc.com/?api-key=..." \
 *   [FEE_PAYER_OVERRIDE=CjNFTjvBhbJJd2B5ePPMHRLx1ELZpa8dwQgGL727eKww] \
 *   npx tsx scripts/x402/e2e-priorseal-mainnet-solana.mts
 */

import { ExactSvmScheme } from '@x402/svm/exact/client';
import { x402Client } from '@x402/fetch';
import { x402HTTPClient } from '@x402/core/http';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import fs from 'node:fs';

const PROXY = process.env.X402_E2E_PROXY?.trim();
if (PROXY) setGlobalDispatcher(new ProxyAgent(PROXY));

const BASE_URL = (process.env.X402_E2E_BASE_URL ?? 'https://priorseal.xyz').replace(/\/+$/, '');
const PATH = '/v1/integration-readiness/smoke';
const QUERY = '?chainId=101';
const NETWORK = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
const FEE_PAYER_OVERRIDE = process.env.FEE_PAYER_OVERRIDE?.trim() || '';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeBase64Json(value: string): Record<string, unknown> {
  const json = Buffer.from(value, 'base64').toString('utf8');
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) throw new Error('payment header did not contain a JSON object');
  return parsed;
}

async function main(): Promise<void> {
  const keypairPath = process.env.SATI_PAYER_KEYPAIR_PATH;
  if (!keypairPath) throw new Error('SATI_PAYER_KEYPAIR_PATH is required');
  const kp = JSON.parse(fs.readFileSync(keypairPath, 'utf8')) as {
    secretKeyBase64: string;
    publicKeyBase58: string;
  };
  const secret64 = Buffer.from(kp.secretKeyBase64, 'base64');
  if (secret64.length !== 64) throw new Error(`unexpected key length ${secret64.length}`);
  const signer = await createKeyPairSignerFromPrivateKeyBytes(secret64.subarray(0, 32));
  if (signer.address !== kp.publicKeyBase58) {
    throw new Error(`derived ${signer.address} != declared ${kp.publicKeyBase58}`);
  }
  console.log('payer       :', signer.address);

  const rpcUrl = process.env.SATI_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  const client = x402Client.fromConfig({
    schemes: [
      { network: NETWORK, client: new ExactSvmScheme(signer, { rpcUrl } as never), x402Version: 2 },
    ],
  });
  const http = new x402HTTPClient();

  const url = `${BASE_URL}${PATH}${QUERY}`;
  console.log('resource    :', url);

  // stage 1: anonymous 402 quote
  const res1 = await fetch(url, { headers: { accept: 'application/json' } });
  const requiredHeader = res1.headers.get('payment-required');
  if (res1.status !== 402 || !requiredHeader) {
    throw new Error(`expected 402 + payment-required, got ${res1.status}`);
  }
  const quote = http.getPaymentRequiredResponse(
    (name) => res1.headers.get(name),
    await res1.json().catch(() => undefined)
  );

  // stage 2: optional fee payer lane override
  const accepts = (quote.accepts ?? []) as Array<Record<string, unknown>>;
  const solAccept = accepts.find((a) => a.network === NETWORK);
  if (!solAccept) throw new Error(`no ${NETWORK} accept in quote`);
  const hintFeePayer = (solAccept.extra as Record<string, unknown> | undefined)?.feePayer;
  console.log('quote feePayer:', hintFeePayer);
  if (FEE_PAYER_OVERRIDE && hintFeePayer !== FEE_PAYER_OVERRIDE) {
    solAccept.extra = {
      ...(solAccept.extra as Record<string, unknown>),
      feePayer: FEE_PAYER_OVERRIDE,
    };
    console.log('override    : feePayer ->', FEE_PAYER_OVERRIDE);
  }

  // stage 3: build payload and pay
  const payload = await client.createPaymentPayload(quote);
  const headers = http.encodePaymentSignatureHeader(payload);
  const res2 = await fetch(url, { headers: { ...headers, accept: 'application/json' } });
  const receiptHeader = res2.headers.get('payment-response');
  if (!res2.ok || !receiptHeader) {
    console.error(
      `FAIL: status ${res2.status}, payment-response: ${receiptHeader ? 'present' : 'missing'}`
    );
    console.error((await res2.text()).slice(0, 600));
    process.exit(1);
  }

  const body: unknown = await res2.json();
  if (!isRecord(body)) {
    console.error('FAIL: paid response was not a JSON object');
    process.exit(1);
  }
  const schema = body.schema ?? (isRecord(body.data) ? body.data.schema : undefined);
  console.log('\npaid response schema:', String(schema ?? '<none>'));
  console.log('paid response keys :', Object.keys(body).join(', '));

  const receipt = decodeBase64Json(receiptHeader);
  const transaction = receipt.transaction;
  const payerAddr = receipt.payer;
  const validTransaction = typeof transaction === 'string' && transaction.length >= 80;
  const validPayer = typeof payerAddr === 'string' && payerAddr === signer.address;
  if (receipt.success !== true || receipt.network !== NETWORK || !validPayer || !validTransaction) {
    const reason =
      typeof receipt.errorReason === 'string' ? receipt.errorReason : 'settlement_receipt_invalid';
    console.error(`FAIL: settlement not confirmed (${reason})`);
    console.error('raw receipt:', JSON.stringify(receipt, null, 2));
    process.exit(1);
  }
  console.log('\n[settled on Solana via PayAI]');
  console.log('signature   :', transaction);
  console.log('payer       :', payerAddr);
  console.log('network     :', receipt.network);
}

main().catch((err: unknown) => {
  console.error(
    'e2e-solana-mainnet error:',
    err instanceof Error ? (err.stack ?? err.message) : err
  );
  process.exit(1);
});
