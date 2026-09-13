#!/usr/bin/env node

import fs from 'node:fs';

import canonicalize from 'canonicalize';
import { concat, encodeAbiParameters, keccak256, toBytes } from 'viem';

const base = new URL('.', import.meta.url);
const load = (name) => JSON.parse(fs.readFileSync(new URL(name, base), 'utf8'));
const rule = load('anchored-settlement-selection-rule-v2.json');
const orderingVector = load('ethereum-ordering-commitment-vector-v1.json');
const observationVector = load('provider-observation-hash-vector-v1.json');

let passes = 0;
let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (ok) passes += 1;
  else failures += 1;
};

const hashJcs = (value) => keccak256(toBytes(canonicalize(value)));

console.log('== Selection rule v2: no cross-chain clock ==');
check('rule schema is v2', rule.schema.endsWith('/v2'), rule.schema);
check('registered gate window remains 600 seconds', rule.gateWindowSeconds === 600);
check('minimum source leg remains 0.1 WETH', rule.minimumSourceLeg.raw === '100000000000000000');
check(
  'Bitcoin header timestamp is not an ordering predicate',
  rule.candidateWindow.crossChainTimestampPredicate === null &&
    !JSON.stringify(rule).includes('candidate block.timestamp must be strictly greater')
);
check(
  'candidate ordering is same-chain blockNumber > E',
  rule.candidateWindow.sameChainOrderPredicate ===
    'Ethereum candidate blockNumber must be strictly greater than E'
);
const orderingFieldNames = rule.ethereumOrderingCommitment.requiredPreimageFields.map(
  ({ name }) => name
);
for (const name of [
  'sourceGateUid',
  'destinationGateUid',
  'preTradeUidsHash',
  'selectionRuleHash',
  'bitcoinAnchorTxid',
  'bitcoinConfirmingBlockHeight',
  'bitcoinConfirmingBlockHash',
]) {
  check(`ordering preimage declares ${name}`, orderingFieldNames.includes(name));
}
check(
  'retry requires new gate, Bitcoin anchor and Ethereum commitment',
  rule.abortAndRetry.retryRequiresNewGateNewBitcoinAnchorAndNewEthereumCommitment === true
);
check(
  'aborted Bitcoin and Ethereum txids are both published',
  rule.abortAndRetry.publishEveryBitcoinAnchorTxidIncludingAbortedAttempts === true &&
    rule.abortAndRetry.publishEveryEthereumCommitmentTxidIncludingAbortedAttempts === true
);

console.log('\n== Ethereum ordering commitment literal vector ==');
const ruleHash = hashJcs(rule);
check(
  'selectionRuleHash recomputes from RFC 8785 bytes',
  ruleHash === orderingVector.selectionRuleHash
);
check(
  'selectionRuleHash is bound inside the ordering preimage',
  orderingVector.preimage.selectionRuleHash === ruleHash
);
const canonicalPreimage = canonicalize(orderingVector.preimage);
check(
  'canonical preimage string is literal',
  canonicalPreimage === orderingVector.canonicalPreimage
);
check(
  'canonical preimage hex is literal',
  Buffer.from(canonicalPreimage).toString('hex') === orderingVector.canonicalPreimageHex
);
const orderingHash = keccak256(toBytes(canonicalPreimage));
check('orderingCommitmentHash recomputes', orderingHash === orderingVector.orderingCommitmentHash);
check(
  'Ethereum transaction carries exactly the 32-byte commitment hash',
  orderingVector.ethereumTransactionTemplate.inputData === orderingHash &&
    orderingVector.ethereumTransactionTemplate.valueWei === '0' &&
    orderingVector.ethereumTransactionTemplate.from ===
      orderingVector.ethereumTransactionTemplate.to
);

console.log('\n== Provider observation ABI and literal vectors ==');
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
  'all seven ABI types are explicit',
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
  'literal encoded entry reproduces',
  JSON.stringify(encodedEntries) === JSON.stringify(observationVector.positive.encodedEntries)
);
const entryHashes = encodedEntries.map(keccak256).sort();
check(
  'literal entry hash reproduces',
  JSON.stringify(entryHashes) === JSON.stringify(observationVector.positive.entryHashesSorted)
);
check(
  'literal providerObservationsHash reproduces',
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
check('negative value rejects under uint256', negativeRejected);

console.log(`\nSUMMARY  PASS ${passes}  FAIL ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
