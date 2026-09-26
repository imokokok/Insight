#!/usr/bin/env node

/** Re-issue historical Attempt 1 with the exact rule-selected Swap log. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

import { createApiKeyForUser, revokeApiKey } from '@/lib/api/apiKey';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ORIGIN = 'https://www.oracleinsight.xyz';
const POLICY_ID = '0x162d3fe744acc2041a959daf40dc3fe9242b654aef58acbb991acbf605885085';
const TX_HASH = '0x9da7b60ba897650547226d345427228c0cf982a15bdfd56263ad071e3637b537';
const LOG_INDEX = 14;

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is missing`);
  return value;
}

function parseArgs(argv: string[]): { gates: string; output: string } {
  if (argv.length !== 4 || argv[0] !== '--gates' || argv[2] !== '--output') {
    throw new Error('usage: reissue-attempt1.mts --gates DIR --output DIR');
  }
  return { gates: resolve(argv[1]!), output: resolve(argv[3]!) };
}

async function post(
  path: string,
  body: unknown,
  apiKey?: string
): Promise<Record<string, unknown>> {
  const response = await fetch(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Insight-VERITAS-receipt-correction/1.0',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = requireObject(await response.json(), `${path} response`);
  if (!response.ok || payload.success !== true) {
    const error = requireObject(payload.error ?? {}, `${path} error`);
    throw new Error(`${path} returned HTTP ${response.status}: ${String(error.code ?? 'unknown')}`);
  }
  return payload;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function main() {
  const { gates, output } = parseArgs(process.argv.slice(2));
  const source = requireObject(
    JSON.parse(readFileSync(join(gates, 'source-gate.json'), 'utf8')) as unknown,
    'source gate'
  );
  const destination = requireObject(
    JSON.parse(readFileSync(join(gates, 'destination-gate.json'), 'utf8')) as unknown,
    'destination gate'
  );
  const sourceData = requireObject(source.data, 'source gate data');
  const destinationData = requireObject(destination.data, 'destination gate data');
  if (
    source.uid !== '0x651a59fed62d0039b597f11876477b8e97dd31553731c713d3ba0bef1e763dc3' ||
    destination.uid !== '0xef75a7f8728b7312e0c2fce412e0412e3f49c6fd3de0fe6a61a06c5288fdfe4c'
  ) {
    throw new Error('gate UIDs do not identify archived rehearsal Attempt 1');
  }
  const ownerId = (process.env.OPS_OWNER_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  if (!ownerId) throw new Error('OPS_OWNER_USER_IDS must contain an owner id');

  const temporary = await createApiKeyForUser(ownerId, 'VERITAS event-price correction', {
    plan: 'enterprise',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  });
  let result: Record<string, unknown> | null = null;
  try {
    const issue = await post(
      '/api/v1/execution/attestation/issue',
      {
        preTradeUid: source.uid,
        requestHash: sourceData.requestHash,
        sourceAssetId: sourceData.sourceAssetId,
        destinationAssetId: sourceData.destinationAssetId,
        subjectChainId: sourceData.subjectChainId,
        settlementChainId: 1,
        participantCount: sourceData.participantCount,
        sourceGroupCount: sourceData.sourceGroupCount,
        preTradeSignedAt: sourceData.checkedAt,
        quotedPrice: 0,
        action: sourceData.action,
        txHash: TX_HASH,
        selectedSwapLogIndex: LOG_INDEX,
        destinationPreTradeUid: destination.uid,
        quoteVenueIndependent: false,
        quoteBasis: 'ORACLE_CONSENSUS',
        quoteBlockNumber: 0,
        priceStateAgeAtExecSeconds: 0,
        claimRole: 'THIRD_PARTY_OBSERVATION',
        preTradeAttestations: { source, destination },
      },
      temporary.plainKey
    );
    const data = requireObject(issue.data, 'issuance data');
    const receipt = requireObject(data.attestation, 'new receipt');
    const signed = requireObject(receipt.data, 'signed receipt data');
    const selected = requireObject(data.selectedEvent, 'selected event evidence');
    if (
      Number(selected.logIndex) !== LOG_INDEX ||
      String(signed.txHash).toLowerCase() !== TX_HASH ||
      signed.quoteBasis !== 'ORACLE_CONSENSUS' ||
      Number(signed.quoteBlockNumber) !== 0 ||
      Number(signed.executedPrice) !== 269300325992 ||
      Number(signed.quotedPrice) !== 269580162136 ||
      signed.priceExecutionStatus !== 'FAITHFUL'
    ) {
      throw new Error('new signed receipt does not match the selected event and gate cross-rate');
    }
    const verifyBody = { attestation: receipt, policyId: POLICY_ID };
    const [publicVerification, pairVerification, partnerVerification] = await Promise.all([
      post('/api/v1/execution/attestation/verify', verifyBody),
      post('/api/v1/execution/attestation/verify-pair', {
        preTradeAttestation: source,
        destinationPreTradeAttestation: destination,
        executionReceipt: receipt,
        policyId: POLICY_ID,
      }),
      post('/api/v1/partners/veritas/execution/attestation/verify', verifyBody),
    ]);
    result = { receipt, selected, publicVerification, pairVerification, partnerVerification };
  } finally {
    await revokeApiKey(temporary.record.id, ownerId);
    const client = createServiceRoleClient();
    const { data, error } = await client
      .from('api_keys')
      .select('is_active')
      .eq('id', temporary.record.id)
      .single();
    if (error || !data || data.is_active !== false) {
      throw new Error('temporary API key revocation could not be confirmed');
    }
  }
  if (!result) throw new Error('production receipt was not issued');
  mkdirSync(output, { recursive: false });
  writeJson(join(output, 'corrected-receipt.json'), result.receipt);
  writeJson(join(output, 'selected-event.json'), result.selected);
  writeJson(join(output, 'public-verification.json'), result.publicVerification);
  writeJson(join(output, 'pair-verification.json'), result.pairVerification);
  writeJson(join(output, 'partner-verification.json'), result.partnerVerification);
  writeJson(join(output, 'issuance-summary.json'), {
    capturedAt: new Date().toISOString(),
    transactionHash: TX_HASH,
    selectedLogIndex: LOG_INDEX,
    originalSourceGateUid: requiredString(source.uid, 'source uid'),
    originalDestinationGateUid: requiredString(destination.uid, 'destination uid'),
    newReceiptUid: requiredString(result.receipt.uid, 'receipt uid'),
    productionPolicyId: POLICY_ID,
    temporaryApiKeyRevoked: true,
    historicalReceiptExpired: true,
    newGateIssued: false,
    chainBroadcast: false,
  });
  process.stdout.write(`corrected receipt ${String(result.receipt.uid)} saved to ${output}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
