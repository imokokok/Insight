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
check(
  'window B is locked by both parties and awaits only its READY',
  plan.selectedWindow.status === 'LOCKED_BY_BOTH_PARTIES_AWAITING_WINDOW_SPECIFIC_READY'
);
check(
  'the same runId continues byte for byte',
  plan.runIdentity.runId === 'insight-veritas-2026-09-18' &&
    plan.runIdentity.runIdComparison === 'BYTE_FOR_BYTE'
);
check(
  'attempt numbering continues as 3 through 7 without reset',
  JSON.stringify(plan.runIdentity.attempts) === JSON.stringify([3, 4, 5, 6, 7]) &&
    plan.runIdentity.attemptNumberingContinuesFromFirstWindow === true &&
    plan.runIdentity.attemptNumberingResetAllowed === false
);
check(
  'a wrong runId maps to the agreed abort reason',
  plan.runIdentity.wrongRunIdOutcome.status === 'ATTEMPT_ABORT' &&
    plan.runIdentity.wrongRunIdOutcome.reasonCode === 'BYTE_MISMATCH'
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
    plan.activationGates.readyMustArriveBeforeFirstGateSignature === true &&
    plan.activationGates.windowMustOpenBeforeFirstGateSignature === true
);
check(
  'all requested fresh checks are required',
  [
    'freshBitcoinOutputCheckRequired',
    'freshBitcoinOutputConfirmationCheckRequired',
    'freshBitcoinFeeLevelCheckRequired',
    'freshEthereumBalanceNonceAndFeeCheckRequired',
    'freshEthereumBaseFeeCheckRequired',
    'freshSettlementReadEndpointsCheckRequired',
    'freshSettlementReadEndpointsMustAgree',
    'freshTransactionSendEndpointsCheckRequired',
    'freshChainStateCheckRequired',
  ].every((name) => plan.activationGates[name] === true)
);
check(
  'READY excludes 2026-09-20 values',
  plan.activationGates.readyContainsOnlyRunDayValuesAndWindowCutoffs === true &&
    plan.activationGates.valuesFrom20260920AllowedInReady === false
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

console.log('\n== Run-day schedule and authorization boundaries ==');
check(
  'fresh checks and rehearsal run from 11:00 to 11:45 UTC',
  plan.runDaySchedule.freshChecksAndFullRehearsal.startsAt === '2026-09-23T11:00:00Z' &&
    plan.runDaySchedule.freshChecksAndFullRehearsal.endsAt === '2026-09-23T11:45:00Z'
);
check(
  'READY is targeted for 11:55 UTC and attempt 3 for 12:00 UTC',
  plan.runDaySchedule.veritasReadyTargetAt === '2026-09-23T11:55:00Z' &&
    plan.runDaySchedule.windowOpensAndAttempt3At === '2026-09-23T12:00:00Z'
);
check(
  'retry targets are 12:11, 12:22, 12:33 and 12:44 UTC',
  JSON.stringify(plan.runDaySchedule.retryRequestTargetTimes) ===
    JSON.stringify([
      '2026-09-23T12:11:00Z',
      '2026-09-23T12:22:00Z',
      '2026-09-23T12:33:00Z',
      '2026-09-23T12:44:00Z',
    ])
);
check(
  'retry target times are not signature authorization',
  plan.runDaySchedule.retryRequestTargetTimesAreAuthorization === false
);

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
  runId: 'insight-veritas-2026-09-18',
  attempt: 3,
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
rejects('renderer rejects the window date as a replacement runId', () =>
  renderGatePairMessage({ ...fixture, runId: 'insight-veritas-2026-09-23' })
);
rejects('renderer rejects an empty runId', () => renderGatePairMessage({ ...fixture, runId: '' }));
rejects('renderer rejects restarted attempt 1', () =>
  renderGatePairMessage({ ...fixture, attempt: 1 })
);
rejects('renderer rejects restarted attempt 2', () =>
  renderGatePairMessage({ ...fixture, attempt: 2 })
);
rejects('renderer rejects out-of-window attempt 8', () =>
  renderGatePairMessage({ ...fixture, attempt: 8 })
);
check(
  'renderer accepts the last scheduled attempt 7',
  renderGatePairMessage({ ...fixture, attempt: 7 }).includes('attempt: 7')
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
