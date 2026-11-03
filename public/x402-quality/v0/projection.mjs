#!/usr/bin/env node
/**
 * x402-quality/v0 — projection builder and independent re-computation checker.
 *
 * Zero dependencies. Does NOT verify signatures: that is verify-insight-receipt's
 * job (`npm install verify-insight-receipt`). This script does the other half —
 * it rebuilds `subject` + `measurement` from the raw receipt and compares them
 * field by field against a published artifact, so any third party can check that
 * a quality attestation really is a faithful projection of the receipt it names.
 *
 *   node projection.mjs build  <receipt.json | https://…>  [--out artifact.json] [--registry <url|file>]
 *   node projection.mjs verify <artifact.json> <receipt.json>
 *
 * `build` is deterministic: the same receipt always yields byte-identical output.
 * It never stamps the current time. `verify` never touches the network.
 */

import { readFileSync, writeFileSync } from 'node:fs';

export const SCHEMA_ID = 'x402-quality/v0';

/**
 * One entry per receipt family. `metrics` and `inputs` are the projection:
 * every key listed here is copied verbatim out of the receipt's SIGNED fields,
 * so a signature over the receipt is a signature over the projection.
 */
const PROFILES = {
  'oracle-pretrade': {
    kind: 'oracle-pretrade',
    profile: 'oracle-pretrade/v3',
    algorithmVersion: 'insight-oracle-safety@3',
    primaryType: 'OracleSafetyCheck',
    observedAt: 'checkedAt',
    verdict: 'verdict',
    metrics: [
      'maxDeviationBps',
      'crossProviderAgreementBps',
      'manipulationRiskBps',
      'participantCount',
      'requiredParticipantCount',
      'sourceGroupCount',
      'requiredSourceGroupCount',
      'independenceStatus',
      'coverageStatus',
      'maxStablecoinDepegBps',
      'maxDataAgeSeconds',
      'recommendedMaxPositionUsd',
    ],
    inputs: [
      'providerObservationsHash',
      'evaluatedAssetIdsHash',
      'reasonCodesHash',
      'requestHash',
      'evaluationScope',
    ],
  },
  execution: {
    kind: 'execution',
    profile: 'oracle-execution/v5',
    algorithmVersion: 'insight-execution@5',
    primaryType: 'ExecutionReceipt',
    observedAt: 'executedAt',
    verdict: 'priceExecutionStatus',
    metrics: [
      'priceDeltaBps',
      'maxSlippageBps',
      'slippageSatisfied',
      'fillStatus',
      'participantCount',
      'requiredParticipantCount',
      'sourceGroupCount',
      'requiredSourceGroupCount',
      'independenceSatisfied',
      'mevRiskBps',
      'attestationAgeAtExecSeconds',
    ],
    inputs: ['measuredFieldsHash', 'preTradeUidsHash', 'requestHash'],
  },
};

/** Which profile does this receipt's signed payload belong to? */
function classify(data) {
  if (!data || typeof data !== 'object') return null;
  if ('fillStatus' in data || 'priceExecutionStatus' in data) return 'execution';
  if ('consensusPrice' in data && 'maxDeviationBps' in data) return 'oracle-pretrade';
  return null;
}

/** Accepts either the API envelope, a bare attestation, or a wrapped one. */
export function unwrap(input) {
  const chain = [input?.data?.attestation, input?.attestation, input];
  for (const candidate of chain) {
    if (candidate && typeof candidate === 'object' && candidate.data && candidate.uid) {
      return candidate;
    }
  }
  throw new Error(
    'no attestation found: expected {uid, attester, signature, data:{…}} at input, input.data.attestation, or input.attestation'
  );
}

function toUnix(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value) {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return Math.trunc(ms / 1000);
  }
  return undefined;
}

function pick(data, keys) {
  const out = {};
  for (const key of keys) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

/**
 * Build the x402-quality/v0 artifact for a receipt.
 *
 * `role` is deliberately NOT inferred from the receipt: only a key registry can
 * say whether a key is a production attester or a sample key, and guessing would
 * misrepresent a sample receipt as production issuance.
 */
export function project(input, { keyRole } = {}) {
  const att = unwrap(input);
  const data = att.data;
  const id = classify(data);
  if (!id) {
    throw new Error(
      'unrecognised receipt family: the signed payload matches no known profile (no consensusPrice/maxDeviationBps, no fillStatus/priceExecutionStatus)'
    );
  }
  const p = PROFILES[id];

  const observedAt = toUnix(data[p.observedAt]);
  const issuedAt = toUnix(att.signedAt) ?? observedAt;
  const verdict = data[p.verdict];
  if (observedAt === undefined || verdict === undefined || att.uid === undefined) {
    throw new Error(
      `incomplete ${p.kind} receipt: needs uid, ${p.observedAt} and ${p.verdict} before a projection can be built`
    );
  }

  const attester = {
    address: att.attester,
    signature: att.signature,
    signature_scheme: 'eip712',
    covers: 'bound-receipt',
    bound_receipt_uid: att.uid,
  };
  if (keyRole) attester.role = keyRole;
  if (att.keyId || att.key_id) attester.key_id = att.keyId ?? att.key_id;

  return {
    schema: SCHEMA_ID,
    issued_at: issuedAt,
    subject: {
      bound_receipt: {
        kind: p.kind,
        uid: att.uid,
        schema_version: data.schemaVersion ?? att.schemaVersion,
        primary_type: p.primaryType,
      },
    },
    measurement: {
      profile: p.profile,
      algorithm_version: p.algorithmVersion,
      observed_at: observedAt,
      verdict,
      metrics: pick(data, p.metrics),
      inputs: pick(data, p.inputs),
      valid_until: data.validUntil,
    },
    attester: [attester],
  };
}

// ---------------------------------------------------------------------------
// Verification: rebuild, compare, report every difference
// ---------------------------------------------------------------------------

/** Fields that carry no verification weight and are excluded from comparison. */
const METADATA_ONLY = new Set(['role', 'key_id']);

function differences(expected, actual, path = '') {
  const out = [];
  const at = (k) => (path ? `${path}.${k}` : `${k}`);

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      out.push(`${path}: shape differs (array vs object)`);
      return out;
    }
    if (expected.length !== actual.length) {
      out.push(`${path}: length ${actual.length} != expected ${expected.length}`);
    }
    const n = Math.min(expected.length, actual.length);
    for (let i = 0; i < n; i += 1)
      out.push(...differences(expected[i], actual[i], `${path}[${i}]`));
    return out;
  }

  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    for (const k of Object.keys(expected)) {
      if (METADATA_ONLY.has(k)) continue;
      out.push(...differences(expected[k], actual?.[k], at(k)));
    }
    return out;
  }

  if (expected !== actual)
    out.push(`${path}: ${JSON.stringify(actual)} != expected ${JSON.stringify(expected)}`);
  return out;
}

export function verify(fixture, receipt) {
  const rebuilt = project(receipt, { keyRole: fixture?.attester?.[0]?.role });
  const diff = differences(rebuilt, fixture);
  return { ok: diff.length === 0, rebuilt, differences: diff };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function load(source) {
  const text = /^https?:\/\//.test(source)
    ? await (await fetch(source)).text()
    : readFileSync(source, 'utf8');
  return JSON.parse(text);
}

async function resolveKeyRole(attesterAddress, registrySource) {
  const url = registrySource ?? 'https://www.oracleinsight.xyz/.well-known/oracle-keys.json';
  try {
    const registry = /^https?:\/\//.test(url) ? await load(url) : await load(url);
    const keys = registry.public_keys ?? registry.keys ?? [];
    const hit = keys.find(
      (k) => String(k.public_key).toLowerCase() === String(attesterAddress).toLowerCase()
    );
    return hit?.role;
  } catch {
    return undefined;
  }
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (command === 'build') {
    const source = rest.find((a) => !a.startsWith('--'));
    if (!source) throw new Error('usage: node projection.mjs build <receipt.json | https://…>');
    const raw = await load(source);
    const att = unwrap(raw);
    const keyRole = await resolveKeyRole(att.attester, flag(rest, '--registry'));
    const artifact = project(raw, { keyRole });
    const json = `${JSON.stringify(artifact, null, 2)}\n`;
    const out = flag(rest, '--out');
    if (out) writeFileSync(out, json);
    else process.stdout.write(json);
    return;
  }

  if (command === 'verify') {
    const [fixturePath, receiptPath] = rest;
    if (!fixturePath || !receiptPath) {
      throw new Error('usage: node projection.mjs verify <artifact.json> <receipt.json>');
    }
    const {
      ok,
      rebuilt,
      differences: diff,
    } = verify(await load(fixturePath), await load(receiptPath));
    if (ok) {
      process.stdout.write(
        `ok — artifact is a faithful projection of ${rebuilt.subject.bound_receipt.uid}\n`
      );
      return;
    }
    process.stderr.write(
      `FAIL — ${diff.length} difference(s) between artifact and rebuilt projection:\n`
    );
    for (const d of diff) process.stderr.write(`  ${d}\n`);
    process.exitCode = 1;
    return;
  }

  process.stderr.write(
    'x402-quality/v0 projection tool\n\n' +
      '  node projection.mjs build  <receipt.json | https://…>  [--out artifact.json] [--registry <url|file>]\n' +
      '  node projection.mjs verify <artifact.json> <receipt.json>\n'
  );
  process.exitCode = command ? 1 : 0;
}

main().catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exitCode = 1;
});
