#!/usr/bin/env node

import fs from 'node:fs';

import { concat, keccak256 } from 'viem';

const BYTES32 = /^0x[0-9a-f]{64}$/;
const SIGNATURE = /^0x[0-9a-f]{130}$/;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const window2Plan = JSON.parse(
  fs.readFileSync(new URL('joint-run-window-2-plan-v1.json', import.meta.url), 'utf8')
);
const expectedRunId = window2Plan.runIdentity?.runId;
const allowedAttempts = window2Plan.runIdentity?.attempts;

assert(
  typeof expectedRunId === 'string' && expectedRunId.length > 0,
  'window-2 plan must define a non-empty runIdentity.runId'
);
assert(
  Array.isArray(allowedAttempts) &&
    allowedAttempts.length > 0 &&
    allowedAttempts.every((attempt) => Number.isSafeInteger(attempt) && attempt >= 1),
  'window-2 plan must define positive integer runIdentity.attempts'
);

const validateEnvelope = (name, envelope) => {
  assert(
    envelope && typeof envelope === 'object' && !Array.isArray(envelope),
    `${name} must be an object`
  );
  assert(BYTES32.test(envelope.uid), `${name}.uid must be lowercase 0x-prefixed bytes32`);
  assert(
    SIGNATURE.test(envelope.signature),
    `${name}.signature must be a 65-byte lowercase hex signature`
  );
  assert(envelope.schemaVersion === 3, `${name}.schemaVersion must be 3`);
  assert(envelope.validForSeconds === 600, `${name}.validForSeconds must be 600`);
  assert(Number.isSafeInteger(envelope.validUntil), `${name}.validUntil must be a safe integer`);
  assert(
    Number.isSafeInteger(envelope.data?.validUntil),
    `${name}.data.validUntil must be a safe integer`
  );
  assert(envelope.data.validUntil === envelope.validUntil, `${name} validUntil values must match`);
  assert(envelope.data.schemaVersion === 3, `${name}.data.schemaVersion must be 3`);
  assert(
    Number.isFinite(Date.parse(envelope.signedAt)),
    `${name}.signedAt must be an ISO timestamp`
  );
  assert(envelope.eip712 && typeof envelope.eip712 === 'object', `${name}.eip712 must be present`);
};

export const renderGatePairMessage = (input) => {
  assert(input?.messageType === 'INSIGHT_GATE_PAIR', 'messageType must be INSIGHT_GATE_PAIR');
  assert(input.runId === expectedRunId, `runId must equal ${expectedRunId} byte for byte`);
  assert(
    Number.isSafeInteger(input.attempt) && allowedAttempts.includes(input.attempt),
    `attempt must be one of ${allowedAttempts.join(', ')}`
  );
  validateEnvelope('sourceEnvelope', input.sourceEnvelope);
  validateEnvelope('destinationEnvelope', input.destinationEnvelope);

  for (const name of ['sourceGateUid', 'destinationGateUid', 'preTradeUidsHash']) {
    assert(BYTES32.test(input[name]), `${name} must be lowercase 0x-prefixed bytes32`);
  }
  assert(
    input.sourceGateUid === input.sourceEnvelope.uid,
    'sourceGateUid must equal sourceEnvelope.uid'
  );
  assert(
    input.destinationGateUid === input.destinationEnvelope.uid,
    'destinationGateUid must equal destinationEnvelope.uid'
  );
  assert(
    input.preTradeUidsHash === keccak256(concat([input.sourceGateUid, input.destinationGateUid])),
    'preTradeUidsHash must equal keccak256(sourceGateUid || destinationGateUid)'
  );

  return [
    'INSIGHT_GATE_PAIR',
    `runId: ${input.runId}`,
    `attempt: ${input.attempt}`,
    '',
    'sourceEnvelope:',
    JSON.stringify(input.sourceEnvelope, null, 2),
    '',
    'destinationEnvelope:',
    JSON.stringify(input.destinationEnvelope, null, 2),
    '',
    `sourceGateUid: ${input.sourceGateUid}`,
    `destinationGateUid: ${input.destinationGateUid}`,
    `preTradeUidsHash: ${input.preTradeUidsHash}`,
    '',
  ].join('\n');
};

const parseArgs = (argv) => {
  const inputIndex = argv.indexOf('--input');
  assert(
    inputIndex >= 0 && argv[inputIndex + 1],
    'usage: render-insight-gate-pair.mjs --input <signed-pair.json>'
  );
  return argv[inputIndex + 1];
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const inputPath = parseArgs(process.argv.slice(2));
    const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    process.stdout.write(renderGatePairMessage(input));
  } catch (error) {
    process.stderr.write(`REFUSE TO RENDER: ${error.message}\n`);
    process.exitCode = 1;
  }
}
