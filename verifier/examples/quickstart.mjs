// verify-insight-receipt — quickstart
//
// Demonstrates local signature checking. The offline fixture uses a throwaway
// key and does not establish trust in an Insight production attester.
//
//   node quickstart.mjs
//
// --offline: generates and checks a synthetic OracleSafetyCheck v1 without network.
// Default (zero signup): fetches a live sample OracleSafetyCheck v3 from
// Insight's public endpoint, then verifies it locally with this package.
// The sample is signed by Insight's dedicated SAMPLE key (never the production
// attester) — it proves the crypto chain, not a real trade.
//
// Real verdict (optional): set INSIGHT_API_KEY and pass your own action:
//   INSIGHT_API_KEY=... node quickstart.mjs ETH 1 liquidate 50000
// verifies a production-attester verdict for asset/chainId/action/tradeAmountUsd.

/* eslint-disable no-console -- this executable example reports results to stdout */

import { hashTypedData } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { V1_DOMAIN, V1_PRIMARY_TYPE, V1_TYPES, verifyReceipt } from 'verify-insight-receipt';

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

async function runOfflineFixture() {
  const account = privateKeyToAccount(generatePrivateKey());
  const checkedAt = Math.floor(Date.now() / 1000);
  const data = {
    verdict: 'PASS',
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 100,
    consensusPrice: 2000,
    maxDeviationBps: 0,
    manipulationRiskBps: 0,
    participantCount: 3,
    checkedAt,
    schemaVersion: 1,
  };
  const message = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      ['verdict', 'asset', 'action'].includes(key) ? value : BigInt(value),
    ])
  );
  const typedData = { domain: V1_DOMAIN, types: V1_TYPES, primaryType: V1_PRIMARY_TYPE, message };
  const attestation = {
    uid: hashTypedData(typedData),
    schemaVersion: 1,
    attester: account.address,
    signature: await account.signTypedData(typedData),
    validForSeconds: 600,
    data,
  };
  const result = await verifyReceipt(attestation);
  console.log(`offline synthetic receipt: code=${result.code}, keyStatus=${result.keyStatus}`);
  console.log('The signature matches the throwaway signer; no issuer trust was established.');
  if (result.code !== 'ok' || result.keyStatus !== 'not_checked') process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--offline') return runOfflineFixture();
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
    console.log('\nVERIFIED against the registry fetched from Insight.');
    console.log('Confirm that registry independently before treating the signer as trusted.');
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
