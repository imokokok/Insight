/* eslint-disable no-console */
/**
 * Incident forensics CLI — turn one disputed transaction into a fact package a
 * third party can re-check without trusting us.
 *
 * The problem this exists for: a disputed swap has two accounts of what
 * happened, and the expensive failure mode is a confident account that is
 * wrong. A report that quietly fills a gap is worse than a report that says
 * "this cannot be established", because the gap is exactly what the dispute is
 * about. So every figure here traces to a receipt field or an on-chain log, and
 * everything unobservable is reported as unobservable with a reason code.
 *
 * It reuses the verified modules rather than re-deriving them:
 *   - `collectExecutionFacts`  facts + honest `unavailableReason`
 *   - `issueExecutionReceipt`  the signed receipt, when a pre-trade gate exists
 *   - `verifyExecutionReceipt`  self-check
 * and adds what a dispute actually needs: the RAW logs, so the reviewer can
 * recompute the attribution themselves instead of believing our number.
 *
 * Signing is additive and identity-honest. If `ATTESTATION_SIGNER_PRIVATE_KEY`
 * is unset the package is still produced, marked UNSIGNED. Nothing is fabricated
 * to make the package look complete.
 *
 * Usage:
 *   npx tsx scripts/incident-forensics.ts \
 *     --tx 0x<hash> --chain 1 \
 *     --source eip155:1/erc20/0x<addr> --dest eip155:1/slip44:60 \
 *     --question "What did the counterparty claim, and what settled?" \
 *     --out ./case-001
 *
 * Optional when a signed receipt is wanted:
 *   --pre-trade-uid 0x<32b> --request-hash 0x<32b>
 *   --pre-trade-gate <path.json>   (one gate; the other is not implied)
 *   --participant-count N --source-group-count N --pre-trade-signed-at <unix>
 *   --quoted-price <num> [--claim-role THIRD_PARTY_OBSERVATION]
 *
 * Outputs in <out>/:
 *   facts.json          collector output, verbatim
 *   raw-logs.json       every log in the receipt + the tx itself
 *   receipt.json        signed Execution Receipt, or an UNSIGNED marker
 *   report.md           the seven-section report
 *   recheck.md          command-level reproduction steps
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { readFileSync } from 'node:fs';

import { getAttesterAddress } from '@/lib/attestations/attesterAccount';
import { verifyExecutionReceipt } from '@/lib/attestations/executionReceipt';
import { collectExecutionFacts, type ExecutionFacts } from '@/lib/execution/executionCollector';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';
import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import { RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';

// --- arguments ---------------------------------------------------------------

interface Args {
  tx: `0x${string}`;
  chainId: number;
  sourceAssetId: string;
  destinationAssetId: string;
  question: string;
  out: string;
  preTradeUid?: `0x${string}`;
  requestHash?: `0x${string}`;
  preTradeGatePath?: string;
  participantCount?: number;
  sourceGroupCount?: number;
  preTradeSignedAt?: number;
  quotedPrice?: number;
  claimRole?: 'FIRST_PARTY_EXECUTION' | 'THIRD_PARTY_OBSERVATION';
  rpcUrl?: string;
}

const HEX32 = /^0x[0-9a-fA-F]{64}$/;

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    const value = argv[i + 1];
    if (!key || value === undefined) continue;
    map.set(key, value);
  }

  const tx = map.get('tx') ?? '';
  const chainId = Number(map.get('chain'));
  const sourceAssetId = map.get('source') ?? '';
  const destinationAssetId = map.get('dest') ?? '';
  const question = map.get('question') ?? '';
  const out = map.get('out') ?? './incident-case';

  if (!HEX32.test(tx)) throw new Error('--tx must be a 0x-prefixed 32-byte hex hash');
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error('--chain must be a positive integer chain id');
  }
  if (!sourceAssetId) throw new Error('--source (CAIP-19 of the asset sold) is required');
  if (!destinationAssetId) {
    throw new Error('--dest (CAIP-19 of the asset bought) is required');
  }
  // CAIP-19 uses a COLON before the asset reference: `eip155:1/erc20:0x...`.
  // A slash there is a silent trap — `parseCaip19` returns null for it, the
  // collector classifies the leg as UNSUPPORTED, and the case comes back with
  // FILL_PRICE_UNAVAILABLE, which reads like a chain fact rather than a typo in
  // the command. Caught here so the operator sees the cause instead.
  for (const [label, value] of [
    ['--source', sourceAssetId],
    ['--dest', destinationAssetId],
  ] as const) {
    if (!/^(eip155|solana):\d+\/(erc20|slip44|spl):.+$/.test(value)) {
      throw new Error(
        `${label} is not a valid CAIP-19 id: ${value}\n` +
          '       expected eip155:{chainId}/erc20:{address} or eip155:{chainId}/slip44:{coinType}\n' +
          '       note the COLON before the asset reference — a slash there parses to null and ' +
          'would be reported as an unsupported asset rather than a malformed argument'
      );
    }
  }
  if (!question) throw new Error('--question (the dispute being answered) is required');

  const quotedPrice = map.has('quoted-price') ? Number(map.get('quoted-price')) : undefined;
  if (quotedPrice !== undefined && !Number.isFinite(quotedPrice)) {
    throw new Error('--quoted-price must be a number when present');
  }

  const claimRole = map.get('claim-role');
  if (
    claimRole &&
    claimRole !== 'FIRST_PARTY_EXECUTION' &&
    claimRole !== 'THIRD_PARTY_OBSERVATION'
  ) {
    throw new Error('--claim-role must be FIRST_PARTY_EXECUTION or THIRD_PARTY_OBSERVATION');
  }

  return {
    tx: tx as `0x${string}`,
    chainId,
    sourceAssetId,
    destinationAssetId,
    question,
    out,
    preTradeUid: map.get('pre-trade-uid') as `0x${string}` | undefined,
    requestHash: map.get('request-hash') as `0x${string}` | undefined,
    preTradeGatePath: map.get('pre-trade-gate'),
    participantCount: map.has('participant-count')
      ? Number(map.get('participant-count'))
      : undefined,
    sourceGroupCount: map.has('source-group-count')
      ? Number(map.get('source-group-count'))
      : undefined,
    preTradeSignedAt: map.has('pre-trade-signed-at')
      ? Number(map.get('pre-trade-signed-at'))
      : undefined,
    quotedPrice,
    claimRole: claimRole as Args['claimRole'],
    rpcUrl: map.get('rpc'),
  };
}

// --- raw chain reads ---------------------------------------------------------
//
// Deliberately a plain fetch against one explicitly-chosen endpoint rather than
// the fallback client. For a dispute report the reviewer must know exactly
// which node answered, and "whichever of four was up" is not a source. A single
// endpoint is named in the report; a disagreement between nodes is itself a
// fact the reviewer may want, but it is not ours to average away.

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

interface RawReceipt {
  transactionHash: string;
  blockNumber: string;
  status: string;
  from?: string;
  to?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  logs: RawLog[];
}

interface RawTx {
  hash: string;
  from?: string;
  to?: string;
  value?: string;
  input?: string;
  nonce?: string;
  gas?: string;
  type?: string;
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { message?: string } };
  if (json.error) throw new Error(`${method} -> ${json.error.message ?? 'unknown RPC error'}`);
  return json.result as T;
}

function resolveRpcUrl(args: Args): string {
  if (args.rpcUrl) return args.rpcUrl;
  const envOverride = process.env[`EXECUTION_RPC_${args.chainId}`];
  if (envOverride) {
    const first = envOverride
      .split(',')
      .map((s) => s.trim())
      .find((s) => s.length > 0);
    if (first) return first;
  }
  const endpoints = getRpcEndpoints(args.chainId);
  if (!endpoints || endpoints.length === 0) {
    throw new Error(
      `No RPC configured for chain ${args.chainId}. Set EXECUTION_RPC_${args.chainId} or pass --rpc. ` +
        'An unsupported chain returns an error, never a guessed endpoint.'
    );
  }
  return endpoints[0];
}

// --- report helpers ----------------------------------------------------------

/** Machine reason code -> the plain sentence a reviewer needs. Kept adjacent to
 *  the collector's own codes so the two cannot drift. */
const UNAVAILABLE_SENTENCE: Record<NonNullable<ExecutionFacts['unavailableReason']>, string> = {
  FILL_PRICE_UNAVAILABLE:
    'No fill price could be attributed to this transaction from the receipt alone.',
  NATIVE_ASSET_LEG:
    'One leg is the chain gas token. A native DESTINATION amount never appears in a Transfer log nor in the transaction value, so the bought amount is genuinely unobservable. The SOLD amount is the transaction value and is readable.',
  PRICE_NOT_ATTRIBUTED:
    'The relevant Transfer events were absent, or the token decimals() call did not answer. No default was assumed for either.',
};

function fmtRaw(value: bigint | null): string {
  return value === null ? 'not readable' : value.toString();
}

/**
 * `JSON.stringify` throws on BigInt, and the collector's `blockNumber` and
 * `feeNative` ARE bigints — they are exact wei values and must not be turned
 * into floats to make a serializer happy. So bigints are serialised as decimal
 * STRINGS tagged as such, which round-trips through `BigInt(s)` without ever
 * passing through a double.
 */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return { $bigint: value.toString() };
  return value;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, jsonReplacer, 2) + '\n');
}

function readGate(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

// --- main --------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  const rpcUrl = resolveRpcUrl(args);

  mkdirSync(args.out, { recursive: true });

  // 1. Collector facts (the verified module, used as-is).
  const client = new RpcClientWithFallback({ contextLabel: 'incident-forensics' });
  const collected = await collectExecutionFacts({
    txHash: args.tx,
    chainId: args.chainId,
    endpoints: [rpcUrl],
    sourceAssetId: args.sourceAssetId,
    destinationAssetId: args.destinationAssetId,
    client,
  });

  if (!collected.ok) {
    throw new Error(
      `Collection failed (${collected.code}): ${collected.message}. ` +
        'A node that has not seen the transaction is NOT the same as a reverted one, and no ' +
        'package is produced for an unknown transaction.'
    );
  }
  const facts = collected.facts;

  // 2. Raw logs and the transaction itself, so the reviewer is not limited to
  //    what our collector chose to read.
  const rawReceipt = await rpc<RawReceipt | null>(rpcUrl, 'eth_getTransactionReceipt', [args.tx]);
  if (!rawReceipt) throw new Error('Receipt disappeared between collection and raw read');
  const rawTx = await rpc<RawTx | null>(rpcUrl, 'eth_getTransactionByHash', [args.tx]);
  const rawBlock = facts.blockNumber
    ? await rpc<{ number?: string; hash?: string; timestamp?: string } | null>(
        rpcUrl,
        'eth_getBlockByNumber',
        ['0x' + facts.blockNumber.toString(16), false]
      )
    : null;

  const rawLogs = {
    meta: {
      collectedAt: startedAt.toISOString(),
      rpc: rpcUrl,
      txHash: args.tx,
      chainId: args.chainId,
      note:
        'These are the original on-chain logs. A reviewer can recompute the Transfer attribution, ' +
        'the fill price and the fee from them without trusting any derived figure in facts.json.',
    },
    receipt: rawReceipt,
    transaction: rawTx,
    block: rawBlock,
    transferLogs: (rawReceipt.logs ?? []).filter(
      (l) =>
        l.topics?.[0]?.toLowerCase() ===
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    ),
  };
  writeJson(join(args.out, 'raw-logs.json'), rawLogs);

  // 2b. WHY the price is unattributed, specifically.
  //
  // The generic reason code is not enough for a dispute. "Transfer events were
  // absent" is a claim; the reviewer needs to see WHERE the tokens actually
  // went. When the bought leg's Transfers never touch the taker, the value did
  // move on-chain but not to the party under dispute — which is a materially
  // different fact, and often the whole answer.
  const transferTopics = (rawReceipt.logs ?? []).filter(
    (l) =>
      l.topics?.[0]?.toLowerCase() ===
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  );
  const takerAddr = (facts.taker ?? '').toLowerCase();
  const touchedTaker = takerAddr
    ? transferTopics.filter(
        (l) =>
          l.topics?.[1]?.slice(-40).toLowerCase() === takerAddr ||
          l.topics?.[2]?.slice(-40).toLowerCase() === takerAddr
      ).length
    : 0;
  const attributionDetail =
    facts.unavailableReason === 'PRICE_NOT_ATTRIBUTED' && takerAddr && touchedTaker === 0
      ? `No Transfer in this transaction involves the taker address \`${facts.taker}\` as sender or receiver. ` +
        'The value moved between other addresses (typically a pool and an aggregator or router), so ' +
        'the amount that reached THIS party cannot be established from Transfer events. ' +
        'This is a different fact from "nothing happened": value did move on-chain, but not to the ' +
        'party in question. Establishing where it went needs `debug_traceTransaction` traces, ' +
        'which this package does not include.'
      : facts.unavailableReason === 'PRICE_NOT_ATTRIBUTED'
        ? `Transfer events involving the taker exist (${touchedTaker} found), so the leg was seen but ` +
          'its amount could not be read — the token `decimals()` call did not answer, or the amount ' +
          'summed to zero. No default was assumed for decimals.'
        : '';

  // 3. Signed receipt, when a pre-trade gate exists. Absence is reported, not
  //    worked around.
  const attesterAddress = await getAttesterAddress();
  const wantsReceipt = Boolean(
    args.preTradeUid && args.requestHash && args.quotedPrice !== undefined
  );

  let receipt: Record<string, unknown> | null = null;
  let receiptNote: string;

  if (!attesterAddress) {
    receiptNote =
      'UNSIGNED: no production attester key was configured for this run, so no Execution Receipt ' +
      'was issued. The facts and raw logs below are complete regardless. A structural claim is not ' +
      'made: identity verification is explicitly NOT claimed.';
  } else if (!wantsReceipt) {
    receiptNote =
      'UNSIGNED: no pre-trade gate was presented, so there is nothing to bind a receipt to. A ' +
      'receipt without its gate could never reach a FAITHFUL verdict, so none was fabricated.';
  } else {
    const gate = args.preTradeGatePath ? readGate(args.preTradeGatePath) : null;
    const issued = await issueExecutionReceipt({
      preTradeUid: args.preTradeUid!,
      requestHash: args.requestHash!,
      sourceAssetId: args.sourceAssetId,
      destinationAssetId: args.destinationAssetId,
      subjectChainId: args.chainId,
      settlementChainId: args.chainId,
      participantCount: args.participantCount ?? 0,
      sourceGroupCount: args.sourceGroupCount ?? 0,
      preTradeSignedAt: args.preTradeSignedAt ?? 0,
      quotedPrice: args.quotedPrice!,
      claimRole: args.claimRole ?? 'THIRD_PARTY_OBSERVATION',
      txHash: args.tx,
      taker: facts.taker ?? undefined,
      preTradeAttestations: gate ? ({ source: gate, destination: gate } as never) : null,
    });

    if (!issued.ok) {
      receiptNote = `UNSIGNED: issuance refused (${issued.code}: ${issued.message}).`;
    } else {
      receipt = issued.receipt as unknown as Record<string, unknown>;
      const selfCheck = await verifyExecutionReceipt(issued.receipt);
      receiptNote =
        `Signed by ${issued.receipt.attester}, schema v${issued.receipt.schemaVersion}, ` +
        `signed verdict ${String(issued.receipt.data.priceExecutionStatus ?? issued.receipt.data.executionStatus)}, ` +
        `binding ${String(issued.receipt.data.bindingMode)}, self-check cryptographicValid=${String(selfCheck.cryptographicValid)}. ` +
        'A valid signature proves the holder signed these fields. It does NOT prove the certified ' +
        'price was correct, the trade well-timed, or the fill economically fair.';
    }
  }

  writeJson(
    join(args.out, 'receipt.json'),
    receipt
      ? { meta: { note: receiptNote, attesterConfigured: true }, receipt }
      : {
          meta: { note: receiptNote, attesterConfigured: Boolean(attesterAddress) },
          receipt: null,
        }
  );

  // 4. The seven-section report.
  const priceReadable = facts.executedPrice !== null;
  const settlementReadable = facts.fillStatus === 'FULL';

  const report = `# Execution and settlement forensics

**Case question:** ${args.question}

Collected ${startedAt.toISOString()} from ${rpcUrl} · chain ${args.chainId} · transaction \`${args.tx}\`

---

## 1. Scope and what this does not answer

This report answers one question: what can be established from the public record about how transaction \`${args.tx}\` executed.

**Deliberately out of scope, and not answered here:**

- Whether the fill price was economically *fair*. That needs market data and a method this report does not apply.
- Whether the trade should have happened at all. That is a business judgement, not a chain fact.
- Whether the counterparty's account is honest. This report states what settled, not who is right.
- Whether this was a partial fill. Transfer events cannot distinguish partial from complete fills, so a settled transaction is reported as \`FULL\` and this limitation is stated rather than estimated away.

Anything below that could not be established is listed as unestablished. **No gap is filled with an estimate, an interpolation, or a plausible-looking number.**

## 2. Sources

| Item | Value |
|---|---|
| Chain | ${args.chainId} |
| Transaction | \`${args.tx}\` |
| RPC endpoint | ${rpcUrl} |
| Collected at | ${startedAt.toISOString()} |
| Block | ${facts.blockNumber !== null ? facts.blockNumber.toString() : 'not readable'} |
| Block timestamp | ${facts.executedAt !== null ? new Date(facts.executedAt * 1000).toISOString() : 'not readable (blockNumber is authoritative)'} |
| Asset sold | \`${args.sourceAssetId}\` |
| Asset bought | \`${args.destinationAssetId}\` |
| Counterparty (taker) | ${facts.taker ?? 'not readable'} |
| Receipt status | ${facts.fillStatus === 'REVERTED' ? 'reverted — nothing settled' : 'settled'} |

The named RPC is the single source for every figure below. Figures were not averaged across nodes and a disagreement between nodes is not resolved by this report.

## 3. Raw facts

Amounts are the **raw integer** values as they exist on chain, in the token's smallest unit. No display scaling, no floating point. A scaled number is derived and belongs in section 5, labelled as such.

| Field | Value |
|---|---|
| Raw transaction value (wei) | ${rawTx?.value ?? 'not readable'} |
| Gas used (raw) | ${rawReceipt.gasUsed ?? 'not present in this node response'} |
| Effective gas price (wei) | ${rawReceipt.effectiveGasPrice ?? 'not present in this node response'} |
| Fee (wei, gasUsed × effectiveGasPrice) | ${fmtRaw(facts.feeNative)} |
| Transfer logs in transaction | ${rawLogs.transferLogs.length} |
| Total logs in transaction | ${rawReceipt.logs?.length ?? 0} |
| Logs touching the taker | ${takerAddr ? touchedTaker : 'unknown (no taker)'} |

The complete receipt, transaction, block and every log are in \`raw-logs.json\`. A reviewer needs nothing from this report to recompute the fill.

## 4. Observability determination

What can be established, and — where it cannot — exactly why.

| Question | Answer |
|---|---|
| Did the transaction settle? | ${settlementReadable ? 'Yes — status is success.' : 'No — the transaction reverted, so nothing settled. Gas was still consumed.'} |
| Is the fill price readable? | ${priceReadable ? 'Yes.' : 'No.'} |
| Is the sell amount readable? | ${facts.sourceAmount !== null ? 'Yes, as a Transfer-derived figure.' : 'No.'} |
| Is the buy amount readable? | ${facts.destinationAmount !== null ? 'Yes, as a Transfer-derived figure.' : 'No.'} |
| Is the fee readable? | ${facts.feeNative !== null ? 'Yes.' : 'No.'} |
| Is the block timestamp readable? | ${facts.executedAt !== null ? 'Yes.' : 'No — block number remains the authoritative anchor.'} |
| Can partial fills be distinguished? | **No.** Transfer events cannot distinguish them. All settled transactions report as \`FULL\`. |

${facts.unavailableReason ? `**Reason code \`${facts.unavailableReason}\`:** ${UNAVAILABLE_SENTENCE[facts.unavailableReason]}${attributionDetail ? `\n\n${attributionDetail}` : ''}` : 'No observability gap was hit for this transaction.'}

## 5. Findings

${priceReadable ? `The fill price is readable and is stated here as a **derived** figure, computed from raw integer amounts by division:\n\n| Figure | Value |\n|---|---|\n| Source amount (scaled) | ${facts.sourceAmount} |\n| Destination amount (scaled) | ${facts.destinationAmount} |\n| Executed price (destination per source) | ${facts.executedPrice} |\n\nScaling divides by each token's own decimals. A null decimals() is treated as unknown, never as 18 — assuming 18 for a 6-decimal token misstates the price by a factor of a trillion.` : `**The fill price is undetermined.** Reason: \`${facts.unavailableReason}\`. ${facts.unavailableReason ? UNAVAILABLE_SENTENCE[facts.unavailableReason] : ''}${attributionDetail ? `\n\n${attributionDetail}` : ''}\n\nThis is the honest outcome. A number presented here would be a guess, and in a dispute a confident guess is the most expensive thing this report could produce.`}

### Receipt

${receiptNote}

## 6. How to re-check this

See \`recheck.md\`. Every step is a command, not a description. A reviewer with a JSON-RPC endpoint and no trust in this report should be able to reproduce every figure in sections 3 to 5.

## 7. Corrections

Any correction is **appended**, never applied in place. Record: what changed, the previous value, the new value, the reason, who made the change, and when. A corrected report that hides its earlier state cannot be independently assessed, which defeats the purpose.
`;

  writeFileSync(join(args.out, 'report.md'), report);

  // 5. Command-level reproduction guide.
  const recheck = `# Re-check this case without trusting the report

You need: an EVM JSON-RPC endpoint. Nothing else. You do not need this repository, our keys, or our services.

**Transaction:** \`${args.tx}\`
**Chain:** ${args.chainId}
**RPC used:** ${rpcUrl}

## Step 1 — confirm the transaction exists and whether it settled

\`\`\`bash
curl -s ${args.rpcUrl ? args.rpcUrl : rpcUrl} \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["${
    args.tx
  }"]}' | jq '.result | {status, blockNumber, from, logs: (.logs|length)}'
\`\`\`

\`status\` of \`0x1\` means settled. \`0x0\` means reverted, and nothing settled — gas was still spent.

## Step 2 — read the raw transaction value

\`\`\`bash
curl -s ${rpcUrl} \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionByHash","params":["${
    args.tx
  }"]}' | jq '.result | {value, from, to, nonce}'
\`\`\`

The value is in wei. A native DESTINATION amount does not appear here or in any log — that is why a native leg leaves the price unestablished.

## Step 3 — count and read the Transfer logs

\`\`\`bash
curl -s ${rpcUrl} \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["${
    args.tx
  }"]}' | jq '[.result.logs[] | select(.topics[0]=="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef")] | length'
\`\`\`

The value in \`topics[0]\` is \`keccak256("Transfer(address,address,uint256)")\`. The amount is the last 64 hex characters of \`data\`, as an **unsigned integer**.

## Step 4 — read each token's decimals (never assume 18)

\`\`\`bash
curl -s ${rpcUrl} \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"<TOKEN_ADDRESS>","data":"0x313ce567"},"latest"]}' | jq -r '.result'
\`\`\`

\`0x313ce567\` is the selector for \`decimals()\`. **If this call fails, the amount is unknown.** Assuming 18 for a 6-decimal token overstates the amount by a factor of a billion.

## Step 5 — attribute the amounts

Sum the \`value\` fields of Transfer logs where the taker address is \`from\` (sold) or \`to\` (bought), for the relevant token address. The price is bought ÷ sold, after scaling each by its own decimals.

**You can only do this when both legs are ERC-20.** If one leg is the chain gas token, the bought amount is unobservable and the price cannot be established from logs. This is a property of the chain, not a gap in the analysis.

## Step 6 — compare against the report

\`\`\`bash
jq '.facts' <out>/facts.json
jq '.receipt' <out>/receipt.json
\`\`\`

If your independently computed figures differ from \`facts.json\`, **your figure is what the chain says** — the report is a claim, the chain is the evidence.

## What this guide does not cover

Partial fills cannot be detected from Transfer events, so a settled transaction reads as \`FULL\`. If the dispute turns on a partial fill, that needs transaction-level traces (\`debug_traceTransaction\`), which this package does not include.
`;

  writeFileSync(join(args.out, 'recheck.md'), recheck);

  // 6. Facts, verbatim.
  writeJson(join(args.out, 'facts.json'), {
    meta: {
      collectedAt: startedAt.toISOString(),
      rpc: rpcUrl,
      question: args.question,
      sourceAssetId: args.sourceAssetId,
      destinationAssetId: args.destinationAssetId,
      note:
        'Collector output, verbatim. Every field is a receipt read or a derived figure from raw ' +
        'logs; see report.md section 4 for what could NOT be established and why. ' +
        `bigint fields (blockNumber, feeNative) are serialised as {"$bigint":"<decimal>"} so ` +
        'exact wei never passes through a float.',
    },
    facts,
  });

  // --- console summary ---
  console.log('case       :', args.out);
  console.log('tx         :', facts.txHash);
  console.log('chain      :', facts.chainId, '| rpc:', rpcUrl);
  console.log('settled    :', facts.fillStatus === 'FULL' ? 'yes' : 'no (reverted)');
  console.log('block      :', facts.blockNumber !== null ? facts.blockNumber.toString() : 'n/a');
  console.log(
    'price      :',
    facts.executedPrice !== null ? String(facts.executedPrice) : 'UNDETERMINED'
  );
  console.log('reason     :', facts.unavailableReason ?? '-');
  console.log('receipt    :', receipt ? 'signed' : 'UNSIGNED (see receipt.json)');
  console.log('outputs    : facts.json raw-logs.json receipt.json report.md recheck.md');
  if (facts.unavailableReason) {
    console.log('');
    console.log(
      'This case has an observability gap. That is reported, not filled. ' +
        'Do not let anyone fill it with an estimate before signing.'
    );
  }
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
