#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import canonicalize from 'canonicalize';
import { concat, keccak256, recoverTypedDataAddress } from 'viem';

const CANDIDATE_POLICY_ID = '0x162d3fe744acc2041a959daf40dc3fe9242b654aef58acbb991acbf605885085';
const HISTORICAL_POLICY_ID = '0xb7b0ea5686628d8241cd269c45cf6ae462acc6b9f36843608358a00bb71691d6';
const PROFILE_ID = '0xe7513b059e9f8291bfa21250e0234661d74112a491efc6b40fbb56692013cb8e';
const RELEASE_ID = '0x6e3bd18c541cc80e326754a7743f05050df348257102b93f9a13bc82c7e69f6b';
const CURRENT_ACTIVATION_SET_ID =
  '0xe9512f0bf2b94c9a846877187b70fd29007fa196c8bd67f7c17eb58eebc24190';
const CANDIDATE_ACTIVATION_SET_ID =
  '0xc83feebc5fe8722129a27c015192e6583cd166e0cd149dd6a7d99564474728db';
const PROMOTION_ID = '0x935a282ed5ac931b81bd825ef81199d3b5b441b2fb7b26b06793e29360296aca';

interface Check {
  gate: string;
  name: string;
  passed: boolean;
  detail: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  assert(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`
  );
  return value as Record<string, unknown>;
}

function at(value: unknown, keys: string[], label: string): unknown {
  let cursor = value;
  for (const key of keys) cursor = record(cursor, label)[key];
  return cursor;
}

function readJson(directory: string, name: string): unknown {
  return JSON.parse(readFileSync(join(directory, name), 'utf8')) as unknown;
}

function canonicalId(value: Record<string, unknown>, idKey?: string): `0x${string}` {
  const body = structuredClone(value);
  if (idKey) delete body[idKey];
  const canonical = canonicalize(body);
  assert(canonical, 'value did not canonicalize');
  return keccak256(Buffer.from(canonical, 'utf8'));
}

function responseData(response: unknown, label: string): Record<string, unknown> {
  assert(at(response, ['status'], label) === 200, `${label} did not return HTTP 200`);
  const body = at(response, ['body'], label);
  assert(at(body, ['success'], label) === true, `${label} success was not true`);
  return record(at(body, ['data'], label), `${label} data`);
}

function negativeData(response: unknown, label: string): Record<string, unknown> | null {
  const status = at(response, ['status'], label);
  assert(typeof status === 'number', `${label} has no HTTP status`);
  if (status !== 200) return null;
  return responseData(response, label);
}

function makeCheck(
  checks: Check[],
  gate: string,
  name: string,
  condition: unknown,
  detail: string
) {
  assert(condition, `${gate} ${name}: ${detail}`);
  checks.push({ gate, name, passed: true, detail });
}

function sha256Sums(directory: string): void {
  const entries = readdirSync(directory)
    .filter((name) => name !== 'SHA256SUMS.txt' && statSync(join(directory, name)).isFile())
    .sort();
  const lines = entries.map((name) => {
    const digest = createHash('sha256')
      .update(readFileSync(join(directory, name)))
      .digest('hex');
    return `${digest}  ${name}`;
  });
  writeFileSync(join(directory, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function runRegression(repoRoot: string, relativePath: string): string {
  return execFileSync(process.execPath, [join(repoRoot, relativePath)], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function writeReadme(directory: string, receipt: Record<string, unknown>): void {
  const text = [
    'Insight / VERITAS v5 remediation evidence',
    '',
    `candidatePolicyId: ${CANDIDATE_POLICY_ID}`,
    `candidateActivationSetId: ${CANDIDATE_ACTIVATION_SET_ID}`,
    `publicationPromotionId: ${PROMOTION_ID}`,
    `profileId: ${PROFILE_ID}`,
    `registryReleaseId: ${RELEASE_ID}`,
    `productionReceiptUid: ${String(receipt.uid)}`,
    '',
    'Important activation boundary:',
    `- current activation set remains ${CURRENT_ACTIVATION_SET_ID}`,
    `- current VERITAS policy remains ${HISTORICAL_POLICY_ID}`,
    '- the v5 candidate is published for review but is not active',
    '- a later promotion requires written bilateral acceptance',
    '',
    'Honesty boundary:',
    '- production gates, selected Ethereum settlement, v5 receipt and public verification are live',
    '- Bitcoin and Ethereum commitment transaction legs are deterministic software simulations',
    '- no chain broadcast was authorised or performed during remediation',
    '',
    'Verification:',
    '1. Verify every file against SHA256SUMS.txt.',
    '2. Read verification-results.json and verification-transcript.txt.',
    '3. Recompute content ids from the canonical objects.',
    '4. Confirm the current integration pointer still names policy v1.',
    '5. Independently POST production-receipt.json to the public verifier with candidatePolicyId.',
    '',
    'verify-evidence-source.txt is the TypeScript verifier source with a Gmail-safe suffix.',
    '',
  ].join('\n');
  writeFileSync(join(directory, 'README.txt'), text, { encoding: 'utf8', mode: 0o600 });
}

async function main(): Promise<void> {
  const directory = resolve(process.argv[2] ?? '');
  assert(directory.length > 0 && existsSync(directory), 'usage: verify-evidence.mts <directory>');
  const checks: Check[] = [];

  const policyResponse = readJson(directory, 'candidate-policy.json');
  const activationResponse = readJson(directory, 'candidate-activation-set.json');
  const currentIntegrations = readJson(directory, 'current-integrations.json');
  const promotionResponse = readJson(directory, 'publication-promotion.json');
  const profileResponse = readJson(directory, 'semantic-profile.json');
  const releaseResponse = readJson(directory, 'oracle-registry-release.json');
  const registry = readJson(directory, 'oracle-keys.json');
  const issuerMetadataResponse = readJson(directory, 'production-issuer-metadata.json');
  const partnerMetadataResponse = readJson(directory, 'production-partner-metadata.json');
  const receipt = record(readJson(directory, 'production-receipt.json'), 'production receipt');
  const receiptData = record(receipt.data, 'production receipt data');
  const publicVerify = readJson(directory, 'public-policy-verification.json');
  const publicPair = readJson(directory, 'public-pair-verification.json');
  const partnerCandidate = readJson(directory, 'partner-candidate-before-activation.json');
  const partnerCurrent = readJson(directory, 'partner-current-before-activation.json');
  const negatives = record(readJson(directory, 'negative-controls.json'), 'negative controls');
  const terminal = record(readJson(directory, 'terminal-rehearsal.json'), 'terminal rehearsal');
  const operator = record(
    readJson(directory, 'operator-and-deployment-proof.json'),
    'operator and deployment proof'
  );

  const policy = record(at(policyResponse, ['policy'], 'policy response'), 'candidate policy');
  const activationSet = record(
    at(activationResponse, ['activationSet'], 'activation response'),
    'candidate activation set'
  );
  const promotion = record(
    at(promotionResponse, ['promotion'], 'promotion response'),
    'publication promotion'
  );
  const profile = record(at(profileResponse, ['profile'], 'profile response'), 'semantic profile');
  const release = record(at(releaseResponse, ['release'], 'release response'), 'registry release');

  makeCheck(
    checks,
    'G1',
    'candidate policy content id',
    canonicalId(policy, 'policyId') === CANDIDATE_POLICY_ID &&
      policy.policyId === CANDIDATE_POLICY_ID,
    `policyId=${CANDIDATE_POLICY_ID}`
  );
  makeCheck(
    checks,
    'G1',
    'candidate activation content id',
    canonicalId(activationSet, 'activationSetId') === CANDIDATE_ACTIVATION_SET_ID &&
      activationSet.activationSetId === CANDIDATE_ACTIVATION_SET_ID,
    `activationSetId=${CANDIDATE_ACTIVATION_SET_ID}`
  );
  makeCheck(
    checks,
    'G1',
    'publication promotion content id',
    canonicalId(promotion, 'promotionId') === PROMOTION_ID &&
      promotion.promotionId === PROMOTION_ID,
    `promotionId=${PROMOTION_ID}`
  );

  makeCheck(checks, 'G2', 'receipt schema', receipt.schemaVersion === 5, 'schemaVersion=5');
  makeCheck(
    checks,
    'G2',
    'signed profile field',
    receiptData.profileId === PROFILE_ID,
    `profileId=${PROFILE_ID}`
  );
  makeCheck(
    checks,
    'G2',
    'candidate admission pins',
    Array.isArray(at(policy, ['pins', 'executionSchemaVersions'], 'policy pins')) &&
      JSON.stringify(at(policy, ['pins', 'executionSchemaVersions'], 'policy pins')) === '[5]' &&
      JSON.stringify(at(policy, ['pins', 'executionProfileIds'], 'policy pins')) ===
        JSON.stringify([PROFILE_ID]),
    'candidate admits only schema 5 and the exact signed profile'
  );

  const releaseId = at(releaseResponse, ['releaseId'], 'release response');
  makeCheck(
    checks,
    'G3',
    'registry release content id',
    releaseId === RELEASE_ID && canonicalId(release) === RELEASE_ID,
    `releaseId=${RELEASE_ID}`
  );
  const keys = at(registry, ['public_keys'], 'oracle keys');
  assert(Array.isArray(keys), 'public_keys must be an array');
  const attester = String(receipt.attester).toLowerCase();
  const key = keys
    .map((entry) => record(entry, 'registry key'))
    .find((entry) => String(entry.public_key).toLowerCase() === attester);
  assert(key, 'production receipt signer is absent from the registry');
  const executedAt = Number(receiptData.executedAt);
  const keyValidFrom = Date.parse(String(key.validFrom)) / 1000;
  const keyValidUntil = key.validUntil === null ? null : Date.parse(String(key.validUntil)) / 1000;
  const revoked = at(registry, ['revoked_keys'], 'oracle keys');
  assert(Array.isArray(revoked), 'revoked_keys must be an array');
  makeCheck(
    checks,
    'G3',
    'production signer role and validity',
    key.role !== 'sample' &&
      key.revoked === false &&
      executedAt >= keyValidFrom &&
      (keyValidUntil === null || executedAt < keyValidUntil) &&
      !revoked.some((entry) => record(entry, 'revocation').key_id === key.key_id),
    `attester=${receipt.attester} keyId=${String(key.key_id)} role=${String(key.role ?? 'attester')}`
  );

  const issuerMetadata = responseData(
    { status: 200, body: issuerMetadataResponse },
    'issuer metadata'
  );
  const partnerMetadata = responseData(
    { status: 200, body: partnerMetadataResponse },
    'partner metadata'
  );
  makeCheck(
    checks,
    'G4',
    'production issuer endpoint',
    issuerMetadata.schemaVersion === 5 &&
      String(issuerMetadata.attester).toLowerCase() === attester &&
      at(issuerMetadata, ['semanticProfile', 'profileId'], 'issuer metadata') === PROFILE_ID,
    'issuer metadata publishes schema 5, the recovered signer and signed profile'
  );
  makeCheck(
    checks,
    'G4',
    'partner endpoint stays on current policy',
    partnerMetadata.requiredPolicyId === HISTORICAL_POLICY_ID &&
      partnerMetadata.productionReachability === 'disabled',
    'partner route advertises historical policy v1 and disabled reachability before acceptance'
  );

  const publicVerification = responseData(publicVerify, 'public policy verification');
  makeCheck(
    checks,
    'G5',
    'production receipt verification',
    publicVerification.valid === true &&
      publicVerification.cryptographicValid === true &&
      publicVerification.trustedAttester === true,
    `uid=${String(receipt.uid)} attester=${String(receipt.attester)}`
  );
  makeCheck(
    checks,
    'G5',
    'current receipt validity',
    publicVerification.expired === false,
    `validUntil=${String(receipt.validUntil)}`
  );

  const eip712 = record(issuerMetadata.eip712, 'issuer EIP-712 metadata');
  const recovered = await recoverTypedDataAddress({
    domain: record(eip712.domain, 'EIP-712 domain') as never,
    types: record(eip712.types, 'EIP-712 types') as never,
    primaryType: String(eip712.primaryType) as never,
    message: receiptData as never,
    signature: String(receipt.signature) as `0x${string}`,
  });
  makeCheck(
    checks,
    'G6',
    'independent signer recovery',
    recovered.toLowerCase() === attester,
    `recovered=${recovered}`
  );
  makeCheck(
    checks,
    'G6',
    'candidate policy admission',
    at(publicVerification, ['consumerPolicy', 'valid'], 'consumer policy') === true &&
      at(publicVerification, ['consumerPolicy', 'policyId'], 'consumer policy') ===
        CANDIDATE_POLICY_ID,
    `policyId=${CANDIDATE_POLICY_ID}`
  );
  const pairVerification = responseData(publicPair, 'public pair verification');
  makeCheck(
    checks,
    'G6',
    'closed-loop pair verification',
    pairVerification.pairedValid === true &&
      at(pairVerification, ['consumerPolicy', 'valid'], 'pair consumer policy') === true,
    `closedLoopStatus=${String(pairVerification.closedLoopStatus)}`
  );

  makeCheck(
    checks,
    'G7',
    'semantic profile content id',
    at(profileResponse, ['profileId'], 'profile response') === PROFILE_ID &&
      canonicalId(profile) === PROFILE_ID,
    `profileId=${PROFILE_ID}`
  );
  makeCheck(
    checks,
    'G7',
    'profile semantics present',
    at(profile, ['commitments', 'preTradeUidsHash', 'algorithm'], 'profile commitments') ===
      'keccak256' &&
      Array.isArray(profile.verdictRules) &&
      record(profile.scales, 'profile scales').quotedPrice === 8,
    'commitments, sentinels, scales, enumerations and verdict rules are addressable'
  );

  const wrongPolicy = negativeData(negatives.wrongPolicy, 'wrong policy negative');
  const missingProfile = negativeData(negatives.missingProfile, 'missing profile negative');
  const wrongSchema = negativeData(negatives.wrongSchema, 'wrong schema negative');
  const expiredSigner = negativeData(negatives.expiredSigner, 'expired signer negative');
  const sampleSigner = negativeData(negatives.sampleSigner, 'sample signer negative');
  const unapprovedEndpoint = negativeData(
    negatives.unapprovedPartnerEndpoint,
    'unapproved endpoint negative'
  );
  makeCheck(
    checks,
    'G8',
    'wrong policy rejected',
    wrongPolicy?.valid === false && wrongPolicy.reason === 'unknown_partner_policy',
    `reason=${String(wrongPolicy?.reason)}`
  );
  makeCheck(
    checks,
    'G8',
    'missing profile rejected',
    missingProfile === null || missingProfile.valid === false,
    missingProfile === null
      ? 'request validation rejected'
      : `reason=${String(missingProfile.reason)}`
  );
  makeCheck(
    checks,
    'G8',
    'wrong schema rejected',
    wrongSchema === null || wrongSchema.valid === false,
    wrongSchema === null ? 'request validation rejected' : `reason=${String(wrongSchema.reason)}`
  );
  makeCheck(
    checks,
    'G8',
    'expired signer rejected',
    expiredSigner?.valid === false && expiredSigner.trustedAttester === false,
    `reason=${String(expiredSigner?.reason)}`
  );
  makeCheck(
    checks,
    'G8',
    'sample signer rejected',
    sampleSigner?.valid === false && sampleSigner.trustedAttester === false,
    `reason=${String(sampleSigner?.reason)}`
  );
  makeCheck(
    checks,
    'G8',
    'unapproved partner endpoint rejected',
    unapprovedEndpoint?.valid === false &&
      unapprovedEndpoint.reason === 'policy_not_active_for_partner',
    `reason=${String(unapprovedEndpoint?.reason)}`
  );
  const currentPartnerResult = responseData(partnerCurrent, 'current partner verification');
  makeCheck(
    checks,
    'G8',
    'historical active policy remains disabled',
    currentPartnerResult.valid === false &&
      currentPartnerResult.reason === 'partner_policy_not_production_reachable',
    `reason=${String(currentPartnerResult.reason)}`
  );

  const sourceGate = record(readJson(directory, 'source-gate.json'), 'source gate');
  const destinationGate = record(readJson(directory, 'destination-gate.json'), 'destination gate');
  const sourceGateData = record(sourceGate.data, 'source gate signed data');
  const destinationGateData = record(destinationGate.data, 'destination gate signed data');
  const commitments = record(terminal.commitments, 'terminal commitments');
  const selected = record(terminal.selectedSettlement, 'selected settlement');
  const orderingBoundary = record(terminal.orderingBoundary, 'ordering boundary');
  const wethAssetId = 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  const usdcAssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  makeCheck(
    checks,
    'G9',
    'fresh PASS gates bind the exact WETH and USDC token legs',
    sourceGateData.verdict === 'PASS' &&
      destinationGateData.verdict === 'PASS' &&
      String(sourceGateData.sourceAssetId).toLowerCase() === wethAssetId &&
      String(sourceGateData.destinationAssetId).toLowerCase() === usdcAssetId &&
      String(destinationGateData.sourceAssetId).toLowerCase() === usdcAssetId &&
      String(destinationGateData.destinationAssetId).toLowerCase() === wethAssetId,
    'neither signed gate may bind native ETH or carry a BLOCK verdict'
  );
  makeCheck(
    checks,
    'G9',
    'fresh gates bind the receipt',
    receiptData.preTradeUid === sourceGate.uid &&
      receiptData.destinationPreTradeUid === destinationGate.uid &&
      receiptData.preTradeUidsHash ===
        keccak256(
          concat([
            String(sourceGate.uid) as `0x${string}`,
            String(destinationGate.uid) as `0x${string}`,
          ])
        ),
    'source uid, destination uid and ordered uid commitment match'
  );
  makeCheck(
    checks,
    'G9',
    'settlement follows rehearsal boundary inside gate window',
    Number(selected.blockNumber) > Number(orderingBoundary.blockNumber) &&
      Number(selected.blockTimestamp) >= Number(sourceGateData.checkedAt) &&
      Number(selected.blockTimestamp) >= Number(destinationGateData.checkedAt) &&
      Number(selected.blockTimestamp) <= Number(sourceGateData.validUntil) &&
      Number(selected.blockTimestamp) <= Number(destinationGateData.validUntil) &&
      Number(selected.blockTimestamp) <= Number(terminal.attemptExpiry) &&
      Number(receiptData.executedAt) === Number(selected.blockTimestamp) &&
      receiptData.txHash === selected.transactionHash,
    `boundary=${String(orderingBoundary.blockNumber)} settlement=${String(selected.blockNumber)}`
  );
  const usdcRaw = -BigInt(String(selected.amount0));
  const wethRaw = BigInt(String(selected.amount1));
  assert(usdcRaw > 0n && wethRaw > 0n, 'selected event is not WETH -> USDC');
  const selectedPoolPrice = Number(usdcRaw) / 1e6 / (Number(wethRaw) / 1e18);
  const priceScale = Number(receiptData.priceScale);
  const executedPrice = Number(receiptData.executedPrice) / 10 ** priceScale;
  const priceDifferenceBps = (executedPrice / selectedPoolPrice - 1) * 10_000;
  makeCheck(
    checks,
    'G9',
    'production receipt grades the selected pool event price',
    Number.isInteger(priceScale) &&
      Number.isFinite(executedPrice) &&
      executedPrice > 0 &&
      receiptData.priceExecutionStatus === 'FAITHFUL' &&
      Number.isFinite(priceDifferenceBps) &&
      Math.abs(priceDifferenceBps) <= 1,
    `receipt=${executedPrice} USDC/WETH pool=${selectedPoolPrice} USDC/WETH delta=${priceDifferenceBps} bps`
  );
  makeCheck(
    checks,
    'G9',
    'commitment software path complete without broadcast',
    terminal.chainBroadcasts === 'NONE' &&
      commitments.mode === 'FULL_SOFTWARE_PATH_SIMULATION_NO_CHAIN_BROADCAST' &&
      at(commitments, ['bitcoin', 'canonicalPreimageBytes'], 'Bitcoin commitment') === 409 &&
      /^0x[0-9a-f]{64}$/.test(
        String(at(commitments, ['ethereum', 'orderingCommitmentHash'], 'Ethereum commitment'))
      ),
    'fresh gates -> both commitment preimages -> real settlement -> production receipt -> pair verification'
  );

  const temporaryKey = record(operator.temporaryApiKey, 'temporary API key proof');
  const workflow = record(operator.workflow, 'workflow proof');
  makeCheck(
    checks,
    'G10',
    'temporary operator credential revoked',
    temporaryKey.plaintextPersisted === false && temporaryKey.revocationConfirmed === true,
    `keyId=${String(temporaryKey.keyId)} revokedAt=${String(temporaryKey.revokedAt)}`
  );
  makeCheck(
    checks,
    'G10',
    'gated deployment succeeded',
    workflow.available === true &&
      workflow.status === 'completed' &&
      workflow.conclusion === 'success',
    `commit=${String(operator.commitSha)} workflow=${String(workflow.html_url)}`
  );
  makeCheck(
    checks,
    'G10',
    'candidate publication did not activate VERITAS',
    at(currentIntegrations, ['activationSetId'], 'current integrations') ===
      CURRENT_ACTIVATION_SET_ID &&
      at(currentIntegrations, ['activationSetId'], 'current integrations') !==
        CANDIDATE_ACTIVATION_SET_ID &&
      at(activationSet, ['partners', 'veritas'], 'candidate activation') === CANDIDATE_POLICY_ID,
    'current pointer remains v2; candidate set changes only the future VERITAS mapping'
  );

  const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const regressionScripts = [
    'scripts/veritas-joint-run/verify-veritas-window-2-plan.mjs',
    'scripts/veritas-joint-run/verify-veritas-round9-run-readiness.mjs',
    'scripts/veritas-joint-run/verify-veritas-round8-publication-closure.mjs',
    'scripts/veritas-joint-run/verify-veritas-round7-closure.mjs',
  ];
  const regressions = regressionScripts.map((script) => ({
    script,
    output: runRegression(repoRoot, script),
  }));
  makeCheck(
    checks,
    'G9',
    'joint-run regression suites',
    regressions.every((entry) => !/(^|\n)FAIL\b/.test(entry.output)),
    `${regressions.length} pinned regression verifiers completed without FAIL`
  );

  const gates = [...new Set(checks.map((check) => check.gate))].sort();
  assert(gates.join(',') === 'G1,G10,G2,G3,G4,G5,G6,G7,G8,G9', 'not every evidence gate ran');
  const results = {
    schema: 'insight-veritas-v5-remediation-verification/v1',
    verifiedAt: new Date().toISOString(),
    result: 'PASS',
    checksPassed: checks.length,
    checksFailed: 0,
    evidenceGatesPassed: 10,
    checks,
    regressions: regressions.map((entry) => ({ script: entry.script, status: 'PASS' })),
  };
  writeFileSync(
    join(directory, 'verification-results.json'),
    `${JSON.stringify(results, null, 2)}\n`,
    {
      encoding: 'utf8',
      mode: 0o600,
    }
  );

  const transcript = [
    'Insight / VERITAS v5 remediation verification',
    `verifiedAt: ${results.verifiedAt}`,
    `result: ${results.result}`,
    `evidence gates: ${results.evidenceGatesPassed}/10`,
    `checks: ${results.checksPassed} PASS / 0 FAIL`,
    '',
    ...checks.map((check) => `PASS  [${check.gate}] ${check.name}  ${check.detail}`),
    '',
    'Pinned joint-run regression output:',
    ...regressions.flatMap((entry) => [`--- ${entry.script}`, entry.output.trim(), '']),
  ].join('\n');
  writeFileSync(join(directory, 'verification-transcript.txt'), `${transcript}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  writeReadme(directory, receipt);
  copyFileSync(fileURLToPath(import.meta.url), join(directory, 'verify-evidence-source.txt'));
  sha256Sums(directory);

  const zipPath = `${directory}-email-safe.zip`;
  if (existsSync(zipPath)) throw new Error(`refuse to overwrite existing archive: ${zipPath}`);
  execFileSync('zip', ['-X', '-r', zipPath, basename(directory)], {
    cwd: dirname(directory),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  execFileSync('unzip', ['-t', zipPath], { stdio: ['ignore', 'pipe', 'pipe'] });
  const zipSha256 = createHash('sha256').update(readFileSync(zipPath)).digest('hex');

  process.stdout.write(
    [
      'VERITAS V5 REMEDIATION EVIDENCE VERIFIED',
      `result=PASS`,
      `evidenceGates=10/10`,
      `checks=${checks.length}/0`,
      `archive=${zipPath}`,
      `archiveBytes=${statSync(zipPath).size}`,
      `archiveSha256=${zipSha256}`,
      '',
    ].join('\n')
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `VERITAS REMEDIATION VERIFICATION FAILED: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  process.exitCode = 1;
});
