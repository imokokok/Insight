/* eslint-disable no-console */
/**
 * Enrich an execution-receipt bytes package with the RAW on-chain event logs
 * (Swap + ERC-20 Transfers) for the transaction, so an external verifier
 * (Headless Oracle / Michael) can recompute signature-to-key, schema,
 * freshness, AND the Transfer-attribution → executedPrice themselves without
 * trusting our derived numbers.
 *
 * The package produced by scripts/export-execution-receipt-bytes.ts already
 * contains: full signed receipt + EIP-712 domain/types + pre-trade gates +
 * tx/block/pool + derived amounts + our self-verification. This script ADDS:
 *   - rawSwapEvent:  the original Uniswap V3 Swap log (address/topics/data)
 *   - rawTransferLogs: every ERC-20 Transfer log in the tx (address/topics/data)
 * and cross-checks our derived poolSwapAmounts against a fresh decode of the
 * Swap log data.
 *
 * Usage:
 *   npx tsx scripts/enrich-execution-bytes-for-headless.ts <src.json> [out.json]
 * Default out.json = <src>.headless.json (sibling).
 * RPC comes from the package's onchain.rpc field (default publicnode).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const src = process.argv[2];
if (!src) {
  console.error(
    'usage: npx tsx scripts/enrich-execution-bytes-for-headless.ts <src.json> [out.json]'
  );
  process.exit(1);
}
const out = process.argv[3] ?? src.replace(/\.json$/, '') + '.headless.json';

const pkg = JSON.parse(readFileSync(src, 'utf8'));
const RPC = pkg.onchain.rpc ?? 'https://ethereum-rpc.publicnode.com';
const txHash: string = pkg.onchain.txHash;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: unknown };
  if (json.error) throw new Error(`${method} -> ${JSON.stringify(json.error)}`);
  return json.result as T;
}

/** Fetch Insight's published oracle-key registry (RFC 8615) for the package. */
async function fetchPublishedKeys(): Promise<{
  url: string;
  fetchedAt: string;
  publicKeys: Array<{ key_id: string; public_key: string; algorithm: string }>;
}> {
  const url = 'https://www.oracleinsight.xyz/.well-known/oracle-keys.json';
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`well-known fetch failed: ${res.status}`);
  const doc = (await res.json()) as { public_keys?: unknown };
  return {
    url,
    fetchedAt: new Date().toISOString(),
    publicKeys: Array.isArray(doc.public_keys) ? (doc.public_keys as never[]) : [],
  };
}

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber?: string;
  transactionHash?: string;
  transactionIndex?: string;
  blockHash?: string;
  logIndex?: string;
  removed?: boolean;
}
interface TxReceipt {
  transactionHash: string;
  blockNumber: string;
  status: string;
  logs: RawLog[];
}

/** decode signed 256-bit word */
function toSigned(w: bigint): bigint {
  const signBit = 1n << 255n;
  return w & signBit ? w - (1n << 256n) : w;
}

async function main() {
  const receipt = await rpc<TxReceipt>('eth_getTransactionReceipt', [txHash]);
  if (!receipt) throw new Error('no receipt on chain for ' + txHash);
  if (receipt.status !== '0x1') throw new Error('tx status is not success');

  const swapLogs = receipt.logs.filter((l) => l.topics[0]?.toLowerCase() === SWAP_TOPIC);
  if (swapLogs.length !== 1) {
    throw new Error(`expected exactly 1 Swap log, found ${swapLogs.length}`);
  }
  const rawSwapEvent = swapLogs[0];

  const rawTransferLogs = receipt.logs
    .filter((l) => l.topics[0]?.toLowerCase() === TRANSFER_TOPIC)
    .map((l) => ({
      address: l.address,
      topics: l.topics,
      data: l.data,
      logIndex: l.logIndex,
    }));

  // fresh decode of Swap log data: token0 = USDC (6dp), token1 = WETH (18dp)
  // in this pool; amount0 > 0 means USDC entered the pool (sold USDC).
  const d = rawSwapEvent.data.startsWith('0x') ? rawSwapEvent.data.slice(2) : rawSwapEvent.data;
  const word = (i: number) => BigInt('0x' + d.slice(i * 64, (i + 1) * 64));
  const amount0 = toSigned(word(0));
  const amount1 = toSigned(word(1));
  const abs0 = Math.abs(Number(amount0));
  const abs1 = Math.abs(Number(amount1));
  const human0 = abs0 / 10 ** 6; // token0 is USDC in this pool
  const human1 = abs1 / 10 ** 18; // token1 is WETH in this pool
  const swapDecoded = { amount0: amount0.toString(), amount1: amount1.toString() };

  const derived = pkg.onchain.poolSwapAmounts as {
    soldHuman: number;
    boughtHuman: number;
  };
  const expected =
    amount0 > 0n ? { sold: human0, bought: human1 } : { sold: human1, bought: human0 };
  const soldRel = Math.abs(expected.sold - derived.soldHuman) / derived.soldHuman;
  const boughtRel = Math.abs(expected.bought - derived.boughtHuman) / derived.boughtHuman;
  const amountsMatch = soldRel < 1e-9 && boughtRel < 1e-9;

  pkg.onchain.rawSwapEvent = {
    address: rawSwapEvent.address,
    topics: rawSwapEvent.topics,
    data: rawSwapEvent.data,
    blockNumber: rawSwapEvent.blockNumber ?? undefined,
    transactionHash: rawSwapEvent.transactionHash ?? undefined,
    logIndex: rawSwapEvent.logIndex ?? undefined,
  };
  pkg.onchain.rawTransferLogs = rawTransferLogs;
  pkg.onchain.swapDecodedFromRaw = swapDecoded;
  pkg.onchain.swapDecodedMatchesDerivedAmounts = amountsMatch;

  // Insight's published key registry, so a verifier can do signature-to-key
  // without trusting us to name the key. Honesty: the receipt signer (anvil
  // test key) is NOT among these production public keys; identity is not claimed.
  const publishedKeys = await fetchPublishedKeys();
  const signer = (pkg.receipt.attester as string).toLowerCase();
  const signerInRegistry = publishedKeys.publicKeys.some(
    (k) => k.public_key.toLowerCase() === signer
  );
  pkg.publishedKeys = {
    ...publishedKeys,
    receiptSigner: pkg.receipt.attester,
    receiptSignerInPublishedRegistry: signerInRegistry,
    note: 'receipt is signed with an anvil TEST key; it is intentionally absent from the published production registry (identity verification is NOT claimed)',
  };
  pkg.meta.rawEventsAddedAt = new Date().toISOString();
  pkg.meta.honestyLabels = [
    ...(pkg.meta.honestyLabels ?? []),
    'rawSwapEvent + rawTransferLogs are the original on-chain logs for pkg.onchain.txHash (fetched from the same public RPC); verifier can recompute Transfer attribution -> executedPrice from them',
    'pre-trade gate provider observations are SYNTHETIC demo inputs (hard-coded in the exporter), as already disclosed on the VERITAS thread; the independence of those observations is NOT independently verifiable from this package, only the EIP-712 signatures and binding are',
  ];
  // receipt-envelope-level annotation stays authoritative.

  writeFileSync(out, JSON.stringify(pkg, null, 2) + '\n');
  console.log('enriched :', out);
  console.log('tx       :', txHash);
  console.log('swap log :', rawSwapEvent.logIndex ?? '?', 'transfer logs:', rawTransferLogs.length);
  console.log('amounts  :', swapDecoded.amount0, '/', swapDecoded.amount1);
  console.log(
    'derived  : soldHuman',
    derived.soldHuman,
    'boughtHuman',
    derived.boughtHuman,
    '| match:',
    amountsMatch
  );
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
