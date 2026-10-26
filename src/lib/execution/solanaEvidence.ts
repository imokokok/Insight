import { createHash } from 'node:crypto';

import { ed25519 } from '@noble/curves/ed25519';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export type SolanaEvidenceSchema =
  | 'insight.solana-execution-receipt.v1'
  | 'insight.solana-simulation-receipt.v1'
  | 'insight.solana-lending-guard-decision.v1';

export type SolanaSignedEvidence<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> = {
  schema: SolanaEvidenceSchema;
  payload: TPayload;
  signer: { algorithm: 'ed25519'; publicKey: string };
  signature: string;
};

export type SolanaEvidenceContextCommitment = {
  namespace: SolanaEvidenceSchema;
  algorithm: 'sha256';
  digest: string;
};

/** Sign an Insight Solana evidence payload with the dedicated Ed25519 seed. */
export function signSolanaEvidence<TPayload extends Record<string, unknown>>(
  schema: SolanaEvidenceSchema,
  payload: TPayload
): SolanaSignedEvidence<TPayload> | null {
  const seed = readSigningSeed();
  if (!seed) return null;
  const signer = {
    algorithm: 'ed25519' as const,
    publicKey: encodeBase58(ed25519.getPublicKey(seed)),
  };
  const unsigned = { schema, payload, signer };
  const message = canonicalBytes(unsigned);
  const signature = encodeBase58(ed25519.sign(message, seed));
  return { ...unsigned, signature };
}

/** Verify the signature and pin it to a separately trusted public key. */
export function verifySolanaEvidence(
  value: unknown,
  trustedPublicKey: string
): value is SolanaSignedEvidence {
  if (!isRecord(value) || Object.keys(value).sort().join(',') !== 'payload,schema,signature,signer')
    return false;
  if (
    value.schema !== 'insight.solana-execution-receipt.v1' &&
    value.schema !== 'insight.solana-simulation-receipt.v1' &&
    value.schema !== 'insight.solana-lending-guard-decision.v1'
  )
    return false;
  if (
    !isRecord(value.payload) ||
    !isValidPayload(value.schema, value.payload) ||
    !isRecord(value.signer) ||
    Object.keys(value.signer).sort().join(',') !== 'algorithm,publicKey'
  )
    return false;
  if (
    value.signer.algorithm !== 'ed25519' ||
    value.signer.publicKey !== trustedPublicKey ||
    typeof value.signature !== 'string'
  )
    return false;
  try {
    const publicKey = decodeBase58(value.signer.publicKey);
    const signature = decodeBase58(value.signature);
    if (publicKey.length !== 32 || signature.length !== 64) return false;
    return ed25519.verify(
      signature,
      canonicalBytes({ schema: value.schema, payload: value.payload, signer: value.signer }),
      publicKey
    );
  } catch {
    return false;
  }
}

function isValidPayload(schema: SolanaEvidenceSchema, payload: Record<string, unknown>): boolean {
  if (schema === 'insight.solana-execution-receipt.v1') {
    const facts = payload.facts;
    if (!isRecord(facts)) return false;
    return (
      facts.schema === 'insight.solana-execution-facts.v1' &&
      facts.network === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' &&
      isBase58Bytes(facts.signature, 64) &&
      isSolanaPublicKey(facts.taker) &&
      typeof facts.sourceAssetId === 'string' &&
      typeof facts.destinationAssetId === 'string' &&
      (facts.status === 'CONFIRMED' || facts.status === 'REVERTED') &&
      isNonNegativeSafeInteger(facts.slot) &&
      isUnixSeconds(facts.observedAt) &&
      typeof facts.feeLamports === 'string' &&
      /^(0|[1-9][0-9]*)$/.test(facts.feeLamports) &&
      (facts.sourceAmount === null || typeof facts.sourceAmount === 'string') &&
      (facts.destinationAmount === null || typeof facts.destinationAmount === 'string') &&
      (facts.fillScope === 'NET_WALLET_OWNED_SPL_BALANCE_DELTA' ||
        facts.fillScope === 'NET_WALLET_LAMPORT_AND_SPL_BALANCE_DELTA') &&
      payload.assertionScope === facts.fillScope &&
      payload.source === 'solana-json-rpc' &&
      isUnixSeconds(payload.issuedAt)
    );
  }
  if (schema === 'insight.solana-lending-guard-decision.v1') {
    return isValidSolanaLendingGuardPayload(payload);
  }
  const simulation = payload.simulation;
  if (!isRecord(simulation)) return false;
  return (
    simulation.network === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' &&
    (simulation.transactionVersion === 'legacy' ||
      simulation.transactionVersion === 'v0' ||
      simulation.transactionVersion === 'v1') &&
    typeof simulation.messageHash === 'string' &&
    /^0x[0-9a-f]{64}$/.test(simulation.messageHash) &&
    simulation.commitment === 'confirmed' &&
    (simulation.status === 'SIMULATED' || simulation.status === 'FAILED') &&
    simulation.signatureState === 'UNSIGNED' &&
    payload.expectedMessageHash === simulation.messageHash &&
    payload.assertionScope === 'PRE_SIGN_TRANSACTION_SIMULATION' &&
    payload.source === 'solana-json-rpc' &&
    isUnixSeconds(payload.issuedAt) &&
    isUnixSeconds(simulation.simulatedAt) &&
    isNonNegativeSafeInteger(simulation.simulationSlot)
  );
}

function isValidSolanaLendingGuardPayload(payload: Record<string, unknown>): boolean {
  const issuedAt = payload.issuedAt;
  const validUntil = payload.validUntil;
  return (
    typeof payload.decisionHash === 'string' &&
    /^0x[0-9a-f]{64}$/i.test(payload.decisionHash) &&
    typeof payload.messageHash === 'string' &&
    /^0x[0-9a-f]{64}$/i.test(payload.messageHash) &&
    isSolanaPublicKey(payload.account) &&
    (payload.protocolId === 'kamino-lend' ||
      payload.protocolId === 'marginfi-v2' ||
      payload.protocolId === 'jupiter-lend-earn' ||
      payload.protocolId === 'save-lend' ||
      payload.protocolId === 'loopscale-vault') &&
    (payload.action === 'supply' || payload.action === 'borrow') &&
    (payload.verdict === 0 || payload.verdict === 1 || payload.verdict === 2) &&
    isUnixSeconds(issuedAt) &&
    isUnixSeconds(validUntil) &&
    Number(validUntil) >= Number(issuedAt) &&
    payload.schemaVersion === 1
  );
}

function isUnixSeconds(value: unknown): boolean {
  return isNonNegativeSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isSolanaPublicKey(value: unknown): value is string {
  return isBase58Bytes(value, 32);
}

function isBase58Bytes(value: unknown, expectedLength: number): value is string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    ![...value].every((character) => BASE58.includes(character))
  )
    return false;
  try {
    return decodeBase58(value).length === expectedLength;
  } catch {
    return false;
  }
}

/** Digest the entire signed envelope for a PriorSeal context commitment. */
export function solanaEvidenceContextCommitment(
  receipt: SolanaSignedEvidence,
  namespace: SolanaEvidenceSchema = receipt.schema
): SolanaEvidenceContextCommitment {
  const digest = createHash('sha256').update(canonicalBytes(receipt)).digest('hex');
  return { namespace, algorithm: 'sha256', digest: '0x' + digest };
}

export function solanaEvidenceSignerPublicKey(): string | null {
  const seed = readSigningSeed();
  return seed ? encodeBase58(ed25519.getPublicKey(seed)) : null;
}

function readSigningSeed(): Uint8Array | null {
  const configured = process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
  if (!configured) return null;
  const normalized = configured.startsWith('0x') ? configured.slice(2) : configured;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) return null;
  return Uint8Array.from(Buffer.from(normalized, 'hex'));
}

function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJson(value));
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    if (keys.some((key) => ['__proto__', 'constructor', 'prototype'].includes(key))) {
      throw new TypeError('Evidence contains an unsafe object key');
    }
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('Evidence is not valid canonical JSON');
}

function encodeBase58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let result = '';
  while (value > 0n) {
    const remainder = Number(value % 58n);
    result = BASE58[remainder] + result;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    result = '1' + result;
  }
  return result || '1';
}

function decodeBase58(value: string): Uint8Array {
  if (!value || ![...value].every((character) => BASE58.includes(character)))
    throw new TypeError('Invalid base58');
  let number = 0n;
  for (const character of value) number = number * 58n + BigInt(BASE58.indexOf(character));
  const bytes: number[] = [];
  while (number > 0n) {
    bytes.push(Number(number & 0xffn));
    number >>= 8n;
  }
  bytes.reverse();
  let zeroes = 0;
  while (value[zeroes] === '1') zeroes += 1;
  return Uint8Array.from([...new Array(zeroes).fill(0), ...bytes]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
