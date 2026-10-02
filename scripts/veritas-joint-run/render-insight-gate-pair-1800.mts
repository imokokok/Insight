#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { concat, getAddress, keccak256 } from 'viem';
import { z } from 'zod';

const RUN_ID = 'insight-veritas-2026-09-18';
const ATTESTER = getAddress('0x6506F789Edd43338A416f59822A63F309f97E8ce');
const WETH = 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const Bytes32 = z.string().regex(/^0x[0-9a-f]{64}$/);
const Envelope = z
  .object({
    uid: Bytes32,
    schemaVersion: z.literal(3),
    attester: z.string(),
    signedAt: z.string().datetime({ offset: true }),
    validForSeconds: z.literal(1800),
    validUntil: z.number().int().positive(),
    signature: z.string().regex(/^0x[0-9a-f]{130}$/),
    data: z
      .object({
        verdict: z.literal('PASS'),
        sourceAssetId: z.string(),
        destinationAssetId: z.string(),
        subjectChainId: z.literal(1),
        action: z.literal('swap'),
        tradeAmountUsd: z.literal(50_000_000_000),
        evaluationScope: z.literal('SOURCE_ASSET_ONLY'),
        schemaVersion: z.literal(3),
        checkedAt: z.number().int().positive(),
        validUntil: z.number().int().positive(),
      })
      .passthrough(),
    eip712: z.object({ primaryType: z.literal('OracleSafetyCheck') }).passthrough(),
  })
  .passthrough();
const Pair = z
  .object({
    messageType: z.literal('INSIGHT_GATE_PAIR'),
    runId: z.literal(RUN_ID),
    attempt: z.number().int().min(6).max(8),
    sourceEnvelope: Envelope,
    destinationEnvelope: Envelope,
    sourceGateUid: Bytes32,
    destinationGateUid: Bytes32,
    preTradeUidsHash: Bytes32,
  })
  .strict();

export function renderGatePairMessage1800(input: unknown): string {
  const pair = Pair.parse(input);
  const roles = [
    ['source', pair.sourceEnvelope, WETH, USDC],
    ['destination', pair.destinationEnvelope, USDC, WETH],
  ] as const;
  for (const [name, envelope, source, destination] of roles) {
    if (getAddress(envelope.attester) !== ATTESTER) throw new Error(`${name} attester mismatch`);
    if (
      envelope.data.sourceAssetId !== source ||
      envelope.data.destinationAssetId !== destination
    ) {
      throw new Error(`${name} signed route mismatch`);
    }
    if (
      envelope.validUntil !== envelope.data.validUntil ||
      envelope.validUntil !== envelope.data.checkedAt + 1800
    ) {
      throw new Error(`${name} signed expiry mismatch`);
    }
  }
  if (pair.sourceEnvelope.uid === pair.destinationEnvelope.uid)
    throw new Error('duplicate gate UID');
  if (
    pair.sourceGateUid !== pair.sourceEnvelope.uid ||
    pair.destinationGateUid !== pair.destinationEnvelope.uid
  ) {
    throw new Error('outer UID does not match its signed envelope');
  }
  if (pair.preTradeUidsHash !== keccak256(concat([pair.sourceGateUid, pair.destinationGateUid]))) {
    throw new Error('ordered UID hash mismatch');
  }
  return [
    'INSIGHT_GATE_PAIR',
    `runId: ${pair.runId}`,
    `attempt: ${pair.attempt}`,
    '',
    'sourceEnvelope:',
    JSON.stringify(pair.sourceEnvelope, null, 2),
    '',
    'destinationEnvelope:',
    JSON.stringify(pair.destinationEnvelope, null, 2),
    '',
    `sourceGateUid: ${pair.sourceGateUid}`,
    `destinationGateUid: ${pair.destinationGateUid}`,
    `preTradeUidsHash: ${pair.preTradeUidsHash}`,
    '',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--input') {
      throw new Error('usage: render-insight-gate-pair-1800.mts --input <signed-pair.json>');
    }
    process.stdout.write(
      renderGatePairMessage1800(JSON.parse(fs.readFileSync(process.argv[3], 'utf8')))
    );
  } catch (error) {
    process.stderr.write(
      `REFUSE TO RENDER: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
}
