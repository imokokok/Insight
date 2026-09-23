#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import canonicalize from 'canonicalize';
import { concat, decodeAbiParameters, getAddress, isAddress, keccak256, toBytes } from 'viem';

import { createApiKeyForUser, revokeApiKey } from '@/lib/api/apiKey';
import {
  signExecutionReceipt,
  type ExecutionReceiptInput,
} from '@/lib/attestations/executionReceipt';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ORIGIN = 'https://www.oracleinsight.xyz';
const CANDIDATE_POLICY_ID = '0x162d3fe744acc2041a959daf40dc3fe9242b654aef58acbb991acbf605885085';
const HISTORICAL_POLICY_ID = '0xb7b0ea5686628d8241cd269c45cf6ae462acc6b9f36843608358a00bb71691d6';
const PROFILE_ID = '0xe7513b059e9f8291bfa21250e0234661d74112a491efc6b40fbb56692013cb8e';
const RELEASE_ID = '0x6e3bd18c541cc80e326754a7743f05050df348257102b93f9a13bc82c7e69f6b';
const CURRENT_ACTIVATION_SET_ID =
  '0xe9512f0bf2b94c9a846877187b70fd29007fa196c8bd67f7c17eb58eebc24190';
const CANDIDATE_ACTIVATION_SET_ID =
  '0xc83feebc5fe8722129a27c015192e6583cd166e0cd149dd6a7d99564474728db';
const PROMOTION_ID = '0x935a282ed5ac931b81bd825ef81199d3b5b441b2fb7b26b06793e29360296aca';
const SELECTION_RULE_HASH = '0x545ede509529b6d8716be4f74e3e6715d92d821d18493dbc7f32e15156d2fc7a';
const POOL = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MIN_WETH_RAW = 100_000_000_000_000_000n;
const RPC_ENDPOINTS = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'];
const USER_AGENT = 'Insight-VERITAS-remediation/1.0';

interface JsonResponse {
  status: number;
  body: unknown;
}

interface RpcLog {
  address: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
  logIndex: string;
  data: `0x${string}`;
  topics: `0x${string}`[];
}

interface GateEnvelope {
  uid: `0x${string}`;
  schemaVersion: number;
  attester: string;
  signedAt: string;
  validUntil: number;
  signature: string;
  data: {
    requestHash: `0x${string}`;
    sourceAssetId: string;
    destinationAssetId: string;
    subjectChainId: number;
    action: string;
    participantCount: number;
    sourceGroupCount: number;
    checkedAt: number;
    validUntil: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
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

function nested(value: unknown, keys: string[], label: string): unknown {
  let cursor = value;
  for (const key of keys) cursor = record(cursor, label)[key];
  return cursor;
}

function parseArgs(argv: string[]): { output: string; pollSeconds: number } {
  let output = '';
  let pollSeconds = 480;
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    assert(value, `${name ?? '<end>'} requires a value`);
    if (name === '--output') output = resolve(value);
    else if (name === '--poll-seconds') pollSeconds = Number(value);
    else throw new Error(`unknown argument: ${name}`);
  }
  assert(output.length > 0, '--output is required');
  assert(
    Number.isInteger(pollSeconds) && pollSeconds >= 60 && pollSeconds <= 540,
    '--poll-seconds must be 60..540'
  );
  assert(!existsSync(output), `output directory already exists: ${output}`);
  return { output, pollSeconds };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function writeText(path: string, value: string): void {
  writeFileSync(path, value.endsWith('\n') ? value : `${value}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

async function httpJson(url: string, init: RequestInit = {}): Promise<JsonResponse> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      'User-Agent': USER_AGENT,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { nonJsonBody: text.slice(0, 500) };
  }
  return { status: response.status, body };
}

async function requireHttpJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await httpJson(url, init);
  assert(
    response.status >= 200 && response.status < 300,
    `${url} returned HTTP ${response.status}`
  );
  return response.body;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const errors: string[] = [];
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const response = await httpJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
      });
      const payload = record(response.body, `${endpoint} response`);
      if (response.status >= 200 && response.status < 300 && payload.result !== undefined) {
        return payload.result as T;
      }
      errors.push(
        `${endpoint}: HTTP ${response.status} ${JSON.stringify(payload.error ?? payload)}`
      );
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`${method} failed on every RPC: ${errors.join(' | ')}`);
}

async function issueGate(apiKey: string, asset: 'ETH' | 'USDC', destinationAsset: 'ETH' | 'USDC') {
  const url = new URL(`${ORIGIN}/api/v1/safety/pre-trade`);
  url.search = new URLSearchParams({
    asset,
    chainId: '1',
    action: 'swap',
    tradeAmountUsd: '50000',
    schemaVersion: '3',
    destinationAsset,
    workflowTag: 'veritas-v5-remediation',
  }).toString();
  const response = await requireHttpJson(url.toString(), { headers: { 'X-API-Key': apiKey } });
  const gate = nested(response, ['data', 'attestation'], 'pre-trade response') as GateEnvelope;
  assert(/^0x[0-9a-f]{64}$/.test(gate.uid), 'gate uid must be lowercase bytes32');
  assert(gate.schemaVersion === 3, 'gate schema must be v3');
  assert(gate.validUntil === gate.data.validUntil, 'gate validity fields disagree');
  return { response, gate };
}

function decodeSwap(log: RpcLog): { amount0: bigint; amount1: bigint } {
  const values = decodeAbiParameters(
    [
      { type: 'int256' },
      { type: 'int256' },
      { type: 'uint160' },
      { type: 'uint128' },
      { type: 'int24' },
    ],
    log.data
  );
  return { amount0: values[0], amount1: values[1] };
}

async function blockTimestamp(blockNumber: number): Promise<number> {
  const block = await rpc<Record<string, string> | null>('eth_getBlockByNumber', [
    `0x${blockNumber.toString(16)}`,
    false,
  ]);
  assert(block?.timestamp, `block ${blockNumber} is unavailable`);
  return Number(BigInt(block.timestamp));
}

async function pollFirstQualifyingSwap(
  startBlock: number,
  expiresAt: number,
  pollSeconds: number
): Promise<{ log: RpcLog; amount0: string; amount1: string; blockTimestamp: number }> {
  const deadline = Date.now() + pollSeconds * 1000;
  let nextBlock = startBlock + 1;
  while (Date.now() < deadline) {
    const head = Number(BigInt(await rpc<string>('eth_blockNumber', [])));
    if (head >= nextBlock) {
      const logs = await rpc<RpcLog[]>('eth_getLogs', [
        {
          address: POOL,
          fromBlock: `0x${nextBlock.toString(16)}`,
          toBlock: `0x${head.toString(16)}`,
          topics: [SWAP_TOPIC],
        },
      ]);
      logs.sort(
        (left, right) =>
          Number(BigInt(left.blockNumber) - BigInt(right.blockNumber)) ||
          Number(BigInt(left.transactionIndex) - BigInt(right.transactionIndex)) ||
          Number(BigInt(left.logIndex) - BigInt(right.logIndex))
      );
      for (const log of logs) {
        const decoded = decodeSwap(log);
        if (decoded.amount0 < 0n && decoded.amount1 >= MIN_WETH_RAW) {
          const timestamp = await blockTimestamp(Number(BigInt(log.blockNumber)));
          assert(timestamp <= expiresAt, 'first qualifying settlement landed after gate expiry');
          return {
            log,
            amount0: decoded.amount0.toString(),
            amount1: decoded.amount1.toString(),
            blockTimestamp: timestamp,
          };
        }
      }
      nextBlock = head + 1;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 4_000));
  }
  throw new Error(`no qualifying WETH->USDC swap observed within ${pollSeconds}s`);
}

function topicAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

async function findAttributionTaker(txHash: string): Promise<string | null> {
  const receipt = await rpc<{ from?: string; logs?: RpcLog[] } | null>(
    'eth_getTransactionReceipt',
    [txHash]
  );
  assert(receipt, `candidate receipt unavailable: ${txHash}`);
  const wethOut = new Set<string>();
  const usdcIn = new Set<string>();
  for (const log of receipt.logs ?? []) {
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC || log.topics.length < 3) continue;
    const token = log.address.toLowerCase();
    if (token === WETH) wethOut.add(topicAddress(log.topics[1]!));
    if (token === USDC) usdcIn.add(topicAddress(log.topics[2]!));
  }
  const intersection = [...wethOut].find(
    (address) => usdcIn.has(address) && address !== POOL && address !== `0x${'0'.repeat(40)}`
  );
  if (intersection && isAddress(intersection)) return getAddress(intersection);
  const sender = receipt.from;
  return sender && isAddress(sender) ? getAddress(sender) : null;
}

function sha256Hex(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function taggedHash(tag: string, message: Buffer): string {
  const tagHash = createHash('sha256').update(tag, 'utf8').digest();
  return createHash('sha256')
    .update(Buffer.concat([tagHash, tagHash, message]))
    .digest('hex');
}

function buildCommitmentRehearsal(sourceUid: `0x${string}`, destinationUid: `0x${string}`) {
  const preTradeUidsHash = keccak256(concat([sourceUid, destinationUid]));
  const bitcoinPreimage = {
    destinationGateUid: destinationUid,
    preTradeUidsHash,
    schema: 'insight-veritas-bitcoin-anchor-commitment/v1',
    selectionRuleHash: SELECTION_RULE_HASH,
    sourceGateUid: sourceUid,
  };
  const bitcoinCanonical = canonicalize(bitcoinPreimage);
  assert(bitcoinCanonical, 'Bitcoin preimage did not canonicalize');
  const bitcoinAnchorTxid = sha256Hex('SIMULATED_NO_BROADCAST:veritas-v5-remediation:bitcoin');
  const bitcoinConfirmingBlockHash = sha256Hex(
    'SIMULATED_NO_BROADCAST:veritas-v5-remediation:block'
  );
  const ethereumPreimage = {
    bitcoinAnchorTxid,
    bitcoinConfirmingBlockHash,
    bitcoinConfirmingBlockHeight: 1,
    destinationGateUid: destinationUid,
    preTradeUidsHash,
    schema: 'insight-veritas-ethereum-ordering-commitment/v1',
    selectionRuleHash: SELECTION_RULE_HASH,
    sourceGateUid: sourceUid,
  };
  const ethereumCanonical = canonicalize(ethereumPreimage);
  assert(ethereumCanonical, 'Ethereum preimage did not canonicalize');
  return {
    mode: 'FULL_SOFTWARE_PATH_SIMULATION_NO_CHAIN_BROADCAST',
    preTradeUidsHash,
    selectionRuleHash: SELECTION_RULE_HASH,
    bitcoin: {
      preimage: bitcoinPreimage,
      canonicalPreimage: bitcoinCanonical,
      canonicalPreimageBytes: Buffer.byteLength(bitcoinCanonical),
      leafTag: 'VRT1/anchored-settlement-commitment',
      anchorLeafHash: taggedHash(
        'VRT1/anchored-settlement-commitment',
        Buffer.from(bitcoinCanonical, 'utf8')
      ),
      simulatedTxid: bitcoinAnchorTxid,
      simulatedConfirmingBlockHeight: 1,
      simulatedConfirmingBlockHash: bitcoinConfirmingBlockHash,
    },
    ethereum: {
      preimage: ethereumPreimage,
      canonicalPreimage: ethereumCanonical,
      canonicalPreimageBytes: Buffer.byteLength(ethereumCanonical),
      orderingCommitmentHash: keccak256(toBytes(ethereumCanonical)),
      broadcast: false,
    },
  };
}

async function postJson(
  url: string,
  body: unknown,
  headers: HeadersInit = {}
): Promise<JsonResponse> {
  return httpJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function githubWorkflowEvidence(sha: string): Promise<unknown> {
  const result = await httpJson(
    `https://api.github.com/repos/imokokok/Insight/actions/runs?head_sha=${sha}&per_page=20`
  );
  if (result.status !== 200) return { available: false, status: result.status, body: result.body };
  const runs = nested(result.body, ['workflow_runs'], 'GitHub actions response');
  if (!Array.isArray(runs)) return { available: false, reason: 'workflow_runs_not_array' };
  const run = runs
    .map((entry) => record(entry, 'workflow run'))
    .find((entry) => entry.name === 'Quality Gate');
  return run
    ? {
        available: true,
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        event: run.event,
        head_sha: run.head_sha,
        html_url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at,
      }
    : { available: false, reason: 'quality_gate_run_not_found' };
}

function writeSha256Sums(directory: string): void {
  const entries = readdirSync(directory)
    .filter((name) => name !== 'SHA256SUMS.txt' && statSync(join(directory, name)).isFile())
    .sort();
  const lines = entries.map((name) => {
    const digest = createHash('sha256')
      .update(readFileSync(join(directory, name)))
      .digest('hex');
    return `${digest}  ${name}`;
  });
  writeText(join(directory, 'SHA256SUMS.txt'), lines.join('\n'));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(options.output, { recursive: false, mode: 0o700 });
  const startedAt = new Date().toISOString();
  const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  copyFileSync(
    join(repoRoot, 'scripts/veritas-remediation/veritas-v5-remediation-plan-v1.json'),
    join(options.output, 'remediation-plan.json')
  );

  const ownerId = (process.env.OPS_OWNER_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  assert(ownerId, 'OPS_OWNER_USER_IDS must contain an owner id');

  const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
  const temporary = await createApiKeyForUser(ownerId, 'VERITAS v5 remediation evidence', {
    plan: 'enterprise',
    expiresAt,
  });
  let revokedAt: string | null = null;
  try {
    const endpointInventory = {
      capturedAt: new Date().toISOString(),
      origin: ORIGIN,
      issuance: `${ORIGIN}/api/v1/execution/attestation/issue`,
      publicVerification: `${ORIGIN}/api/v1/execution/attestation/verify`,
      publicPairVerification: `${ORIGIN}/api/v1/execution/attestation/verify-pair`,
      partnerVerification: `${ORIGIN}/api/v1/partners/veritas/execution/attestation/verify`,
      partnerPairVerification: `${ORIGIN}/api/v1/partners/veritas/execution/attestation/verify-pair`,
      keyRegistry: `${ORIGIN}/.well-known/oracle-keys.json`,
      profile: `${ORIGIN}/.well-known/oracle-registry/profiles/${PROFILE_ID}`,
      release: `${ORIGIN}/.well-known/oracle-registry/releases/${RELEASE_ID}`,
      policy: `${ORIGIN}/.well-known/oracle-registry/integrations/${CANDIDATE_POLICY_ID}`,
      candidateActivationSet: `${ORIGIN}/.well-known/oracle-registry/integration-sets/${CANDIDATE_ACTIVATION_SET_ID}`,
      currentIntegrations: `${ORIGIN}/.well-known/oracle-registry/integrations/current.json`,
      promotion: `${ORIGIN}/.well-known/oracle-registry/promotions/${PROMOTION_ID}`,
    };
    writeJson(join(options.output, 'endpoint-inventory.json'), endpointInventory);

    const staticFetches = await Promise.all([
      requireHttpJson(endpointInventory.keyRegistry),
      requireHttpJson(endpointInventory.profile),
      requireHttpJson(endpointInventory.release),
      requireHttpJson(endpointInventory.policy),
      requireHttpJson(endpointInventory.candidateActivationSet),
      requireHttpJson(endpointInventory.currentIntegrations),
      requireHttpJson(endpointInventory.promotion),
      requireHttpJson(endpointInventory.publicVerification),
      requireHttpJson(endpointInventory.partnerVerification),
    ]);
    const staticNames = [
      'oracle-keys.json',
      'semantic-profile.json',
      'oracle-registry-release.json',
      'candidate-policy.json',
      'candidate-activation-set.json',
      'current-integrations.json',
      'publication-promotion.json',
      'production-issuer-metadata.json',
      'production-partner-metadata.json',
    ];
    staticFetches.forEach((value, index) =>
      writeJson(join(options.output, staticNames[index]!), value)
    );

    assert(
      nested(staticFetches[3], ['policyId'], 'candidate policy response') === CANDIDATE_POLICY_ID,
      'candidate policy endpoint returned the wrong id'
    );
    assert(
      nested(staticFetches[4], ['activationSetId'], 'candidate set response') ===
        CANDIDATE_ACTIVATION_SET_ID,
      'candidate activation endpoint returned the wrong id'
    );
    assert(
      nested(staticFetches[5], ['activationSetId'], 'current integrations response') ===
        CURRENT_ACTIVATION_SET_ID,
      'current activation changed before bilateral acceptance'
    );
    assert(
      nested(staticFetches[6], ['promotionId'], 'promotion response') === PROMOTION_ID,
      'publication promotion endpoint returned the wrong id'
    );

    const [sourceIssued, destinationIssued] = await Promise.all([
      issueGate(temporary.plainKey, 'ETH', 'USDC'),
      issueGate(temporary.plainKey, 'USDC', 'ETH'),
    ]);
    const sourceGate = sourceIssued.gate;
    const destinationGate = destinationIssued.gate;
    writeJson(join(options.output, 'source-gate-response.json'), sourceIssued.response);
    writeJson(join(options.output, 'destination-gate-response.json'), destinationIssued.response);
    writeJson(join(options.output, 'source-gate.json'), sourceGate);
    writeJson(join(options.output, 'destination-gate.json'), destinationGate);

    const orderingBoundaryBlock = Number(BigInt(await rpc<string>('eth_blockNumber', [])));
    const attemptExpiry = Math.min(sourceGate.validUntil, destinationGate.validUntil);
    const candidate = await pollFirstQualifyingSwap(
      orderingBoundaryBlock,
      attemptExpiry,
      options.pollSeconds
    );
    const candidateBlock = Number(BigInt(candidate.log.blockNumber));
    const taker = await findAttributionTaker(candidate.log.transactionHash);
    const issueBody: Record<string, unknown> = {
      preTradeUid: sourceGate.uid,
      requestHash: sourceGate.data.requestHash,
      sourceAssetId: sourceGate.data.sourceAssetId,
      destinationAssetId: sourceGate.data.destinationAssetId,
      subjectChainId: sourceGate.data.subjectChainId,
      settlementChainId: 1,
      participantCount: sourceGate.data.participantCount,
      sourceGroupCount: sourceGate.data.sourceGroupCount,
      preTradeSignedAt: sourceGate.data.checkedAt,
      quotedPrice: 0,
      action: 'swap',
      txHash: candidate.log.transactionHash,
      destinationPreTradeUid: destinationGate.uid,
      quoteVenueIndependent: false,
      quoteBasis: 'PREV_BLOCK_CLOSE',
      quoteBlockNumber: orderingBoundaryBlock,
      priceStateAgeAtExecSeconds: Math.max(0, candidate.blockTimestamp - sourceGate.data.checkedAt),
      claimRole: 'THIRD_PARTY_OBSERVATION',
      preTradeAttestations: { source: sourceGate, destination: destinationGate },
    };
    if (taker) issueBody.taker = taker;

    const issueResponse = await postJson(endpointInventory.issuance, issueBody, {
      'X-API-Key': temporary.plainKey,
    });
    assert(
      issueResponse.status === 200,
      `production issuance failed: HTTP ${issueResponse.status} ${JSON.stringify(issueResponse.body)}`
    );
    const productionReceipt = nested(
      issueResponse.body,
      ['data', 'attestation'],
      'production issue response'
    );
    writeJson(join(options.output, 'production-issue-response.json'), issueResponse.body);
    writeJson(join(options.output, 'production-receipt.json'), productionReceipt);

    const verifyBody = { attestation: productionReceipt, policyId: CANDIDATE_POLICY_ID };
    const pairBody = {
      preTradeAttestation: sourceGate,
      destinationPreTradeAttestation: destinationGate,
      executionReceipt: productionReceipt,
      policyId: CANDIDATE_POLICY_ID,
    };
    const [publicVerify, publicPair, partnerCandidate, partnerCurrent] = await Promise.all([
      postJson(endpointInventory.publicVerification, verifyBody),
      postJson(endpointInventory.publicPairVerification, pairBody),
      postJson(endpointInventory.partnerVerification, verifyBody),
      postJson(endpointInventory.partnerVerification, {
        attestation: productionReceipt,
        policyId: HISTORICAL_POLICY_ID,
      }),
    ]);
    writeJson(join(options.output, 'public-policy-verification.json'), publicVerify);
    writeJson(join(options.output, 'public-pair-verification.json'), publicPair);
    writeJson(join(options.output, 'partner-candidate-before-activation.json'), partnerCandidate);
    writeJson(join(options.output, 'partner-current-before-activation.json'), partnerCurrent);

    const receiptRecord = record(productionReceipt, 'production receipt');
    const receiptData = record(receiptRecord.data, 'production receipt data');
    const missingProfile = structuredClone(receiptRecord);
    delete record(missingProfile.data, 'missing-profile data').profileId;
    const wrongSchema = structuredClone(receiptRecord);
    wrongSchema.schemaVersion = 4;
    record(wrongSchema.data, 'wrong-schema data').schemaVersion = 4;

    const now = Math.floor(Date.now() / 1000);
    const expiredSignerInput: ExecutionReceiptInput = {
      preTradeUid: `0x${'11'.repeat(32)}`,
      requestHash: `0x${'22'.repeat(32)}`,
      preTradeSignedAt: now - 30,
      preTradeValidUntil: now + 570,
      bindingMode: 'SELF_REPORTED',
      claimRole: 'THIRD_PARTY_OBSERVATION',
      sourceAssetId: sourceGate.data.sourceAssetId,
      destinationAssetId: sourceGate.data.destinationAssetId,
      subjectChainId: 1,
      settlementChainId: 1,
      action: 'swap',
      quotedPrice: 3000,
      executedPrice: 3000,
      fillStatus: 'FULL',
      txHash: `0x${'33'.repeat(32)}`,
      blockNumber: candidateBlock,
      executedAt: now,
      oracleDataAgeAtExecSeconds: 30,
      participantCount: 3,
      sourceGroupCount: 2,
      reasonCodes: ['PRE_TRADE_NOT_PRESENTED'],
    };
    const expiredSignerReceipt = await signExecutionReceipt(expiredSignerInput);
    assert(expiredSignerReceipt, 'local expired-signer negative receipt could not be signed');

    const sampleResponse = await requireHttpJson(
      `${ORIGIN}/api/v1/execution/attestation/sample?schemaVersion=5`
    );
    const sampleReceipt = nested(sampleResponse, ['data', 'attestation'], 'sample response');
    const negativeControls = {
      wrongPolicy: await postJson(endpointInventory.publicVerification, {
        attestation: productionReceipt,
        policyId: `0x${'ff'.repeat(32)}`,
      }),
      missingProfile: await postJson(endpointInventory.publicVerification, {
        attestation: missingProfile,
        policyId: CANDIDATE_POLICY_ID,
      }),
      wrongSchema: await postJson(endpointInventory.publicVerification, {
        attestation: wrongSchema,
        policyId: CANDIDATE_POLICY_ID,
      }),
      expiredSigner: await postJson(endpointInventory.publicVerification, {
        attestation: expiredSignerReceipt,
        policyId: CANDIDATE_POLICY_ID,
      }),
      sampleSigner: await postJson(endpointInventory.publicVerification, {
        attestation: sampleReceipt,
        policyId: CANDIDATE_POLICY_ID,
      }),
      unapprovedPartnerEndpoint: partnerCandidate,
    };
    writeJson(join(options.output, 'negative-controls.json'), negativeControls);
    writeJson(join(options.output, 'expired-signer-negative-receipt.json'), expiredSignerReceipt);
    writeJson(join(options.output, 'sample-signer-negative-receipt.json'), sampleReceipt);

    const commitments = buildCommitmentRehearsal(sourceGate.uid, destinationGate.uid);
    const terminalRehearsal = {
      schema: 'insight-veritas-v5-terminal-rehearsal/v1',
      completedAt: new Date().toISOString(),
      chainBroadcasts: 'NONE',
      chainLegMode: commitments.mode,
      honestyBoundary:
        'Fresh production gates, a real post-gate Ethereum settlement and a current production-role ExecutionReceipt are live. Bitcoin and Ethereum commitment transactions are deterministic software-path simulations only; no chain broadcast was authorised or performed.',
      sourceGateUid: sourceGate.uid,
      destinationGateUid: destinationGate.uid,
      attemptExpiry,
      orderingBoundary: {
        mode: 'READ_ONLY_ETHEREUM_HEAD_FOR_REHEARSAL',
        blockNumber: orderingBoundaryBlock,
      },
      commitments,
      selectedSettlement: {
        rule: 'first WETH->USDC Uniswap V3 pool event after orderingBoundary with amount1 >= 0.1 WETH',
        transactionHash: candidate.log.transactionHash,
        blockNumber: candidateBlock,
        transactionIndex: Number(BigInt(candidate.log.transactionIndex)),
        logIndex: Number(BigInt(candidate.log.logIndex)),
        amount0: candidate.amount0,
        amount1: candidate.amount1,
        blockTimestamp: candidate.blockTimestamp,
        attributedTaker: taker,
      },
      receipt: {
        uid: receiptRecord.uid,
        attester: receiptRecord.attester,
        schemaVersion: receiptRecord.schemaVersion,
        profileId: receiptData.profileId,
        bindingMode: receiptData.bindingMode,
        priceExecutionStatus: receiptData.priceExecutionStatus,
      },
      verificationFiles: [
        'public-policy-verification.json',
        'public-pair-verification.json',
        'partner-candidate-before-activation.json',
      ],
    };
    writeJson(join(options.output, 'terminal-rehearsal.json'), terminalRehearsal);

    const canonicalDigests = {
      policyId: nested(staticFetches[3], ['policyId'], 'candidate policy response'),
      activationSetId: nested(staticFetches[4], ['activationSetId'], 'candidate set response'),
      promotionId: nested(staticFetches[6], ['promotionId'], 'promotion response'),
      profileId: nested(staticFetches[1], ['profileId'], 'profile response'),
      releaseId: nested(staticFetches[2], ['releaseId'], 'release response'),
    };
    writeJson(join(options.output, 'canonical-digests.json'), canonicalDigests);

    const commitSha = process.env.EVIDENCE_COMMIT_SHA ?? '';
    assert(
      /^[0-9a-f]{40}$/.test(commitSha),
      'EVIDENCE_COMMIT_SHA must be the deployed 40-hex commit'
    );
    const workflow = await githubWorkflowEvidence(commitSha);
    writeJson(join(options.output, 'operator-and-deployment-proof.json'), {
      capturedAt: new Date().toISOString(),
      commitSha,
      workflow,
      publicationObjectsReachable: true,
      productionIssuerReachable: true,
      productionReceiptIssued: true,
      temporaryApiKey: {
        keyId: temporary.record.id,
        keyPrefix: temporary.record.key_prefix,
        plan: temporary.record.plan,
        createdAt: temporary.record.created_at,
        expiresAt: temporary.record.expires_at,
        plaintextPersisted: false,
        revocationPendingFinally: true,
      },
    });
  } finally {
    await revokeApiKey(temporary.record.id, ownerId);
    revokedAt = new Date().toISOString();
    const client = createServiceRoleClient();
    const { data, error } = await client
      .from('api_keys')
      .select('id, key_prefix, is_active, expires_at')
      .eq('id', temporary.record.id)
      .single();
    assert(!error && data, 'temporary API key revocation could not be confirmed');
    assert(data.is_active === false, 'temporary API key is still active after revocation');

    const proofPath = join(options.output, 'operator-and-deployment-proof.json');
    const existing = existsSync(proofPath)
      ? (JSON.parse(readFileSync(proofPath, 'utf8')) as Record<string, unknown>)
      : {};
    writeJson(proofPath, {
      ...existing,
      evidenceStartedAt: startedAt,
      evidenceFinishedAt: new Date().toISOString(),
      temporaryApiKey: {
        ...record(existing.temporaryApiKey ?? {}, 'temporary API key proof'),
        keyId: temporary.record.id,
        keyPrefix: temporary.record.key_prefix,
        plaintextPersisted: false,
        revokedAt,
        revocationConfirmed: data.is_active === false,
      },
    });
  }

  writeSha256Sums(options.output);
  process.stdout.write(
    [
      'VERITAS V5 LIVE REMEDIATION EVIDENCE CAPTURED',
      `output=${options.output}`,
      `candidatePolicyId=${CANDIDATE_POLICY_ID}`,
      `candidateActivationSetId=${CANDIDATE_ACTIVATION_SET_ID}`,
      `promotionId=${PROMOTION_ID}`,
      `temporaryApiKeyRevokedAt=${revokedAt}`,
      '',
    ].join('\n')
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `VERITAS REMEDIATION CAPTURE FAILED: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  process.exitCode = 1;
});
