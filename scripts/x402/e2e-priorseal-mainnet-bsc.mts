/**
 * PriorSeal x402 paid-tier e2e rehearsal against the integration-readiness
 * endpoint (BNB Smart Chain MAINNET, eip155:56).
 *
 * PayAI settles BSC v2 exact payments through Permit2 (docs.payai.network/x402/
 * supported-networks): Binance-Peg USDC 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
 * (18 decimals), requirement extra carries assetTransferMethod: "permit2", and
 * the x402 SDK client routes to Permit2 signing on that field automatically.
 * The facilitator pays settlement gas, but the payer must grant the canonical
 * Permit2 contract (0x000000000022D473030F116dDEE9F6B43aC78BA3) a USDC
 * allowance once — that approval transaction is the only buyer-gas step and
 * needs BNB in the payer wallet. This script checks the allowance first and
 * only sends an approval when it is short.
 *
 * Usage (approval is skipped when already sufficient):
 *   X402_E2E_PRIVATE_KEY=0x... [X402_E2E_PROXY=http://127.0.0.1:7890] \
 *     [BSC_RPC_URL=https://bsc-dataseed.bnbchain.org] \
 *     npx tsx scripts/x402/e2e-priorseal-mainnet-bsc.mts
 *
 * Without X402_E2E_PRIVATE_KEY the run is quote-only: it asserts the 402
 * advertises the eip155:56 rail with the Permit2 extra and exits 0.
 *
 * Safety: the payer key must be a dedicated, balance-limited mainnet key
 * (~/.workbuddy/secrets/x402-pay.key).
 */

import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { x402Client } from '@x402/fetch';
import { erc20Abi, createPublicClient, createWalletClient, http, maxUint256 } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const BASE_URL = (process.env.X402_E2E_BASE_URL ?? 'https://priorseal.xyz').replace(/\/+$/, '');
const PATH = '/v1/integration-readiness';
const NETWORK = 'eip155:56' as const;
const USDC_BSC = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as const;
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;
const RPC_URL = process.env.BSC_RPC_URL ?? 'https://bsc-dataseed.bnbchain.org';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeBase64Json(value: string): Record<string, unknown> {
  const json = Buffer.from(value, 'base64').toString('utf8');
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) throw new Error('payment header did not contain a JSON object');
  return parsed;
}

type AcceptEntry = Record<string, unknown>;

function bnbAccept(accepts: unknown): AcceptEntry | undefined {
  if (!Array.isArray(accepts)) return undefined;
  return accepts.find((a): a is AcceptEntry => isRecord(a) && a.network === NETWORK);
}

async function stage0Approval(
  wallet: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  requiredAtomic: bigint
): Promise<void> {
  const allowance = await publicClient.readContract({
    address: USDC_BSC,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [wallet.account.address, PERMIT2],
  });
  console.log(
    `[stage0] Permit2 allowance: ${allowance.toString()} / required ${requiredAtomic.toString()}`
  );
  if (allowance >= requiredAtomic) {
    console.log('[stage0] OK: allowance sufficient, no approval needed');
    return;
  }
  const gas = await publicClient.getBalance({ address: wallet.account.address });
  console.log(`[stage0] payer BNB balance: ${Number(gas) / 1e18}`);
  if (gas === 0n) {
    throw new Error('payer has no BNB for the one-time Permit2 approval; fund the wallet first');
  }
  const hash = await wallet.writeContract({
    address: USDC_BSC,
    abi: erc20Abi,
    functionName: 'approve',
    args: [PERMIT2, maxUint256],
    chain: bsc,
  });
  console.log('[stage0] approval tx:', hash, '- waiting for receipt...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`approval reverted: ${hash}`);
  console.log('[stage0] OK: Permit2 approved (block', receipt.blockNumber, ')');
}

async function main(): Promise<void> {
  const publicClient = createPublicClient({ chain: bsc, transport: http(RPC_URL) });
  const rawKey = process.env.X402_E2E_PRIVATE_KEY?.trim();
  const query = rawKey
    ? `?chainId=56&subjectAddress=${privateKeyToAccount(rawKey as '0x').address}`
    : '?chainId=56&subjectAddress=0x0000000000000000000000000000000000000000';

  // stage 1: anonymous 402 quote, assert the BNB rail terms
  const res1 = await fetch(`${BASE_URL}${PATH}${query}`, {
    headers: { accept: 'application/json' },
  });
  const requiredHeader = res1.headers.get('payment-required');
  if (res1.status !== 402 || !requiredHeader) {
    console.error(`[stage1] FAIL: expected 402 + PAYMENT-REQUIRED, got ${res1.status}`);
    console.error((await res1.text()).slice(0, 400));
    process.exit(1);
  }
  const quote = decodeBase64Json(requiredHeader);
  const bnb = bnbAccept(quote.accepts);
  if (!bnb) {
    console.error('[stage1] FAIL: 402 quote does not advertise', NETWORK);
    process.exit(1);
  }
  console.log('[stage1] OK: 402 quote received');
  console.log('[stage1] BNB terms:', JSON.stringify(bnb));
  if ((bnb.extra as Record<string, unknown> | undefined)?.assetTransferMethod !== 'permit2') {
    console.error('[stage1] FAIL: BNB requirement is missing assetTransferMethod=permit2');
    process.exit(1);
  }

  if (!rawKey) {
    console.log('[stage2] SKIP: X402_E2E_PRIVATE_KEY not set (quote-only run)');
    return;
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
    console.error('[stage2] FAIL: X402_E2E_PRIVATE_KEY must be 32-byte 0x hex');
    process.exit(1);
  }
  const signer = privateKeyToAccount(rawKey as '0x');
  const wallet = createWalletClient({ account: signer, chain: bsc, transport: http(RPC_URL) });

  // stage 2: one-time Permit2 allowance (buyer gas) when short
  await stage0Approval(wallet, publicClient, BigInt(bnb.amount as string));

  // stage 3: paid call — SDK routes to Permit2 signing on the extra field
  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: new ExactEvmScheme(signer), x402Version: 2 }],
  });
  const { wrapFetchWithPayment } = await import('@x402/fetch');
  const paidFetch = wrapFetchWithPayment(globalThis.fetch, client);
  const paid = await paidFetch(`${BASE_URL}${PATH}${query}`, {
    headers: { accept: 'application/json' },
  });

  if (!paid.ok) {
    console.error(`[stage3] FAIL: paid call returned ${paid.status}`);
    console.error((await paid.text()).slice(0, 600));
    process.exit(1);
  }
  const receiptHeader = paid.headers.get('payment-response');
  if (!receiptHeader) {
    console.error('[stage3] FAIL: no PAYMENT-RESPONSE settlement receipt on 200 response');
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
    console.error(`[stage3] FAIL: payment was not confirmed (${reason})`);
    console.error('[stage3] raw receipt:', JSON.stringify(receipt, null, 2));
    process.exit(1);
  }
  console.log('[stage3] OK: settlement confirmed via PayAI on BSC');
  console.log('[stage3] transaction =', transaction, 'payer =', payer, 'network =', NETWORK);
}

if (process.env.X402_E2E_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.X402_E2E_PROXY));
  console.log('[proxy] routing all fetches through', process.env.X402_E2E_PROXY);
}

main().catch((error: unknown) => {
  console.error(
    'e2e-priorseal-mainnet-bsc error:',
    error instanceof Error ? (error.stack ?? error.message) : error
  );
  process.exit(1);
});
