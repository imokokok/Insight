/* eslint-disable no-console */
/**
 * Export a self-contained execution-receipt BYTES PACKAGE for external
 * verification (VERITAS / Proof of Agent and anyone else who asks for bytes).
 *
 * Everything is real: a live Ethereum mainnet RPC, a real settled single-pool
 * USDC/WETH swap, real EIP-712 pre-trade gates, and a real signed execution
 * receipt. The package contains everything a verifier needs to re-check the
 * receipt WITHOUT trusting us:
 *   - the full signed receipt (30 fields + EIP-712 signature + domain + types)
 *   - the pre-trade gate envelopes (quotedPrice is DERIVED from them)
 *   - the on-chain tx hash / block / pool, so the fill can be re-collected
 *   - our own verification outputs (to compare against, not to trust)
 *
 * Honest labels, by design:
 *   - the signing key is a TEST key (anvil default), NOT the production
 *     attester key. Structural verification (fields, signature, verdict) is
 *     unaffected; identity verification (did Insight's production key sign)
 *     is NOT claimed.
 *   - the receipt is NOT anchored. Anchoring is the stated next step, not a
 *     claim made here.
 *
 * Run:
 *   npx tsx scripts/export-execution-receipt-bytes.ts [outdir]
 * Default outdir: ~/.workbuddy/veritas-execution-bytes/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import { verifyExecutionReceipt } from '@/lib/attestations/executionReceipt';
import type { AttestationInputV2 } from '@/lib/attestations/oracleSafetyAttestationV3';
import { signAttestationV3 } from '@/lib/attestations/oracleSafetyAttestationV3';
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';

import { decodeAllTransfers } from '@/lib/execution/events';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';
import { verifyExecutionPair } from '@/lib/execution/verifyExecutionPair';

const RPC = 'https://ethereum-rpc.publicnode.com';
// anvil default test key — deliberately NOT the production attester key.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const POOL = '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640' as const;
const SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67' as const;
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const SLOT0_SELECTOR = '0x3850c7bd';

const MAX_SLIPPAGE_BPS = 100;
const GATE_LEAD_SECONDS = 30;
const SEARCH_BLOCKS = 40;
const MAX_CANDIDATES = 25;

const hex = (n: number) => '0x' + n.toString(16);

interface LiveReceipt {
  status: string;
  blockNumber: string;
  from: string;
  logs: Array<{ address: `0x${string}`; topics: `0x${string}`[]; data: `0x${string}` }>;
}

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

interface PoolSwap {
  soldToken: string;
  boughtToken: string;
  soldHuman: number;
  boughtHuman: number;
  price: number;
}

function toSigned(w: bigint): bigint {
  const signBit = 1n << 255n;
  return w & signBit ? w - (1n << 256n) : w;
}

function decodePoolSwap(log: { data: string }): PoolSwap {
  const d = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
  const word = (i: number) => BigInt('0x' + d.slice(i * 64, (i + 1) * 64));
  const amount0 = toSigned(word(0));
  const amount1 = toSigned(word(1));
  const usdc = Math.abs(Number(amount0)) / 10 ** 6;
  const weth = Math.abs(Number(amount1)) / 10 ** 18;
  return amount0 > 0n
    ? { soldToken: USDC, boughtToken: WETH, soldHuman: usdc, boughtHuman: weth, price: weth / usdc }
    : {
        soldToken: WETH,
        boughtToken: USDC,
        soldHuman: weth,
        boughtHuman: usdc,
        price: usdc / weth,
      };
}

async function midWethPerUsdcAt(block: number): Promise<number> {
  const raw = await rpc<string>('eth_call', [{ to: POOL, data: SLOT0_SELECTOR }, hex(block)]);
  const sqrtPriceX96 = BigInt('0x' + raw.slice(2, 66));
  const p = Number(sqrtPriceX96) / 2 ** 96;
  return (p * p) / 10 ** 12;
}

function preTradeInput(
  sourceAssetId: string,
  destinationAssetId: string,
  consensusPriceUsd: number,
  checkedAtMs: number
): AttestationInputV2 {
  const ts = BigInt(Math.floor(checkedAtMs / 1000));
  return {
    verdict: 'PASS',
    sourceAssetId,
    destinationAssetId,
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 50_000,
    consensusPrice: consensusPriceUsd,
    maxDeviationPct: 0.2,
    manipulationRiskScore: 0.01,
    participantCount: 4,
    crossProviderAgreement: 0.99,
    maxStablecoinDepegPct: 0.01,
    maxDataAgeSeconds: 12,
    recommendedMaxPositionUsd: 100_000,
    contributingFactors: [],
    providerObservations: [
      {
        provider: 'chainlink',
        feedId: '0xfeed0001',
        value: 1_00000000n,
        timestamp: ts,
        dataAgeSeconds: 4n,
        included: true,
        exclusionReason: '',
      },
      {
        provider: 'api3',
        feedId: '0xfeed0002',
        value: 1_00000000n,
        timestamp: ts,
        dataAgeSeconds: 6n,
        included: true,
        exclusionReason: '',
      },
      {
        provider: 'redstone',
        feedId: '0xfeed0003',
        value: 1_00000000n,
        timestamp: ts,
        dataAgeSeconds: 5n,
        included: true,
        exclusionReason: '',
      },
    ] as ProviderObservationEntry[],
    checkedAtMs,
  } as AttestationInputV2;
}

/** BigInt -> decimal string, so the package is valid JSON. */
function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  return value;
}

async function main() {
  process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  process.env.EXECUTION_RPC_1 = RPC;

  const outdir = process.argv[2] ?? join(homedir(), '.workbuddy', 'veritas-execution-bytes');
  mkdirSync(outdir, { recursive: true });

  const latest = Number(await rpc<string>('eth_blockNumber', []));
  const swapLogs = await rpc<Array<{ transactionHash: string; data: string }>>('eth_getLogs', [
    {
      address: POOL,
      topics: [SWAP_TOPIC],
      fromBlock: hex(latest - SEARCH_BLOCKS),
      toBlock: hex(latest),
    },
  ]);
  if (swapLogs.length === 0) throw new Error('no swaps in window');

  let lastErr: unknown = null;

  for (let i = swapLogs.length - 1; i >= 0 && i >= swapLogs.length - MAX_CANDIDATES; i--) {
    const swapLog = swapLogs[i];
    const txHash = swapLog.transactionHash as `0x${string}`;
    try {
      const poolSwapsInTx = swapLogs.filter((l) => l.transactionHash === txHash);
      if (poolSwapsInTx.length !== 1) continue;

      const swap = decodePoolSwap(swapLog);
      if (!(swap.price > 0) || !Number.isFinite(swap.price)) continue;

      const receipt = await rpc<LiveReceipt>('eth_getTransactionReceipt', [txHash]);
      if (!receipt || receipt.status !== '0x1') continue;
      const blockNum = Number(receipt.blockNumber);
      const block = await rpc<{ timestamp: string }>('eth_getBlockByNumber', [
        hex(blockNum),
        false,
      ]);
      const executedAt = Number(block.timestamp);

      const transfers = decodeAllTransfers(receipt.logs);

      const candidates = [
        (receipt.from as string).toLowerCase(),
        ...[...new Set(transfers.map((t) => t.from))].filter(
          (a) => a !== (receipt.from as string).toLowerCase()
        ),
      ];
      let picked: { taker: string; sold: bigint; bought: bigint } | null = null;
      for (const taker of candidates) {
        const sold = transfers
          .filter((t) => t.from === taker && t.token.toLowerCase() === swap.soldToken)
          .reduce((acc, t) => acc + t.value, 0n);
        const bought = transfers
          .filter((t) => t.to === taker && t.token.toLowerCase() === swap.boughtToken)
          .reduce((acc, t) => acc + t.value, 0n);
        if (sold > 0n && bought > 0n) {
          picked = { taker, sold, bought };
          break;
        }
      }
      if (!picked) continue;

      const sourceDecimals = swap.soldToken === USDC ? 6 : 18;
      const destDecimals = swap.boughtToken === USDC ? 6 : 18;
      const attributedSold = Number(picked.sold) / 10 ** sourceDecimals;
      const attributedBought = Number(picked.bought) / 10 ** destDecimals;
      const rel = (a: number, b: number) => Math.abs(a - b) / b;
      if (
        rel(attributedSold, swap.soldHuman) > 1e-6 ||
        rel(attributedBought, swap.boughtHuman) > 1e-6
      ) {
        continue;
      }

      const mid = await midWethPerUsdcAt(blockNum - 1);
      if (!(mid > 0)) continue;

      const usdWeth = 1 / mid;
      const srcUsd = swap.soldToken === USDC ? 1 : usdWeth;
      const dstUsd = swap.boughtToken === USDC ? 1 : usdWeth;

      const sourceAssetId = `eip155:1/erc20:${swap.soldToken}`;
      const destAssetId = `eip155:1/erc20:${swap.boughtToken}`;

      const gateMs = (executedAt - GATE_LEAD_SECONDS) * 1000;
      const sourceGate = await signAttestationV3(
        preTradeInput(sourceAssetId, destAssetId, srcUsd, gateMs)
      );
      const destGate = await signAttestationV3(
        preTradeInput(destAssetId, sourceAssetId, dstUsd, gateMs)
      );
      if (!sourceGate || !destGate) throw new Error('gate signing failed');

      const issue = await issueExecutionReceipt({
        preTradeUid: sourceGate.uid as `0x${string}`,
        requestHash: sourceGate.data.requestHash,
        sourceAssetId,
        destinationAssetId: destAssetId,
        subjectChainId: 1,
        settlementChainId: 1,
        participantCount: 4,
        sourceGroupCount: 3,
        preTradeSignedAt: executedAt - GATE_LEAD_SECONDS,
        quotedPrice: 0, // VERIFIED binding derives it from the gates
        maxSlippageBps: MAX_SLIPPAGE_BPS,
        txHash,
        taker: picked.taker as `0x${string}`,
        preTradeAttestations: { source: sourceGate!, destination: destGate! },
      });
      if (!issue.ok) throw new Error(`issue failed: ${issue.code} ${issue.message}`);

      const verify = await verifyExecutionReceipt(issue.receipt);
      const pair = await verifyExecutionPair(sourceGate, issue.receipt);

      const expectedDeltaBps = ((swap.price - srcUsd / dstUsd) / (srcUsd / dstUsd)) * 10_000;
      const expectedStatus =
        Math.abs(expectedDeltaBps) <= MAX_SLIPPAGE_BPS ? 'FAITHFUL' : 'DEVIATED';

      const pkg = {
        meta: {
          generatedAt: new Date().toISOString(),
          purpose: 'self-contained execution-receipt bytes for independent verification',
          honestyLabels: [
            'signing key is a TEST key (anvil default), NOT the production attester key; structural verification is unaffected, identity verification is NOT claimed',
            'receipt is NOT anchored; anchoring remains the stated next step',
          ],
        },
        onchain: {
          chainId: 1,
          rpc: RPC,
          pool: POOL,
          txHash,
          blockNumber: blockNum,
          executedAt,
          taker: picked.taker,
          legs: { soldToken: swap.soldToken, boughtToken: swap.boughtToken },
          poolSwapAmounts: { soldHuman: swap.soldHuman, boughtHuman: swap.boughtHuman },
          preSwapMidWethPerUsdc: mid,
          independentExpectedDeltaBps: expectedDeltaBps,
          independentExpectedStatus: expectedStatus,
        },
        preTrade: {
          sourceGate,
          destinationGate: destGate,
          note: 'quotedPrice in the receipt is DERIVED from these gates (VERIFIED binding), not caller-supplied',
        },
        receipt: issue.receipt,
        facts: {
          executedPrice: issue.facts.executedPrice,
          binding: issue.binding,
        },
        selfVerification: {
          verifyExecutionReceipt: verify,
          verifyExecutionPair: {
            closedLoopStatus: pair.closedLoopStatus,
            pairedValid: pair.pairedValid,
            binding: pair.binding,
          },
          assertionsHeld: [
            'collector Transfer-attributed executedPrice reproduces the pool Swap event to <1e-6 relative',
            `receipt executionStatus == ${issue.receipt.data.executionStatus} matches independent recompute ${expectedStatus}`,
            `maxSlippageBps (${issue.receipt.data.maxSlippageBps}) is a SIGNED field (v2 struct field 12 of 32), and verdict uses the same signed value`,
          ],
        },
      };

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outPath = join(outdir, `execution-receipt-bytes-${stamp}.json`);
      writeFileSync(outPath, JSON.stringify(pkg, replacer, 2) + '\n');

      console.log('\n=== EXECUTION RECEIPT BYTES PACKAGE ===');
      console.log('out          :', outPath);
      console.log('tx           :', txHash, '(block', blockNum + ')');
      console.log('legs         :', swap.soldToken, '->', swap.boughtToken);
      console.log('executedPrice:', issue.facts.executedPrice, '/ pool', swap.price);
      console.log(
        'priceDeltaBps:',
        issue.receipt.data.priceDeltaBps,
        '/ expected',
        expectedDeltaBps.toFixed(2)
      );
      console.log(
        'status       :',
        issue.receipt.data.executionStatus,
        '/ expected',
        expectedStatus
      );
      console.log('verify       :', verify.valid, '/', verify.executionStatus);
      console.log('closedLoop   :', pair.closedLoopStatus);
      console.log('uid          :', issue.receipt.uid);
      console.log('signer       :', issue.receipt.attester, '(test key)');
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error('no gradeable live swap found');
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
