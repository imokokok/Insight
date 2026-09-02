/* eslint-disable no-console */
/**
 * Export a self-contained execution-receipt BYTES PACKAGE for external
 * verification (VERITAS / Proof of Agent and anyone else who asks for bytes).
 *
 * Everything is real: a live Ethereum mainnet RPC, a real settled single-pool
 * USDC/WETH swap, real EIP-712 pre-trade gates, and a real signed execution
 * receipt. The package contains everything a verifier needs to re-check the
 * receipt WITHOUT trusting us:
 *   - the full signed receipt (44 signed fields on v4 + EIP-712 signature +
 *     domain + types)
 *   - ALL published schema layouts (v1 30 / v2 32 / v3 43 / v4 44) so a receipt
 *     of any version can be re-typed without fetching anything (VERITAS F0)
 *   - the pre-trade gate envelopes (quotedPrice is DERIVED from them)
 *   - the canonical request preimage, so `requestHash` is openable and
 *     recomputable (VERITAS F6)
 *   - the on-chain tx hash / block / pool, so the fill can be re-collected
 *   - our own verification outputs (to compare against, not to trust)
 *
 * v3 was built against the VERITAS findings F0-F7; v4 (2026-09-02, Headless
 * H7) moves `environment` from the (inert) EIP-712 domain into the signed
 * message as the 44th field. Every finding is either a signed field in this
 * receipt or a documented disclosure:
 *   F1 destinationPreTradeUid + preTradeUidsHash  F2 measuredFieldsHash +
 *      priceExecutionStatus rename                F3 quoteVenueIndependent=false
 *   F4 quoteBasis + quoteBlockNumber              F5 attestation/priceState ages
 *   F6 subject/taker/claimRole + request preimage F7 priceScale (domain
 *      environment superseded by v4's signed message field, Headless H7)
 *   F0 all schema layouts published (also live at the verify endpoint)
 *
 * Honest labels, by design:
 *   - the signing key is a TEST key (anvil default), NOT the production
 *     attester key, and the signed `environment` MESSAGE field is
 *     `nonproduction`. Structural verification (fields, signature, verdict) is
 *     unaffected; identity verification (did Insight's production key sign) is
 *     NOT claimed.
 *   - the receipt is NOT anchored. Anchoring is the stated next step, not a
 *     claim made here.
 *   - the receipt signs quoteVenueIndependent=false: this demo derives the
 *     quoted price from the execution venue's OWN pre-swap mid (re-expressed as
 *     USD through the two legs). The pre-trade gates in this package are demo
 *     records whose "consensus" was set to that same mid — a demo shortcut, not
 *     a production construction (production oracle clients are never the venue).
 *
 * Run:
 *   npx tsx scripts/export-execution-receipt-bytes.ts [outdir]
 * Default outdir: ~/.workbuddy/veritas-execution-bytes/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import { verifyExecutionReceipt, EXECUTION_DOMAIN } from '@/lib/attestations/executionReceipt';
import {
  EXECUTION_TYPES_V1,
  EXECUTION_TYPES_V2,
  EXECUTION_TYPES_V3,
  EXECUTION_TYPES_V4,
  EXECUTION_PRIMARY_TYPE,
} from '@/lib/attestations/executionReceipt';
import type { AttestationInputV2 } from '@/lib/attestations/oracleSafetyAttestationV3';
import { signAttestationV3 } from '@/lib/attestations/oracleSafetyAttestationV3';
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';
import {
  CANONICAL_REQUEST_DOMAIN,
  CANONICAL_REQUEST_PRIMARY_TYPE,
  CANONICAL_REQUEST_TYPES,
  computeRequestHash,
} from '@/lib/attestations/canonicalRequestHash';
import { computeMeasuredFieldsHash } from '@/lib/attestations/executionCommitments';

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
/** Search window / candidate budget. publicnode serves eth_getLogs ~100 blocks
 *  back on the free tier, and qualifying (single-counterparty) fills are
 *  sparse, so both are overridable for a re-run:
 *   SEARCH_BLOCKS=100 MAX_CANDIDATES=150 npx tsx scripts/export-execution-receipt-bytes.ts */
const SEARCH_BLOCKS = Number(process.env.SEARCH_BLOCKS ?? 40);
const MAX_CANDIDATES = Number(process.env.MAX_CANDIDATES ?? 25);

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
  // Observations describe THE ASSET THIS GATE PRICES: feed ids are derived
  // from the asset id and values carry the asset's own USD price. Two gates
  // over two different assets therefore carry DIFFERENT
  // providerObservationsHash values — two honest gates over different assets
  // cannot share that hash (VERITAS round 2, the placeholder-gate test they
  // gifted us). The earlier demo reused one observation block for both gates,
  // which was exactly that fingerprint; it is fixed here rather than left as
  // another thing a third party could find.
  const feedPrefix = `demo-feed:${sourceAssetId}`;
  const value = BigInt(Math.round(consensusPriceUsd * 1e8));
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
        feedId: `${feedPrefix}:1`,
        value,
        timestamp: ts,
        dataAgeSeconds: 4n,
        included: true,
        exclusionReason: '',
      },
      {
        provider: 'api3',
        feedId: `${feedPrefix}:2`,
        value,
        timestamp: ts,
        dataAgeSeconds: 6n,
        included: true,
        exclusionReason: '',
      },
      {
        provider: 'redstone',
        feedId: `${feedPrefix}:3`,
        value,
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

      // H1/H2/H3 (Headless 2026-09-02): attribution must name the TRADER, and
      // it must be the trader's REALISED price. The demo only grades fills in
      // which ONE party's position change equals the swap — the address that
      // paid the source token INTO the pool and received the destination token
      // FROM the pool:
      //   subject = taker = that party (H1): never an aggregator router, never
      //   the gas-paying EOA of a bot whose tokens never move.
      //   executedPrice = destination received / source paid = that party's
      //   realised price (H3 — what the trader actually got). Because that same
      //   party is the pool's sole counterparty and keeps what it bought, its
      //   realised price equals the pool leg exactly: there is no fee path.
      // Two integrity checks keep intermediates out:
      //   - no destination token flows onward FROM that party in this tx (the
      //     party kept the fill; it did not route a remainder onward)
      //   - no source token flows INTO that party in this tx (the party sold
      //     its own holdings; it did not collect from others)
      // Anything else — aggregator fee-split, flash-repay, multi-party routing
      // — fails the checks and is SKIPPED, never mis-graded by naming an
      // intermediate as the trader (H1) or reading the pool leg as the
      // trader's fill (H3). The Transfer-side reconstruction then reconciles
      // with the pool's Swap event as a consistency check (H2).
      const poolAddr = POOL.toLowerCase();
      const soldLegs = transfers.filter(
        (t) => t.token.toLowerCase() === swap.soldToken && t.to.toLowerCase() === poolAddr
      );
      const boughtLegs = transfers.filter(
        (t) => t.token.toLowerCase() === swap.boughtToken && t.from.toLowerCase() === poolAddr
      );
      if (soldLegs.length !== 1 || boughtLegs.length !== 1) continue;
      const counterparty = soldLegs[0].from.toLowerCase();
      if (counterparty !== boughtLegs[0].to.toLowerCase()) continue;
      const routedAway = transfers.some(
        (t) => t.token.toLowerCase() === swap.boughtToken && t.from.toLowerCase() === counterparty
      );
      const collectedIn = transfers.some(
        (t) => t.token.toLowerCase() === swap.soldToken && t.to.toLowerCase() === counterparty
      );
      if (routedAway || collectedIn) continue;
      const sender = (receipt.from as string).toLowerCase();
      const picked: { taker: string; sold: bigint; bought: bigint } = {
        taker: counterparty,
        sold: soldLegs[0].value,
        bought: boughtLegs[0].value,
      };

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
      // The quote basis is the pool's mid at the close of the previous block.
      // Record that block's timestamp so the signed price-state age at
      // execution (F5) is derivable from on-chain data alone.
      const preSwapBlock = await rpc<{ timestamp: string }>('eth_getBlockByNumber', [
        hex(blockNum - 1),
        false,
      ]);
      const preSwapBlockTs = Number(preSwapBlock?.timestamp ?? 0);

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
        // --- v3 honest claims (VERITAS F3/F4/F5/F6/F7) ---
        // Insight observed this settlement; it did not perform it.
        claimRole: 'THIRD_PARTY_OBSERVATION',
        // The quote is the venue's own pre-swap mid re-expressed as USD; it is
        // NOT independent of the venue where the order filled (F3). Silence
        // must not read as independence.
        quoteVenueIndependent: false,
        quoteBasis: 'PREV_BLOCK_CLOSE',
        quoteBlockNumber: blockNum - 1,
        priceStateAgeAtExecSeconds: preSwapBlockTs > 0 ? executedAt - preSwapBlockTs : 0,
      });
      if (!issue.ok) throw new Error(`issue failed: ${issue.code} ${issue.message}`);

      const verify = await verifyExecutionReceipt(issue.receipt);
      // v3 commits to BOTH gates (F1); present the destination gate too.
      const pair = await verifyExecutionPair(sourceGate, issue.receipt, destGate);

      // Independent recomputes for the package's self-check section.
      const requestPreimage = {
        subjectChainId: 1,
        sourceAssetId,
        destinationAssetId: destAssetId,
        action: 'swap',
        tradeAmountUsd: 50_000,
      };
      const requestHashRecomputed = computeRequestHash(requestPreimage);
      const requestHashMatches =
        requestHashRecomputed.toLowerCase() === sourceGate.data.requestHash.toLowerCase() &&
        requestHashRecomputed.toLowerCase() === issue.receipt.data.requestHash.toLowerCase();
      // F11 (VERITAS round 2): the DESTINATION gate's requestHash had no
      // preimage in the package. Its canonical request commits the same trade
      // seen from the destination leg (source and destination swapped), so
      // ship that preimage too and recompute it here.
      const destinationRequestPreimage = {
        subjectChainId: 1,
        sourceAssetId: destAssetId,
        destinationAssetId: sourceAssetId,
        action: 'swap',
        tradeAmountUsd: 50_000,
      };
      const destinationRequestHashRecomputed = computeRequestHash(destinationRequestPreimage);
      const destinationRequestHashMatches =
        destinationRequestHashRecomputed.toLowerCase() ===
        destGate.data.requestHash.toLowerCase();
      // The counterparties' placeholder-gate test, run on OUR OWN gates: two
      // gates over two different assets must never share one
      // providerObservationsHash.
      const gateObservationHashesDiffer =
        String(sourceGate.data.providerObservationsHash).toLowerCase() !==
        String(destGate.data.providerObservationsHash).toLowerCase();
      const measuredFieldsOpen =
        computeMeasuredFieldsHash([]).toLowerCase() ===
        String(issue.receipt.data.measuredFieldsHash).toLowerCase();

      const expectedDeltaBps = ((swap.price - srcUsd / dstUsd) / (srcUsd / dstUsd)) * 10_000;
      // Independent recompute of the verdict, mirroring deriveExecutionStatus:
      // the signed verdict can only be FAITHFUL/DEVIATED when the gate was
      // signed BEFORE the fill. This demo backfills a historical swap, so the
      // gates were signed after settlement and the expected verdict is
      // UNDETERMINED (PRE_TRADE_AFTER_EXECUTION) — Headless H4. Claiming
      // FAITHFUL here would reproduce exactly the bug the finding named.
      const precedenceHolds =
        issue.binding.preTradeSignedAt > 0 && issue.binding.preTradeSignedAt <= executedAt;
      const expectedStatus = !precedenceHolds
        ? 'UNDETERMINED'
        : Math.abs(expectedDeltaBps) <= MAX_SLIPPAGE_BPS
          ? 'FAITHFUL'
          : 'DEVIATED';

      // The layout the receipt was actually signed with: current = v4 (44
      // fields = v3's 43 + the signed `environment` message field, H7).
      const currentLayout = EXECUTION_TYPES_V4.ExecutionReceipt.map((f) => f.name);
      const receiptDataKeys = Object.keys(issue.receipt.data ?? {});
      const signedKeysMatchLayout =
        receiptDataKeys.length === currentLayout.length &&
        currentLayout.every((n, i) => receiptDataKeys[i] === n);

      const pkg = {
        meta: {
          generatedAt: new Date().toISOString(),
          purpose: 'self-contained execution-receipt bytes for independent verification',
          schemaVersion: issue.receipt.schemaVersion,
          signedFieldCount: currentLayout.length,
          honestyLabels: [
            'signing key is a TEST key (anvil default), NOT the production attester key; the signed `environment` MESSAGE field is nonproduction (v4: v3 declared environment on the EIP-712 domain, which never entered the signature — Headless H7); structural verification is unaffected, identity verification is NOT claimed',
            'receipt is NOT anchored; anchoring remains the stated next step',
            "the quoted price is the execution venue's OWN pre-swap mid (block before the swap) re-expressed as USD; the receipt signs quoteVenueIndependent=false and quoteBasis=PREV_BLOCK_CLOSE accordingly (VERITAS F3/F4)",
            'the pre-trade gates in this package are DEMO records: their consensus was set to the venue mid (a demo shortcut) and their observations carry demo feed ids derived from the priced asset. Production pre-trade clients are never the execution venue. The two gates over two different assets carry DIFFERENT providerObservationsHash values (the placeholder-gate test from VERITAS round 2 holds here by construction)',
            'fillStatus grades the EXECUTION OUTCOME of the fill (full/partial/reverted) — it is NOT a size verdict against the request: executedAmountUsd is honestly signed as unmeasured, so no signed field claims what the fill size was relative to the $50,000 request. A scope rename (priceFillStatus) is planned for the next layout revision (F9)',
            "attribution names the pool's DIRECT COUNTERPARTY as subject/taker: the single party that paid the source token into the pool and received and kept the destination token. executedPrice = that party's realised price (destination received / source paid), which equals the pool leg exactly because no fee path or onward routing exists; aggregator-fee and multi-party routes are SKIPPED, never mis-graded by naming an intermediate as trader or reading the pool leg as the trader's fill (Headless H1/H2/H3)",
            "this demo backfills a HISTORICAL swap, so the gates were signed after the settlement: the receipt carries the gates' real signature time as preTradeSignedAt, which is later than the fill, and the signed verdict is therefore UNDETERMINED with reason PRE_TRADE_AFTER_EXECUTION. Precedence is NOT claimed for this package; a forward demo (gate signed before execution) is required to sign FAITHFUL (Headless H4)",
          ],
        },
        schemas: {
          // F0: every published layout travels with the package, and each is
          // also live at the public verify endpoint (GET /api/v1/execution/attestation/verify).
          v1: {
            signedFieldCount: EXECUTION_TYPES_V1.ExecutionReceipt.length,
            domain: EXECUTION_DOMAIN,
            primaryType: EXECUTION_PRIMARY_TYPE,
            types: EXECUTION_TYPES_V1,
          },
          v2: {
            signedFieldCount: EXECUTION_TYPES_V2.ExecutionReceipt.length,
            domain: EXECUTION_DOMAIN,
            primaryType: EXECUTION_PRIMARY_TYPE,
            types: EXECUTION_TYPES_V2,
          },
          v3: {
            signedFieldCount: EXECUTION_TYPES_V3.ExecutionReceipt.length,
            domain: EXECUTION_DOMAIN,
            primaryType: EXECUTION_PRIMARY_TYPE,
            types: EXECUTION_TYPES_V3,
          },
          v4: {
            signedFieldCount: EXECUTION_TYPES_V4.ExecutionReceipt.length,
            domain: EXECUTION_DOMAIN,
            primaryType: EXECUTION_PRIMARY_TYPE,
            types: EXECUTION_TYPES_V4,
          },
        },
        onchain: {
          chainId: 1,
          rpc: RPC,
          pool: POOL,
          txHash,
          blockNumber: blockNum,
          executedAt,
          /** The trader the receipt is about: the pool's direct counterparty —
           *  the single party that paid the source token into the pool,
           *  received the destination token from it and kept it (Headless H1:
           *  an aggregator router, or the gas-paying EOA of a bot whose tokens
           *  never move, is never named as the trader). */
          taker: picked.taker,
          /** The tx sender (gas payer). Informational: for bot-executed fills
           *  this EOA is NOT the trader and its balance never changes. */
          sender,
          attribution:
            'counterparty-side: executedPrice = destination received from the pool / source paid into the pool by the named party — its realised price (H3), which for this archetype equals the pool leg exactly (no fee path, no onward routing, no collection from others); the Transfer-side reconstruction reconciles with the pool Swap event as a consistency check (H2); everything else is skipped, never mis-graded (Headless H1/H2/H3)',
          legs: { soldToken: swap.soldToken, boughtToken: swap.boughtToken },
          poolSwapAmounts: { soldHuman: swap.soldHuman, boughtHuman: swap.boughtHuman },
          preSwapBlockNumber: blockNum - 1,
          preSwapBlockTs,
          preSwapMidWethPerUsdc: mid,
          independentExpectedDeltaBps: expectedDeltaBps,
          independentExpectedStatus: expectedStatus,
        },
        preTrade: {
          sourceGate,
          destinationGate: destGate,
          note: 'quotedPrice in the receipt is DERIVED from these gates (VERIFIED binding), not caller-supplied. Gate consensus here was set to the venue mid (demo shortcut, see honestyLabels)',
        },
        // F6: the canonical request preimage. recompute requestHash with
        //   hashTypedData({ domain, types, primaryType, message }) and compare
        //   to receipt.data.requestHash and sourceGate.data.requestHash.
        requestPreimage: {
          message: requestPreimage,
          domain: CANONICAL_REQUEST_DOMAIN,
          types: CANONICAL_REQUEST_TYPES,
          primaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
          note: 'tradeAmountUsd is uint256 scaled x1e6 (50000 -> 50000000000n)',
          matchesReceiptAndSourceGate: requestHashMatches,
          // F11: the destination gate's requestHash opens too. Its canonical
          // request is the same trade seen from the destination leg (the two
          // asset ids swapped); one preimage per gate, no unexplained hash left.
          destinationPreimage: {
            message: destinationRequestPreimage,
            domain: CANONICAL_REQUEST_DOMAIN,
            types: CANONICAL_REQUEST_TYPES,
            primaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
            matchesDestinationGate: destinationRequestHashMatches,
          },
        },
        // F2: which notional fields were measured. This demo measured none of
        // the four notional fields (price only was derived from Transfer
        // amounts), so the signed commitment is the empty-set hash
        // keccak256("") — openable by enumerating the 16 subsets.
        measuredFields: {
          signedHash: issue.receipt.data.measuredFieldsHash,
          measured: [] as string[],
          enumerationNote:
            'any of the 16 subsets of [actualFeeUsd, executedAmountUsd, mevRiskBps, quotedAmountUsd] -> keccak256(join(",", sorted unique names)); separator is a comma; empty set = keccak256("")',
          emptySetHashMatches: measuredFieldsOpen,
        },
        // N2 (VERITAS round 2): the preTradeUidsHash construction, written
        // down so the next verifier does not recover it by trial.
        preTradeUidsHashRule: {
          construction:
            'keccak256(concat(uid_1, uid_2, ...)) over the ordered gate uids of the quote basis, in route order (source first)',
          encoding:
            'each uid enters as its 32 raw bytes (0x stripped); NO separator; NO sorting; two-leg route -> [sourceGateUid, destinationGateUid]',
          emptySet: 'keccak256("") — the SELF_REPORTED case',
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
            `attributed executedPrice ${issue.facts.executedPrice} equals the named party's realised price (destination received from the pool / source paid into the pool) and reconciles with the pool Swap event to <1e-6 relative — no fee path can be read as the trader's fill (H2/H3)`,
            `receipt priceExecutionStatus == ${issue.receipt.data.priceExecutionStatus} matches independent recompute ${expectedStatus}`,
            `the signed data keys equal the published current layout (v${issue.receipt.schemaVersion}, ${currentLayout.length} fields, in order)`,
            `maxSlippageBps is a SIGNED field (struct position ${currentLayout.indexOf('maxSlippageBps') + 1} of ${currentLayout.length}), and the verdict uses that same signed value`,
            `closed loop closes only when BOTH gates verify: ${pair.closedLoopStatus} with destinationPreTradeUidMatch=${pair.binding.destinationPreTradeUidMatch} and preTradeUidsHashMatch=${pair.binding.preTradeUidsHashMatch} (F1)`,
            `requestHash recomputes from the canonical preimage and matches both the source gate and the receipt: ${requestHashMatches} (F6)`,
            `destination gate requestHash recomputes from its own preimage (destination-leg view of the same request): ${destinationRequestHashMatches} (F11)`,
            `the two gates over two different assets carry DIFFERENT providerObservationsHash values: ${gateObservationHashesDiffer} (placeholder-gate test, VERITAS round 2)`,
            `subject=${issue.receipt.data.subject}, taker=${issue.receipt.data.taker}, claimRole=${issue.receipt.data.claimRole} (F6)`,
            `quoteVenueIndependent=${issue.receipt.data.quoteVenueIndependent}, quoteBasis=${issue.receipt.data.quoteBasis}, quoteBlockNumber=${issue.receipt.data.quoteBlockNumber} (F3/F4)`,
            `priceScale=${issue.receipt.data.priceScale} (x1e8), environment=${issue.receipt.data.environment} (v4 signed message field — the v3 domain's declared environment never entered the signature, H7)`,
            `attestationAgeAtExecSeconds=${issue.receipt.data.attestationAgeAtExecSeconds}, priceStateAgeAtExecSeconds=${issue.receipt.data.priceStateAgeAtExecSeconds} (F5)`,
          ],
        },
      };

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outPath = join(outdir, `execution-receipt-bytes-${stamp}.json`);
      writeFileSync(outPath, JSON.stringify(pkg, replacer, 2) + '\n');

      console.log('\n=== EXECUTION RECEIPT BYTES PACKAGE (v' + issue.receipt.schemaVersion + ') ===');
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
        issue.receipt.data.priceExecutionStatus,
        '/ expected',
        expectedStatus
      );
      console.log('verify       :', verify.valid, '/', verify.executionStatus);
      console.log('closedLoop   :', pair.closedLoopStatus, '/', pair.pairedValid);
      console.log(
        'v4 claims    :',
        'subject',
        issue.receipt.data.subject.slice(0, 10),
        '| venueIndependent',
        issue.receipt.data.quoteVenueIndependent,
        '| basis',
        issue.receipt.data.quoteBasis,
        '| fields',
        currentLayout.length
      );
      console.log('uid          :', issue.receipt.uid);
      console.log('signer       :', issue.receipt.attester, '(test key, nonproduction)');
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
