// verify-insight-receipt — quickstart
//
// Proves the full Insight trust chain on YOUR machine, offline, with no API key.
//
//   node quickstart.mjs
//
// Default (zero signup): fetches a live sample OracleSafetyCheck v3 from
// Insight's public endpoint, then verifies it locally with this package.
// The sample is signed by Insight's dedicated SAMPLE key (never the production
// attester) — it proves the crypto chain, not a real trade.
//
// Real verdict (optional): set INSIGHT_API_KEY and pass your own action:
//   INSIGHT_API_KEY=... node quickstart.mjs ETH 1 liquidate 50000
// verifies a production-attester verdict for asset/chainId/action/tradeAmountUsd.

/* eslint-disable no-console -- this executable example reports results to stdout */

import { verifyReceipt } from 'verify-insight-receipt';

const BASE = process.env.INSIGHT_BASE || 'https://www.oracleinsight.xyz';
const WELL_KNOWN = `${BASE}/.well-known/oracle-keys.json`;

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function getSampleAttestation() {
  const body = await getJson(`${BASE}/api/v1/safety/attestation/sample`);
  const a = body?.data?.attestation;
  if (!a) throw new Error('sample endpoint returned no attestation');
  return a;
}

async function getRealAttestation([asset, chainId, action, amount]) {
  const q = new URLSearchParams({ asset, chainId, action, tradeAmountUsd: amount });
  const body = await getJson(`${BASE}/api/v1/safety/pre-trade?${q}`, {
    Authorization: `Bearer ${process.env.INSIGHT_API_KEY}`,
  });
  const a = body?.data?.attestation;
  if (!a) throw new Error('pre-trade endpoint returned no attestation');
  return a;
}

// The document at /.well-known/oracle-keys.json ships as `public_keys` /
// `revoked_keys`; the verifier accepts both the public and normalized registry shapes.
// Normalize so this demo verifies correctly on the published package until
// the package's registry parsing is updated.
function normalizeKeyRegistry(reg) {
  if (!reg || Array.isArray(reg.keys)) return reg;
  return { keys: reg.public_keys ?? [], revoked: reg.revoked_keys ?? [] };
}

async function main() {
  const args = process.argv.slice(2);
  const isReal = args.length >= 4;
  if (isReal && !process.env.INSIGHT_API_KEY) {
    throw new Error('INSIGHT_API_KEY is required for a real pre-trade verdict');
  }

  const attestation = isReal ? await getRealAttestation(args) : await getSampleAttestation();
  const keyRegistry = normalizeKeyRegistry(await getJson(WELL_KNOWN));
  const result = await verifyReceipt(attestation, { keyRegistry });

  console.log(`OracleSafetyCheck v${result.schemaVersion}`);
  console.log(`  signer     : ${result.attester}`);
  console.log(
    `  checkedAt  : ${result.checkedAt ? new Date(result.checkedAt * 1000).toISOString() : 'n/a'}`
  );
  console.log(
    `  validUntil : ${result.validUntil ? new Date(result.validUntil * 1000).toISOString() : 'n/a'}`
  );
  console.log(`  code       : ${result.code}`);
  console.log(`  keyStatus  : ${result.keyStatus}`);
  console.log(`  expired    : ${result.expired}`);

  if (result.code === 'ok' && result.keyStatus === 'valid') {
    console.log('\nVERIFIED — genuine signature from a key in Insight’s published registry.');
    console.log('No network, no API key, no trust in Insight needed to confirm this.');
  } else {
    console.log(`\nNOT VERIFIED (${result.code}/${result.keyStatus}).`);
    if (result.reason) console.log(`reason: ${result.reason}`);
    process.exitCode = 1;
  }

  if (!isReal) {
    console.log('\nNote: this was the SAMPLE signer. For a verdict on your own trade,');
    console.log('set INSIGHT_API_KEY and pass asset/chainId/action/amount.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
