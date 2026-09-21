#!/usr/bin/env node

import fs from 'node:fs';

import { concat, keccak256 } from 'viem';

import { renderGatePairMessage } from './render-insight-gate-pair.mjs';

const base = new URL('.', import.meta.url);
const load = (name) => JSON.parse(fs.readFileSync(new URL(name, base), 'utf8'));
const plan = load('joint-run-window-2-plan-v1.json');
const agreementV1 = load('joint-run-operational-agreement-v1.json');

let passes = 0;
let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (ok) passes += 1;
  else failures += 1;
};
const rejects = (label, fn) => {
  try {
    fn();
    check(label, false, 'accepted an input that must be rejected');
  } catch (error) {
    check(label, true, error.message);
  }
};

console.log('== Window selection and capacity ==');
check('candidate B is selected', plan.selectedWindow.candidate === 'B');
check(
  'window is 2026-09-23 12:00–13:00 UTC',
  plan.selectedWindow.startsAt === '2026-09-23T12:00:00Z' &&
    plan.selectedWindow.endsAt === '2026-09-23T13:00:00Z' &&
    plan.selectedWindow.durationSeconds === 3600
);
check(
  'Insight local time is 20:00 +08:00',
  plan.selectedWindow.insightLocalTime === '2026-09-23T20:00:00+08:00'
);
check('five fresh gate pairs are planned', plan.attemptCapacity.maximumFreshGatePairs === 5);
check('target cycle is eleven minutes', plan.attemptCapacity.targetCycleSeconds === 660);
check(
  'operator remains available for the full hour',
  plan.attemptCapacity.operatorAvailabilityRequiredForEntireWindow === true
);
check(
  'fresh gates and explicit retry requests remain mandatory',
  plan.attemptCapacity.freshSignedGatePairRequiredPerAttempt === true &&
    plan.attemptCapacity.explicitVeritasRetryRequestRequiredAfterAttemptOne === true
);
check(
  'pre-signing and reuse remain forbidden',
  plan.attemptCapacity.preSigningAllowed === false &&
    plan.attemptCapacity.gateReuseAcrossAttemptsAllowed === false
);

console.log('\n== Cutoffs and activation gates ==');
check(
  'minute 44/47/55/60 cutoffs are exact',
  JSON.stringify(plan.windowCutoffs) ===
    JSON.stringify({
      lastGateRequestMinute: 44,
      noBitcoinBroadcastAfterMinute: 47,
      attemptsConcludedByMinute: 55,
      recordsPublishedByMinute: 60,
    })
);
check(
  'new READY is required before the first signature',
  plan.activationGates.windowSpecificVeritasReadyRequired === true &&
    plan.activationGates.readyMustArriveBeforeFirstGateSignature === true
);
check(
  'all requested fresh checks are required',
  [
    'freshBitcoinOutputCheckRequired',
    'freshEthereumBalanceNonceAndFeeCheckRequired',
    'freshSettlementReadEndpointsCheckRequired',
    'freshTransactionSendEndpointsCheckRequired',
    'freshChainStateCheckRequired',
  ].every((name) => plan.activationGates[name] === true)
);
check(
  'unusable or disagreeing endpoints fail closed',
  plan.activationGates.noUsableDataSourceOutcome === 'FAIL_CLOSED' &&
    plan.activationGates.endpointDisagreementOutcome === 'FAIL_CLOSED'
);
check(
  'nothing authorized in the first window carries forward',
  Object.values(plan.carryForwardFromFirstWindow).every((value) => value === false)
);
check('selection rule pin is unchanged', plan.selectionRuleHash === agreementV1.selectionRuleHash);

console.log('\n== Pre-composed gate message ==');
const sourceGateUid = `0x${'11'.repeat(32)}`;
const destinationGateUid = `0x${'22'.repeat(32)}`;
const preTradeUidsHash = keccak256(concat([sourceGateUid, destinationGateUid]));
const envelope = (uid, signatureByte) => ({
  uid,
  schemaVersion: 3,
  attester: '0xa268676C85b927D64a4e2384636874f76D69e419',
  signedAt: '2026-09-23T12:00:01.000Z',
  validForSeconds: 600,
  validUntil: 1789992601,
  signature: `0x${signatureByte.repeat(65)}`,
  data: { schemaVersion: 3, validUntil: 1789992601 },
  eip712: { primaryType: 'OracleSafetyCheck' },
});
const fixture = {
  messageType: 'INSIGHT_GATE_PAIR',
  runId: 'fixture-not-for-broadcast',
  attempt: 1,
  sourceEnvelope: envelope(sourceGateUid, '33'),
  destinationEnvelope: envelope(destinationGateUid, '44'),
  sourceGateUid,
  destinationGateUid,
  preTradeUidsHash,
};
const rendered = renderGatePairMessage(fixture);
check('renderer emits the agreed plain-text header', rendered.startsWith('INSIGHT_GATE_PAIR\n'));
check(
  'renderer includes both complete envelope sections',
  rendered.includes('sourceEnvelope:\n{') && rendered.includes('destinationEnvelope:\n{')
);
check(
  'renderer includes exactly the three live commitment lines',
  [sourceGateUid, destinationGateUid, preTradeUidsHash].every((value) => rendered.includes(value))
);
check(
  'renderer does not add duplicate outer validUntil lines',
  !rendered.includes('sourceValidUntil:') && !rendered.includes('destinationValidUntil:')
);
rejects('renderer rejects a mismatched source uid', () =>
  renderGatePairMessage({ ...fixture, sourceGateUid: destinationGateUid })
);
rejects('renderer rejects an incorrect ordered uid hash', () =>
  renderGatePairMessage({ ...fixture, preTradeUidsHash: sourceGateUid })
);
rejects('renderer rejects pre-v3 envelopes', () =>
  renderGatePairMessage({
    ...fixture,
    sourceEnvelope: { ...fixture.sourceEnvelope, schemaVersion: 2 },
  })
);

console.log('\n== Standing boundaries ==');
check('F12 remains open', plan.standing[0].startsWith('F12 remains open'));
check(
  'integration and endorsement are still disclaimed',
  plan.standing.includes('Not a VERITAS integration') &&
    plan.standing.includes('Verification is not endorsement')
);

console.log(`\nWINDOW 2 PLAN: ${passes} PASS / ${failures} FAIL`);
if (failures > 0) process.exitCode = 1;
