#!/usr/bin/env node
/**
 * Frozen portable fixture evaluator. It uses the pinned viem version to verify
 * the EIP-712 claim, then deliberately evaluates time, current status and
 * settlement observation as distinct predicates.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { verifyTypedData } from 'viem';

const require = createRequire(import.meta.url);
const RESULT_SCHEMA = 'insight.x402-stale-admissibility-result/v1';

function fail(message) {
  throw new Error(`stale-admissibility fixture: ${message}`);
}

function sha256(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

async function readJson(path) {
  const raw = await readFile(path);
  try {
    return { raw, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)) };
  } catch {
    fail(`invalid JSON: ${path}`);
  }
}

function parseArgs(args) {
  const options = new Map();
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i];
    if (!name?.startsWith('--') || options.has(name)) {
      fail('usage: node evaluate.mjs --manifest manifest.json --case CASE [--check]');
    }
    if (name === '--check') {
      options.set(name, true);
      continue;
    }
    if (!args[i + 1] || args[i + 1].startsWith('--')) {
      fail('usage: node evaluate.mjs --manifest manifest.json --case CASE [--check]');
    }
    options.set(name, args[i + 1]);
    i += 1;
  }
  return options;
}

async function loadPinned(base, entry, label, requirePin = true) {
  if (!entry || typeof entry.path !== 'string') fail(`missing ${label} entry`);
  const loaded = await readJson(resolve(base, entry.path));
  const actual = sha256(loaded.raw);
  if (requirePin && (typeof entry.sha256 !== 'string' || entry.sha256 !== actual)) {
    fail(`${label} SHA-256 mismatch`);
  }
  return { ...loaded, sha256: actual };
}

function sameCommitment(claim, status) {
  return (
    status?.appliesTo?.subjectHash === claim.subjectHash &&
    status?.appliesTo?.claimHash === claim.claimHash &&
    status.caseId === claim.caseId
  );
}

async function resultFor({ manifest, caseId, config, claim, status, claimSha256, statusSha256 }) {
  const { evaluationTime, maxAgeSeconds, maxFutureSkewSeconds } = config;
  if (
    ![
      evaluationTime,
      maxAgeSeconds,
      maxFutureSkewSeconds,
      claim.assertedAt,
      status.observedAt,
    ].every(Number.isInteger)
  ) {
    fail('all configured timestamps and limits must be integers');
  }
  if (!sameCommitment(claim, status)) fail('status evidence is not bound to the signed claim');

  const claimTooFarFuture = claim.assertedAt > evaluationTime + maxFutureSkewSeconds;
  const statusTooFarFuture = status.observedAt > evaluationTime + maxFutureSkewSeconds;
  const ageSeconds = evaluationTime - claim.assertedAt;
  const ageState = claimTooFarFuture
    ? 'FUTURE_TIMESTAMP'
    : ageSeconds > maxAgeSeconds
      ? 'STALE'
      : 'FRESH';
  const signatureValidity = claim.signature
    ? await verifyTypedData({
        address: claim.attester,
        domain: manifest.signing.domain,
        types: manifest.signing.types,
        primaryType: manifest.signing.primaryType,
        message: {
          caseId: claim.caseId,
          assertedAt: claim.assertedAt,
          subjectHash: claim.subjectHash,
          claimHash: claim.claimHash,
        },
        signature: claim.signature,
      })
    : false;

  let reason = 'ADMISSIBLE';
  if (!signatureValidity) reason = 'SIGNATURE_INVALID';
  else if (claimTooFarFuture || statusTooFarFuture) reason = 'FUTURE_TIMESTAMP';
  else if (ageState !== 'FRESH') reason = 'AGE_EXCEEDS_MAX';
  else if (status.state !== 'SAFE') reason = 'STATUS_UNSAFE';

  return {
    schema: RESULT_SCHEMA,
    evaluator: manifest.evaluator,
    caseId,
    evaluationTime,
    inputIntegrity: { claimSha256, statusSha256 },
    signatureValidity: {
      valid: signatureValidity,
      scheme: manifest.signing.scheme,
      signer: claim.attester,
    },
    age: {
      state: ageState,
      assertedAt: claim.assertedAt,
      evaluationTime,
      ageSeconds,
      maxAgeSeconds,
      maxFutureSkewSeconds,
      trustedClockRequired: true,
    },
    statusEvidence: {
      state: status.state,
      observedAt: status.observedAt,
      authority: status.authority,
      synthetic: status.synthetic === true,
      eventTimeEstablished: false,
      sourceIndependenceEstablished: false,
    },
    currentAdmissibility: {
      admissible: reason === 'ADMISSIBLE',
      reason,
    },
    observedSettlement: status.observedSettlement,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = args.get('--manifest');
  const caseId = args.get('--case');
  const check = args.has('--check');
  if (!manifestPath || !caseId)
    fail('usage: node evaluate.mjs --manifest manifest.json --case CASE [--check]');

  const { value: manifest } = await readJson(resolve(manifestPath));
  if (manifest?.schema !== 'insight.x402-stale-admissibility-fixture/v1')
    fail('unsupported manifest schema');
  if (manifest?.evaluator?.dependency !== `viem@${require('viem/package.json').version}`) {
    fail(`requires ${manifest?.evaluator?.dependency}`);
  }
  const config = manifest.cases?.[caseId];
  if (!config) fail(`unknown case: ${caseId}`);

  const base = dirname(resolve(manifestPath));
  const claim = await loadPinned(base, config.claim, 'claim');
  const status = await loadPinned(base, config.status, 'status');
  const result = await resultFor({
    manifest,
    caseId,
    config,
    claim: claim.value,
    status: status.value,
    claimSha256: claim.sha256,
    statusSha256: status.sha256,
  });

  if (check) {
    const expected = await loadPinned(base, config.expected, 'expected');
    if (JSON.stringify(result) !== JSON.stringify(expected.value))
      fail('result differs from pinned expected output');
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
