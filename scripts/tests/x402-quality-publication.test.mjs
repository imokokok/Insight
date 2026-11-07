/**
 * Publication gate for the served x402-quality/v0 artifact.
 *
 * The files under `public/x402-quality/v0/` are a public standard artifact: a JSON Schema, a
 * zero-dependency projection tool and fixtures generated from live receipts. This suite fails if a
 * published byte stops being self-consistent — a fixture that no longer re-verifies, an artifact
 * that drifts outside the published schema envelope, or tooling that quietly grows a dependency.
 *
 * It runs offline and needs no credentials, so it is safe under `npm run test:reliability`.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const dir = join(root, 'public', 'x402-quality', 'v0');
const schemaPath = join(dir, 'x402-quality-v0.schema.json');
const projectionPath = join(dir, 'projection.mjs');
const fixturesDir = join(dir, 'fixtures');
const staleFixtureDir = join(fixturesDir, 'stale-admissibility-v1');
const staleEvaluatorPath = join(staleFixtureDir, 'evaluate.mjs');
const staleManifestPath = join(staleFixtureDir, 'manifest.json');

const SCHEMA_ID = 'https://www.oracleinsight.xyz/x402-quality/v0/x402-quality-v0.schema.json';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** Run the published CLI the way a third party would, from the repository root. */
function verifyProjection(artifactPath, receiptPath) {
  return execFileSync(process.execPath, [projectionPath, 'verify', artifactPath, receiptPath], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Run the frozen stale-admissibility control exactly as its README instructs. */
function evaluateStaleControl(caseId, { manifestPath = staleManifestPath, check = true } = {}) {
  const args = [staleEvaluatorPath, '--manifest', manifestPath, '--case', caseId];
  if (check) args.push('--check');
  return JSON.parse(
    execFileSync(process.execPath, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  );
}

const FIXTURE_PAIRS = [
  ['artifact.oracle-pretrade.v3.json', 'receipt.oracle-pretrade.sample.json'],
  ['artifact.execution.v5.json', 'receipt.execution.sample.json'],
];

test('the served schema is valid JSON and pins its canonical $id', () => {
  const schema = readJson(schemaPath);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.$id, SCHEMA_ID);
  assert.equal(schema.properties.schema.const, 'x402-quality/v0');
  assert.deepEqual(schema.required, ['schema', 'subject', 'measurement', 'attester']);
  assert.equal(schema.properties.attester.type, 'array');
  assert.equal(schema.additionalProperties, false);
});

test('each artifact is a faithful projection of the receipt it names', () => {
  for (const [artifact, receipt] of FIXTURE_PAIRS) {
    const out = verifyProjection(join(fixturesDir, artifact), join(fixturesDir, receipt));
    assert.match(out, /^ok — artifact is a faithful projection of 0x[0-9a-f]{64}/);
  }
});

test('a single altered digit fails closed', () => {
  const artifact = readJson(join(fixturesDir, 'artifact.oracle-pretrade.v3.json'));
  artifact.measurement.metrics.maxDeviationBps += 1;
  const tamperedPath = join(tmpdir(), `x402-quality-tampered-${process.pid}.json`);
  writeFileSync(tamperedPath, JSON.stringify(artifact, null, 2));
  try {
    assert.throws(
      () =>
        verifyProjection(tamperedPath, join(fixturesDir, 'receipt.oracle-pretrade.sample.json')),
      (error) => error.status === 1
    );
  } finally {
    rmSync(tamperedPath, { force: true });
  }
});

test('every artifact stays inside the published schema envelope', () => {
  const schema = readJson(schemaPath);
  const allowedTopLevel = new Set(Object.keys(schema.properties));
  const allowedAttesterKeys = new Set(Object.keys(schema.$defs.attesterEntry.properties));

  for (const [artifact] of FIXTURE_PAIRS) {
    const parsed = readJson(join(fixturesDir, artifact));
    assert.equal(parsed.schema, 'x402-quality/v0');
    for (const key of Object.keys(parsed)) {
      assert.ok(allowedTopLevel.has(key), `${artifact}: unexpected top-level key "${key}"`);
    }
    assert.ok(Array.isArray(parsed.attester) && parsed.attester.length >= 1);
    for (const entry of parsed.attester) {
      for (const key of Object.keys(entry)) {
        assert.ok(allowedAttesterKeys.has(key), `${artifact}: unexpected attester key "${key}"`);
      }
      // The honest boundary must survive into every published artifact: a reused receipt
      // signature is a recomputable view, not a signature over the document itself.
      assert.equal(entry.covers, 'bound-receipt');
      assert.equal(entry.bound_receipt_uid, parsed.subject.bound_receipt?.uid);
    }
    assert.ok(parsed.subject.bound_receipt?.uid, `${artifact}: missing subject.bound_receipt.uid`);
  }
});

test('projection.mjs imports nothing outside the node standard library', () => {
  const source = readFileSync(projectionPath, 'utf8');
  const specs = [...source.matchAll(/\bfrom\s+'([^']+)'/g)].map((match) => match[1]);
  assert.ok(specs.length > 0, 'expected projection.mjs to import the node standard library');
  for (const spec of specs) {
    assert.ok(spec.startsWith('node:'), `projection.mjs must stay zero-dependency, saw "${spec}"`);
  }
});

test('pinned stale-admissibility controls preserve the predicate split', () => {
  const freshUnsafe = evaluateStaleControl('fresh-unsafe');
  const olderAccurate = evaluateStaleControl('older-accurate');

  assert.equal(freshUnsafe.signatureValidity.valid, true);
  assert.equal(freshUnsafe.age.state, 'FRESH');
  assert.equal(freshUnsafe.statusEvidence.state, 'UNSAFE');
  assert.equal(freshUnsafe.currentAdmissibility.reason, 'STATUS_UNSAFE');
  assert.equal(freshUnsafe.observedSettlement.state, 'OBSERVED');

  assert.equal(olderAccurate.signatureValidity.valid, true);
  assert.equal(olderAccurate.age.state, 'STALE');
  assert.equal(olderAccurate.statusEvidence.state, 'SAFE');
  assert.equal(olderAccurate.currentAdmissibility.reason, 'AGE_EXCEEDS_MAX');
  assert.equal(olderAccurate.observedSettlement.state, 'NOT_OBSERVED');

  for (const result of [freshUnsafe, olderAccurate]) {
    assert.equal(result.age.trustedClockRequired, true);
    assert.equal(result.statusEvidence.eventTimeEstablished, false);
    assert.equal(result.statusEvidence.sourceIndependenceEstablished, false);
    assert.equal(result.currentAdmissibility.admissible, false);
  }
});

test('the stale-admissibility evaluator fails closed on future timestamps outside its skew bound', () => {
  const alteredManifest = readJson(staleManifestPath);
  alteredManifest.cases['fresh-unsafe'].evaluationTime = 1699999980;
  for (const config of Object.values(alteredManifest.cases)) {
    for (const input of ['claim', 'status', 'expected']) {
      config[input].path = join(staleFixtureDir, config[input].path);
    }
  }
  const alteredManifestPath = join(tmpdir(), `x402-quality-future-${process.pid}.json`);
  writeFileSync(alteredManifestPath, JSON.stringify(alteredManifest));
  try {
    const result = evaluateStaleControl('fresh-unsafe', {
      manifestPath: alteredManifestPath,
      check: false,
    });
    assert.equal(result.age.state, 'FUTURE_TIMESTAMP');
    assert.equal(result.currentAdmissibility.admissible, false);
    assert.equal(result.currentAdmissibility.reason, 'FUTURE_TIMESTAMP');
  } finally {
    rmSync(alteredManifestPath, { force: true });
  }
});
