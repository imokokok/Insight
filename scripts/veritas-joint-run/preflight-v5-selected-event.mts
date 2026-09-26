#!/usr/bin/env node

/** Production-role, no-broadcast preflight for the selected VERITAS window. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

import { decodeAbiParameters } from 'viem';
import { z } from 'zod';

import { createApiKeyForUser, revokeApiKey } from '@/lib/api/apiKey';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ORIGIN = 'https://www.oracleinsight.xyz';
const POLICY_ID = '0x162d3fe744acc2041a959daf40dc3fe9242b654aef58acbb991acbf605885085';
const ACTIVATION_SET_ID = '0xc83feebc5fe8722129a27c015192e6583cd166e0cd149dd6a7d99564474728db';
const POOL = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
const SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
const WETH = 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const USDC = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const RPCS = ['https://ethereum-rpc.publicnode.com', 'https://rpc.mevblocker.io'];
const USER_AGENT = 'Insight-VERITAS-window-A-preflight/1.0';
const BYTES32 = /^0x[0-9a-f]{64}$/;

const GateSchema = z
  .object({
    uid: z.string().regex(BYTES32),
    schemaVersion: z.literal(3),
    validForSeconds: z.literal(600),
    validUntil: z.number().int().positive(),
    data: z
      .object({
        verdict: z.string(),
        requestHash: z.string().regex(BYTES32),
        sourceAssetId: z.string(),
        destinationAssetId: z.string(),
        subjectChainId: z.literal(1),
        action: z.literal('swap'),
        checkedAt: z.number().int().positive(),
        validUntil: z.number().int().positive(),
        participantCount: z.number().int().nonnegative(),
        sourceGroupCount: z.number().int().nonnegative(),
        consensusPrice: z.number().int().positive(),
      })
      .passthrough(),
  })
  .passthrough();

const LogSchema = z.object({
  address: z.string(),
  blockNumber: z.string(),
  transactionHash: z.string().regex(BYTES32),
  transactionIndex: z.string(),
  logIndex: z.string(),
  topics: z.array(z.string()),
  data: z.string(),
});

type Gate = z.infer<typeof GateSchema>;
type SwapLog = z.infer<typeof LogSchema>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function object(value: unknown, label: string): Record<string, unknown> {
  assert(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`
  );
  return value as Record<string, unknown>;
}

function dataOf(value: unknown, label: string): Record<string, unknown> {
  return object(object(value, label).data, `${label}.data`);
}

function save(dir: string, name: string, value: unknown): void {
  writeFileSync(join(dir, name), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function json(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      'User-Agent': USER_AGENT,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(45_000),
  });
  const body = (await response.json()) as unknown;
  assert(
    response.ok,
    `${url} returned HTTP ${response.status}: ${String(object(body, 'HTTP body').error ?? 'unknown')}`
  );
  return body;
}

async function post(path: string, body: unknown, apiKey?: string): Promise<unknown> {
  const response = await json(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
    body: JSON.stringify(body),
  });
  assert(object(response, path).success === true, `${path} returned success=false`);
  return response;
}

async function rpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const response = object(
    await json(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    }),
    `${method} response`
  );
  assert(
    response.error === undefined && response.result !== undefined,
    `${endpoint} ${method} failed`
  );
  return response.result;
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  assert(numerator >= 0n && denominator > 0n, 'price ratio must be positive');
  return (numerator + denominator / 2n) / denominator;
}

function amounts(log: SwapLog): { usdcOut: bigint; wethIn: bigint } {
  assert(
    log.address.toLowerCase() === POOL && log.topics[0]?.toLowerCase() === SWAP_TOPIC,
    'wrong pool or Swap topic'
  );
  const [amount0, amount1] = decodeAbiParameters(
    [
      { type: 'int256' },
      { type: 'int256' },
      { type: 'uint160' },
      { type: 'uint128' },
      { type: 'int24' },
    ],
    log.data as `0x${string}`
  );
  return { usdcOut: -amount0, wethIn: amount1 };
}

async function firstSelected(
  startBlock: number,
  expiry: number
): Promise<{ log: SwapLog; usdcOut: bigint; wethIn: bigint; blockTime: number; receipt: unknown }> {
  let nextBlock = startBlock + 1;
  const deadline = Math.min(Date.now() + 420_000, expiry * 1000 - 30_000);
  while (Date.now() < deadline) {
    const heads = await Promise.all(RPCS.map((endpoint) => rpc(endpoint, 'eth_blockNumber', [])));
    const head = Math.min(...heads.map((value) => Number(BigInt(String(value)))));
    if (head >= nextBlock) {
      const raw = await rpc(RPCS[0]!, 'eth_getLogs', [
        {
          address: POOL,
          fromBlock: `0x${nextBlock.toString(16)}`,
          toBlock: `0x${head.toString(16)}`,
          topics: [SWAP_TOPIC],
        },
      ]);
      const logs = z
        .array(LogSchema)
        .parse(raw)
        .sort(
          (a, b) =>
            Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)) ||
            Number(BigInt(a.transactionIndex) - BigInt(b.transactionIndex)) ||
            Number(BigInt(a.logIndex) - BigInt(b.logIndex))
        );
      for (const log of logs) {
        const { usdcOut, wethIn } = amounts(log);
        if (usdcOut <= 0n || wethIn < 100_000_000_000_000_000n) continue;
        const block = object(
          await rpc(RPCS[0]!, 'eth_getBlockByNumber', [log.blockNumber, false]),
          'selected block'
        );
        const blockTime = Number(BigInt(String(block.timestamp)));
        assert(blockTime <= expiry, 'selected event is after gate expiry');
        const receipts = await Promise.all(
          RPCS.map((endpoint) => rpc(endpoint, 'eth_getTransactionReceipt', [log.transactionHash]))
        );
        const canonical = JSON.stringify(
          receipts.map((value) => {
            const receipt = object(value, 'transaction receipt');
            const selected = z
              .array(LogSchema)
              .parse(receipt.logs)
              .find((item) => item.logIndex === log.logIndex);
            assert(selected, 'selected log missing from transaction receipt');
            return {
              blockHash: receipt.blockHash,
              transactionHash: receipt.transactionHash,
              selected,
            };
          })
        );
        const parsed = JSON.parse(canonical) as Array<{
          blockHash: string;
          transactionHash: string;
          selected: SwapLog;
        }>;
        assert(
          JSON.stringify(parsed[0]) === JSON.stringify(parsed[1]),
          'two RPCs disagree on selected log or block hash'
        );
        return { log, usdcOut, wethIn, blockTime, receipt: receipts[0] };
      }
      nextBlock = head + 1;
    }
    await new Promise((done) => setTimeout(done, 4000));
  }
  throw new Error('no qualifying selected event before the preflight deadline');
}

function validateGate(gate: Gate, source: string, destination: string): void {
  assert(
    gate.data.sourceAssetId.toLowerCase() === source &&
      gate.data.destinationAssetId.toLowerCase() === destination,
    'gate asset binding mismatch'
  );
  assert(
    gate.data.validUntil === gate.validUntil && gate.validUntil === gate.data.checkedAt + 600,
    'gate window is not 600 seconds'
  );
  assert(gate.data.verdict === 'PASS', `preflight gate is ${gate.data.verdict}`);
}

async function main(): Promise<void> {
  assert(
    process.argv.length === 4 && process.argv[2] === '--output',
    'usage: preflight-v5-selected-event.mts --output DIR'
  );
  const output = resolve(process.argv[3]!);
  assert(!existsSync(output), 'output directory already exists');
  mkdirSync(output, { recursive: false, mode: 0o700 });
  const ownerId = (process.env.OPS_OWNER_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  assert(ownerId, 'OPS_OWNER_USER_IDS is required');

  const [issuer, integrations] = await Promise.all([
    json(`${ORIGIN}/api/v1/execution/attestation/verify`),
    json(`${ORIGIN}/.well-known/oracle-registry/integrations/current.json`),
  ]);
  const issuerData = dataOf(issuer, 'issuer metadata');
  assert(issuerData.schemaVersion === 5 && issuerData.attester, 'production issuer is not v5');
  assert(
    object(integrations, 'integrations').activationSetId === ACTIVATION_SET_ID,
    'VERITAS activation set changed'
  );
  save(output, 'issuer-metadata.json', issuer);
  save(output, 'current-integrations.json', integrations);

  const temporary = await createApiKeyForUser(ownerId, 'VERITAS window A full-path preflight', {
    plan: 'enterprise',
    expiresAt: new Date(Date.now() + 45 * 60_000).toISOString(),
  });
  let keyRevoked = false;
  try {
    const gateUrl = (asset: 'WETH' | 'USDC', destinationAsset: 'WETH' | 'USDC') => {
      const url = new URL(`${ORIGIN}/api/v1/safety/pre-trade`);
      url.search = new URLSearchParams({
        asset,
        chainId: '1',
        action: 'swap',
        tradeAmountUsd: '50000',
        schemaVersion: '3',
        destinationAsset,
        workflowTag: 'veritas-window-a-preflight',
      }).toString();
      return url.toString();
    };
    const [sourceResponse, destinationResponse] = await Promise.all([
      json(gateUrl('WETH', 'USDC'), { headers: { 'X-API-Key': temporary.plainKey } }),
      json(gateUrl('USDC', 'WETH'), { headers: { 'X-API-Key': temporary.plainKey } }),
    ]);
    save(output, 'source-gate-response.json', sourceResponse);
    save(output, 'destination-gate-response.json', destinationResponse);
    const source = GateSchema.parse(dataOf(sourceResponse, 'source gate response').attestation);
    const destination = GateSchema.parse(
      dataOf(destinationResponse, 'destination gate response').attestation
    );
    validateGate(source, WETH, USDC);
    validateGate(destination, USDC, WETH);
    assert(
      source.data.requestHash !== destination.data.requestHash,
      'opposite-direction gate request hashes unexpectedly match'
    );
    const expiry = Math.min(source.validUntil, destination.validUntil);
    const heads = await Promise.all(RPCS.map((endpoint) => rpc(endpoint, 'eth_blockNumber', [])));
    const startBlock = Math.min(...heads.map((value) => Number(BigInt(String(value)))));
    const selected = await firstSelected(startBlock, expiry);
    assert(
      selected.blockTime >= Math.max(source.data.checkedAt, destination.data.checkedAt),
      'selected event predates gates'
    );
    save(output, 'selected-transaction-receipt.json', selected.receipt);

    const issue = await post(
      '/api/v1/execution/attestation/issue',
      {
        preTradeUid: source.uid,
        destinationPreTradeUid: destination.uid,
        requestHash: source.data.requestHash,
        sourceAssetId: source.data.sourceAssetId,
        destinationAssetId: source.data.destinationAssetId,
        subjectChainId: 1,
        settlementChainId: 1,
        participantCount: source.data.participantCount,
        sourceGroupCount: source.data.sourceGroupCount,
        preTradeSignedAt: source.data.checkedAt,
        quotedPrice: 0,
        action: 'swap',
        txHash: selected.log.transactionHash,
        selectedSwapLogIndex: Number(BigInt(selected.log.logIndex)),
        quoteVenueIndependent: false,
        quoteBasis: 'ORACLE_CONSENSUS',
        quoteBlockNumber: 0,
        priceStateAgeAtExecSeconds: 0,
        claimRole: 'THIRD_PARTY_OBSERVATION',
        preTradeAttestations: { source, destination },
      },
      temporary.plainKey
    );
    save(output, 'production-issue-response.json', issue);
    const issued = dataOf(issue, 'issue response');
    const receipt = object(issued.attestation, 'signed receipt');
    const receiptData = object(receipt.data, 'signed receipt data');
    const event = object(issued.selectedEvent, 'selected event witness');
    const expectedPrice = roundDivide(selected.usdcOut * 10n ** 20n, selected.wethIn);
    const expectedQuote = roundDivide(
      BigInt(source.data.consensusPrice) * 100_000_000n,
      BigInt(destination.data.consensusPrice)
    );
    assert(
      BigInt(String(receiptData.executedPrice)) === expectedPrice,
      'signed price differs from selected event'
    );
    assert(
      BigInt(String(receiptData.quotedPrice)) === expectedQuote,
      'signed quote differs from gate cross-rate'
    );
    assert(
      receiptData.quoteBasis === 'ORACLE_CONSENSUS' && receiptData.quoteBlockNumber === 0,
      'signed quote provenance mismatch'
    );
    assert(
      String(receiptData.txHash).toLowerCase() === selected.log.transactionHash,
      'signed transaction mismatch'
    );
    assert(
      event.logIndex === Number(BigInt(selected.log.logIndex)) &&
        String(event.pool).toLowerCase() === POOL,
      'selected event witness mismatch'
    );
    assert(
      event.sourceRaw === selected.wethIn.toString() &&
        event.destinationRaw === selected.usdcOut.toString(),
      'selected event raw amounts mismatch'
    );

    const verificationBody = { attestation: receipt, policyId: POLICY_ID };
    const [publicVerify, partnerVerify, pairVerify] = await Promise.all([
      post('/api/v1/execution/attestation/verify', verificationBody),
      post('/api/v1/partners/veritas/execution/attestation/verify', verificationBody),
      post('/api/v1/partners/veritas/execution/attestation/verify-pair', {
        preTradeAttestation: source,
        destinationPreTradeAttestation: destination,
        executionReceipt: receipt,
        policyId: POLICY_ID,
      }),
    ]);
    save(output, 'public-verification.json', publicVerify);
    save(output, 'partner-verification.json', partnerVerify);
    save(output, 'pair-verification.json', pairVerify);
    for (const [label, response] of [
      ['public', publicVerify],
      ['partner', partnerVerify],
    ] as const) {
      const data = dataOf(response, `${label} verification`);
      assert(
        data.cryptographicValid === true && data.trustedAttester === true,
        `${label} signature or signer failed`
      );
      assert(
        data.valid === true &&
          data.consumerPolicy &&
          object(data.consumerPolicy, 'consumer policy').valid === true,
        `${label} active-policy verification failed`
      );
    }
    assert(
      dataOf(pairVerify, 'pair verification').pairedValid === true,
      'production pair verification failed'
    );
    save(output, 'preflight-summary.json', {
      capturedAt: new Date().toISOString(),
      scope: 'PRODUCTION_GATES_AND_SELECTED_EVENT_RECEIPT_NO_CHAIN_COMMITMENT_BROADCAST',
      productionOrigin: ORIGIN,
      currentActivationSetId: ACTIVATION_SET_ID,
      policyId: POLICY_ID,
      sourceGateUid: source.uid,
      destinationGateUid: destination.uid,
      gateStartBlock: startBlock,
      selectedTransactionHash: selected.log.transactionHash,
      selectedBlockNumber: Number(BigInt(selected.log.blockNumber)),
      selectedLogIndex: Number(BigInt(selected.log.logIndex)),
      selectedBlockTime: selected.blockTime,
      signedReceiptUid: receipt.uid,
      signedVerdict: receiptData.priceExecutionStatus,
      executedPrice8: expectedPrice.toString(),
      quotedPrice8: expectedQuote.toString(),
      temporaryApiKeyRevocationPending: true,
      liveJointRunAttemptStarted: false,
    });
  } finally {
    await revokeApiKey(temporary.record.id, ownerId);
    const client = createServiceRoleClient();
    const { data, error } = await client
      .from('api_keys')
      .select('is_active')
      .eq('id', temporary.record.id)
      .single();
    assert(!error && data?.is_active === false, 'temporary API key revocation was not confirmed');
    keyRevoked = true;
  }
  assert(keyRevoked, 'temporary API key was not revoked');
  const summaryPath = join(output, 'preflight-summary.json');
  const summary = object(
    JSON.parse(readFileSync(summaryPath, 'utf8')) as unknown,
    'preflight summary'
  );
  summary.temporaryApiKeyRevocationPending = false;
  summary.temporaryApiKeyRevoked = true;
  save(output, 'preflight-summary.json', summary);
  const digest = createHash('sha256').update(readFileSync(summaryPath)).digest('hex');
  process.stdout.write(
    `VERITAS WINDOW A PREFLIGHT PASS receipt=${String(summary.signedReceiptUid)} summarySha256=${digest}\n`
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `VERITAS WINDOW A PREFLIGHT FAILED: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
