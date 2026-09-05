/** Offline verification for ExecutionReceipt v1-v4 and its pre-trade pairing. */

import { concat, hashTypedData, keccak256, toBytes, verifyTypedData } from 'viem';

import { resolveKeyStatus } from './keyRegistry';
import { verifyReceipt, type VerifyOptions } from './verify';

import type { KeyEntry, KeyRegistry, RoutableAttestation } from './types';

export const EXECUTION_DOMAIN = { name: 'Insight Execution', version: '1', chainId: 1 } as const;
export const EXECUTION_PRIMARY_TYPE = 'ExecutionReceipt';

const V1_FIELDS = [
  ['preTradeUid', 'bytes32'],
  ['requestHash', 'bytes32'],
  ['sourceAssetId', 'string'],
  ['destinationAssetId', 'string'],
  ['subjectChainId', 'uint256'],
  ['settlementChainId', 'uint256'],
  ['action', 'string'],
  ['quotedPrice', 'uint256'],
  ['executedPrice', 'uint256'],
  ['priceDeltaBps', 'int256'],
  ['maxSlippageBps', 'uint256'],
  ['slippageSatisfied', 'bool'],
  ['quotedAmountUsd', 'uint256'],
  ['executedAmountUsd', 'uint256'],
  ['actualFeeUsd', 'uint256'],
  ['fillStatus', 'string'],
  ['executionStatus', 'string'],
  ['txHash', 'bytes32'],
  ['blockNumber', 'uint256'],
  ['executedAt', 'uint256'],
  ['oracleDataAgeAtExecSeconds', 'uint256'],
  ['participantCount', 'uint256'],
  ['requiredParticipantCount', 'uint256'],
  ['sourceGroupCount', 'uint256'],
  ['requiredSourceGroupCount', 'uint256'],
  ['independenceSatisfied', 'bool'],
  ['mevRiskBps', 'uint256'],
  ['reasonCodesHash', 'bytes32'],
  ['validUntil', 'uint256'],
  ['schemaVersion', 'uint256'],
] as const;

const V2_FIELDS = [
  ['bindingMode', 'string'],
  ...V1_FIELDS.slice(0, 20),
  ['preTradeSignedAt', 'uint256'],
  ...V1_FIELDS.slice(20),
] as const;

const V3_FIELDS = [
  ['bindingMode', 'string'],
  ['claimRole', 'string'],
  ['subject', 'address'],
  ['taker', 'address'],
  ['preTradeUid', 'bytes32'],
  ['destinationPreTradeUid', 'bytes32'],
  ['preTradeUidsHash', 'bytes32'],
  ['requestHash', 'bytes32'],
  ['sourceAssetId', 'string'],
  ['destinationAssetId', 'string'],
  ['subjectChainId', 'uint256'],
  ['settlementChainId', 'uint256'],
  ['action', 'string'],
  ['quotedPrice', 'uint256'],
  ['executedPrice', 'uint256'],
  ['priceScale', 'uint8'],
  ['quoteBasis', 'string'],
  ['quoteBlockNumber', 'uint256'],
  ['quoteVenueIndependent', 'bool'],
  ['priceDeltaBps', 'int256'],
  ['maxSlippageBps', 'uint256'],
  ['slippageSatisfied', 'bool'],
  ['quotedAmountUsd', 'uint256'],
  ['executedAmountUsd', 'uint256'],
  ['actualFeeUsd', 'uint256'],
  ['measuredFieldsHash', 'bytes32'],
  ['fillStatus', 'string'],
  ['priceExecutionStatus', 'string'],
  ['txHash', 'bytes32'],
  ['blockNumber', 'uint256'],
  ['executedAt', 'uint256'],
  ['preTradeSignedAt', 'uint256'],
  ['attestationAgeAtExecSeconds', 'uint256'],
  ['priceStateAgeAtExecSeconds', 'uint256'],
  ['participantCount', 'uint256'],
  ['requiredParticipantCount', 'uint256'],
  ['sourceGroupCount', 'uint256'],
  ['requiredSourceGroupCount', 'uint256'],
  ['independenceSatisfied', 'bool'],
  ['mevRiskBps', 'uint256'],
  ['reasonCodesHash', 'bytes32'],
  ['validUntil', 'uint256'],
  ['schemaVersion', 'uint256'],
] as const;

const descriptors = (fields: readonly (readonly [string, string])[]) => ({
  ExecutionReceipt: fields.map(([name, type]) => ({ name, type })),
});

export const EXECUTION_TYPES_V1 = descriptors(V1_FIELDS);
export const EXECUTION_TYPES_V2 = descriptors(V2_FIELDS);
export const EXECUTION_TYPES_V3 = descriptors(V3_FIELDS);
export const EXECUTION_TYPES_V4 = descriptors([...V3_FIELDS, ['environment', 'string']]);

export function executionTypesForSchemaVersion(version: number) {
  if (version === 1) return EXECUTION_TYPES_V1;
  if (version === 2) return EXECUTION_TYPES_V2;
  if (version === 3) return EXECUTION_TYPES_V3;
  if (version === 4) return EXECUTION_TYPES_V4;
  return null;
}

export interface ExecutionReceipt extends RoutableAttestation {
  data: Record<string, unknown>;
}

export interface ExecutionVerificationResult {
  valid: boolean;
  cryptographicValid: boolean;
  code:
    | 'ok'
    | 'expired'
    | 'uid_mismatch'
    | 'signature_invalid'
    | 'signature_missing'
    | 'unsupported_schema'
    | 'malformed';
  kind: 'execution';
  attester: string;
  uid: string | null;
  schemaVersion: number;
  executedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  keyStatus: ReturnType<typeof resolveKeyStatus>;
  trustedAttester: boolean;
  executionStatus: string | null;
  bindingMode: string | null;
  reason?: string;
}

const ZERO_ADDRESS = `0x${'0'.repeat(40)}`;
const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;
const EMPTY_HASH = keccak256(toBytes(''));

function fieldValue(name: string, data: Record<string, unknown>): unknown {
  const verdict = data.priceExecutionStatus ?? data.executionStatus ?? 'UNDETERMINED';
  const age = data.attestationAgeAtExecSeconds ?? data.oracleDataAgeAtExecSeconds ?? 0;
  const defaults: Record<string, unknown> = {
    bindingMode: 'SELF_REPORTED',
    claimRole: 'THIRD_PARTY_OBSERVATION',
    subject: data.taker ?? ZERO_ADDRESS,
    taker: ZERO_ADDRESS,
    destinationPreTradeUid: ZERO_BYTES32,
    preTradeUidsHash: EMPTY_HASH,
    priceScale: 8,
    quoteBasis: 'UNSPECIFIED',
    quoteBlockNumber: 0,
    quoteVenueIndependent: false,
    measuredFieldsHash: EMPTY_HASH,
    executionStatus: verdict,
    priceExecutionStatus: verdict,
    preTradeSignedAt: 0,
    oracleDataAgeAtExecSeconds: age,
    attestationAgeAtExecSeconds: age,
    priceStateAgeAtExecSeconds: 0,
    environment: '',
  };
  return data[name] ?? defaults[name];
}

function typedArgs(data: Record<string, unknown>) {
  const version = Number(data.schemaVersion);
  const types = executionTypesForSchemaVersion(version);
  if (!types) return null;
  const message: Record<string, unknown> = {};
  for (const field of types.ExecutionReceipt) {
    const value = fieldValue(field.name, data);
    if (value === undefined) throw new Error(`missing field ${field.name}`);
    message[field.name] =
      field.type.startsWith('uint') || field.type.startsWith('int')
        ? BigInt(value as string | number | bigint)
        : value;
  }
  return { domain: EXECUTION_DOMAIN, types, primaryType: EXECUTION_PRIMARY_TYPE, message } as const;
}

function productionKey(attester: string, registry?: KeyRegistry): KeyEntry | null {
  const keys = registry?.public_keys ?? registry?.keys ?? [];
  return keys.find((key) => key.public_key.toLowerCase() === attester.toLowerCase()) ?? null;
}

export async function verifyExecutionReceipt(
  receipt: ExecutionReceipt,
  opts: VerifyOptions = {}
): Promise<ExecutionVerificationResult> {
  const attester = typeof receipt?.attester === 'string' ? receipt.attester : '';
  const data = receipt?.data ?? {};
  const version = Number(data.schemaVersion ?? receipt?.schemaVersion ?? 0);
  const executedAt = Number.isFinite(Number(data.executedAt)) ? Number(data.executedAt) : null;
  const validUntil = Number.isFinite(Number(data.validUntil)) ? Number(data.validUntil) : null;
  const keyStatus = resolveKeyStatus(attester, executedAt, opts.keyRegistry);
  const key = productionKey(attester, opts.keyRegistry);
  const trustedAttester = keyStatus === 'valid' && key?.role !== 'sample';
  const base = {
    kind: 'execution' as const,
    attester,
    uid: receipt?.uid ?? null,
    schemaVersion: version,
    executedAt,
    validUntil,
    keyStatus,
    trustedAttester,
    executionStatus:
      typeof (data.priceExecutionStatus ?? data.executionStatus) === 'string'
        ? String(data.priceExecutionStatus ?? data.executionStatus)
        : null,
    bindingMode: typeof data.bindingMode === 'string' ? data.bindingMode : null,
  };
  try {
    if (typeof receipt?.signature !== 'string' || receipt.signature.length === 0) {
      return {
        ...base,
        valid: false,
        cryptographicValid: false,
        code: 'signature_missing',
        expired: false,
        reason: 'signature_missing',
      };
    }
    const args = typedArgs(data);
    if (!args)
      return {
        ...base,
        valid: false,
        cryptographicValid: false,
        code: 'unsupported_schema',
        expired: false,
        reason: `unsupported ExecutionReceipt schemaVersion ${version}`,
      };
    const expected = hashTypedData(args);
    if (expected !== receipt.uid)
      return {
        ...base,
        valid: false,
        cryptographicValid: false,
        code: 'uid_mismatch',
        expired: false,
        reason: 'uid_mismatch: data was modified after signing',
      };
    const signatureValid = await verifyTypedData({
      ...args,
      address: attester as `0x${string}`,
      signature: receipt.signature as `0x${string}`,
    });
    if (!signatureValid)
      return {
        ...base,
        valid: false,
        cryptographicValid: false,
        code: 'signature_invalid',
        expired: false,
        reason: 'signature_invalid',
      };
    const expired = validUntil !== null && Math.floor(Date.now() / 1000) >= validUntil;
    return {
      ...base,
      valid: !expired && trustedAttester,
      cryptographicValid: true,
      code: expired ? 'expired' : 'ok',
      expired,
      reason: !trustedAttester
        ? 'signature is valid but signer is not an authorised production key'
        : expired
          ? 'expired'
          : undefined,
    };
  } catch (error) {
    return {
      ...base,
      valid: false,
      cryptographicValid: false,
      code: 'malformed',
      expired: false,
      reason: `malformed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export interface ExecutionPairResult {
  pairedValid: boolean;
  closedLoopStatus: string;
  reason: string;
  preTrade: Awaited<ReturnType<typeof verifyReceipt>>;
  destinationPreTrade: Awaited<ReturnType<typeof verifyReceipt>> | null;
  execution: ExecutionVerificationResult;
}

const text = (value: unknown) => (value == null ? '' : String(value));
const cryptoOk = (code: string) => code === 'ok' || code === 'expired';

export async function verifyExecutionPair(
  preTrade: RoutableAttestation,
  execution: ExecutionReceipt,
  destinationPreTrade: RoutableAttestation | null = null,
  opts: VerifyOptions = {}
): Promise<ExecutionPairResult> {
  const [pre, exec, dest] = await Promise.all([
    verifyReceipt(preTrade, opts),
    verifyExecutionReceipt(execution, opts),
    destinationPreTrade ? verifyReceipt(destinationPreTrade, opts) : Promise.resolve(null),
  ]);
  const p = preTrade.data ?? {};
  const e = execution.data ?? {};
  const version = Number(e.schemaVersion);
  const destinationUid = text(e.destinationPreTradeUid);
  const commitsDestination =
    version >= 3 && destinationUid !== '' && destinationUid !== ZERO_BYTES32;
  const orderedUids = [text(e.preTradeUid), ...(commitsDestination ? [destinationUid] : [])];
  const uidHash = keccak256(concat(orderedUids.map((uid) => uid as `0x${string}`)));
  const executedAt = Number(e.executedAt);
  const inWindow = (result: typeof pre | null) =>
    result?.checkedAt != null &&
    result.validUntil != null &&
    executedAt >= result.checkedAt &&
    executedAt <= result.validUntil;
  const authorised = (attestation: RoutableAttestation | null) =>
    ['PASS', 'CAUTION'].includes(text(attestation?.data?.verdict).toUpperCase());
  const keyIsProduction = (attester: string) =>
    productionKey(attester, opts.keyRegistry)?.role !== 'sample';
  const d = destinationPreTrade?.data ?? {};
  const destinationScopeMatches =
    !commitsDestination ||
    (text(d.sourceAssetId) === text(p.destinationAssetId) &&
      text(d.destinationAssetId) === text(p.sourceAssetId) &&
      Number(d.subjectChainId) === Number(p.subjectChainId) &&
      text(d.action).toLowerCase() === text(p.action).toLowerCase() &&
      Number(d.tradeAmountUsd) === Number(p.tradeAmountUsd));
  const valid =
    cryptoOk(pre.code) &&
    pre.keyStatus === 'valid' &&
    keyIsProduction(pre.attester) &&
    exec.cryptographicValid &&
    exec.trustedAttester &&
    e.bindingMode === 'VERIFIED' &&
    pre.uid === text(e.preTradeUid) &&
    text(p.requestHash) === text(e.requestHash) &&
    Number(p.subjectChainId) === Number(e.subjectChainId) &&
    text(p.sourceAssetId) === text(e.sourceAssetId) &&
    text(p.destinationAssetId) === text(e.destinationAssetId) &&
    text(p.action).toLowerCase() === text(e.action).toLowerCase() &&
    authorised(preTrade) &&
    inWindow(pre) &&
    (!commitsDestination ||
      (dest !== null &&
        destinationPreTrade !== null &&
        cryptoOk(dest.code) &&
        dest.keyStatus === 'valid' &&
        keyIsProduction(dest.attester) &&
        dest.uid === destinationUid &&
        authorised(destinationPreTrade) &&
        inWindow(dest))) &&
    destinationScopeMatches &&
    (version < 3 || text(e.preTradeUidsHash).toLowerCase() === uidHash.toLowerCase());
  const status = text(e.priceExecutionStatus ?? e.executionStatus);
  return {
    pairedValid: valid,
    closedLoopStatus: valid ? `${version >= 3 ? 'PRICE_' : ''}CLOSED_${status}` : 'PAIR_INVALID',
    reason: valid
      ? 'signatures, production-key trust, bindings and execution-time gate windows verified'
      : 'one or more signature, trust, binding, authorisation or timing checks failed',
    preTrade: pre,
    destinationPreTrade: dest,
    execution: exec,
  };
}
