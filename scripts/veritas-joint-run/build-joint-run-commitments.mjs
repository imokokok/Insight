#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import canonicalize from 'canonicalize';
import { getAddress, isAddress, keccak256 } from 'viem';

const EVM_BYTES32 = /^0x[0-9a-f]{64}$/;
const BITCOIN_DISPLAY_HASH = /^[0-9a-f]{64}$/;
const INPUT_FIELDS = new Set([
  'sourceGateUid',
  'destinationGateUid',
  'preTradeUidsHash',
  'selectionRuleHash',
  'bitcoinAnchorTxid',
  'bitcoinConfirmingBlockHeight',
  'bitcoinConfirmingBlockHash',
]);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const canonicalBytes = (value) => Buffer.from(canonicalize(value), 'utf8');
const jcsKeccak256 = (value) => keccak256(canonicalBytes(value));
const sha256 = (value) => createHash('sha256').update(value).digest();

export const taggedHashSha256 = (tag, message) => {
  const tagHash = sha256(Buffer.from(tag, 'utf8'));
  return sha256(Buffer.concat([tagHash, tagHash, Buffer.from(message)]));
};

const validateCanonicalAddress = (label, address) => {
  assert(isAddress(address), `${label} must be a valid EVM address`);
  assert(getAddress(address) === address, `${label} must use canonical EIP-55 casing`);
};

const validateEvmBytes32 = (label, value) => {
  assert(EVM_BYTES32.test(value), `${label} must be lowercase bytes32 hex with a 0x prefix`);
};

const validateBitcoinDisplayHash = (label, value) => {
  assert(
    BITCOIN_DISPLAY_HASH.test(value),
    `${label} must be 32-byte lowercase hex without 0x in Bitcoin display order`
  );
};

export const validateRule = (rule) => {
  validateCanonicalAddress('venue.pool', rule.venue.pool);
  validateCanonicalAddress('direction.sourceTokenAddress', rule.direction.sourceTokenAddress);
  validateCanonicalAddress(
    'direction.destinationTokenAddress',
    rule.direction.destinationTokenAddress
  );
  assert(
    rule.bitcoinAnchorCommitment.preimageSchema === 'insight-veritas-bitcoin-anchor-commitment/v1',
    'unexpected Bitcoin commitment schema'
  );
  assert(
    rule.bitcoinAnchorCommitment.leafTag === 'VRT1/anchored-settlement-commitment',
    'unexpected Bitcoin anchor leaf tag'
  );
};

export const buildCommitments = ({ rule, input }) => {
  validateRule(rule);
  for (const name of Object.keys(input)) {
    assert(INPUT_FIELDS.has(name), `unexpected runtime input field: ${name}`);
  }

  const selectionRuleHash = jcsKeccak256(rule);
  if (input.selectionRuleHash !== undefined) {
    assert(
      input.selectionRuleHash === selectionRuleHash,
      `selectionRuleHash mismatch: supplied ${input.selectionRuleHash}, recomputed ${selectionRuleHash}`
    );
  }

  for (const name of ['sourceGateUid', 'destinationGateUid', 'preTradeUidsHash']) {
    validateEvmBytes32(name, input[name]);
  }
  validateEvmBytes32('selectionRuleHash', selectionRuleHash);

  const bitcoinPreimage = {
    destinationGateUid: input.destinationGateUid,
    preTradeUidsHash: input.preTradeUidsHash,
    schema: rule.bitcoinAnchorCommitment.preimageSchema,
    selectionRuleHash,
    sourceGateUid: input.sourceGateUid,
  };
  const bitcoinCanonical = canonicalBytes(bitcoinPreimage);
  const bitcoinLeaf = taggedHashSha256(rule.bitcoinAnchorCommitment.leafTag, bitcoinCanonical);

  const confirmationFields = [
    'bitcoinAnchorTxid',
    'bitcoinConfirmingBlockHeight',
    'bitcoinConfirmingBlockHash',
  ];
  const confirmationCount = confirmationFields.filter((name) => input[name] !== undefined).length;
  assert(
    confirmationCount === 0 || confirmationCount === confirmationFields.length,
    'Bitcoin confirmation fields must be supplied together or omitted together'
  );

  let ethereumOrdering = null;
  if (confirmationCount === confirmationFields.length) {
    validateBitcoinDisplayHash('bitcoinAnchorTxid', input.bitcoinAnchorTxid);
    validateBitcoinDisplayHash('bitcoinConfirmingBlockHash', input.bitcoinConfirmingBlockHash);
    assert(
      Number.isSafeInteger(input.bitcoinConfirmingBlockHeight) &&
        input.bitcoinConfirmingBlockHeight > 0,
      'bitcoinConfirmingBlockHeight must be a positive JSON integer'
    );

    const preimage = {
      bitcoinAnchorTxid: input.bitcoinAnchorTxid,
      bitcoinConfirmingBlockHash: input.bitcoinConfirmingBlockHash,
      bitcoinConfirmingBlockHeight: input.bitcoinConfirmingBlockHeight,
      destinationGateUid: input.destinationGateUid,
      preTradeUidsHash: input.preTradeUidsHash,
      schema: rule.ethereumOrderingCommitment.preimageSchema,
      selectionRuleHash,
      sourceGateUid: input.sourceGateUid,
    };
    const canonical = canonicalBytes(preimage);
    ethereumOrdering = {
      preimage,
      canonicalPreimage: canonical.toString('utf8'),
      canonicalPreimageHex: canonical.toString('hex'),
      canonicalPreimageBytes: canonical.length,
      orderingCommitmentHash: keccak256(canonical),
    };
  }

  return {
    selectionRuleHash,
    bitcoinAnchor: {
      preimage: bitcoinPreimage,
      canonicalPreimage: bitcoinCanonical.toString('utf8'),
      canonicalPreimageHex: bitcoinCanonical.toString('hex'),
      canonicalPreimageBytes: bitcoinCanonical.length,
      leafTag: rule.bitcoinAnchorCommitment.leafTag,
      anchorLeafHash: bitcoinLeaf.toString('hex'),
    },
    ethereumOrdering,
  };
};

const parseArgs = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    assert(token === '--input' || token === '--rule', `unknown argument: ${token}`);
    assert(argv[index + 1], `${token} requires a path`);
    options[token.slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
};

const main = () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const options = parseArgs(process.argv.slice(2));
  const rulePath = path.resolve(
    options.rule ?? path.join(here, 'anchored-settlement-selection-rule-v2.json')
  );
  const inputPath = path.resolve(
    options.input ?? path.join(here, 'ethereum-ordering-commitment-vector-v1.json')
  );
  const rule = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
  const loaded = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const input = loaded.preimage ? { ...loaded.preimage } : loaded;
  if (loaded.preimage) delete input.schema;
  process.stdout.write(`${JSON.stringify(buildCommitments({ rule, input }), null, 2)}\n`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
