#!/usr/bin/env node

import fs from 'node:fs';

import canonicalize from 'canonicalize';
import { concat, encodeAbiParameters, getAddress, isAddress, keccak256, toBytes } from 'viem';

import {
  buildCommitments,
  taggedHashSha256,
  validateRule,
} from './build-joint-run-commitments.mjs';

const base = new URL('.', import.meta.url);
const load = (name) => JSON.parse(fs.readFileSync(new URL(name, base), 'utf8'));
const rule = load('anchored-settlement-selection-rule-v2.json');
const bitcoinVector = load('bitcoin-anchor-commitment-vector-v1.json');
const orderingVector = load('ethereum-ordering-commitment-vector-v1.json');
const observationVector = load('provider-observation-hash-vector-v1.json');
const finalPackage = load('joint-run-final-package-requirements-v1.json');
const operationalAgreement = load('joint-run-operational-agreement-v1.json');

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

const hashJcs = (value) => keccak256(toBytes(canonicalize(value)));
const reverseBytes = (hex) => Buffer.from(hex, 'hex').reverse().toString('hex');
const bitcoinInput = { ...bitcoinVector.preimage };
delete bitcoinInput.schema;
const orderingInput = { ...orderingVector.preimage };
delete orderingInput.schema;
const builtBitcoin = buildCommitments({ rule, input: bitcoinInput });
const builtAll = buildCommitments({ rule, input: orderingInput });

console.log('== F17: canonical committed addresses ==');
for (const [label, address] of [
  ['pool', rule.venue.pool],
  ['WETH', rule.direction.sourceTokenAddress],
  ['USDC', rule.direction.destinationTokenAddress],
]) {
  check(`${label} address is valid`, isAddress(address));
  check(`${label} address uses canonical EIP-55 casing`, getAddress(address) === address, address);
}
check(
  'USDC is the corrected canonical string',
  rule.direction.destinationTokenAddress === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
);
rejects('rule validator rejects the round-8 USDC spelling', () => {
  validateRule({
    ...rule,
    direction: {
      ...rule.direction,
      destinationTokenAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0cE3606eB48',
    },
  });
});

console.log('\n== Selection rule invariants and repin ==');
const ruleHash = hashJcs(rule);
check('rule schema remains v2', rule.schema.endsWith('/v2'), rule.schema);
check('registered gate window remains 600 seconds', rule.gateWindowSeconds === 600);
check('minimum source leg remains 0.1 WETH', rule.minimumSourceLeg.raw === '100000000000000000');
check(
  'cross-chain timestamp predicate remains null',
  rule.candidateWindow.crossChainTimestampPredicate === null
);
check(
  'candidate ordering remains blockNumber > E',
  rule.candidateWindow.sameChainOrderPredicate ===
    'Ethereum candidate blockNumber must be strictly greater than E'
);
check(
  'Bitcoin vector pins the recomputed rule hash',
  bitcoinVector.selectionRuleHash === ruleHash,
  ruleHash
);
check(
  'ordering vector pins the recomputed rule hash',
  orderingVector.selectionRuleHash === ruleHash
);
check(
  'final-package requirements pin the recomputed rule hash',
  finalPackage.selectionRuleHash === ruleHash
);
check(
  'operational agreement pins the recomputed rule hash',
  operationalAgreement.selectionRuleHash === ruleHash
);

console.log('\n== N22: five-field Bitcoin anchor preimage and tagged leaf ==');
const bitcoinFieldNames = rule.bitcoinAnchorCommitment.requiredPreimageFields.map(
  ({ name }) => name
);
check(
  'Bitcoin preimage field list is exact',
  JSON.stringify(bitcoinFieldNames) ===
    JSON.stringify([
      'schema',
      'sourceGateUid',
      'destinationGateUid',
      'preTradeUidsHash',
      'selectionRuleHash',
    ])
);
check(
  'Bitcoin schema is agreed v1',
  rule.bitcoinAnchorCommitment.preimageSchema === 'insight-veritas-bitcoin-anchor-commitment/v1'
);
check(
  'Bitcoin leaf tag is protocol-distinct',
  rule.bitcoinAnchorCommitment.leafTag === 'VRT1/anchored-settlement-commitment'
);
check(
  'builder reproduces the literal Bitcoin preimage',
  canonicalize(builtBitcoin.bitcoinAnchor.preimage) === canonicalize(bitcoinVector.preimage)
);
check(
  'builder reproduces the literal Bitcoin canonical string',
  builtBitcoin.bitcoinAnchor.canonicalPreimage === bitcoinVector.canonicalPreimage
);
check(
  'builder reproduces the literal Bitcoin canonical hex',
  builtBitcoin.bitcoinAnchor.canonicalPreimageHex === bitcoinVector.canonicalPreimageHex
);
check(
  'Bitcoin preimage is 409 UTF-8 bytes',
  builtBitcoin.bitcoinAnchor.canonicalPreimageBytes === 409 &&
    bitcoinVector.canonicalPreimageBytes === 409
);
check(
  'tagged SHA-256 anchor leaf reproduces',
  builtBitcoin.bitcoinAnchor.anchorLeafHash === bitcoinVector.anchorLeafHash &&
    taggedHashSha256(
      bitcoinVector.leafTag,
      Buffer.from(bitcoinVector.canonicalPreimage, 'utf8')
    ).toString('hex') === bitcoinVector.anchorLeafHash
);
check(
  'Bitcoin preimage excludes sequential-handshake fields',
  ['timestamp', 'agentKey', 'nonce'].every((name) => !(name in bitcoinVector.preimage))
);
check(
  'pre-confirmation builder does not invent Ethereum facts',
  builtBitcoin.ethereumOrdering === null
);

console.log('\n== N20: explicit and encoding-discriminating Bitcoin fields ==');
const orderingTypes = Object.fromEntries(
  rule.ethereumOrderingCommitment.requiredPreimageFields.map(({ name, type }) => [name, type])
);
for (const name of ['bitcoinAnchorTxid', 'bitcoinConfirmingBlockHash']) {
  const type = orderingTypes[name];
  check(`${name} type requires lowercase`, type.includes('lowercase'));
  check(`${name} type forbids 0x`, type.includes('without 0x'));
  check(`${name} type fixes Bitcoin display order`, type.includes('display order'));
  check(
    `${name} fixture is bare lowercase 32-byte hex`,
    /^[0-9a-f]{64}$/.test(orderingVector.preimage[name])
  );
  check(`${name} fixture contains letters`, /[a-f]/.test(orderingVector.preimage[name]));
  check(
    `${name} fixture changes under byte reversal`,
    reverseBytes(orderingVector.preimage[name]) !== orderingVector.preimage[name]
  );
}
const reversedInput = {
  ...orderingInput,
  bitcoinAnchorTxid: reverseBytes(orderingInput.bitcoinAnchorTxid),
  bitcoinConfirmingBlockHash: reverseBytes(orderingInput.bitcoinConfirmingBlockHash),
};
check(
  'reversing both Bitcoin fields moves orderingCommitmentHash',
  buildCommitments({ rule, input: reversedInput }).ethereumOrdering.orderingCommitmentHash !==
    builtAll.ethereumOrdering.orderingCommitmentHash
);
rejects('builder rejects a Bitcoin txid with 0x', () =>
  buildCommitments({
    rule,
    input: { ...orderingInput, bitcoinAnchorTxid: `0x${orderingInput.bitcoinAnchorTxid}` },
  })
);
rejects('builder rejects uppercase Bitcoin hex', () =>
  buildCommitments({
    rule,
    input: {
      ...orderingInput,
      bitcoinConfirmingBlockHash: orderingInput.bitcoinConfirmingBlockHash.toUpperCase(),
    },
  })
);

console.log('\n== Ethereum ordering vector and deterministic builder ==');
check(
  'builder reproduces the literal Ethereum preimage',
  canonicalize(builtAll.ethereumOrdering.preimage) === canonicalize(orderingVector.preimage)
);
check(
  'builder reproduces Ethereum canonical string',
  builtAll.ethereumOrdering.canonicalPreimage === orderingVector.canonicalPreimage,
  `${builtAll.ethereumOrdering.canonicalPreimageBytes} bytes`
);
check(
  'builder reproduces Ethereum canonical hex',
  builtAll.ethereumOrdering.canonicalPreimageHex === orderingVector.canonicalPreimageHex
);
check(
  'builder reproduces orderingCommitmentHash',
  builtAll.ethereumOrdering.orderingCommitmentHash === orderingVector.orderingCommitmentHash,
  orderingVector.orderingCommitmentHash
);
check(
  'transaction template carries exactly the commitment hash',
  orderingVector.ethereumTransactionTemplate.inputData === orderingVector.orderingCommitmentHash &&
    orderingVector.ethereumTransactionTemplate.valueWei === '0' &&
    orderingVector.ethereumTransactionTemplate.from ===
      orderingVector.ethereumTransactionTemplate.to
);
for (const name of [
  'sourceGateUid',
  'destinationGateUid',
  'preTradeUidsHash',
  'selectionRuleHash',
]) {
  check(
    `Ethereum preimage extends Bitcoin value ${name} unchanged`,
    orderingVector.preimage[name] === bitcoinVector.preimage[name]
  );
}
rejects('builder rejects a stale supplied selectionRuleHash', () =>
  buildCommitments({
    rule,
    input: { ...orderingInput, selectionRuleHash: `0x${'00'.repeat(32)}` },
  })
);

console.log('\n== N19 and N17: symmetric canonicality and abort publication ==');
check(
  'rule requires Bitcoin pre-publication canonicality',
  rule.abortAndRetry.abortIfBitcoinConfirmingBlockNonCanonicalBeforePublication === true &&
    rule.abortAndRetry.bitcoinReorgCheck.includes('BITCOIN_CONFIRMING_BLOCK_REORGED_OUT')
);
check(
  'Bitcoin mismatch has a fixed abort reason',
  finalPackage.bitcoinAnchorEvidence.onMissingUnconfirmedOrMismatchedBlock.reasonCode ===
    'BITCOIN_CONFIRMING_BLOCK_REORGED_OUT'
);
check(
  'Bitcoin abort publishes original and current locations',
  finalPackage.bitcoinAnchorEvidence.onMissingUnconfirmedOrMismatchedBlock
    .mustPublishOriginalConfirmationFields === true &&
    finalPackage.bitcoinAnchorEvidence.onMissingUnconfirmedOrMismatchedBlock
      .mustPublishCurrentCanonicalOrReMinedLocationWhenAvailable === true
);
check(
  'Bitcoin abort publishes both chains transaction ids',
  finalPackage.bitcoinAnchorEvidence.onMissingUnconfirmedOrMismatchedBlock
    .mustPublishEveryBitcoinAnchorTxid === true &&
    finalPackage.bitcoinAnchorEvidence.onMissingUnconfirmedOrMismatchedBlock
      .mustPublishEveryEthereumCommitmentTxid === true
);
check(
  'rule retains Ethereum pre-publication canonicality',
  rule.abortAndRetry.abortIfEthereumCommitmentReorgedOutBeforePublication === true &&
    rule.abortAndRetry.ethereumReorgCheck.includes('abort the attempt')
);
check(
  'Ethereum mismatch retains its fixed abort reason',
  finalPackage.ethereumOrderingEvidence.onMissingOrMismatchedBlock.reasonCode ===
    'ETHEREUM_ORDERING_COMMITMENT_REORGED_OUT'
);
check(
  'post-publication recheck covers both chains and forbids rewriting',
  rule.abortAndRetry.postPublicationRecheck.includes('Bitcoin') &&
    rule.abortAndRetry.postPublicationRecheck.includes('block E') &&
    rule.abortAndRetry.postPublicationRecheck.includes('REORG_DETECTED') &&
    rule.abortAndRetry.postPublicationRecheck.includes('never silently rewritten')
);

console.log('\n== N21: mechanical runtime and selected operating window ==');
check(
  'human round trip is removed from the gate window',
  operationalAgreement.runtimeCoordination.humanRoundTripInsideGateWindow === false
);
check(
  'sender may submit immediately after Bitcoin confirmation',
  operationalAgreement.runtimeCoordination.senderMaySubmitImmediatelyAfterBitcoinConfirmation ===
    true
);
check(
  'mismatch outcome is a published abort',
  operationalAgreement.runtimeCoordination.mismatchOutcome === 'PUBLISHED_ABORT'
);
check(
  'VERITAS is selected to submit both commitment legs',
  operationalAgreement.submissionRoles.bitcoinAnchorSender === 'VERITAS' &&
    operationalAgreement.submissionRoles.ethereumOrderingSender === 'VERITAS'
);
check(
  'dedicated Ethereum sender is canonical EIP-55',
  getAddress(operationalAgreement.submissionRoles.ethereumOrderingSenderAddress) ===
    operationalAgreement.submissionRoles.ethereumOrderingSenderAddress
);
check(
  'selected window is 2026-09-18 12:00 UTC for one hour',
  operationalAgreement.scheduledWindow.startsAt === '2026-09-18T12:00:00Z' &&
    operationalAgreement.scheduledWindow.durationSeconds === 3600 &&
    operationalAgreement.scheduledWindow.status === 'CONFIRMED_BY_BOTH_PARTIES'
);
check(
  'pre-broadcast gates include F17, N19, N20 and N22',
  ['F17', 'N19', 'N20', 'N22'].every((id) =>
    operationalAgreement.preBroadcastGates.some((gate) => gate.startsWith(id))
  )
);
check(
  'gate signing starts the registered 600-second clock',
  operationalAgreement.attemptGatePolicy.gateValiditySeconds === 600 &&
    operationalAgreement.attemptGatePolicy.clockStartsAt === 'GATE_SIGNATURE'
);
check(
  'pre-signing and cross-attempt gate reuse are forbidden',
  operationalAgreement.attemptGatePolicy.preSigningAllowed === false &&
    operationalAgreement.attemptGatePolicy.freshSignedGatePairRequiredPerAttempt === true &&
    operationalAgreement.attemptGatePolicy.gateReuseAcrossAttemptsAllowed === false
);
check(
  'Insight remains available to sign two or three attempts during the full window',
  operationalAgreement.attemptGatePolicy.operatorAvailabilityRequiredForEntireWindow === true &&
    operationalAgreement.attemptGatePolicy.plannedSigningCapacity.minimumAttempts === 2 &&
    operationalAgreement.attemptGatePolicy.plannedSigningCapacity.maximumAttempts === 3
);
check(
  'only live gate identifiers and their ordered hash remain substitutions',
  JSON.stringify(operationalAgreement.liveSubstitutions) ===
    JSON.stringify(['sourceGateUid', 'destinationGateUid', 'preTradeUidsHash'])
);
check(
  'the five run-day steps are pinned in order',
  JSON.stringify(operationalAgreement.perAttemptSequence) ===
    JSON.stringify([
      'SIGN_FRESH_GATE_PAIR',
      'BUILD_PUBLISH_AND_BROADCAST_BITCOIN_COMMITMENT',
      'AFTER_FIRST_BITCOIN_CONFIRMATION_BUILD_AND_SUBMIT_ETHEREUM_COMMITMENT',
      'SELECT_FIRST_QUALIFYING_EVENT_AFTER_BLOCK_E_IN_CANONICAL_ORDER',
      'PUBLISH_GRADED_OUTCOME_OR_ABORT_WITH_ALL_TRANSACTION_IDS',
    ])
);
check(
  'mismatch, expiry and missing candidate all publish aborts with every transaction id',
  JSON.stringify(operationalAgreement.abortPublication.conditions) ===
    JSON.stringify(['BYTE_MISMATCH', 'GATE_EXPIRY', 'MISSING_QUALIFYING_CANDIDATE']) &&
    operationalAgreement.abortPublication.publishEveryBitcoinAnchorTxid === true &&
    operationalAgreement.abortPublication.publishEveryEthereumCommitmentTxid === true
);
check(
  'stale selection rules refuse to run before broadcast',
  operationalAgreement.runtimeCoordination.ruleHashPreflight.recomputeFromRuleFile === true &&
    operationalAgreement.runtimeCoordination.ruleHashPreflight
      .mustEqualConfiguredSelectionRuleHash === true &&
    operationalAgreement.runtimeCoordination.ruleHashPreflight.mismatchOutcome === 'REFUSE_TO_RUN'
);

console.log('\n== N18 and standing claim boundaries ==');
check(
  'ordering remains proven by inclusion',
  finalPackage.publicClaims.ordering.classification === 'PROVEN_BY_INCLUSION' &&
    finalPackage.publicClaims.ordering.requiredEvidence.length === 4
);
check(
  'attestation age remains issuer asserted',
  finalPackage.publicClaims.attestationAge.classification === 'ISSUER_ASSERTED'
);
check(
  'proven ordering and asserted age remain separate',
  finalPackage.publicClaims.claimsMustRemainSeparate === true &&
    finalPackage.publicClaims.forbiddenCombinedClaim.includes('Do not state or imply')
);
check(
  'operational agreement does not authorize premature broadcast',
  operationalAgreement.standing.includes(
    'No transaction is authorized before every preBroadcastGate is satisfied'
  )
);

console.log('\n== N15 provider observation regression ==');
const expectedAbi = [
  { name: 'provider', type: 'string' },
  { name: 'feedId', type: 'string' },
  { name: 'value', type: 'uint256' },
  { name: 'timestamp', type: 'uint256' },
  { name: 'dataAgeSeconds', type: 'uint256' },
  { name: 'included', type: 'bool' },
  { name: 'exclusionReason', type: 'string' },
];
check(
  'all seven ABI types remain explicit',
  JSON.stringify(observationVector.entryAbi) === JSON.stringify(expectedAbi)
);
const encodedEntries = observationVector.positive.entries.map((entry) =>
  encodeAbiParameters(expectedAbi, [
    entry.provider,
    entry.feedId,
    BigInt(entry.value),
    BigInt(entry.timestamp),
    BigInt(entry.dataAgeSeconds),
    entry.included,
    entry.exclusionReason,
  ])
);
check(
  'positive literal encoded entry reproduces',
  JSON.stringify(encodedEntries) === JSON.stringify(observationVector.positive.encodedEntries)
);
const entryHashes = encodedEntries.map(keccak256).sort();
check(
  'providerObservationsHash reproduces',
  keccak256(concat(entryHashes)) === observationVector.positive.providerObservationsHash
);
let negativeRejected = false;
try {
  const entry = observationVector.negative.entry;
  encodeAbiParameters(expectedAbi, [
    entry.provider,
    entry.feedId,
    BigInt(entry.value),
    BigInt(entry.timestamp),
    BigInt(entry.dataAgeSeconds),
    entry.included,
    entry.exclusionReason,
  ]);
} catch {
  negativeRejected = true;
}
check('negative value remains rejected under uint256', negativeRejected);

console.log(`\nSUMMARY  PASS ${passes}  FAIL ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
