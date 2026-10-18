import { createHash } from 'node:crypto';

export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
// CAIP-2 uses a 32-character customary Solana reference, while JSON-RPC
// getGenesisHash returns the full 44-character base58 blockhash. Do not use
// the CAIP-2 reference for this transport-level cluster check.
const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

export type SolanaSimulationPayload = {
  network: typeof SOLANA_MAINNET_CAIP2;
  transactionVersion: 'legacy' | 'v0' | 'v1';
  messageHash: string;
  signatureState: 'UNSIGNED' | 'SIGNED_OR_PARTIALLY_SIGNED';
  commitment: 'confirmed';
  simulationSlot: number;
  simulatedAt: number;
  status: 'SIMULATED' | 'FAILED';
  error: unknown | null;
  logs: string[] | null;
  logsTruncated: boolean;
  unitsConsumed: number | null;
  loadedAccountsDataSize: number | null;
  feeLamports: string | null;
  observationSource: 'solana-json-rpc';
};

export type SolanaSimulationResult =
  | { ok: true; payload: SolanaSimulationPayload }
  | { ok: false; code: SolanaSimulationFailureCode; message: string };

type SolanaSimulationFailureCode =
  | 'INVALID_TRANSACTION'
  | 'RPC_UNAVAILABLE'
  | 'RPC_INVALID_RESPONSE'
  | 'CLUSTER_MISMATCH';

export async function simulateSolanaTransaction(input: {
  transactionBase64: string;
  endpoints: string[];
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  now?: () => number;
}): Promise<SolanaSimulationResult> {
  let parsed: ExtractedSolanaMessage;
  try {
    parsed = extractSolanaMessage(input.transactionBase64);
  } catch {
    return failure(
      'INVALID_TRANSACTION',
      'transactionBase64 is not a valid legacy, v0, or v1 Solana transaction'
    );
  }
  if (input.endpoints.length === 0)
    return failure('RPC_UNAVAILABLE', 'No Solana mainnet RPC endpoint is configured');
  const fetcher = input.fetcher ?? fetch;
  let lastFailure: SolanaSimulationResult = failure(
    'RPC_UNAVAILABLE',
    'All Solana mainnet RPC endpoints failed'
  );
  for (const endpoint of input.endpoints) {
    try {
      const genesis = await rpc<string>(endpoint, 'getGenesisHash', [], fetcher, input.signal);
      if (genesis !== SOLANA_MAINNET_GENESIS_HASH) {
        lastFailure = failure(
          'CLUSTER_MISMATCH',
          'RPC endpoint is not connected to Solana mainnet-beta'
        );
        continue;
      }
      const result = asRecord(
        await rpc<unknown>(
          endpoint,
          'simulateTransaction',
          [
            input.transactionBase64,
            {
              encoding: 'base64',
              commitment: 'confirmed',
              sigVerify: false,
              replaceRecentBlockhash: false,
              innerInstructions: true,
            },
          ],
          fetcher,
          input.signal
        ),
        'simulateTransaction result'
      );
      const context = asRecord(result.context, 'simulation context');
      const value = asRecord(result.value, 'simulation value');
      const rawLogs = value.logs;
      if (
        rawLogs !== null &&
        (!Array.isArray(rawLogs) || !rawLogs.every((entry) => typeof entry === 'string'))
      )
        throw new InvalidRpcDataError('simulation logs are invalid');
      const allLogs = Array.isArray(rawLogs) ? (rawLogs as string[]) : null;
      const logsTruncated = Boolean(
        allLogs &&
        (allLogs.length > 128 ||
          allLogs.slice(0, 128).reduce((total, line) => total + line.length, 0) > 16_384)
      );
      const logs = allLogs ? capLogs(allLogs) : null;
      const error = value.err === undefined ? null : safeJsonValue(value.err);
      const payload: SolanaSimulationPayload = {
        network: SOLANA_MAINNET_CAIP2,
        transactionVersion: parsed.transactionVersion,
        messageHash: parsed.messageHash,
        signatureState: parsed.signatureState,
        commitment: 'confirmed',
        simulationSlot: safeInteger(context.slot, 'simulation context slot'),
        simulatedAt: Math.floor((input.now ?? Date.now)() / 1000),
        status: error === null ? 'SIMULATED' : 'FAILED',
        error,
        logs,
        logsTruncated,
        unitsConsumed: nullableInteger(value.unitsConsumed, 'unitsConsumed'),
        loadedAccountsDataSize: nullableInteger(
          value.loadedAccountsDataSize,
          'loadedAccountsDataSize'
        ),
        feeLamports: nullableUnsignedString(value.fee, 'fee'),
        observationSource: 'solana-json-rpc',
      };
      return { ok: true, payload };
    } catch (error) {
      if (input.signal?.aborted) throw error;
      lastFailure =
        error instanceof InvalidRpcDataError
          ? failure('RPC_INVALID_RESPONSE', 'Solana RPC returned invalid simulation data')
          : failure('RPC_UNAVAILABLE', 'Solana RPC request failed');
    }
  }
  return lastFailure;
}

export function solanaTransactionMessageHash(transactionBase64: string): {
  transactionVersion: 'legacy' | 'v0' | 'v1';
  messageHash: string;
} {
  const parsed = extractSolanaMessage(transactionBase64);
  return { transactionVersion: parsed.transactionVersion, messageHash: parsed.messageHash };
}

type ExtractedSolanaMessage = {
  transactionVersion: 'legacy' | 'v0' | 'v1';
  messageHash: string;
  signatureState: 'UNSIGNED' | 'SIGNED_OR_PARTIALLY_SIGNED';
};

function extractSolanaMessage(encoded: string): ExtractedSolanaMessage {
  if (
    typeof encoded !== 'string' ||
    encoded.length < 8 ||
    encoded.length > 12_000 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
  )
    throw new TypeError('invalid base64');
  const transaction = Buffer.from(encoded, 'base64');
  if (transaction.toString('base64') !== encoded) throw new TypeError('non-canonical base64');
  let transactionVersion: ExtractedSolanaMessage['transactionVersion'];
  let messageStart: number;
  let messageEnd: number;
  let signatureStart: number;
  let signatureCount: number;

  if (transaction[0] === 0x81) {
    transactionVersion = 'v1';
    if (transaction.length < 43) throw new TypeError('truncated v1 transaction');
    signatureCount = transaction[1];
    if (signatureCount < 1) throw new TypeError('v1 transaction has no signer');
    messageStart = 0;
    messageEnd = v1MessageLength(transaction);
    signatureStart = messageEnd;
    if (transaction.length !== signatureStart + signatureCount * 64)
      throw new TypeError('v1 signature tail has an invalid length');
  } else {
    const decoded = readShortVector(transaction, 0);
    signatureCount = decoded.value;
    if (signatureCount < 1 || signatureCount > 256) throw new TypeError('invalid signature count');
    messageStart = decoded.next + signatureCount * 64;
    if (messageStart >= transaction.length) throw new TypeError('transaction message is missing');
    const prefix = transaction[messageStart];
    if ((prefix & 0x80) === 0) transactionVersion = 'legacy';
    else if (prefix === 0x80) transactionVersion = 'v0';
    else throw new TypeError('unsupported transaction version');
    if (transaction.length > 1232)
      throw new TypeError('legacy and v0 transactions cannot exceed 1,232 bytes');
    const headerStart = messageStart + (transactionVersion === 'v0' ? 1 : 0);
    if (headerStart + 3 > transaction.length || transaction[headerStart] !== signatureCount)
      throw new TypeError('signature count does not match message header');
    if (transaction[headerStart] < 1)
      throw new TypeError('transaction message has no required signer');
    messageEnd = transaction.length;
    signatureStart = decoded.next;
  }

  if (transactionVersion === 'v1' && transaction.length > 4096)
    throw new TypeError('v1 transactions cannot exceed 4,096 bytes');

  const signatures = transaction.subarray(signatureStart, signatureStart + signatureCount * 64);
  const signatureState = signatures.every((byte) => byte === 0)
    ? 'UNSIGNED'
    : 'SIGNED_OR_PARTIALLY_SIGNED';
  const messageBytes = transaction.subarray(messageStart, messageEnd);
  const messageHash = '0x' + createHash('sha256').update(messageBytes).digest('hex');
  return { transactionVersion, messageHash, signatureState };
}

function v1MessageLength(transaction: Buffer): number {
  let offset = 8; // version byte, three header bytes, four-byte config mask
  const mask = transaction.readUInt32LE(4);
  if (
    (mask & ~0x1f) !== 0 ||
    ((mask & 0x3) !== 0 && (mask & 0x3) !== 0x3) ||
    (mask & 0x0c) !== 0x0c ||
    offset + 34 > transaction.length
  )
    throw new TypeError('invalid v1 config mask');
  offset += 32; // recent blockhash
  const instructionCount = transaction[offset++];
  const addressCount = transaction[offset++];
  if (instructionCount < 1 || instructionCount > 64 || addressCount < 1 || addressCount > 96)
    throw new TypeError('v1 counts exceed protocol limits');
  const requiredSignatures = transaction[1];
  const readonlySigned = transaction[2];
  const readonlyUnsigned = transaction[3];
  if (
    requiredSignatures < 1 ||
    requiredSignatures > addressCount ||
    readonlySigned >= requiredSignatures ||
    readonlyUnsigned > addressCount - requiredSignatures
  )
    throw new TypeError('v1 message header account counts are inconsistent');
  offset += addressCount * 32;
  if (mask & 0x3) offset += 8;
  if (mask & 0x4) offset += 4;
  if (mask & 0x8) offset += 4;
  if (mask & 0x10) offset += 4;
  if (offset + instructionCount * 4 > transaction.length)
    throw new TypeError('truncated v1 instruction headers');
  const accountCounts: number[] = [];
  const dataLengths: number[] = [];
  for (let index = 0; index < instructionCount; index += 1) {
    if (transaction[offset + index * 4] >= addressCount)
      throw new TypeError('v1 instruction program index is out of range');
    accountCounts.push(transaction[offset + index * 4 + 1]);
    dataLengths.push(transaction.readUInt16LE(offset + index * 4 + 2));
  }
  offset += instructionCount * 4;
  for (let index = 0; index < instructionCount; index += 1) {
    const accountsEnd = offset + accountCounts[index];
    const instructionEnd = accountsEnd + dataLengths[index];
    if (instructionEnd > transaction.length)
      throw new TypeError('truncated v1 instruction payloads');
    for (let account = offset; account < accountsEnd; account += 1)
      if (transaction[account] >= addressCount)
        throw new TypeError('v1 instruction account index is out of range');
    offset = instructionEnd;
  }
  return offset;
}

function readShortVector(bytes: Buffer, start: number): { value: number; next: number } {
  let value = 0;
  let shift = 0;
  let offset = start;
  let byteCount = 0;
  while (offset < bytes.length && shift <= 14) {
    const byte = bytes[offset++];
    byteCount += 1;
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      if (value > 0xffff || (byteCount > 1 && value < 0x80) || (byteCount > 2 && value < 0x4000))
        throw new TypeError('non-canonical short vector');
      return { value, next: offset };
    }
    shift += 7;
  }
  throw new TypeError('invalid short vector');
}

function capLogs(logs: string[]): string[] {
  const result: string[] = [];
  let total = 0;
  for (const log of logs.slice(0, 128)) {
    const remaining = 16_384 - total;
    if (remaining <= 0) break;
    const capped = log.slice(0, Math.min(4_096, remaining));
    result.push(capped);
    total += capped.length;
  }
  return result;
}

async function rpc<T>(
  endpoint: string,
  method: string,
  params: unknown[],
  fetcher: typeof fetch,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'insight-solana-simulation', method, params }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Solana RPC returned a non-success HTTP response');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new InvalidRpcDataError('invalid JSON');
  }
  const envelope = asRecord(body, 'JSON-RPC response');
  if (envelope.jsonrpc !== '2.0' || envelope.id !== 'insight-solana-simulation')
    throw new InvalidRpcDataError('invalid JSON-RPC envelope');
  if (envelope.error != null) throw new Error('Solana RPC rejected the simulation request');
  if (!Object.hasOwn(envelope, 'result')) throw new InvalidRpcDataError('result is missing');
  return envelope.result as T;
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidRpcDataError(field + ' is not an object');
  return value as Record<string, unknown>;
}

function safeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new InvalidRpcDataError(field + ' is not a non-negative integer');
  return value;
}

function nullableInteger(value: unknown, field: string): number | null {
  return value == null ? null : safeInteger(value, field);
}

function nullableUnsignedString(value: unknown, field: string): string | null {
  if (value == null) return null;
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^(0|[1-9][0-9]*)$/.test(String(value))
  )
    throw new InvalidRpcDataError(field + ' is not an unsigned integer');
  return String(value);
}

function safeJsonValue(value: unknown, depth = 0): unknown {
  if (depth > 12)
    throw new InvalidRpcDataError('simulation error exceeds the supported nesting depth');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value))
    return value.slice(0, 64).map((child) => safeJsonValue(child, depth + 1));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, 64))
      output[key.slice(0, 128)] = safeJsonValue(child, depth + 1);
    return output;
  }
  throw new InvalidRpcDataError('simulation error is not JSON-safe');
}

function failure(code: SolanaSimulationFailureCode, message: string): SolanaSimulationResult {
  return { ok: false, code, message };
}

class InvalidRpcDataError extends Error {}
